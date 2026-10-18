-- Barber app: walk-ins, clients, supplies, Wednesday cleaning list, shop chat.
--
-- Staff of a shop = the owner, or a barber whose seat is in that shop. Clients
-- and anonymous visitors never read these tables; walk-ins come in through
-- check_in(), which rate-limits by phone and by shop.

create type public.walkin_status as enum ('waiting', 'done', 'no_show');
create type public.supply_status as enum ('full', 'low', 'out');

-- ---------------------------------------------------------------- helpers

create function private.is_shop_staff(p_shop uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_owner() or exists (
    select 1 from public.barbers where profile_id = (select auth.uid()) and shop_id = p_shop
  );
$$;
revoke execute on function private.is_shop_staff(uuid) from public, anon;
grant execute on function private.is_shop_staff(uuid) to authenticated;

-- ---------------------------------------------------------------- tables

create table public.walkins (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  phone text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  barber_id uuid references public.barbers (id) on delete set null, -- requested barber; null = first available
  status public.walkin_status not null default 'waiting',
  handled_by uuid references public.barbers (id) on delete set null,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index walkins_shop_status_idx on public.walkins (shop_id, status, created_at);
create index walkins_phone_idx on public.walkins (phone, created_at desc);
create index walkins_barber_id_idx on public.walkins (barber_id);
create index walkins_handled_by_idx on public.walkins (handled_by);

-- A barber's own client book. Owners see every barber's.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  phone text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  notes text check (notes is null or length(notes) <= 500),
  visits int not null default 1 check (visits >= 0),
  last_visit_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (barber_id, phone)
);

create table public.supplies (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  status public.supply_status not null default 'full',
  sort int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
create index supplies_shop_idx on public.supplies (shop_id, sort);
create index supplies_updated_by_idx on public.supplies (updated_by);

-- Done for the week when last_done_on is on or after this week's Wednesday.
create table public.cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  task text not null check (length(trim(task)) between 1 and 80),
  sort int not null default 0,
  last_done_on date,
  done_by uuid references public.profiles (id) on delete set null
);
create index cleaning_tasks_shop_idx on public.cleaning_tasks (shop_id, sort);
create index cleaning_tasks_done_by_idx on public.cleaning_tasks (done_by);

create table public.shop_messages (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  author_name text not null,
  body text not null check (length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index shop_messages_shop_idx on public.shop_messages (shop_id, created_at desc);
create index shop_messages_author_idx on public.shop_messages (author_id);

alter table public.walkins enable row level security;
alter table public.clients enable row level security;
alter table public.supplies enable row level security;
alter table public.cleaning_tasks enable row level security;
alter table public.shop_messages enable row level security;

-- ---------------------------------------------------------------- check-in

-- Public walk-in check-in. Returns the place in line.
create function public.check_in(p_shop text, p_name text, p_phone text, p_barber uuid default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_shop uuid;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_name text := trim(coalesce(p_name, ''));
  v_place int;
begin
  select id into v_shop from public.shops where slug = p_shop;
  if v_shop is null then raise exception 'Pick a shop'; end if;
  if length(v_name) = 0 or length(v_name) > 60 then raise exception 'Enter your name'; end if;
  if v_phone !~ '^\+?[0-9]{10,15}$' then raise exception 'Enter a valid phone number'; end if;
  if p_barber is not null and not exists (
    select 1 from public.barbers where id = p_barber and shop_id = v_shop and active
  ) then
    raise exception 'That barber isn''t at this shop';
  end if;
  if exists (select 1 from public.walkins where phone = v_phone and created_at > now() - interval '10 minutes') then
    raise exception 'You''re already checked in. Hang tight.';
  end if;
  if (select count(*) from public.walkins where shop_id = v_shop and created_at > now() - interval '5 minutes') >= 8 then
    raise exception 'Lots of check-ins right now. Try again in a few minutes.';
  end if;

  insert into public.walkins (shop_id, name, phone, barber_id) values (v_shop, v_name, v_phone, p_barber);
  select count(*) into v_place from public.walkins where shop_id = v_shop and status = 'waiting';
  return v_place;
end;
$$;
revoke execute on function public.check_in(text, text, text, uuid) from public;
grant execute on function public.check_in(text, text, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------- policies

create policy walkins_staff_read on public.walkins for select to authenticated
  using ((select private.is_shop_staff(shop_id)));
create policy walkins_staff_update on public.walkins for update to authenticated
  using ((select private.is_shop_staff(shop_id))) with check ((select private.is_shop_staff(shop_id)));

create policy clients_own_or_owner on public.clients for all to authenticated
  using (barber_id = (select private.my_barber_id()) or (select private.is_owner()))
  with check (barber_id = (select private.my_barber_id()) or (select private.is_owner()));

create policy supplies_staff on public.supplies for all to authenticated
  using ((select private.is_shop_staff(shop_id))) with check ((select private.is_shop_staff(shop_id)));

create policy cleaning_staff on public.cleaning_tasks for all to authenticated
  using ((select private.is_shop_staff(shop_id))) with check ((select private.is_shop_staff(shop_id)));

create policy messages_staff_read on public.shop_messages for select to authenticated
  using ((select private.is_shop_staff(shop_id)));
create policy messages_staff_insert on public.shop_messages for insert to authenticated
  with check ((select private.is_shop_staff(shop_id)) and author_id = (select auth.uid()));
create policy messages_own_delete on public.shop_messages for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.is_owner()));

-- ---------------------------------------------------------------- grants

revoke all on public.walkins, public.clients, public.supplies, public.cleaning_tasks, public.shop_messages
  from anon, authenticated;
grant select on public.walkins to authenticated;
grant update (status, handled_by, handled_at) on public.walkins to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.supplies to authenticated;
grant select, insert, update, delete on public.cleaning_tasks to authenticated;
grant select, insert, delete on public.shop_messages to authenticated;

-- Live updates for the walk-in queue and chat (RLS still applies).
alter publication supabase_realtime add table public.walkins, public.shop_messages;

-- ---------------------------------------------------------------- seed

insert into public.supplies (shop_id, name, sort)
select s.id, v.name, v.sort
from public.shops s
cross join (values
  ('Towels', 1), ('Neck strips', 2), ('Capes', 3), ('Blades', 4), ('Clipper oil', 5),
  ('Disinfectant', 6), ('Shave cream', 7), ('Hair products', 8), ('Paper towels', 9), ('Hand soap', 10)
) as v (name, sort);

insert into public.cleaning_tasks (shop_id, task, sort)
select s.id, v.task, v.sort
from public.shops s
cross join (values
  ('Sweep and mop floors', 1), ('Disinfect chairs and stations', 2), ('Clean mirrors', 3),
  ('Wash capes and towels', 4), ('Empty trash', 5), ('Wipe down sinks', 6), ('Clean restroom', 7)
) as v (task, sort);
