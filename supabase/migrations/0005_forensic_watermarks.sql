-- 외부 유출 신고용 포렌식 워터마크. 토큰 자체에는 개인정보를 넣지 않고
-- 서버가 발급한 난수와 발급 이력을 연결해 운영자만 소유자를 확인한다.
create table public.reader_watermark_issues (
  id uuid primary key default gen_random_uuid(),
  token text not null unique check (token ~ '^[a-f0-9]{32}$'),
  user_id uuid references public.profiles(id) on delete set null,
  session_id text not null check (char_length(session_id) between 16 and 120),
  novel_id uuid not null references public.novels(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  issued_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create index reader_watermark_lookup_idx on public.reader_watermark_issues(token) where revoked_at is null;
create index reader_watermark_owner_idx on public.reader_watermark_issues(user_id, issued_at desc);

create table public.content_report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.content_reports(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 1 and 500),
  file_name text not null check (char_length(file_name) between 1 and 180),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  detection_status text not null default 'queued' check (detection_status in ('queued','detected','not_detected','needs_review','failed')),
  detected_token text,
  matched_watermark_id uuid references public.reader_watermark_issues(id) on delete set null,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  detector_note text not null default '' check (char_length(detector_note) <= 1000),
  created_at timestamptz not null default now(),
  analyzed_at timestamptz
);

create index content_report_evidence_report_idx on public.content_report_evidence(report_id, created_at desc);
alter table public.reader_watermark_issues enable row level security;
alter table public.content_report_evidence enable row level security;

create policy "watermark_owner_read" on public.reader_watermark_issues for select
  using (user_id = auth.uid() or public.is_admin(array['moderator']));
create policy "evidence_owner_read" on public.content_report_evidence for select
  using (reporter_id = auth.uid() or public.is_admin(array['moderator']));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-evidence', 'report-evidence', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "report_evidence_owner_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'report-evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "report_evidence_owner_read" on storage.objects for select to authenticated
using (bucket_id = 'report-evidence' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin(array['moderator'])));

-- 리더가 콘텐츠를 보여주기 직전에 호출한다. 토큰은 브라우저가 만들지 않고
-- 데이터베이스가 생성하므로 워터마크와 사용자 연결을 위조할 수 없다.
create or replace function public.issue_reader_watermark(p_novel_slug text, p_chapter_id uuid, p_session_id text)
returns table(token text, issued_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_novel_id uuid;
  v_price integer;
  v_status text;
  v_published_at timestamptz;
  v_token text := encode(gen_random_bytes(16), 'hex');
begin
  if auth.uid() is null and char_length(coalesce(p_session_id, '')) < 16 then raise exception 'session required'; end if;
  select n.id, c.price_cookies, c.status, c.published_at
    into v_novel_id, v_price, v_status, v_published_at
    from public.novels n join public.chapters c on c.novel_id = n.id
   where n.slug = p_novel_slug and c.id = p_chapter_id;
  if not found or v_status <> 'published' or v_published_at is null or v_published_at > now() then raise exception 'chapter unavailable'; end if;
  if v_price > 0 and not exists (select 1 from public.chapter_unlocks u where u.chapter_id = p_chapter_id and u.user_id = auth.uid()) then raise exception 'chapter locked'; end if;

  insert into public.reader_watermark_issues(token, user_id, session_id, novel_id, chapter_id)
    values (v_token, auth.uid(), left(p_session_id, 120), v_novel_id, p_chapter_id);
  return query select v_token, now();
end;
$$;

revoke all on function public.issue_reader_watermark(text, uuid, text) from public;
grant execute on function public.issue_reader_watermark(text, uuid, text) to anon, authenticated;

-- 자동 스캐너가 후보 토큰을 제시해도, 일치 여부는 서버의 발급 이력으로만 확정한다.
create or replace function public.match_report_watermark(p_evidence_id uuid, p_token text)
returns table(matched boolean, watermark_id uuid, issued_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter uuid;
  v_watermark reader_watermark_issues%rowtype;
begin
  select reporter_id into v_reporter from public.content_report_evidence where id = p_evidence_id;
  if v_reporter is null or (v_reporter <> auth.uid() and not public.is_admin(array['moderator'])) then raise exception 'evidence access denied'; end if;
  select * into v_watermark from public.reader_watermark_issues where token = lower(p_token) and revoked_at is null limit 1;
  if not found then
    update public.content_report_evidence set detection_status = 'needs_review', analyzed_at = now(), detector_note = '후보 토큰을 발급 이력과 대조하지 못했습니다.' where id = p_evidence_id;
    return query select false, null::uuid, null::timestamptz;
    return;
  end if;
  update public.content_report_evidence
     set detection_status = 'detected', matched_watermark_id = v_watermark.id, detected_token = lower(p_token), confidence = 1, analyzed_at = now(), detector_note = '서버 발급 이력과 일치했습니다.'
   where id = p_evidence_id;
  return query select true, v_watermark.id, v_watermark.issued_at;
end;
$$;

revoke all on function public.match_report_watermark(uuid, text) from public;
grant execute on function public.match_report_watermark(uuid, text) to authenticated;
