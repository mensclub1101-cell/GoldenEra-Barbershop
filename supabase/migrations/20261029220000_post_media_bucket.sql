-- Photos and videos barbers post to the shop's Instagram. Instagram fetches
-- the file from a public URL, so the bucket is public-read. Only staff
-- (the owner or a barber with a seat) upload, each into their own folder,
-- and can remove their own files after posting.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 104857600, array['image/jpeg', 'video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

create policy post_media_staff_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and ((select private.is_owner()) or (select private.my_barber_id()) is not null)
  );
create policy post_media_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'post-media' and owner_id = (select auth.uid())::text);
