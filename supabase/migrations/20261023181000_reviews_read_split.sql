-- Visitors can't run private.is_owner(), so the combined read policy failed
-- for them. Anyone reads visible reviews; the owner reads all (own policy).
alter policy reviews_read on public.reviews using (visible);
create policy reviews_owner_read on public.reviews for select to authenticated using ((select private.is_owner()));
