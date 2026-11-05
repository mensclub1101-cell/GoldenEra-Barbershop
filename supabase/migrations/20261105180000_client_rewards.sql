-- Client rewards: points and invites, Cash App style. A friend who signs up
-- with a client's invite code stays pending until a barber marks their first
-- cut; then the inviter gets 50 points and the friend 25. Clients only read
-- their own rows; every write goes through the functions below.

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

-- For barbers and the owner: invited clients still waiting on their first cut.
create function public.pending_first_cuts()
returns table (profile_id uuid, full_name text, phone text, barber_name text, joined timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.profile_id, p.full_name, p.phone, b.display_name, r.created_at
  from public.client_rewards r
  join public.profiles p on p.id = r.profile_id
  left join public.barbers b on b.id = p.favorite_barber_id
  where r.referral_status = 'pending'
    and ((select private.my_barber_id()) is not null or (select private.is_owner()))
  order by r.created_at;
$$;

-- A barber (or the owner) confirms an invited client's first cut: the friend
-- gets 25 points, the inviter 50, once.
create function public.confirm_first_cut(p_profile uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  friend public.client_rewards;
  friend_name text;
begin
  if (select private.my_barber_id()) is null and not (select private.is_owner()) then
    raise exception 'Only staff can confirm a cut.';
  end if;
  if p_profile = (select auth.uid()) then raise exception 'You can''t confirm your own cut.'; end if;
  select * into friend from public.client_rewards
  where profile_id = p_profile and referral_status = 'pending'
  for update;
  if not found then return false; end if;
  select coalesce(split_part(full_name, ' ', 1), 'a friend') into friend_name from public.profiles where id = p_profile;
  insert into public.points_ledger (profile_id, delta, reason, created_by)
  values (friend.profile_id, 25, 'Welcome bonus: first cut', (select auth.uid()));
  -- The inviter's account may have been deleted since.
  if friend.referred_by is not null then
    insert into public.points_ledger (profile_id, delta, reason, created_by)
    values (friend.referred_by, 50, left('Invite bonus: ' || friend_name, 80), (select auth.uid()));
  end if;
  update public.client_rewards set referral_status = 'earned', referral_earned_at = now()
  where profile_id = p_profile;
  return true;
end;
$$;

revoke execute on function public.my_rewards(), public.claim_referral(text), public.pending_first_cuts(),
  public.confirm_first_cut(uuid) from public, anon;
grant execute on function public.my_rewards(), public.claim_referral(text), public.pending_first_cuts(),
  public.confirm_first_cut(uuid) to authenticated;
