begin;
create table if not exists public.wow_platform_relay_settings (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
alter table public.wow_platform_relay_settings enable row level security;
revoke all on public.wow_platform_relay_settings from public,anon,authenticated;
insert into public.wow_platform_relay_settings(singleton) values(true) on conflict do nothing;

create or replace function public.wow_relay_enabled() returns boolean
 language sql stable security definer set search_path='' as $$
 select coalesce((select enabled from public.wow_platform_relay_settings where singleton),false)
$$;
create or replace function public.wow_platform_relay(p_user uuid,p_session uuid,p_enabled boolean,p_accept_pricing boolean)
 returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform public.wow_platform_require(p_user,p_session);
 if p_enabled is not null then
   if p_enabled and p_accept_pricing is distinct from true then raise exception 'INVALID_REQUEST'; end if;
   update public.wow_platform_relay_settings set enabled=p_enabled,updated_at=now(),updated_by=p_user where singleton;
 end if;
 return public.wow_relay_enabled();
end $$;
revoke all on function public.wow_relay_enabled(),public.wow_platform_relay(uuid,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.wow_relay_enabled(),public.wow_platform_relay(uuid,uuid,boolean,boolean) to service_role;
commit;
