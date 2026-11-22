-- Mark Robot private one-to-one voice signaling. No recorded audio or legacy history changes.
begin;
create schema if not exists wow_voice;
revoke all on schema wow_voice from public, anon, authenticated;
create table if not exists wow_voice.calls (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.wow_workspaces(id),
 room_id uuid not null references wow_collab.rooms(id),
 caller_id uuid not null references public.wow_accounts(id),
 callee_id uuid not null references public.wow_accounts(id),
 status text not null default 'ringing' check(status in ('ringing','active','declined','ended','missed')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '35 seconds'),
 accepted_at timestamptz, ended_at timestamptz,
 check(caller_id<>callee_id)
);
create index if not exists wow_voice_call_inbox on wow_voice.calls(workspace_id,callee_id,status,created_at desc);
create index if not exists wow_voice_call_outbox on wow_voice.calls(workspace_id,caller_id,status,created_at desc);
create table if not exists wow_voice.signals (
 id bigint generated always as identity primary key,
 call_id uuid not null references wow_voice.calls(id) on delete cascade,
 sender_id uuid not null references public.wow_accounts(id),
 kind text not null check(kind in ('offer','answer','ice')),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=32768),
 created_at timestamptz not null default now()
);
create index if not exists wow_voice_signal_cursor on wow_voice.signals(call_id,id);
alter table wow_voice.calls enable row level security;
alter table wow_voice.signals enable row level security;
revoke all on wow_voice.calls,wow_voice.signals from public,anon,authenticated;
revoke all on sequence wow_voice.signals_id_seq from public,anon,authenticated;

