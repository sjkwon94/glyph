-- 글리프 운영 데이터 모델 (Supabase/Postgres)
-- 원칙: 금액·쿠키 잔액·회차 소장은 브라우저에서 직접 수정할 수 없다.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.author_applications (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pen_name text not null check (char_length(pen_name) between 2 and 30),
  primary_genre text not null check (primary_genre in ('martial','fantasy','romance','mystery','sf','daily')),
  introduction text not null check (char_length(introduction) between 50 and 1000),
  portfolio_url text check (portfolio_url is null or char_length(portfolio_url) <= 500),
  sample_path text check (sample_path is null or char_length(sample_path) <= 500),
  sample_excerpt text check (sample_excerpt is null or char_length(sample_excerpt) <= 10000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    nullif(btrim(portfolio_url), '') is not null
    or nullif(btrim(sample_path), '') is not null
    or char_length(coalesce(btrim(sample_excerpt), '')) >= 200
  )
);

create table public.novels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title text not null check (char_length(title) between 1 and 100),
  category text not null check (category in ('martial','fantasy','romance','mystery','sf','daily')),
  synopsis text not null default '' check (char_length(synopsis) <= 3000),
  cover_path text,
  status text not null default 'draft' check (status in ('draft','serializing','complete','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels(id) on delete cascade,
  chapter_number integer not null check (chapter_number > 0),
  title text not null check (char_length(title) between 1 and 100),
  body text not null default '' check (char_length(body) <= 200000),
  price_cookies integer not null default 0 check (price_cookies between 0 and 100),
  status text not null default 'draft' check (status in ('draft','scheduled','published','hidden')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (novel_id, chapter_number)
);

create table public.cookie_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.cookie_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('purchase','ad_reward','chapter_unlock','refund','admin_adjustment')),
  reference_id text not null,
  idempotency_key text not null unique,
  balance_after integer not null check (balance_after >= 0),
  created_at timestamptz not null default now()
);

create table public.chapter_unlocks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  price_paid integer not null check (price_paid >= 0),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

