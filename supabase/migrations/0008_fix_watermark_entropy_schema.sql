-- Supabase managed projects may install pgcrypto functions in `extensions`.
-- Qualify the entropy source so server-issued watermark tokens never fail
-- because a security-definer function has search_path=public.
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
  v_token text := encode(extensions.gen_random_bytes(16), 'hex');
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
