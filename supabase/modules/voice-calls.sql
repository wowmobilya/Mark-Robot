-- WOW Mark Robot: audio/video calls isolated from all existing text chat tables.
-- Private Supabase Realtime Broadcast/Presence carries only ephemeral signaling.
-- This migration is additive to the live production schema (the earlier PR219
-- draft is not in main); keep an offline backup before applying.
begin;
create schema if not exists wow_voice;
revoke all on schema wow_voice from public,anon,authenticated;
create table if not exists wow_voice.calls (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.wow_workspaces(id),
 room_id uuid not null references wow_collab.rooms(id),
 caller_id uuid not null references public.wow_accounts(id),
 kind text not null check(kind in ('audio','video')),
 status text not null default 'ringing' check(status in ('ringing','active','completed','missed','declined')),
 created_at timestamptz not null default now(),
 ring_until timestamptz not null default (now()+interval '40 seconds'),
 expires_at timestamptz not null default (now()+interval '40 seconds'),
 started_at timestamptz,
 ended_at timestamptz
);
create table if not exists wow_voice.participants (
 call_id uuid not null references wow_voice.calls(id) on delete cascade,
 account_id uuid not null references public.wow_accounts(id),
 status text not null check(status in ('invited','joined','declined','left')),
 joined_at timestamptz,
 left_at timestamptz,
 primary key(call_id,account_id)
);
create index if not exists wow_voice_inbox on wow_voice.participants(account_id,status,call_id);
create index if not exists wow_voice_room_history on wow_voice.calls(room_id,created_at desc);
create index if not exists wow_voice_expiry on wow_voice.calls(status,expires_at);
alter table wow_voice.calls enable row level security;
alter table wow_voice.participants enable row level security;
revoke all on wow_voice.calls,wow_voice.participants from public,anon,authenticated;
-- The functions enforce per-account authorization, never expose base tables.

