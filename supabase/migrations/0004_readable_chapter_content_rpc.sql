-- 본문 조회는 잠금 여부를 서버에서 판정하고, 읽을 수 있는 회차의 본문만 반환한다.
-- 클라이언트가 chapters 테이블을 직접 조회하지 않아도 되므로 익명 사용자도 무료 회차를 읽을 수 있다.

create or replace function public.get_readable_chapter_content(p_novel_ids uuid[])
returns table (
  id uuid,
  body text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.body
  from public.chapters c
  join public.novels n on n.id = c.novel_id
  where c.novel_id = any(p_novel_ids)
    and c.status = 'published'
    and c.published_at <= now()
    and (
      c.price_cookies = 0
      or n.owner_id = auth.uid()
      or exists (
        select 1
        from public.chapter_unlocks u
        where u.chapter_id = c.id and u.user_id = auth.uid()
      )
    )
  order by c.novel_id, c.chapter_number;
$$;

revoke all on function public.get_readable_chapter_content(uuid[]) from public;
grant execute on function public.get_readable_chapter_content(uuid[]) to anon, authenticated;
