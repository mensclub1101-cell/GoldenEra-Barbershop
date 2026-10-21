-- Table privileges are granted explicitly in this project; RLS still limits
-- writes to the owner and reads to the owner or that barber.
grant select, insert, update, delete on public.rent_rates to authenticated;
