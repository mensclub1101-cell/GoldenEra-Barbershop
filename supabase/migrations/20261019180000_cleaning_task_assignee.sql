-- Who's on each Wednesday cleaning task ("Angel + Chase"). Free text so it
-- works before every barber has an account.
alter table public.cleaning_tasks add column assignee text check (char_length(assignee) <= 40);
