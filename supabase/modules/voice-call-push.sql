-- Additive Web Push delivery for incoming voice/video calls when the PWA is closed.
-- This migration runs AFTER public notifications.sql and the private wow_voice schema.
-- It reuses the verified existing WOW encrypted push worker / native device binding.
begin;
alter table public.wow_push_events drop constraint if exists wow_push_events_source_check;
alter table public.wow_push_events add constraint wow_push_events_source_check check (
  (actor_id is not null and recipient_id is null and
    ((record_store='invoices' and kind='proforma') or
     (record_store='payments' and kind='payment') or
     (record_store='settings' and kind in ('expense','receipt')) or
     (record_store='test' and kind='test'))) or
  (recipient_id is not null and actor_id is null and details='{}'::jsonb and
    jsonb_typeof(record_id)='object' and jsonb_typeof(record_id->'id')='string'
    and record_id ?& array['id','recipient'] and record_id->>'recipient'=recipient_id::text
    and ((record_store='chat' and kind='chat')
      or (record_store='gallery' and kind in ('order.created','order.updated','stock.updated'))
      or (record_store='operations' and kind='operations')
      or (record_store='voice' and kind='call')))
);
create or replace function wow_notify.payload(p_kind text,p_source text,p_workspace uuid,p_recipient uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare notice jsonb;
begin
  if p_kind='chat' then
    select jsonb_strip_nulls(jsonb_build_object('roomId',n.room_id,'messageId',n.message_id::text,'expiresAt',m.expires_at))
      into notice from wow_collab.chat_notifications n join wow_collab.messages m
        on m.id=n.message_id and m.room_id=n.room_id
      where n.message_id=p_source::bigint and n.recipient_id=p_recipient and n.workspace_id=p_workspace
        and public.wow_chat_push_allowed(n.workspace_id,n.recipient_id,n.room_id,n.message_id);
  elsif p_kind='call' then
    select jsonb_build_object('callId',c.id,'roomId',c.room_id,'mediaKind',c.kind,'callerName',left(caller.name,80),
      'expiresAt',c.ring_until)
    into notice from wow_voice.calls c
    join wow_voice.participants p on p.call_id=c.id and p.account_id=p_recipient and p.status='invited'
    join wow_collab.rooms room on room.id=c.room_id and room.active and room.workspace_id=c.workspace_id
    join wow_collab.members m on m.room_id=c.room_id and m.account_id=p_recipient and m.state='active'
    join public.wow_accounts recipient on recipient.id=p_recipient and recipient.workspace_id=c.workspace_id
    join public.wow_accounts caller on caller.id=c.caller_id and caller.workspace_id=c.workspace_id
    where c.id=p_source::uuid and c.workspace_id=p_workspace and c.status='ringing'
      and c.ring_until>now() and c.expires_at>now() and
      wow_collab.eligible(recipient) and wow_collab.eligible(caller)
      and wow_collab.room_allowed(recipient.id,recipient.role,room)
      and (recipient.role='owner' or
        'chat.view'=any(recipient.permissions) and 'chat.edit'=any(recipient.permissions))
      and exists(select from wow_collab.members cm where cm.room_id=c.room_id and cm.account_id=c.caller_id and cm.state='active');
  elsif p_kind in ('order.created','order.updated','stock.updated') then
    notice=public.wow_gallery_notice_payload(p_source::uuid,p_recipient);
    if notice->>'workspaceId' is distinct from p_workspace::text
      or notice->>'kind' is distinct from p_kind then return null;end if;
  elsif p_kind='operations' then
    notice=public.wow_operations_notice_payload(p_source::bigint,p_recipient);
    if notice->>'workspaceId' is distinct from p_workspace::text then return null;end if;
  end if;
  return notice;
end $$;
revoke all on function wow_notify.payload(text,text,uuid,uuid) from public,anon,authenticated;
-- Existing push claim/recheck revalidate the call at delivery, so answered,
-- declined, expired or revoked invitations are never sent as fresh calls.
create or replace function wow_voice.enqueue_incoming_call() returns trigger
language plpgsql security definer set search_path='' as $$
declare c wow_voice.calls; notice_id uuid;
begin
 if new.status<>'invited' then return new;end if;
 select * into c from wow_voice.calls where id=new.call_id;
 if c.id is null or c.status<>'ringing' or c.ring_until<=now() then return new;end if;
 if not exists(select from public.wow_push_active_devices d
   where d.workspace_id=c.workspace_id and d.account_id=new.account_id and d.bound_at<=c.created_at) then return new;end if;
 -- One event per ring and recipient. Leave the existing event/job on a retry.
 insert into public.wow_push_events(workspace_id,recipient_id,record_store,record_id,
     record_revision,kind,action,details,created_at)
 values(c.workspace_id,new.account_id,'voice',
     jsonb_build_object('id',c.id,'recipient',new.account_id),0,'call','created','{}',c.created_at)
 on conflict(workspace_id,record_store,record_id,record_revision,kind)
 do nothing returning id into notice_id;
 if notice_id is not null then
  insert into public.wow_push_jobs(event_id,subscription_id)
   select notice_id,d.id from public.wow_push_active_devices d
    where d.workspace_id=c.workspace_id and d.account_id=new.account_id and d.bound_at<=c.created_at
   on conflict(event_id,subscription_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function wow_voice.enqueue_incoming_call() from public,anon,authenticated;
drop trigger if exists wow_voice_ring_push on wow_voice.participants;
create trigger wow_voice_ring_push after insert on wow_voice.participants
 for each row execute function wow_voice.enqueue_incoming_call();
commit;
