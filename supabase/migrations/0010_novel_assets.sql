-- 작가가 등록한 작품 표지와 추천 배너를 Supabase Storage에 저장한다.
alter table public.novels
  add column if not exists cover_path text,
  add column if not exists banner_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'novel-assets', 'novel-assets', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "novel_assets_public_read" on storage.objects;
drop policy if exists "novel_assets_owner_insert" on storage.objects;
drop policy if exists "novel_assets_owner_update" on storage.objects;
drop policy if exists "novel_assets_owner_delete" on storage.objects;

create policy "novel_assets_public_read" on storage.objects for select
using (bucket_id = 'novel-assets');

create policy "novel_assets_owner_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'novel-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.author_applications a
    where a.user_id = auth.uid() and a.status = 'approved'
  )
);

create policy "novel_assets_owner_update" on storage.objects for update to authenticated
using (
  bucket_id = 'novel-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.author_applications a
    where a.user_id = auth.uid() and a.status = 'approved'
  )
)
with check (bucket_id = 'novel-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "novel_assets_owner_delete" on storage.objects for delete to authenticated
using (bucket_id = 'novel-assets' and (storage.foldername(name))[1] = auth.uid()::text);
