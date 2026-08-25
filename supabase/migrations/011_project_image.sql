-- Project app icon / cover image
alter table public.projects
  add column if not exists image_url text;

-- Public bucket for project images (path: {user_id}/{project_id}/icon.ext)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-images',
  'project-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Project images public read" on storage.objects;
drop policy if exists "Users upload own project images" on storage.objects;
drop policy if exists "Users update own project images" on storage.objects;
drop policy if exists "Users delete own project images" on storage.objects;

create policy "Project images public read"
  on storage.objects for select
  using (bucket_id = 'project-images');

create policy "Users upload own project images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own project images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own project images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
