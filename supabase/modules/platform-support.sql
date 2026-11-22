-- Private conversation between one signed-in company member and the verified
-- platform founder. Recipient and workspace are always determined on the server.
begin;
create schema if not exists wow_support;
revoke all on schema wow_support from public,anon,authenticated;
create table if not exists wow_support.cases (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.wow_workspaces(id),
 author uuid not null references public.wow_accounts(id),request_id uuid not null,
 photo bytea check(octet_length(photo) between 4 and 196608), created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),latest_tenant integer not null default 1,latest_founder integer not null default 0,
 unique(author,request_id)
);
create index if not exists support_author_cases on wow_support.cases(workspace_id,author,created_at desc,id desc);
create index if not exists support_all_cases on wow_support.cases(created_at desc,id desc);
create table if not exists wow_support.messages (
 id uuid primary key default gen_random_uuid(),case_id uuid not null references wow_support.cases(id),
 sender uuid not null references auth.users(id),request_id uuid not null,seq integer not null,
 from_founder boolean not null,text text not null check(length(text) between 1 and 3000),
 created_at timestamptz not null default clock_timestamp(),unique(case_id,seq),unique(case_id,sender,from_founder,request_id)
);
create table if not exists wow_support.receipts (
 case_id uuid not null references wow_support.cases(id),reader uuid not null references auth.users(id),
 founder_view boolean not null,seen integer not null,primary key(case_id,reader,founder_view)
);
alter table wow_support.cases enable row level security;
alter table wow_support.messages enable row level security;
alter table wow_support.receipts enable row level security;
revoke all on all tables in schema wow_support from public,anon,authenticated;

create or replace function wow_limits.storage_used(wid uuid) returns bigint language sql stable set search_path='' as $$
 select coalesce((select sum(size) from public.wow_media_uploads where workspace_id=wid),0)
      + coalesce((select sum(bytes) from wow_collab.files where workspace_id=wid and state<>'removed'),0)
      + coalesce((select sum(bytes) from wow_collab.chat_assets where workspace_id=wid and state<>'removed'),0)
      + coalesce((select sum(size_bytes) from public.wow_gallery_assets where workspace_id=wid and lifecycle<>'removed'),0)
      + coalesce((select sum(octet_length(pdf)) from wow_mail.statements where workspace_id=wid and pdf is not null),0)
      + coalesce((select sum(octet_length(photo)) from wow_support.cases where workspace_id=wid and photo is not null),0);
$$;
drop trigger if exists wow_support_photo_quota on wow_support.cases;
create trigger wow_support_photo_quota after insert on wow_support.cases for each row when(new.photo is not null) execute function wow_limits.admit();

create or replace function wow_support.summary(c wow_support.cases,uid uuid,founder boolean) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',c.id,'companyName',w.name,'authorName',a.name,'text',left(m.text,250),
   'createdAt',c.created_at,'updatedAt',c.updated_at,'hasPhoto',c.photo is not null,
   'unread',(case when founder then c.latest_tenant else c.latest_founder end)>coalesce(r.seen,0))
 from public.wow_workspaces w join public.wow_accounts a on a.id=c.author join wow_support.messages m on m.case_id=c.id and m.seq=1
 left join wow_support.receipts r on r.case_id=c.id and r.reader=uid and r.founder_view=founder where w.id=c.workspace_id;
