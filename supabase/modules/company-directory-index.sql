-- Support the founder directory's stable newest-first pagination.
create index if not exists wow_workspaces_directory_idx
  on public.wow_workspaces (created_at desc, id);

-- Compare Unicode compatibility forms, case and whitespace without changing display names.
-- Map Turkish capital dotted I before lowercasing so İNEGÖL and inegöl match.
create unique index if not exists wow_workspaces_company_name_key
  on public.wow_workspaces ((lower(btrim(regexp_replace(translate(normalize(name, NFKC), 'İ', 'I'), '[[:space:]]+', ' ', 'g')))));
