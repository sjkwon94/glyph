-- 출시 운영 기능: 관리자 권한, 신고·차단, 동의 이력, 작가 정산, 비공개 심사 원고
-- 관리자 지정과 금액 확정은 service_role 또는 서버 함수에서만 수행한다.

create table public.admin_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'moderator' check (role in ('moderator','creator_reviewer','finance','super_admin')),
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admin_roles enable row level security;

create or replace function public.is_admin(required_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_roles a
    where a.user_id = auth.uid()
      and (required_roles is null or a.role = any(required_roles) or a.role = 'super_admin')
  );
$$;

revoke all on function public.is_admin(text[]) from public;
grant execute on function public.is_admin(text[]) to authenticated;

create policy "admin_roles_self_read" on public.admin_roles for select
using (user_id = auth.uid());

create table public.consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  policy_type text not null check (policy_type in ('terms','privacy','marketing','creator_terms')),
  policy_version text not null check (char_length(policy_version) between 1 and 40),
  accepted boolean not null,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('community_post','comment')),
  target_id uuid not null,
  reason text not null check (reason in ('spam','abuse','spoiler','copyright','other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'received' check (status in ('received','reviewing','resolved','dismissed')),
  assigned_to uuid references public.admin_roles(user_id) on delete set null,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 2000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index content_reports_open_once_idx
  on public.content_reports(reporter_id, target_type, target_id)
  where status in ('received','reviewing');
create index content_reports_queue_idx on public.content_reports(status, created_at);

create table public.creator_earning_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  novel_id uuid references public.novels(id) on delete set null,
  source_type text not null check (source_type in ('paid_content','tip','rewarded_ad','adjustment','refund')),
  source_reference text not null,
  gross_amount_krw bigint not null,
  deductions_krw bigint not null default 0 check (deductions_krw >= 0),
  settlement_base_krw bigint generated always as (gross_amount_krw - deductions_krw) stored,
  creator_rate numeric(5,4) not null check (creator_rate between 0 and 1),
  creator_amount_krw bigint generated always as (floor((gross_amount_krw - deductions_krw) * creator_rate)) stored,
  occurred_at timestamptz not null default now(),
  unique (source_type, source_reference)
);

create table public.settlement_statements (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  total_amount_krw bigint not null check (total_amount_krw >= 0),
  status text not null default 'draft' check (status in ('draft','confirmed','paid','held')),
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (creator_id, period_start, period_end),
  check (period_start <= period_end)
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.consent_logs enable row level security;
alter table public.user_blocks enable row level security;
alter table public.content_reports enable row level security;
alter table public.creator_earning_events enable row level security;
alter table public.settlement_statements enable row level security;
alter table public.admin_audit_logs enable row level security;

-- 이메일 확인 전 회원가입도 동의 이력을 빠뜨리지 않도록 Auth 트리거에서 함께 기록한다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(nullif(left(new.raw_user_meta_data->>'display_name', 30), ''), '새 독자'));
  insert into public.cookie_wallets(user_id, balance) values (new.id, 0);
  if nullif(new.raw_user_meta_data->>'accepted_terms_version', '') is not null then
    insert into public.consent_logs(user_id, policy_type, policy_version, accepted)
      values (new.id, 'terms', left(new.raw_user_meta_data->>'accepted_terms_version', 40), true);
  end if;
  if nullif(new.raw_user_meta_data->>'accepted_privacy_version', '') is not null then
    insert into public.consent_logs(user_id, policy_type, policy_version, accepted)
      values (new.id, 'privacy', left(new.raw_user_meta_data->>'accepted_privacy_version', 40), true);
  end if;
  return new;
end;
$$;

create policy "consents_owner_read" on public.consent_logs for select using (user_id = auth.uid());
create policy "consents_owner_insert" on public.consent_logs for insert with check (user_id = auth.uid());
create policy "blocks_owner_all" on public.user_blocks for all
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "reports_owner_insert" on public.content_reports for insert
  with check (reporter_id = auth.uid() and status = 'received');
create policy "reports_owner_read" on public.content_reports for select
  using (reporter_id = auth.uid() or public.is_admin(array['moderator']));
create policy "earnings_creator_read" on public.creator_earning_events for select using (creator_id = auth.uid());
create policy "settlements_creator_read" on public.settlement_statements for select using (creator_id = auth.uid());
create policy "audit_admin_read" on public.admin_audit_logs for select using (public.is_admin(null));
create policy "author_applications_admin_read" on public.author_applications for select
  using (public.is_admin(array['creator_reviewer']));

-- 브라우저가 승인 상태나 제재 상태를 직접 바꾸지 못하도록 제한하고, 감사로그가 남는 RPC만 허용한다.
create or replace function public.review_author_application(p_user_id uuid, p_status text, p_note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(array['creator_reviewer']) then raise exception 'admin required'; end if;
  if p_status not in ('approved','rejected') then raise exception 'invalid status'; end if;

  update public.author_applications
    set status = p_status, review_note = left(coalesce(p_note, ''), 1000), reviewed_at = now(), updated_at = now()
    where user_id = p_user_id and status = 'pending';
  if not found then raise exception 'pending application not found'; end if;

  insert into public.admin_audit_logs(actor_id, action, target_type, target_id, detail)
    values (auth.uid(), 'review_author_application', 'author_application', p_user_id::text, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.resolve_content_report(p_report_id uuid, p_status text, p_note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(array['moderator']) then raise exception 'admin required'; end if;
  if p_status not in ('resolved','dismissed') then raise exception 'invalid status'; end if;

  update public.content_reports
    set status = p_status, resolution_note = left(coalesce(p_note, ''), 2000), resolved_at = now(), assigned_to = auth.uid()
    where id = p_report_id and status in ('received','reviewing');
  if not found then raise exception 'open report not found'; end if;

  insert into public.admin_audit_logs(actor_id, action, target_type, target_id, detail)
    values (auth.uid(), 'resolve_content_report', 'content_report', p_report_id::text, jsonb_build_object('status', p_status));
end;
$$;

revoke all on function public.review_author_application(uuid, text, text) from public;
revoke all on function public.resolve_content_report(uuid, text, text) from public;
grant execute on function public.review_author_application(uuid, text, text) to authenticated;
grant execute on function public.resolve_content_report(uuid, text, text) to authenticated;

-- 심사 파일은 {user_id}/filename 경로에만 업로드한다. 버킷 자체는 비공개다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('author-samples', 'author-samples', false, 20971520, array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/x-hwp'
]) on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "author_samples_owner_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'author-samples' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "author_samples_owner_read" on storage.objects for select to authenticated
using (bucket_id = 'author-samples' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin(array['creator_reviewer'])));
create policy "author_samples_owner_delete" on storage.objects for delete to authenticated
using (bucket_id = 'author-samples' and (storage.foldername(name))[1] = auth.uid()::text);

revoke insert, update, delete on public.creator_earning_events, public.settlement_statements, public.admin_roles, public.admin_audit_logs from anon, authenticated;
revoke update, delete on public.content_reports, public.consent_logs from authenticated;

-- 결제·광고 웹훅 전용 잔액 변경 함수. anon/authenticated에는 실행 권한이 없다.
create or replace function public.server_credit_wallet(
  p_user_id uuid,
  p_delta integer,
  p_reason text,
  p_reference_id text,
  p_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service role required';
  end if;
  if p_reason not in ('purchase','ad_reward','refund','admin_adjustment') then raise exception 'invalid reason'; end if;
  if p_delta = 0 then raise exception 'delta must not be zero'; end if;

  select balance into v_balance from public.cookie_wallets where user_id = p_user_id for update;
  if not found then raise exception 'wallet not found'; end if;
  if exists (select 1 from public.cookie_ledger where idempotency_key = p_idempotency_key) then return v_balance; end if;
  if v_balance + p_delta < 0 then raise exception 'insufficient balance'; end if;

  v_balance := v_balance + p_delta;
  update public.cookie_wallets set balance = v_balance, updated_at = now() where user_id = p_user_id;
  insert into public.cookie_ledger(user_id, delta, reason, reference_id, idempotency_key, balance_after)
    values (p_user_id, p_delta, p_reason, p_reference_id, p_idempotency_key, v_balance);
  return v_balance;
end;
$$;

revoke all on function public.server_credit_wallet(uuid, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.server_credit_wallet(uuid, integer, text, text, text) to service_role;

create or replace function public.server_apply_payment_event(
  p_order_id uuid,
  p_event_id text,
  p_status text,
  p_amount_krw integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.purchase_orders%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then raise exception 'service role required'; end if;
  if p_status not in ('paid','failed','cancelled','refunded') then raise exception 'invalid status'; end if;
  select * into v_order from public.purchase_orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if v_order.amount_krw <> p_amount_krw then raise exception 'amount mismatch'; end if;
  if v_order.status = p_status then return false; end if;

  if p_status = 'paid' then
    if v_order.status not in ('pending','failed') then raise exception 'invalid payment transition'; end if;
    perform public.server_credit_wallet(v_order.user_id, v_order.cookies, 'purchase', v_order.id::text, 'payment:' || p_event_id);
    update public.purchase_orders set status = 'paid', paid_at = now() where id = v_order.id;
  elsif p_status = 'refunded' then
    if v_order.status <> 'paid' then raise exception 'only paid orders can be refunded'; end if;
    perform public.server_credit_wallet(v_order.user_id, -v_order.cookies, 'refund', v_order.id::text, 'refund:' || p_event_id);
    update public.purchase_orders set status = 'refunded' where id = v_order.id;
  else
    if v_order.status <> 'pending' then raise exception 'invalid payment transition'; end if;
    update public.purchase_orders set status = p_status where id = v_order.id;
  end if;
  return true;
end;
$$;

create or replace function public.server_verify_reward(p_session_id uuid, p_event_id text, p_completed boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.reward_sessions%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then raise exception 'service role required'; end if;
  select * into v_session from public.reward_sessions where id = p_session_id for update;
  if not found then raise exception 'reward session not found'; end if;
  if v_session.status = 'verified' then return false; end if;
  if v_session.status <> 'issued' or v_session.expires_at <= now() then raise exception 'reward session unavailable'; end if;

  if not p_completed then
    update public.reward_sessions set status = 'rejected', provider_event_id = p_event_id where id = v_session.id;
    return true;
  end if;
  perform public.server_credit_wallet(v_session.user_id, v_session.reward_cookies, 'ad_reward', v_session.id::text, 'ad:' || p_event_id);
  update public.reward_sessions set status = 'verified', provider_event_id = p_event_id, verified_at = now() where id = v_session.id;
  return true;
end;
$$;

revoke all on function public.server_apply_payment_event(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.server_verify_reward(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.server_apply_payment_event(uuid, text, text, integer) to service_role;
grant execute on function public.server_verify_reward(uuid, text, boolean) to service_role;