$$;
create or replace function public.wow_support_service(p_user uuid,p_session uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare founder boolean;wid uuid;cid uuid;req uuid;cursor_id uuid;cursor_time timestamptz;cursor_seq integer;
 c wow_support.cases; prior wow_support.messages; body text; img bytea;items jsonb;remaining uuid;unread integer;new_seq integer;
begin
 if p_action is null or p_action not in ('support.list','support.create','support.open','support.reply','platform.support.list','platform.support.open','platform.support.reply') then raise exception 'INVALID_ACTION';end if;
 founder=starts_with(p_action,'platform.');
 if founder then perform public.wow_platform_require(p_user,p_session);
 else wid=(public.wow_actor(p_user,p_session,null,false,p_action='support.create')->>'workspaceId')::uuid;end if;


 if p_action in ('support.list','platform.support.list') then
   cursor_id=(p_data->>'cursor')::uuid;
   if cursor_id is not null then
     select created_at into cursor_time from wow_support.cases where id=cursor_id and (founder or (workspace_id=wid and author=p_user));
     if not found then raise exception 'INVALID_CURSOR';end if;
   end if;
   select coalesce(jsonb_agg(wow_support.summary(t,p_user,founder) order by t.created_at desc,t.id desc),'[]') into items
   from (select s.* from wow_support.cases s where (founder or (s.workspace_id=wid and s.author=p_user))
     and (cursor_id is null or (s.created_at,s.id)<(cursor_time,cursor_id)) order by s.created_at desc,s.id desc limit 31) t;
   if jsonb_array_length(items)>30 then remaining=(items->29->>'id')::uuid;items=items-30;end if;
   select count(*) into unread from wow_support.cases s left join wow_support.receipts r
     on r.case_id=s.id and r.reader=p_user and r.founder_view=founder
   where (founder or (s.workspace_id=wid and s.author=p_user)) and (case when founder then s.latest_tenant else s.latest_founder end)>coalesce(r.seen,0);
   return jsonb_build_object('cases',items,'nextCursor',remaining,'unreadCases',unread);
 end if;
 if p_action in ('support.create','support.reply','platform.support.reply') then
   req=(p_data->>'requestId')::uuid;body=btrim(p_data->>'text');
   if req is null or jsonb_typeof(p_data->'text') is distinct from 'string' or length(body) not between 1 and 3000 then raise exception 'INVALID_MESSAGE';end if;
 end if;
 if p_action='support.create' then
   if p_data->'photo' is not null and p_data->'photo'<>'null'::jsonb then
     if p_data#>>'{photo,mime}' is distinct from 'image/jpeg' or coalesce(length(p_data#>>'{photo,base64}'),0) not between 4 and 262144 then raise exception 'INVALID_PHOTO';end if;
     begin img=decode(p_data#>>'{photo,base64}','base64');exception when others then raise exception 'INVALID_PHOTO';end;
     if octet_length(img) not between 4 and 196608 or substring(img from 1 for 3)<>decode('ffd8ff','hex')
       or substring(img from octet_length(img)-1)<>decode('ffd9','hex') then raise exception 'INVALID_PHOTO';end if;
   end if;
   select * into c from wow_support.cases where author=p_user and request_id=req;
   if found then
     if c.workspace_id<>wid or c.photo is distinct from img or (select text from wow_support.messages where case_id=c.id and seq=1) is distinct from body then raise exception 'IDEMPOTENCY_MISMATCH';end if;
     return jsonb_build_object('caseId',c.id);
   end if;
   if (select count(*) from wow_support.cases where author=p_user and created_at>now()-interval '1 hour')>=20 then raise exception 'RATE_LIMITED';end if;
   insert into wow_support.cases(workspace_id,author,request_id,photo) values(wid,p_user,req,img) returning * into c;
   insert into wow_support.messages(case_id,sender,request_id,seq,from_founder,text) values(c.id,p_user,req,1,false,body);
   return jsonb_build_object('caseId',c.id);
 end if;
 cid=(p_data->>'caseId')::uuid;
 select * into c from wow_support.cases where id=cid and (founder or (workspace_id=wid and author=p_user)) for update;
 if not found then raise exception 'ACCESS_DENIED';end if;
 if p_action in ('support.open','platform.support.open') then
   cursor_id=(p_data->>'cursor')::uuid;
   if cursor_id is not null then
     select seq into cursor_seq from wow_support.messages where case_id=cid and id=cursor_id;
     if not found then raise exception 'INVALID_CURSOR';end if;
   end if;
   select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'text',m.text,'fromFounder',m.from_founder,'createdAt',m.created_at) order by m.seq),'[]') into items
    from (select * from wow_support.messages where case_id=cid and (cursor_seq is null or seq<cursor_seq) order by seq desc limit 101) m;
   if jsonb_array_length(items)>100 then items=items-0;remaining=(items->0->>'id')::uuid;end if;
   if cursor_id is null then
     insert into wow_support.receipts values(cid,p_user,founder,greatest(c.latest_tenant,c.latest_founder))
       on conflict(case_id,reader,founder_view) do update set seen=greatest(wow_support.receipts.seen,excluded.seen);
   end if;
   return jsonb_build_object('case',wow_support.summary(c,p_user,founder)||jsonb_build_object('photo',case when c.photo is not null then
     jsonb_build_object('mime','image/jpeg','base64',replace(encode(c.photo,'base64'),chr(10),'')) end),'messages',items,'nextCursor',remaining);
 end if;
 select * into prior from wow_support.messages where case_id=cid and sender=p_user and from_founder=founder and request_id=req;
 if found then
   if prior.text<>body then raise exception 'IDEMPOTENCY_MISMATCH';end if;
   return jsonb_build_object('caseId',cid);
 end if;
 if (select count(*) from wow_support.messages where case_id=cid and sender=p_user and created_at>now()-interval '1 minute')>=15 then raise exception 'RATE_LIMITED';end if;
 new_seq=greatest(c.latest_tenant,c.latest_founder)+1;
 insert into wow_support.messages(case_id,sender,request_id,seq,from_founder,text) values(cid,p_user,req,new_seq,founder,body);
 update wow_support.cases set updated_at=clock_timestamp(),latest_tenant=case when not founder then new_seq else latest_tenant end,
    latest_founder=case when founder then new_seq else latest_founder end where id=cid;
 return jsonb_build_object('caseId',cid);
exception when invalid_text_representation then raise exception 'INVALID_REQUEST';
end $$;
revoke all on all functions in schema wow_support from public,anon,authenticated;
revoke all on function public.wow_support_service(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_support_service(uuid,uuid,text,jsonb) to service_role;
commit;
