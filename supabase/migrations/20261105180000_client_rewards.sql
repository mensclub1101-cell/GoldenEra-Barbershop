-- Client rewards: points and invites, Cash App style. A friend who signs up
-- with a client's invite code stays pending until their first visit is done:
-- they check in from the app and the barber closes the walk-in as Done, like
-- any other. That pays the friend 25 and the inviter 50 on its own; nobody
-- has to confirm anything. Clients only read their own rows; every write goes
-- through the functions below.

create table public.client_rewards (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  referral_code text not null unique check (referral_code ~ '^[A-Z0-9]{4,12}$'),
  referred_by uuid references public.profiles (id) on delete set null,
  referral_status text check (referral_status in ('pending', 'earned')),
  referral_earned_at timestamptz,
  created_at timestamptz not null default now()
);
create index client_rewards_referred_by_idx on public.client_rewards (referred_by);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  reason text not null check (length(reason) between 1 and 80),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index points_ledger_profile_id_idx on public.points_ledger (profile_id);
create index points_ledger_created_by_idx on public.points_ledger (created_by);

alter table public.client_rewards enable row level security;
alter table public.points_ledger enable row level security;
create policy client_rewards_own_read on public.client_rewards for select to authenticated
  using (profile_id = (select auth.uid()));
create policy points_ledger_own_read on public.points_ledger for select to authenticated
  using (profile_id = (select auth.uid()));
grant select on public.client_rewards, public.points_ledger to authenticated;

-- The caller's rewards row, made on first use with a code like "ALEX7Q2".
create function private.ensure_my_rewards() returns public.client_rewards
language plpgsql security definer set search_path = '' as $$
declare
  me public.profiles;
  mine public.client_rewards;
  stem text;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if me.id is null or me.role <> 'client' then
    raise exception 'Rewards are for client accounts.';
  end if;
  select * into mine from public.client_rewards where profile_id = me.id;
  if found then return mine; end if;
  stem := upper(left(regexp_replace(coalesce(me.full_name, ''), '[^A-Za-z]', '', 'g'), 5));
  if length(stem) < 2 then stem := 'GE'; end if;
  loop
    begin
      insert into public.client_rewards (profile_id, referral_code)
      values (me.id, stem || upper(substr(md5(gen_random_uuid()::text), 1, 3)))
      returning * into mine;
      return mine;
    exception when unique_violation then
      -- Made by a request running at the same moment, or the code is taken
      -- (then try another suffix).
      select * into mine from public.client_rewards where profile_id = me.id;
      if found then return mine; end if;
    end;
  end loop;
end;
$$;
revoke execute on function private.ensure_my_rewards() from public, anon, authenticated;

-- Everything the Rewards tab shows: code, balance, and the friends who used
-- the code (first name and whether their bonus is earned yet).
create function public.my_rewards() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  mine public.client_rewards;
begin
  mine := private.ensure_my_rewards();
  return jsonb_build_object(
    'code', mine.referral_code,
    'points', coalesce((select sum(delta) from public.points_ledger where profile_id = mine.profile_id), 0),
    'my_bonus', mine.referral_status,
    'invites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', coalesce(split_part(p.full_name, ' ', 1), 'A friend'),
        'status', r.referral_status,
        'joined', r.created_at
      ) order by r.created_at desc)
      from public.client_rewards r
      join public.profiles p on p.id = r.profile_id
      where r.referred_by = mine.profile_id
    ), '[]'::jsonb)
  );
end;
$$;

