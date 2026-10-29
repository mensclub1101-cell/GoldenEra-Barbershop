-- Storage deletes look the file up first, which needs read access through
-- RLS (the bucket being public only covers the public URL). Let staff see
-- their own uploads so they can remove them after posting.
create policy post_media_own_read on storage.objects for select to authenticated
  using (bucket_id = 'post-media' and owner_id = (select auth.uid())::text);
