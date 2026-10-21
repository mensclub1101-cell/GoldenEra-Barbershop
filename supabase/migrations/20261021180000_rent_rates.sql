-- Each barber's booth rent amount, set by the owner. Its own table (not a
-- barbers column) because barbers can update their own row and active rows
-- are public; this stays owner-write, barber-read-own.
create table public.rent_rates (
  barber_id uuid primary key references public.barbers(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 10000000),
  updated_at timestamptz not null default now()
);
alter table public.rent_rates enable row level security;
create policy rent_rates_owner_all on public.rent_rates for all to authenticated
  using ((select private.is_owner())) with check ((select private.is_owner()));
create policy rent_rates_read_own on public.rent_rates for select to authenticated
  using (barber_id = (select private.my_barber_id()));
