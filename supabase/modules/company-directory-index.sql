-- Support the founder directory's stable newest-first pagination.
create index if not exists wow_workspaces_directory_idx
  on public.wow_workspaces (created_at desc, id);