create or replace function public.wow_voice_service(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid; sid uuid; wid uuid; ctx jsonb; rid uuid; cid uuid; cal wow_voice.calls;
 requested text; member_role text; role text; n integer; items jsonb; participants jsonb;
begin
 if jsonb_typeof(p_data)<>'object' or p_action not in
 ('start','inbox','status','accept','decline','leave','end','heartbeat','connected','history') then
   raise exception using message='INVALID_VOICE_REQUEST',errcode='P0001';
 end if;
 uid:=(p_data->>'userId')::uuid;sid:=(p_data->>'sessionId')::uuid;
 if uid is null or sid is null then raise exception using message='AUTH_REQUIRED',errcode='P0001';end if;
 ctx:=public.wow_actor(uid,sid,null,false,false);wid:=(ctx->>'workspaceId')::uuid;
 role:=ctx#>>'{account,role}';
 if role<>'owner' and not ((ctx#>'{account,permissions}') ? 'chat.view'
  and (ctx#>'{account,permissions}') ? 'chat.edit') then
   raise exception using message='ACCESS_DENIED',errcode='P0001';end if;
 -- Server expiration is independent of open browsers and never deletes call history.
 update wow_voice.calls c set status=case when c.status='ringing' then 'missed'
  when c.started_at is not null then 'completed' else 'missed' end,ended_at=now()
 where c.workspace_id=wid and c.status in ('ringing','active') and c.expires_at<=now();

 if p_action='start' then
   rid:=(p_data->>'roomId')::uuid;requested:=p_data->>'kind';
   if rid is null or requested not in ('audio','video') then
     raise exception using message='INVALID_VOICE_REQUEST',errcode='P0001';end if;
   select r.kind,m.role into requested,member_role
   from wow_collab.rooms r join wow_collab.members m on m.room_id=r.id and m.account_id=uid and m.state='active'
   where r.id=rid and r.workspace_id=wid and r.active and r.kind in ('direct','group')
     and wow_collab.room_allowed(uid,role,r);
   if requested is null or (requested='group' and role='customer') then
     raise exception using message='ACCESS_DENIED',errcode='P0001';end if;
   -- Only all currently eligible chat members may be invited; limit mesh calls.
   select count(*) into n from wow_collab.members m join public.wow_accounts a on a.id=m.account_id
    where m.room_id=rid and m.state='active' and wow_collab.eligible(a)
      and (a.role='owner' or ('chat.view'=any(a.permissions) and 'chat.edit'=any(a.permissions)));
   if n<2 or n>4 or (requested='direct' and n<>2) or
     exists(select from wow_collab.members m join public.wow_accounts a on a.id=m.account_id
      where m.room_id=rid and m.state='active' and (not wow_collab.eligible(a) or
       (a.role<>'owner' and not ('chat.view'=any(a.permissions) and 'chat.edit'=any(a.permissions)))))
     then raise exception using message='VOICE_PARTICIPANTS_UNAVAILABLE',errcode='P0001';end if;
   perform pg_advisory_xact_lock(hashtext('wow-voice:'||wid::text));
   if exists(select from wow_voice.calls c join wow_voice.participants p on p.call_id=c.id
      where c.workspace_id=wid and c.status in ('ringing','active') and p.status in ('invited','joined') and p.account_id in
        (select m.account_id from wow_collab.members m where m.room_id=rid and m.state='active'))
     then raise exception using message='VOICE_BUSY',errcode='P0001';end if;
   insert into wow_voice.calls(workspace_id,room_id,caller_id,kind)
    values(wid,rid,uid,p_data->>'kind') returning * into cal;
   insert into wow_voice.participants(call_id,account_id,status,joined_at)
    select cal.id,m.account_id,case when m.account_id=uid then 'joined' else 'invited' end,
      case when m.account_id=uid then now() end
    from wow_collab.members m where m.room_id=rid and m.state='active';
   cid:=cal.id;
 elsif p_action='inbox' then
   select coalesce(jsonb_agg(v.item order by v.created_at desc),'[]') into items from (
     select c.created_at,jsonb_build_object('id',c.id,'roomId',c.room_id,'kind',c.kind,'status',c.status,
      'callerId',c.caller_id,'callerName',a.name,'participantStatus',p.status,'expiresAt',c.expires_at) item
     from wow_voice.calls c join wow_voice.participants p on p.call_id=c.id
     join public.wow_accounts a on a.id=c.caller_id
     join wow_collab.rooms r on r.id=c.room_id and r.active and r.workspace_id=wid
     join wow_collab.members m on m.room_id=r.id and m.account_id=uid and m.state='active'
     where c.workspace_id=wid and p.account_id=uid and p.status in ('invited','joined')
      and c.status in ('ringing','active') and wow_collab.room_allowed(uid,role,r)
     order by c.created_at desc limit 4
   ) v;
   return jsonb_build_object('calls',items);
 elsif p_action='history' then
   rid:=(p_data->>'roomId')::uuid;
   if not exists(select from wow_collab.rooms r join wow_collab.members m
    on m.room_id=r.id and m.account_id=uid and m.state='active'
    where r.id=rid and r.workspace_id=wid and r.active and wow_collab.room_allowed(uid,role,r))
    then raise exception using message='ACCESS_DENIED',errcode='P0001';end if;
   select coalesce(jsonb_agg(j.item order by j.created_at),'[]') into items from (
    select c.created_at,jsonb_build_object('id',c.id,'roomId',c.room_id,'kind',c.kind,
     'status',c.status,'callerId',c.caller_id,'startedAt',c.started_at,'endedAt',c.ended_at,
     'createdAt',c.created_at,'durationSeconds',case when c.started_at is not null
       then greatest(0,extract(epoch from coalesce(c.ended_at,now())-c.started_at)::int) else 0 end) item
    from wow_voice.calls c join wow_voice.participants p on p.call_id=c.id and p.account_id=uid
    where c.room_id=rid and c.workspace_id=wid and c.status not in ('ringing','active')
    order by c.created_at desc limit 30
   ) j;
   return jsonb_build_object('history',items);
 end if;

 -- Every call action re-checks both the signed-in member and the current room.
 cid:=coalesce(cid,(p_data->>'callId')::uuid);
 if cid is null then raise exception using message='INVALID_VOICE_REQUEST',errcode='P0001';end if;
 select * into cal from wow_voice.calls c
   where c.id=cid and c.workspace_id=wid and exists
     (select from wow_voice.participants p where p.call_id=c.id and p.account_id=uid)
   for update;
 if cal.id is null or not exists(
    select from wow_collab.rooms r join wow_collab.members m on m.room_id=r.id
    where r.id=cal.room_id and r.active and r.workspace_id=wid
      and m.account_id=uid and m.state='active' and wow_collab.room_allowed(uid,role,r))
  then raise exception using message='ACCESS_DENIED',errcode='P0001';end if;
 if p_action in ('accept','decline') then
   if not exists(select from wow_voice.participants p where p.call_id=cid and p.account_id=uid and p.status='invited')
      or cal.status not in ('ringing','active') or cal.ring_until<=now() then
     raise exception using message='VOICE_CALL_UNAVAILABLE',errcode='P0001';end if;
   update wow_voice.participants p set status=case when p_action='accept' then 'joined' else 'declined' end,
     joined_at=case when p_action='accept' then now() else p.joined_at end,
     left_at=case when p_action='decline' then now() else p.left_at end
     where p.call_id=cid and p.account_id=uid;
   if p_action='accept' then
     update wow_voice.calls c set status='active',expires_at=least(c.created_at+interval '2 hours',now()+interval '50 seconds')
       where c.id=cid;
   end if;
 elsif p_action in ('end','leave') then
   if p_action='end' and uid=cal.caller_id then
      update wow_voice.participants p set status='left',left_at=now()
       where p.call_id=cid and p.status in ('invited','joined');
   else
      update wow_voice.participants p set status='left',left_at=now() where p.call_id=cid and p.account_id=uid and p.status in ('invited','joined');
   end if;
 elsif p_action='connected' then
   if cal.status<>'active' or not exists(
     select from wow_voice.participants p where p.call_id=cid and p.account_id=uid and p.status='joined')
     then raise exception using message='VOICE_CALL_UNAVAILABLE',errcode='P0001';end if;
   update wow_voice.calls c set started_at=coalesce(c.started_at,now()) where c.id=cid;
 elsif p_action='heartbeat' then
   if cal.status<>'active' or not exists(select from wow_voice.participants p where p.call_id=cid and p.account_id=uid and p.status='joined')
     then raise exception using message='VOICE_CALL_UNAVAILABLE',errcode='P0001';end if;
   update wow_voice.calls c set expires_at=least(c.created_at+interval '2 hours',now()+interval '50 seconds') where c.id=cid;
 elsif p_action<>'start' and p_action<>'status' then
   raise exception using message='INVALID_VOICE_REQUEST',errcode='P0001';
 end if;
 -- Never keep a call active without at least two accepted participants, or after
 -- all invitations have been rejected. A participant can always hang up.
 if p_action in ('decline','end','leave') then
   if (select count(*) from wow_voice.participants p where p.call_id=cid and p.status='joined')<2
     and not exists(select from wow_voice.participants p where p.call_id=cid and p.status='invited') then
      update wow_voice.calls c set status=case when c.started_at is not null then 'completed'
       when p_action='decline' then 'declined' else 'missed' end,ended_at=now() where c.id=cid and c.status in ('ringing','active');
   elsif p_action='end' and uid=cal.caller_id then
      update wow_voice.calls c set status=case when c.started_at is not null then 'completed' else 'missed' end,ended_at=now()
       where c.id=cid and c.status in ('ringing','active');
   end if;
 end if;
 select * into cal from wow_voice.calls c where c.id=cid;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.account_id,'name',a.name,'status',p.status)
   order by p.joined_at nulls last,a.name),'[]') into participants
   from wow_voice.participants p join public.wow_accounts a on a.id=p.account_id where p.call_id=cid;
 return jsonb_build_object('id',cal.id,'roomId',cal.room_id,'callerId',cal.caller_id,'kind',cal.kind,
   'status',cal.status,'createdAt',cal.created_at,'startedAt',cal.started_at,'endedAt',cal.ended_at,
   'expiresAt',cal.expires_at,'participants',participants);
end $$;
revoke all on function public.wow_voice_service(text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_voice_service(text,jsonb) to service_role;

-- RLS authorization for private Broadcast and Presence.
-- These policies authorize the LIVE JWT user/session, never a client-supplied ID
-- or mutable user_metadata. They do not open any other Realtime topic.
create or replace function public.wow_call_realtime_allowed()
returns boolean language plpgsql stable security definer set search_path='' as $$
declare
 user_id uuid:=(select auth.uid()); token jsonb:=(select auth.jwt());
 session_id uuid; current_topic text:=realtime.topic(); room_id uuid; call_id uuid;
begin
 if user_id is null or token->>'session_id' is null or
   (current_topic !~ '^wow-call-room:[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    and current_topic !~ '^wow-call:[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$')
   then return false;end if;
 session_id:=(token->>'session_id')::uuid;
 if not exists(select from public.wow_accounts a
  join public.wow_workspaces w on w.id=a.workspace_id and w.status='active'
  join public.wow_sessions s on s.account_id=a.id and s.session_id=session_id and s.closed_at is null and s.session_version=a.session_version
  join auth.sessions z on z.id=session_id and z.user_id=a.id and (z.not_after is null or z.not_after>now())
  where a.id=user_id and a.status='active' and a.deleted_at is null
   and (a.expires_at is null or a.expires_at>now())
   and (a.role='owner' or ('chat.view'=any(a.permissions) and 'chat.edit'=any(a.permissions))))
   then return false;end if;
 if left(current_topic,14)='wow-call-room:' then
   room_id:=substring(current_topic from 15)::uuid;
   return exists(select from wow_collab.rooms r
     join wow_collab.members m on m.room_id=r.id and m.account_id=user_id and m.state='active'
     join public.wow_accounts a on a.id=user_id and a.workspace_id=r.workspace_id
     where r.id=room_id and r.active and wow_collab.room_allowed(user_id,a.role,r));
 end if;
 call_id:=substring(current_topic from 10)::uuid;
 return exists(select from wow_voice.calls c
   join wow_voice.participants p on p.call_id=c.id and p.account_id=user_id and p.status='joined'
   join wow_collab.rooms r on r.id=c.room_id and r.active
   join wow_collab.members m on m.room_id=r.id and m.account_id=user_id and m.state='active'
   join public.wow_accounts a on a.id=user_id and a.workspace_id=c.workspace_id
   where c.id=call_id and c.status='active' and c.expires_at>now()
    and wow_collab.room_allowed(user_id,a.role,r));
exception when invalid_text_representation then return false;
end $$;
revoke all on function public.wow_call_realtime_allowed() from public,anon;
grant execute on function public.wow_call_realtime_allowed() to authenticated;
create policy "wow call Realtime receive" on realtime.messages for select to authenticated
 using (extension in ('broadcast','presence') and (select public.wow_call_realtime_allowed()));
create policy "wow call Realtime send" on realtime.messages for insert to authenticated
 with check (extension in ('broadcast','presence') and (select public.wow_call_realtime_allowed()));
commit;