-- A new client signing up with a friend's code. Only once, only within a day
-- of making the account, and never their own code.
create function public.claim_referral(p_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  mine public.client_rewards;
  inviter uuid;
  joined timestamptz;
begin
  mine := private.ensure_my_rewards();
  if mine.referred_by is not null then return false; end if;
  select created_at into joined from public.profiles where id = mine.profile_id;
  if joined < now() - interval '1 day' then return false; end if;
  select profile_id into inviter from public.client_rewards
  where referral_code = upper(trim(p_code)) and profile_id <> mine.profile_id;
  if inviter is null then return false; end if;
  update public.client_rewards set referred_by = inviter, referral_status = 'pending'
  where profile_id = mine.profile_id;
  return true;
end;
$$;

-- Walk-ins checked in from a signed-in client account remember who it was,
-- so finishing that walk-in can pay their invite bonus.
alter table public.walkins add column profile_id uuid references public.profiles (id) on delete set null;
create index walkins_profile_id_idx on public.walkins (profile_id);

create or replace function public.walkin_check_in(p_shop text, p_name text, p_phone text, p_barber uuid default null, p_eta text default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_shop uuid;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_name text := trim(coalesce(p_name, ''));
  v_eta time;
  v_place int;
begin
  select id into v_shop from public.shops where slug = p_shop;
  if v_shop is null then raise exception 'Pick a shop'; end if;
  if length(v_name) = 0 or length(v_name) > 60 then raise exception 'Enter your name'; end if;
  if v_phone !~ '^\+?[0-9]{10,15}$' then raise exception 'Enter a valid phone number'; end if;
  if p_eta is not null and p_eta <> '' then
    if p_eta !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Pick a time'; end if;
    v_eta := p_eta::time;
    if v_eta < (now() at time zone 'America/Los_Angeles')::time - interval '15 minutes' then
      raise exception 'That time already passed. Pick another.';
    end if;
  end if;
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

  -- auth.uid() is null for check-ins from the public site.
  insert into public.walkins (shop_id, name, phone, barber_id, eta, profile_id)
  values (v_shop, v_name, v_phone, p_barber, v_eta, (select auth.uid()));
  select count(*) into v_place from public.walkins where shop_id = v_shop and status = 'waiting';
  return v_place;
end;
$$;
revoke execute on function public.walkin_check_in(text, text, text, uuid, text) from public;
grant execute on function public.walkin_check_in(text, text, text, uuid, text) to anon, authenticated;

-- A walk-in closed as Done pays its client's invite bonus, once.
create function private.walkin_done_pays_invite() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  friend public.client_rewards;
  friend_name text;
begin
  select * into friend from public.client_rewards
  where profile_id = new.profile_id and referral_status = 'pending'
  for update;
  if not found then return new; end if;
  select coalesce(split_part(full_name, ' ', 1), 'a friend') into friend_name from public.profiles where id = new.profile_id;
  insert into public.points_ledger (profile_id, delta, reason, created_by)
  values (friend.profile_id, 25, 'Welcome bonus: first cut', (select auth.uid()));
  -- The inviter's account may have been deleted since.
  if friend.referred_by is not null then
    insert into public.points_ledger (profile_id, delta, reason, created_by)
    values (friend.referred_by, 50, left('Invite bonus: ' || friend_name, 80), (select auth.uid()));
  end if;
  update public.client_rewards set referral_status = 'earned', referral_earned_at = now()
  where profile_id = new.profile_id;
  return new;
end;
$$;
revoke execute on function private.walkin_done_pays_invite() from public, anon, authenticated;

create trigger walkin_done_pays_invite
after update of status on public.walkins
for each row
when (new.status = 'done' and old.status is distinct from 'done' and new.profile_id is not null)
execute function private.walkin_done_pays_invite();

-- For the owner: every invite, who sent it, and where it stands.
create function public.rewards_overview()
returns table (friend text, inviter text, barber text, status text, joined timestamptz, earned_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select coalesce(split_part(f.full_name, ' ', 1), 'A friend'), coalesce(split_part(i.full_name, ' ', 1), 'A client'),
    b.display_name, r.referral_status, r.created_at, r.referral_earned_at
  from public.client_rewards r
  join public.profiles f on f.id = r.profile_id
  left join public.profiles i on i.id = r.referred_by
  left join public.barbers b on b.id = f.favorite_barber_id
  where r.referral_status is not null and (select private.is_owner())
  order by r.created_at desc;
$$;

-- For a barber: invited clients who picked them, so they know who's coming.
create function public.my_invited_clients()
returns table (friend text, status text, joined timestamptz)
language sql stable security definer set search_path = '' as $$
  select coalesce(split_part(f.full_name, ' ', 1), 'A friend'), r.referral_status, r.created_at
  from public.client_rewards r
  join public.profiles f on f.id = r.profile_id
  where r.referral_status is not null
    and f.favorite_barber_id = (select private.my_barber_id())
  order by r.created_at desc;
$$;

revoke execute on function public.my_rewards(), public.claim_referral(text), public.rewards_overview(),
  public.my_invited_clients() from public, anon;
grant execute on function public.my_rewards(), public.claim_referral(text), public.rewards_overview(),
  public.my_invited_clients() to authenticated;
