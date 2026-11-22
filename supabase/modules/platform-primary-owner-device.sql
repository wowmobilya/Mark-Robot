-- Correct exemption: precisely one primary owner device per workspace.
-- Additional owner accounts cannot bypass the paid linked-phone quota.
begin;
create or replace function wow_limits.devices_used(wid uuid)
returns bigint language sql stable set search_path='' as $$
 select greatest(count(*) - case when coalesce(bool_or(a.role='owner'),false) then 1 else 0 end,0)
 from public.wow_account_installations i join public.wow_accounts a on a.id=i.account_id
 where a.workspace_id=wid and a.deleted_at is null;
$$;
revoke all on function wow_limits.devices_used(uuid) from public,anon,authenticated;
commit;
