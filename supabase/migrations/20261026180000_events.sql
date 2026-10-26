-- Shop events (pop-ups, cut-a-thons, back-to-school days) the owner posts from
-- the owner app. Barbers see upcoming events for their shop and events for
-- both shops (shop_id null). Date and time are shop-local, so no time zones.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops (id) on delete cascade, -- null = both shops
  title text not null check (length(trim(title)) between 1 and 80),
  event_date date not null,
  start_time time,
  end_time time,
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now()
);
create index events_date_idx on public.events (event_date);
create index events_shop_id_idx on public.events (shop_id);
alter table public.events enable row level security;
create policy events_owner_read on public.events for select to authenticated
  using ((select private.is_owner()));
create policy events_barber_read on public.events for select to authenticated
  using ((select private.my_barber_id()) is not null and (shop_id is null or private.is_shop_staff(shop_id)));
create policy events_owner_insert on public.events for insert to authenticated
  with check ((select private.is_owner()));
create policy events_owner_update on public.events for update to authenticated
  using ((select private.is_owner())) with check ((select private.is_owner()));
create policy events_owner_delete on public.events for delete to authenticated
  using ((select private.is_owner()));
grant select, insert, update, delete on public.events to authenticated;
