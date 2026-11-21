-- Edge-only fallback for the separate offline owner signing key.
-- Existing provider Vault grants allow service_role reads; no Vault grants or
-- API schema exposure are added. Provision the named key through management.
begin;

create or replace function public.wow_offline_owner_signing_key()
returns jsonb
language sql stable security invoker set search_path='' as $$
  select v.decrypted_secret::jsonb
  from vault.decrypted_secrets v
  where v.name='wow_offline_owner_signing_jwk'
$$;

revoke all on function public.wow_offline_owner_signing_key() from public,anon,authenticated;
grant execute on function public.wow_offline_owner_signing_key() to service_role;
comment on function public.wow_offline_owner_signing_key() is
  'Private Edge credential lookup. Fixed Vault name, no app/module action. Never log or return its value to a browser.';

commit;
