-- 플랫폼이 제공하는 공개 샘플 작품과 재신청 RPC.
-- 실제 작가 작품은 owner_id가 필수이며 기존 RLS가 그대로 적용된다.

alter table public.novels alter column owner_id drop not null;

insert into public.novels (id, owner_id, slug, title, category, synopsis, status)
values
  ('11111111-1111-4111-8111-111111111111', null, 'ash-sword', '재가 된 검', 'martial', '죽은 사부의 편지를 따라 지워진 이름과 뒤바뀐 죽음의 진실을 추적한다.', 'serializing'),
  ('22222222-2222-4222-8222-222222222222', null, 'winter-orbit', '겨울 궤도의 편지', 'sf', '목성 궤도 정거장에 멸망한 지구의 편지가 80년 늦게 도착한다.', 'serializing'),
  ('33333333-3333-4333-8333-333333333333', null, 'monster-cafe', '괴물들의 심야 카페', 'fantasy', '자정이 지나면 인간이 아닌 손님들의 고민 상담이 시작된다.', 'serializing'),
  ('44444444-4444-4444-8444-444444444444', null, 'our-temperature', '우리 사이의 온도', 'romance', '헤어진 연인과 오래된 한옥에서 겨울을 나게 된 두 사람의 이야기.', 'complete'),
  ('55555555-5555-4555-8555-555555555555', null, 'missing-floor', '사라진 13층', 'mystery', '존재하지 않는 13층에서 매일 새벽 호출이 내려온다.', 'serializing'),
  ('66666666-6666-4666-8666-666666666666', null, 'laundry', '수요일의 세탁소', 'daily', '매주 수요일마다 옷과 함께 비밀을 맡기는 손님들이 찾아온다.', 'serializing')
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  category = excluded.category,
  synopsis = excluded.synopsis,
  status = excluded.status,
  updated_at = now();

with sample_content as (
  select array[
    '비가 사흘째 내리던 날, 주인공은 도착할 수 없는 곳에서 온 편지를 받았다.',
    '봉투에는 발신지도 날짜도 없었다. 다만 돌아오라는 두 글자만 또렷했다.',
    '창밖의 그림자들이 동시에 칼을 뽑자 오래 잠들어 있던 이야기가 다시 움직이기 시작했다.'
  ]::text[] as body
), chapter_seed (id, novel_id, chapter_number, title, price_cookies) as (
  values
    ('11111111-0001-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, '죽은 자의 편지', 0),
    ('11111111-0002-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 2, '이름 없는 주막', 3),
    ('11111111-0003-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 3, '열세 번째 발자국', 3),
    ('22222222-0001-4000-8000-000000000001'::uuid, '22222222-2222-4222-8222-222222222222'::uuid, 1, '80년 늦은 안부', 0),
    ('22222222-0002-4000-8000-000000000002'::uuid, '22222222-2222-4222-8222-222222222222'::uuid, 2, '유령 주파수', 3),
    ('22222222-0003-4000-8000-000000000003'::uuid, '22222222-2222-4222-8222-222222222222'::uuid, 3, '푸른 별의 목소리', 3),
    ('33333333-0001-4000-8000-000000000001'::uuid, '33333333-3333-4333-8333-333333333333'::uuid, 1, '어서 오세요, 인간은 처음이죠?', 0),
    ('33333333-0002-4000-8000-000000000002'::uuid, '33333333-3333-4333-8333-333333333333'::uuid, 2, '울지 못하는 도깨비', 3),
    ('33333333-0003-4000-8000-000000000003'::uuid, '33333333-3333-4333-8333-333333333333'::uuid, 3, '보름달 한 스푼', 3),
    ('44444444-0001-4000-8000-000000000001'::uuid, '44444444-4444-4444-8444-444444444444'::uuid, 1, '영하 8도의 재회', 0),
    ('44444444-0002-4000-8000-000000000002'::uuid, '44444444-4444-4444-8444-444444444444'::uuid, 2, '두 개의 머그컵', 3),
    ('44444444-0003-4000-8000-000000000003'::uuid, '44444444-4444-4444-8444-444444444444'::uuid, 3, '녹지 않는 마음', 3),
    ('55555555-0001-4000-8000-000000000001'::uuid, '55555555-5555-4555-8555-555555555555'::uuid, 1, '없는 층의 호출', 0),
    ('55555555-0002-4000-8000-000000000002'::uuid, '55555555-5555-4555-8555-555555555555'::uuid, 2, 'CCTV 속의 나', 3),
    ('55555555-0003-4000-8000-000000000003'::uuid, '55555555-5555-4555-8555-555555555555'::uuid, 3, '13호 열쇠', 3),
    ('66666666-0001-4000-8000-000000000001'::uuid, '66666666-6666-4666-8666-666666666666'::uuid, 1, '빨간 코트의 주인', 0),
    ('66666666-0002-4000-8000-000000000002'::uuid, '66666666-6666-4666-8666-666666666666'::uuid, 2, '주머니 속 영수증', 3),
    ('66666666-0003-4000-8000-000000000003'::uuid, '66666666-6666-4666-8666-666666666666'::uuid, 3, '비 오는 날의 셔츠', 3)
)
insert into public.chapters (id, novel_id, chapter_number, title, body, price_cookies, status, published_at)
select s.id, s.novel_id, s.chapter_number, s.title, array_to_string(c.body, E'\n\n'), s.price_cookies, 'published', now()
from chapter_seed s cross join sample_content c
on conflict (id) do update set
  title = excluded.title,
  price_cookies = excluded.price_cookies,
  status = excluded.status,
  published_at = excluded.published_at,
  updated_at = now();

create or replace function public.submit_author_application(
  p_pen_name text,
  p_primary_genre text,
  p_introduction text,
  p_portfolio_url text default null,
  p_sample_path text default null,
  p_sample_excerpt text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication required'; end if;

  insert into public.author_applications (
    user_id, pen_name, primary_genre, introduction, portfolio_url,
    sample_path, sample_excerpt, status, submitted_at, reviewed_at, review_note, updated_at
  ) values (
    v_user, btrim(p_pen_name), p_primary_genre, btrim(p_introduction),
    nullif(btrim(p_portfolio_url), ''), nullif(btrim(p_sample_path), ''),
    nullif(btrim(p_sample_excerpt), ''), 'pending', now(), null, null, now()
  )
  on conflict (user_id) do update set
    pen_name = excluded.pen_name,
    primary_genre = excluded.primary_genre,
    introduction = excluded.introduction,
    portfolio_url = excluded.portfolio_url,
    sample_path = excluded.sample_path,
    sample_excerpt = excluded.sample_excerpt,
    status = 'pending',
    submitted_at = now(),
    reviewed_at = null,
    review_note = null,
    updated_at = now()
  where public.author_applications.status = 'rejected';

  if not found then raise exception 'application already pending or approved'; end if;
end;
$$;

revoke all on function public.submit_author_application(text, text, text, text, text, text) from public, anon;
grant execute on function public.submit_author_application(text, text, text, text, text, text) to authenticated;
