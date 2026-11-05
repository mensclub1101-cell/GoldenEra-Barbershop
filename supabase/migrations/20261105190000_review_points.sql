-- Clients earn 10 points for a review left in the app, once per visit: a
-- walk-in they checked in for from their account that was closed as Done.
-- The points come whatever the rating. App reviews start hidden; the owner
-- shows the ones they want on the website. Google and Yelp don't allow
-- rewarding reviews, so only reviews left here earn points.

alter table public.reviews
  add column profile_id uuid references public.profiles (id) on delete set null,
  add column walkin_id uuid unique references public.walkins (id) on delete set null;
create index reviews_profile_id_idx on public.reviews (profile_id);

-- The caller's latest finished visit that has no review yet.
create function private.my_reviewable_visit() returns public.walkins
language sql stable security definer set search_path = '' as $$
  select w.* from public.walkins w
  where w.profile_id = (select auth.uid()) and w.status = 'done'
    and not exists (select 1 from public.reviews r where r.walkin_id = w.id)
  order by w.handled_at desc nulls last
  limit 1;
$$;
revoke execute on function private.my_reviewable_visit() from public, anon, authenticated;

create function public.leave_review(p_rating int, p_body text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  me public.profiles;
  visit public.walkins;
  author text;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if me.id is null or me.role <> 'client' then raise exception 'Reviews are for client accounts.'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'Pick 1 to 5 stars.'; end if;
  if length(trim(coalesce(p_body, ''))) not between 1 and 600 then
    raise exception 'Write a few words (600 characters at most).';
  end if;
  visit := private.my_reviewable_visit();
  if visit.id is null then
    raise exception 'You can leave a review after a visit you checked in for from the app.';
  end if;
  -- "Alex R." from "Alex Rivera".
  author := coalesce(nullif(split_part(trim(me.full_name), ' ', 1), ''), 'Client')
    || coalesce(' ' || nullif(left(split_part(trim(me.full_name), ' ', 2), 1), '') || '.', '');
  insert into public.reviews (shop_id, author, body, rating, source, visible, profile_id, walkin_id)
  values (visit.shop_id, left(author, 60), trim(p_body), p_rating, 'App', false, me.id, visit.id);
  perform private.ensure_my_rewards();
  insert into public.points_ledger (profile_id, delta, reason, created_by)
  values (me.id, 10, 'Review: thank you', me.id);
  return true;
end;
$$;

-- my_rewards also says whether a visit is waiting for a review.
create or replace function public.my_rewards() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  mine public.client_rewards;
begin
  mine := private.ensure_my_rewards();
  return jsonb_build_object(
    'code', mine.referral_code,
    'points', coalesce((select sum(delta) from public.points_ledger where profile_id = mine.profile_id), 0),
    'my_bonus', mine.referral_status,
    'can_review', (private.my_reviewable_visit()).id is not null,
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

-- For the owner: points handed out and app reviews, for the Rewards page.
create function public.rewards_totals() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when (select private.is_owner()) then jsonb_build_object(
    'points_given', coalesce((select sum(delta) from public.points_ledger where delta > 0), 0),
    'app_reviews', (select count(*) from public.reviews where source = 'App' and profile_id is not null)
  ) end;
$$;

revoke execute on function public.leave_review(int, text), public.my_rewards(), public.rewards_totals() from public, anon;
grant execute on function public.leave_review(int, text), public.my_rewards(), public.rewards_totals() to authenticated;
