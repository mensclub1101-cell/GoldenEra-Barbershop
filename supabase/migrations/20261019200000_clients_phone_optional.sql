-- Barbers can add clients by hand with just a name and their cut; phone is
-- optional. Unique (barber_id, phone) still stops duplicate numbers (nulls
-- don't clash).
alter table public.clients alter column phone drop not null;
alter table public.clients drop constraint clients_phone_check;
alter table public.clients add constraint clients_phone_check check (phone is null or phone ~ '^\+?[0-9]{10,15}$');
