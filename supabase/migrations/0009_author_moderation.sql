-- 작가 제재는 브라우저 상태가 아니라 관리자 RPC와 감사 로그를 통해서만 변경한다.
alter table public.author_applications
  add column if not exists moderation_status text not null default 'normal',
  add column if not exists moderation_until timestamptz,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references public.profiles(id) on delete set null;

alter table public.author_applications
  drop constraint if exists author_applications_moderation_status_check;

alter table public.author_applications
  add constraint author_applications_moderation_status_check
  check (moderation_status in ('normal','suspended_7d','suspended_30d','suspended_1y','permanently_suspended','deleted'));

create index if not exists author_applications_moderation_idx
  on public.author_applications(moderation_status, moderation_until);

create or replace function public.moderate_author(
  p_user_id uuid,
  p_status text,
  p_confirm_display_name text default '',
  p_confirm_pen_name text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_pen_name text;
  v_until timestamptz;
begin
  if not public.is_admin(array['creator_reviewer']) then raise exception 'admin required'; end if;
  if p_status not in ('normal','suspended_7d','suspended_30d','suspended_1y','permanently_suspended','deleted') then raise exception 'invalid moderation status'; end if;

  select p.display_name, a.pen_name
    into v_display_name, v_pen_name
    from public.author_applications a
    join public.profiles p on p.id = a.user_id
   where a.user_id = p_user_id;
  if not found then raise exception 'author not found'; end if;

  if p_status in ('permanently_suspended','deleted')
     and (btrim(coalesce(p_confirm_display_name, '')) <> v_display_name
       or btrim(coalesce(p_confirm_pen_name, '')) <> v_pen_name) then
    raise exception 'confirmation mismatch';
  end if;

  v_until := case p_status
    when 'suspended_7d' then now() + interval '7 days'
    when 'suspended_30d' then now() + interval '30 days'
    when 'suspended_1y' then now() + interval '1 year'
    else null
  end;

  update public.author_applications
     set moderation_status = p_status,
         moderation_until = v_until,
         moderated_at = now(),
         moderated_by = auth.uid(),
         updated_at = now()
   where user_id = p_user_id;

  if p_status = 'deleted' then
    update public.novels set status = 'hidden', updated_at = now() where owner_id = p_user_id;
  end if;

  insert into public.admin_audit_logs(actor_id, action, target_type, target_id, detail)
    values (auth.uid(), 'moderate_author', 'author', p_user_id::text,
      jsonb_build_object('status', p_status, 'moderation_until', v_until));
end;
$$;

revoke all on function public.moderate_author(uuid, text, text, text) from public;
grant execute on function public.moderate_author(uuid, text, text, text) to authenticated;

-- 정지 기간 중에는 작가가 새 회차를 발행할 수 없다. 읽기 권한과 기존 공개작품은 유지한다.
create or replace function public.prevent_suspended_author_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and exists (
    select 1
      from public.novels n
      join public.author_applications a on a.user_id = n.owner_id
     where n.id = new.novel_id
       and a.moderation_status <> 'normal'
       and (a.moderation_until is null or a.moderation_until > now())
  ) then
    raise exception 'author publishing is suspended';
  end if;
  return new;
end;
$$;

drop trigger if exists chapters_author_moderation_guard on public.chapters;
create trigger chapters_author_moderation_guard
before insert or update of status on public.chapters
for each row execute function public.prevent_suspended_author_publish();
