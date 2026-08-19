-- The profile-images bucket/policies were created out-of-band (dashboard), never
-- committed here, and only had an INSERT policy. app/api/upload/profile/route.ts
-- always uploads to the fixed path `${user.id}/avatar.webp` with upsert: true, so
-- any re-upload after the first is an UPDATE under the hood — which had no policy
-- to satisfy, failing with "new row violates row-level security policy". Storage
-- upsert needs INSERT + SELECT + UPDATE (the conflict check requires SELECT); a
-- SELECT policy scoped to the caller's own folder doesn't reintroduce the bucket
-- enumeration issue the security-hardening migration removed, since it only
-- exposes each user's own path prefix, not the whole bucket.

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view profile images" on storage.objects;
drop policy if exists "profile_images_select" on storage.objects;
drop policy if exists "profile_images_insert" on storage.objects;
drop policy if exists "profile_images_update" on storage.objects;
drop policy if exists "profile_images_delete" on storage.objects;

-- Users can read their own avatar path (required for upsert's conflict check)
create policy "profile_images_select" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'profile-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can upload their own avatar (path: {user_id}/avatar.webp)
create policy "profile_images_insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can overwrite (upsert) their own avatar
create policy "profile_images_update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'profile-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own avatar
create policy "profile_images_delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