create table public.reactions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('novel','chapter','community_post')),
  target_id uuid not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('martial','fantasy','romance','mystery','sf','daily')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 10000),
  status text not null default 'visible' check (status in ('visible','hidden','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  novel_id uuid references public.novels(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  status text not null default 'visible' check (status in ('visible','hidden','deleted')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(novel_id, chapter_id, post_id) = 1)
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_order_id text not null unique,
  amount_krw integer not null check (amount_krw > 0),
  cookies integer not null check (cookies > 0),
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','refunded')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table public.reward_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_event_id text unique,
  nonce_hash text not null unique,
  status text not null default 'issued' check (status in ('issued','verified','rejected','expired')),
  reward_cookies integer not null check (reward_cookies between 1 and 10),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create index chapters_public_idx on public.chapters(novel_id, chapter_number) where status = 'published';
create index author_applications_status_idx on public.author_applications(status, submitted_at);
create index posts_category_idx on public.community_posts(category, created_at desc) where status = 'visible';
create index comments_novel_idx on public.comments(novel_id, created_at desc) where status = 'visible';
create index ledger_user_idx on public.cookie_ledger(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.author_applications enable row level security;
alter table public.novels enable row level security;
alter table public.chapters enable row level security;
alter table public.cookie_wallets enable row level security;
alter table public.cookie_ledger enable row level security;
alter table public.chapter_unlocks enable row level security;
alter table public.reactions enable row level security;
alter table public.community_posts enable row level security;
alter table public.comments enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.reward_sessions enable row level security;

create policy "profiles_public_read" on public.profiles for select using (true);
create policy "profiles_owner_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "author_applications_owner_read" on public.author_applications for select using (user_id = auth.uid());
create policy "author_applications_owner_insert" on public.author_applications for insert with check (user_id = auth.uid() and status = 'pending');
create policy "novels_public_read" on public.novels for select using (status in ('serializing','complete') or owner_id = auth.uid());
create policy "novels_owner_insert" on public.novels for insert with check (
  owner_id = auth.uid()
  and exists (select 1 from public.author_applications a where a.user_id = auth.uid() and a.status = 'approved')
);
create policy "novels_owner_update" on public.novels for update using (
  owner_id = auth.uid()
  and exists (select 1 from public.author_applications a where a.user_id = auth.uid() and a.status = 'approved')
) with check (
  owner_id = auth.uid()
  and exists (select 1 from public.author_applications a where a.user_id = auth.uid() and a.status = 'approved')
);
create policy "novels_owner_delete" on public.novels for delete using (owner_id = auth.uid());

-- 유료 본문은 소장한 독자와 작가만 읽는다. 목록용 메타데이터는 별도 View/API로 노출한다.
create policy "chapters_owner_all" on public.chapters for all
  using (
    exists (select 1 from public.novels n where n.id = novel_id and n.owner_id = auth.uid())
    and exists (select 1 from public.author_applications a where a.user_id = auth.uid() and a.status = 'approved')
  )
  with check (
    exists (select 1 from public.novels n where n.id = novel_id and n.owner_id = auth.uid())
    and exists (select 1 from public.author_applications a where a.user_id = auth.uid() and a.status = 'approved')
  );
create policy "chapters_reader_select" on public.chapters for select using (
  status = 'published' and published_at <= now() and (
    price_cookies = 0 or exists (
      select 1 from public.chapter_unlocks u where u.chapter_id = id and u.user_id = auth.uid()
    )
  )
);

create policy "wallet_owner_read" on public.cookie_wallets for select using (user_id = auth.uid());
create policy "ledger_owner_read" on public.cookie_ledger for select using (user_id = auth.uid());
create policy "unlocks_owner_read" on public.chapter_unlocks for select using (user_id = auth.uid());
create policy "purchases_owner_read" on public.purchase_orders for select using (user_id = auth.uid());
create policy "rewards_owner_read" on public.reward_sessions for select using (user_id = auth.uid());

create policy "reactions_public_read" on public.reactions for select using (true);
create policy "reactions_owner_insert" on public.reactions for insert with check (user_id = auth.uid());
create policy "reactions_owner_update" on public.reactions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reactions_owner_delete" on public.reactions for delete using (user_id = auth.uid());
create policy "posts_public_read" on public.community_posts for select using (status = 'visible' or user_id = auth.uid());
create policy "posts_owner_insert" on public.community_posts for insert with check (user_id = auth.uid());
create policy "posts_owner_update" on public.community_posts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "comments_public_read" on public.comments for select using (status = 'visible' or user_id = auth.uid());
create policy "comments_owner_insert" on public.comments for insert with check (user_id = auth.uid());
create policy "comments_owner_update" on public.comments for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(nullif(left(new.raw_user_meta_data->>'display_name', 30), ''), '새 독자'));
  insert into public.cookie_wallets(user_id, balance) values (new.id, 0);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.unlock_chapter(p_chapter_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_price integer;
  v_balance integer;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  select price_cookies into v_price from public.chapters
    where id = p_chapter_id and status = 'published' and published_at <= now();
  if not found then raise exception 'chapter unavailable'; end if;
  if exists (select 1 from public.chapter_unlocks where user_id = v_user and chapter_id = p_chapter_id) then return true; end if;

  select balance into v_balance from public.cookie_wallets where user_id = v_user for update;
  if v_balance < v_price then return false; end if;

  insert into public.chapter_unlocks(user_id, chapter_id, price_paid) values (v_user, p_chapter_id, v_price);
  if v_price > 0 then
    update public.cookie_wallets set balance = balance - v_price, updated_at = now() where user_id = v_user;
    insert into public.cookie_ledger(user_id, delta, reason, reference_id, idempotency_key, balance_after)
      values (v_user, -v_price, 'chapter_unlock', p_chapter_id::text, 'unlock:' || v_user::text || ':' || p_chapter_id::text, v_balance - v_price);
  end if;
  return true;
end;
$$;

revoke all on function public.unlock_chapter(uuid) from public;
grant execute on function public.unlock_chapter(uuid) to authenticated;

-- 본문을 제외한 안전한 회차 목록. SECURITY DEFINER이지만 반환 열을 고정하고
-- 공개 상태인 회차만 읽으므로 잠긴 본문이나 초안은 노출하지 않는다.
create or replace function public.get_chapter_catalog(p_novel_id uuid)
returns table (
  id uuid,
  novel_id uuid,
  chapter_number integer,
  title text,
  price_cookies integer,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.novel_id, c.chapter_number, c.title, c.price_cookies, c.published_at
  from public.chapters c
  where c.novel_id = p_novel_id and c.status = 'published' and c.published_at <= now()
  order by c.chapter_number;
$$;

revoke all on function public.get_chapter_catalog(uuid) from public;
grant execute on function public.get_chapter_catalog(uuid) to anon, authenticated;

revoke all on public.cookie_wallets, public.cookie_ledger, public.chapter_unlocks, public.purchase_orders, public.reward_sessions from anon;
revoke insert, update, delete on public.cookie_wallets, public.cookie_ledger, public.chapter_unlocks, public.purchase_orders, public.reward_sessions from authenticated;
revoke update, delete on public.author_applications from authenticated;
revoke update (status) on public.community_posts, public.comments from authenticated;
