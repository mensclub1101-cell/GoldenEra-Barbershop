-- The site now checks walk-ins in through walkin_check_in(). Retire the old
-- entry point (no drop, so nothing waits on it).
revoke execute on function public.check_in(text, text, text, uuid) from anon, authenticated;
