-- Real client reviews the owner adds from the owner app (copied from Google,
-- Yelp, in person). Visible ones show on the website; the owner can hide or
-- delete them. Anyone can read visible reviews; only the owner writes.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  author text not null check (length(trim(author)) between 1 and 60),
  body text not null check (length(trim(body)) between 1 and 600),
  rating smallint not null check (rating between 1 and 5),
  source text check (source is null or length(source) <= 20),
  visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index reviews_shop_id_idx on public.reviews (shop_id);
alter table public.reviews enable row level security;
create policy reviews_read on public.reviews for select to anon, authenticated
  using (visible or (select private.is_owner()));
create policy reviews_owner_insert on public.reviews for insert to authenticated
  with check ((select private.is_owner()));
create policy reviews_owner_update on public.reviews for update to authenticated
  using ((select private.is_owner())) with check ((select private.is_owner()));
create policy reviews_owner_delete on public.reviews for delete to authenticated
  using ((select private.is_owner()));
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
