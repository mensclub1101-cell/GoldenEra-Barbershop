-- The owner's answers and requests for the build team (setup questions plus
-- free-form asks). Owners read and write; the team reads them in the owner app.
create table public.owner_requests (
  id uuid primary key default gen_random_uuid(),
  body text not null check (length(trim(body)) between 1 and 1000),
  author_name text not null check (length(trim(author_name)) between 1 and 60),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index owner_requests_created_by_idx on public.owner_requests (created_by);
alter table public.owner_requests enable row level security;
create policy owner_requests_owner_all on public.owner_requests for all to authenticated
  using ((select private.is_owner())) with check ((select private.is_owner()));
grant select, insert, update, delete on public.owner_requests to authenticated;
alter table public.owner_requests add column topic text check (topic is null or length(topic) <= 60);
