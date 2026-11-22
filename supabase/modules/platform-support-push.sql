-- Deploy after platform-support and voice-call-push. Recipient bindings stay
-- in their OWN workspace. No message, photo, company name or case identifier
-- is sent to a lock screen. Authorization and unread state are checked again
-- by the existing encrypted Web Push worker immediately before delivery.
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
      or (record_store='voice' and kind='call')
      or (record_store='support' and kind in ('support.ticket','support.reply'))))
);
create or replace function wow_notify.payload(p_kind text,p_source text,p_workspace uuid,p_recipient uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare notice jsonb;
begin
  if p_kind in ('support.ticket','support.reply') then
    select jsonb_build_object('route',case when p_kind='support.ticket' then 'founder-support' else 'member-support' end)
      into notice from wow_support.messages m join wow_support.cases c on c.id=m.case_id
      join public.wow_accounts a on a.id=p_recipient and a.workspace_id=p_workspace and a.status='active' and a.deleted_at is null
      join public.wow_workspaces w on w.id=a.workspace_id and w.status='active'
      left join wow_support.receipts r on r.case_id=c.id and r.reader=p_recipient and r.founder_view=(p_kind='support.ticket')
      where m.id=p_source::uuid and m.sender<>p_recipient and m.seq>coalesce(r.seen,0) and (a.expires_at is null or a.expires_at>now())
        and ((p_kind='support.reply' and m.from_founder and c.author=p_recipient and c.workspace_id=p_workspace)
        or (p_kind='support.ticket' and not m.from_founder and exists(select from public.wow_platform_owners o where o.user_id=p_recipient and o.active)));
  elsif p_kind='chat' then
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

create or replace function wow_support.enqueue_notice() returns trigger language plpgsql security definer set search_path='' as $$
declare rec record; eid uuid; category text;
begin
 category=case when new.from_founder then 'support.reply' else 'support.ticket' end;
 for rec in
   select distinct d.workspace_id,d.account_id from public.wow_push_active_devices d
   join wow_support.cases c on c.id=new.case_id
   where d.account_id<>new.sender and d.bound_at<=new.created_at and
     ((new.from_founder and d.account_id=c.author and d.workspace_id=c.workspace_id)
      or (not new.from_founder and exists(select from public.wow_platform_owners o where o.user_id=d.account_id and o.active)))
 loop
   insert into public.wow_push_events(workspace_id,recipient_id,record_store,record_id,record_revision,kind,action,details,created_at)
     values(rec.workspace_id,rec.account_id,'support',jsonb_build_object('id',new.id,'recipient',rec.account_id),0,category,'created','{}',new.created_at)
     on conflict(workspace_id,record_store,record_id,record_revision,kind) do nothing returning id into eid;
   if eid is not null then
     insert into public.wow_push_jobs(event_id,subscription_id) select eid,d.id from public.wow_push_active_devices d
       where d.account_id=rec.account_id and d.workspace_id=rec.workspace_id and d.bound_at<=new.created_at
       on conflict(event_id,subscription_id) do nothing;
   end if;
 end loop;
 return null;
end $$;
revoke all on function wow_support.enqueue_notice() from public,anon,authenticated;
drop trigger if exists wow_support_push on wow_support.messages;
create trigger wow_support_push after insert on wow_support.messages for each row execute function wow_support.enqueue_notice();
commit;
