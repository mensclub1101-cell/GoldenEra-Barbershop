-- Walk-ins pick when they'll get to the shop (shop-local time, today).
-- Null = they're here now. walkin_check_in() replaces check_in(): a new
-- name instead of an overload, so 4-argument calls stay unambiguous.
alter table public.walkins add column eta time;

create function public.walkin_check_in(p_shop text, p_name text, p_phone text, p_barber uuid default null, p_eta text default null)
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

  insert into public.walkins (shop_id, name, phone, barber_id, eta) values (v_shop, v_name, v_phone, p_barber, v_eta);
  select count(*) into v_place from public.walkins where shop_id = v_shop and status = 'waiting';
  return v_place;
end;
$$;
revoke execute on function public.walkin_check_in(text, text, text, uuid, text) from public;
grant execute on function public.walkin_check_in(text, text, text, uuid, text) to anon, authenticated;
