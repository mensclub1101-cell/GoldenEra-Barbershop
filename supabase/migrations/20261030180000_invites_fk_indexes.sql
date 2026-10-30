-- Speed up lookups on who created and who used an invite (advisor: unindexed foreign keys).
create index if not exists invites_created_by_idx on public.invites (created_by);
create index if not exists invites_used_by_idx on public.invites (used_by);
