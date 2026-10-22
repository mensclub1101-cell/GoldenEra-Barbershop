-- Each barber's weekly hours, set on their card: 7 entries, Sunday first,
-- each null (off) or {"open":"10:00","close":"19:00"} in shop time. Null
-- column = not set yet. Public like the rest of the card (active rows).
alter table public.barbers add column schedule jsonb
  check (schedule is null or (jsonb_typeof(schedule) = 'array' and jsonb_array_length(schedule) = 7));
grant update (schedule) on public.barbers to authenticated;