create or replace function public.wow_voice_service(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid; sid uuid; wid uuid; ctx jsonb;
 rid uuid; peer_id uuid; call_id uuid; live_call wow_voice.calls; conversation wow_collab.rooms;
 caller public.wow_accounts; callee public.wow_accounts;
 signal_kind text; signal_payload jsonb; cursor bigint; items jsonb; state text;
begin
 if jsonb_typeof(p_data)<>'object' or p_action not in ('inbox','start','accept','decline','end','signal','events') then
  raise exception using message='INVALID_VOICE_REQUEST',errcode='P0001';
 end if;
 uid:=(p_data->>'userId')::uuid;sid:=(p_data->>'sessionId')::uuid;
 if uid is null or sid is null then raise exception using message='AUTH_REQUIRED',errcode='P0001';end if;
 ctx:=public.wow_actor(uid,sid,null,false,false);
 wid:=(ctx->>'workspaceId')::uuid;
 if ctx#>>'{account,role}'<>'owner' and
   not ((ctx#>'{account,permissions}') ? 'chat.view' and (ctx#>'{account,permissions}') ? 'chat.edit') then
  raise exception using message='ACCESS_DENIED',errcode='P0001';
 end if;
 -- Ringing and active sessions have short, server-enforced lifetimes.
 update wow_voice.calls c set status='missed',ended_at=now()
  where c.workspace_id=wid and c.status='ringing' and c.expires_at<=now();
 update wow_voice.calls c set status='ended',ended_at=now()
  where c.workspace_id=wid and c.status='active' and c.expires_at<=now();
 delete from wow_voice.signals s using wow_voice.calls c
  where s.call_id=c.id and c.workspace_id=wid and
    (c.status not in ('ringing','active') or s.created_at<now()-interval '2 hours');

 if p_action='start' then
  rid:=(p_data->>'roomId')::uuid;peer_id:=(p_data->>'targetId')::uuid;
  if rid is null or peer_id is null or peer_id=uid then raise exception using message='INVALID_VOICE_REQUEST',errcode='P0001';end if;
  select * into conversation from wow_collab.rooms r where r.id=rid and r.workspace_id=wid and r.active and r.kind='direct';
  select * into caller from public.wow_accounts a where a.id=uid and a.workspace_id=wid and wow_collab.eligible(a);
  select * into callee from public.wow_accounts a where a.id=peer_id and a.workspace_id=wid and wow_collab.eligible(a)
   and (a.role='owner' or 'chat.edit'=any(a.permissions));
  if conversation.id is null or caller.id is null or callee.id is null or not wow_collab.can_message(caller.role,callee.role)
   or (select count(*) from wow_collab.members m where m.room_id=rid and m.state='active')<>2
   or not exists(select from wow_collab.members m where m.room_id=rid and m.account_id=uid and m.state='active')
   or not exists(select from wow_collab.members m where m.room_id=rid and m.account_id=peer_id and m.state='active')
   then raise exception using message='ACCESS_DENIED',errcode='P0001';end if;
  -- Serialize calls within one workspace so simultaneous start cannot double-ring.
  perform pg_advisory_xact_lock(hashtext('wow-voice:'||wid::text));
  update wow_voice.calls c set status=case when c.status='ringing' then 'missed' else 'ended' end,ended_at=now()
   where c.workspace_id=wid and c.status in ('ringing','active') and c.expires_at<=now();
  if exists(select from wow_voice.calls c where c.workspace_id=wid and c.status in ('ringing','active')
   and (c.caller_id=any(array[uid,peer_id]) or c.callee_id=any(array[uid,peer_id]))) then
   raise exception using message='VOICE_BUSY',errcode='P0001';
  end if;
  insert into wow_voice.calls(workspace_id,room_id,caller_id,callee_id)
    values(wid,rid,uid,peer_id) returning * into live_call;
  return jsonb_build_object('id',live_call.id,'roomId',live_call.room_id,'peerId',live_call.callee_id,
   'status',live_call.status,'direction','outgoing','expiresAt',live_call.expires_at);
 end if;

 if p_action='inbox' then
  select coalesce(jsonb_agg(q.value order by q.created_at desc),'[]') into items from (
   select c.created_at, jsonb_build_object('id',c.id,'roomId',c.room_id,
    'peerId',case when c.caller_id=uid then c.callee_id else c.caller_id end,
    'peerName',peer.name,'direction',case when c.caller_id=uid then 'outgoing' else 'incoming' end,
    'status',c.status,'expiresAt',c.expires_at) value
   from wow_voice.calls c
   join wow_collab.rooms r on r.id=c.room_id and r.active and r.kind='direct' and r.workspace_id=wid
   join wow_collab.members mine on mine.room_id=r.id and mine.account_id=uid and mine.state='active'
   join wow_collab.members other on other.room_id=r.id and other.account_id<>uid and other.state='active'
   join public.wow_accounts peer on peer.id=other.account_id and peer.workspace_id=wid and wow_collab.eligible(peer)
   where c.workspace_id=wid and uid in (c.caller_id,c.callee_id) and c.status in ('ringing','active')
    and wow_collab.room_allowed(uid,ctx#>>'{account,role}',r)
   order by c.created_at desc limit 3
  ) q;
  return jsonb_build_object('calls',items);
 end if;

 call_id:=(p_data->>'callId')::uuid;
 if call_id is null then raise exception using message='INVALID_VOICE_REQUEST',errcode='P0001';end if;
 select * into live_call from wow_voice.calls c where c.id=call_id and c.workspace_id=wid and uid in(c.caller_id,c.callee_id) for update;
 if live_call.id is null then raise exception using message='ACCESS_DENIED',errcode='P0001';end if;
 select * into conversation from wow_collab.rooms r where r.id=live_call.room_id and r.workspace_id=wid and r.active and r.kind='direct';
 select * into caller from public.wow_accounts a where a.id=live_call.caller_id and a.workspace_id=wid and wow_collab.eligible(a);
 select * into callee from public.wow_accounts a where a.id=live_call.callee_id and a.workspace_id=wid and wow_collab.eligible(a);
 if conversation.id is null or caller.id is null or callee.id is null or not wow_collab.can_message(caller.role,callee.role)
  or not exists(select from wow_collab.members m where m.room_id=conversation.id and m.account_id=caller.id and m.state='active')
  or not exists(select from wow_collab.members m where m.room_id=conversation.id and m.account_id=callee.id and m.state='active')
  or not wow_collab.room_allowed(uid,ctx#>>'{account,role}',conversation)
  then raise exception using message='ACCESS_DENIED',errcode='P0001';end if;
 if p_action='accept' then
  if uid<>live_call.callee_id or live_call.status<>'ringing' then raise exception using message='VOICE_CALL_UNAVAILABLE',errcode='P0001';end if;
  update wow_voice.calls set status='active',accepted_at=now(),expires_at=least(created_at+interval '2 hours',now()+interval '90 seconds')
   where id=call_id returning * into live_call;
 elsif p_action='decline' then
  if uid<>live_call.callee_id or live_call.status<>'ringing' then raise exception using message='VOICE_CALL_UNAVAILABLE',errcode='P0001';end if;
  update wow_voice.calls set status='declined',ended_at=now() where id=call_id returning * into live_call;
 elsif p_action='end' then
  if live_call.status in ('ringing','active') then
   update wow_voice.calls set status='ended',ended_at=now() where id=call_id returning * into live_call;
  end if;
 elsif p_action='signal' then
  signal_kind:=p_data->>'kind';signal_payload:=p_data->'payload';
  if live_call.status<>'active' or signal_kind not in ('offer','answer','ice') or
   jsonb_typeof(signal_payload)<>'object' or octet_length(signal_payload::text)>32768 or
   (signal_kind='offer' and uid<>live_call.caller_id) or
   (signal_kind='answer' and uid<>live_call.callee_id) then
   raise exception using message='INVALID_VOICE_SIGNAL',errcode='P0001';
  end if;
  if signal_kind in ('offer','answer') then
   if signal_payload->>'type'<>signal_kind or length(coalesce(signal_payload->>'sdp','')) not between 1 and 24000 then
    raise exception using message='INVALID_VOICE_SIGNAL',errcode='P0001';end if;
   if exists(select from wow_voice.signals s where s.call_id=call_id and s.sender_id=uid and s.kind=signal_kind) then
    raise exception using message='VOICE_SIGNAL_DUPLICATE',errcode='P0001';end if;
  else
   if length(coalesce(signal_payload->>'candidate','')) not between 1 and 2048
    or jsonb_typeof(signal_payload->'sdpMLineIndex') not in ('number','null') and signal_payload ? 'sdpMLineIndex'
    then raise exception using message='INVALID_VOICE_SIGNAL',errcode='P0001';end if;
  end if;
  if (select count(*) from wow_voice.signals where call_id=live_call.id)>=256 then
    raise exception using message='RATE_LIMITED',errcode='P0001';end if;
  insert into wow_voice.signals(call_id,sender_id,kind,payload) values(call_id,uid,signal_kind,signal_payload);
 elsif p_action='events' then
  cursor:=coalesce((p_data->>'after')::bigint,0);
  if cursor<0 then raise exception using message='INVALID_VOICE_REQUEST',errcode='P0001';end if;
  if live_call.status='active' then
   update wow_voice.calls set expires_at=least(created_at+interval '2 hours',now()+interval '90 seconds') where id=call_id returning * into live_call;
  end if;
  select coalesce(jsonb_agg(x.data order by x.id),'[]') into items from (
   select s.id,jsonb_build_object('id',s.id::text,'kind',s.kind,'payload',s.payload) data
   from wow_voice.signals s where s.call_id=call_id and s.sender_id<>uid and s.id>cursor order by s.id limit 80
  ) x;
  return jsonb_build_object('id',call_id,'status',live_call.status,'signals',items,'expiresAt',live_call.expires_at);
 else
  raise exception using message='INVALID_VOICE_REQUEST',errcode='P0001';
 end if;
 if live_call.status not in ('ringing','active') then delete from wow_voice.signals where call_id=call_id;end if;
 return jsonb_build_object('id',call_id,'status',live_call.status,'expiresAt',live_call.expires_at);
end $$;
revoke all on function public.wow_voice_service(text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_voice_service(text,jsonb) to service_role;
commit;
