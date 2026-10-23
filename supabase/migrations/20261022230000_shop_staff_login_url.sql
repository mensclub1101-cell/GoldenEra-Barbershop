-- The shop's own booking-system login page (e.g. the shop's Squire sign-in),
-- shown as a tab on every barber's Booking page. Only a public sign-in page
-- address, never credentials; the owner sets it (shops_owner_update policy).
alter table public.shops add column staff_login_url text check (staff_login_url is null or staff_login_url ~ '^https://');
grant update (staff_login_url) on public.shops to authenticated;
