import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { getCategoryLabel, novels as demoNovels, type CategoryId, type Novel } from '../data';
import { CHAPTER_KEY_BY_UUID, CHAPTER_UUID_BY_KEY, isUuid, NOVEL_SLUG_BY_UUID, NOVEL_UUID_BY_SLUG } from '../lib/platformIds';
import { isDemoMode, supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type ReaderTheme = 'paper' | 'sepia' | 'night' | 'charcoal';
export type ReaderMode = 'page' | 'scroll';
export type ActionResult = { ok: boolean; reason?: string };

export type ReaderSettings = {
  fontSize: number;
  lineHeight: number;
  theme: ReaderTheme;
  mode: ReaderMode;
  fontFamily: 'serif' | 'sans';
  brightness: number;
  contentWidth: number;
};

export type CommentItem = { id: string; author: string; authorId?: string; body: string; createdAt: string };
export type CommunityPostItem = {
  id: string;
  category: Exclude<CategoryId, 'all'>;
  categoryLabel: string;
  title: string;
  body: string;
  author: string;
  authorId?: string;
  createdAt: string;
  views: number;
  comments: number;
  likes: number;
};

export type DraftEpisode = { id: string; novelId: string; chapterNumber: number; title: string; body: string; status: '초안' | '발행'; updatedAt: string };
export type AuthorWork = {
  id: string;
  slug: string;
  title: string;
  category: Exclude<CategoryId, 'all'>;
  synopsis: string;
  status: 'draft' | 'serializing' | 'complete' | 'hidden';
};
type Reaction = 'like' | 'dislike' | null;

export type ModerationReport = {
  id: string;
  targetId: string;
  targetType: 'comment' | 'community_post';
  targetAuthor: string;
  reason: 'spam' | 'abuse' | 'spoiler' | 'copyright' | 'other';
  details: string;
  status: 'received' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: string;
};

export type AuthorApplication = {
  userId?: string;
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  penName: string;
  genre: string;
  introduction: string;
  portfolioUrl: string;
  sampleName: string;
  samplePath?: string;
  sampleExcerpt: string;
  submittedAt?: string;
  reviewNote?: string;
};

type AuthorApplicationInput = Omit<AuthorApplication, 'status' | 'submittedAt' | 'reviewNote' | 'userId' | 'samplePath'> & { sampleFile?: File | null };

type PersistedState = {
  cookieBalance: number;
  unlocked: string[];
  favorites: string[];
  bookmarks: string[];
  reactions: Record<string, Reaction>;
  comments: Record<string, CommentItem[]>;
  readerSettings: ReaderSettings;
  drafts: DraftEpisode[];
  authorWorks: AuthorWork[];
  userPosts: CommunityPostItem[];
  adRewardsToday: number;
  authorApplication: AuthorApplication;
  pendingApplications: AuthorApplication[];
  reports: ModerationReport[];
  blockedUsers: string[];
};

type AppContextValue = PersistedState & {
  catalogNovels: Novel[];
  syncing: boolean;
  syncError: string;
  toggleFavorite: (novelId: string) => void;
  toggleBookmark: (chapterId: string) => void;
  setReaction: (targetId: string, reaction: Reaction) => void;
  addComment: (targetId: string, body: string) => Promise<ActionResult>;
  createCommunityPost: (category: Exclude<CategoryId, 'all'>, title: string, body: string) => Promise<ActionResult>;
  updateReaderSettings: (partial: Partial<ReaderSettings>) => void;
  unlockChapter: (chapterId: string, price: number) => Promise<ActionResult>;
  grantAdReward: (amount: number) => boolean;
  mockPurchase: (amount: number) => boolean;
  createNovel: (title: string, category: Exclude<CategoryId, 'all'>, synopsis: string) => Promise<ActionResult>;
  saveDraft: (novelId: string, title: string, body: string, publish: boolean, draftId?: string) => Promise<ActionResult>;
  submitAuthorApplication: (application: AuthorApplicationInput) => Promise<ActionResult>;
  reportContent: (report: Omit<ModerationReport, 'id' | 'status' | 'createdAt'>) => Promise<ActionResult>;
  blockUser: (displayName: string, userId?: string) => Promise<ActionResult>;
  unblockUser: (displayName: string) => Promise<ActionResult>;
  reviewAuthorApplication: (userId: string | undefined, status: 'approved' | 'rejected', note: string) => Promise<ActionResult>;
  resolveReport: (reportId: string, status: 'resolved' | 'dismissed') => Promise<ActionResult>;
  resetDemoData: () => void;
};

const STORAGE_KEY = 'glyph-demo-state-v4';
const emptyApplication: AuthorApplication = { status: 'not_submitted', penName: '', genre: 'fantasy', introduction: '', portfolioUrl: '', sampleName: '', sampleExcerpt: '' };

const initialState: PersistedState = {
  cookieBalance: 8,
  unlocked: ['ash-1', 'winter-1', 'cafe-1', 'temp-1', 'floor-1', 'laundry-1'],
  favorites: ['ash-sword'],
  bookmarks: [],
  reactions: {},
  comments: {
    'ash-sword': [
      { id: 'c1', author: '청풍독자', body: '첫 문장부터 분위기가 좋네요. 다음 화도 기대합니다.', createdAt: '8분 전' },
      { id: 'c2', author: '무명객', body: '종이학 장면이 눈앞에 그려졌어요.', createdAt: '22분 전' },
    ],
  },
  readerSettings: { fontSize: 19, lineHeight: 1.9, theme: 'paper', mode: 'page', fontFamily: 'sans', brightness: 100, contentWidth: 720 },
  drafts: [
    { id: 'draft-1', novelId: 'demo-work-1', chapterNumber: 4, title: '4화. 북쪽으로 가는 길', body: '산맥 너머에서 검은 연기가 피어올랐다.', status: '초안', updatedAt: '오늘 20:14' },
    { id: 'published-3', novelId: 'demo-work-1', chapterNumber: 3, title: '3화. 열세 번째 발자국', body: '', status: '발행', updatedAt: '10월 12일' },
  ],
  authorWorks: [{ id: 'demo-work-1', slug: 'ash-sword', title: '재가 된 검', category: 'martial', synopsis: '모든 것을 잃은 검객의 마지막 약속.', status: 'serializing' }],
  userPosts: [],
  adRewardsToday: 0,
  authorApplication: emptyApplication,
  pendingApplications: [],
  reports: [],
  blockedUsers: [],
};

const productionState: PersistedState = { ...initialState, cookieBalance: 0, favorites: [], comments: {}, drafts: [], authorWorks: [] };

function loadState(): PersistedState {
  if (!isDemoMode) return productionState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...initialState, ...JSON.parse(raw) } as PersistedState : initialState;
  } catch { return initialState; }
}

function displayDate(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function relatedProfile(value: unknown): { id?: string; display_name?: string } {
  if (Array.isArray(value)) return (value[0] ?? {}) as { id?: string; display_name?: string };
  return (value ?? {}) as { id?: string; display_name?: string };
}

function mapApplication(row: Record<string, unknown> | null): AuthorApplication {
  if (!row) return emptyApplication;
  const samplePath = typeof row.sample_path === 'string' ? row.sample_path : '';
  return {
    userId: String(row.user_id ?? ''), status: row.status as AuthorApplication['status'], penName: String(row.pen_name ?? ''),
    genre: String(row.primary_genre ?? 'fantasy'), introduction: String(row.introduction ?? ''), portfolioUrl: String(row.portfolio_url ?? ''),
    sampleName: samplePath.split('/').pop() ?? '', samplePath, sampleExcerpt: String(row.sample_excerpt ?? ''),
    submittedAt: displayDate(row.submitted_at as string | null), reviewNote: String(row.review_note ?? ''),
  };
}

const catalogColors: Record<Exclude<CategoryId, 'all'>, [string, string]> = {
  martial: ['#29241f', '#8f7cff'], fantasy: ['#302743', '#9f8cff'], romance: ['#493039', '#d49bb7'],
  mystery: ['#28252f', '#ad9acb'], sf: ['#202c3b', '#8caee0'], daily: ['#31434a', '#a6cad3'],
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { viewer } = useAuth();
  const [state, setState] = useState<PersistedState>(loadState);
  const [catalogNovels, setCatalogNovels] = useState<Novel[]>(isDemoMode ? demoNovels : []);
  const [catalogNovelIds, setCatalogNovelIds] = useState<Record<string, string>>({});
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [syncing, setSyncing] = useState(!isDemoMode);
  const [syncError, setSyncError] = useState('');

  const commit = (producer: (previous: PersistedState) => PersistedState) => {
    setState((previous) => {
      const next = producer(previous);
      if (isDemoMode) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (isDemoMode || !supabase) return;
    const client = supabase;
    let active = true;
    void (async () => {
      const { data: novelRows, error: novelError } = await client
        .from('novels')
        .select('id,slug,title,category,synopsis,status,updated_at,profiles!novels_owner_id_fkey(display_name)')
        .in('status', ['serializing', 'complete'])
        .order('updated_at', { ascending: false });
      if (novelError) { if (active) setSyncError(novelError.message); return; }
      const ids = (novelRows ?? []).map((row) => String(row.id));
      const [catalogResponses, accessible] = await Promise.all([
        Promise.all(ids.map((id) => client.rpc('get_chapter_catalog', { p_novel_id: id }))),
        ids.length ? client.rpc('get_readable_chapter_content', { p_novel_ids: ids }) : Promise.resolve({ data: [], error: null }),
      ]);
      if (!active) return;
      const catalogError = catalogResponses.find((response) => response.error)?.error ?? accessible.error;
      if (catalogError) setSyncError(catalogError.message);
      const accessibleRows = (accessible.data ?? []) as Array<{ id: unknown; body: unknown }>;
      const accessibleBodies = new Map<string, string>(accessibleRows.map((row) => [String(row.id), String(row.body ?? '')]));
      const nextCatalog: Novel[] = (novelRows ?? []).map((row, index) => {
        const category = row.category as Exclude<CategoryId, 'all'>;
        const [color, accent] = catalogColors[category] ?? catalogColors.fantasy;
        const profile = relatedProfile(row.profiles);
        const chapterRows = catalogResponses[index]?.data ?? [];
        return {
          id: String(row.slug), title: String(row.title), author: profile.display_name ?? '글리프', category, categoryLabel: getCategoryLabel(category),
          tagline: String(row.synopsis || '새로운 이야기가 시작됩니다.'), description: String(row.synopsis || ''), color, accent,
          rating: 0, readers: '신규', likes: 0, dislikes: 0, tags: [getCategoryLabel(category)], status: row.status === 'complete' ? '완결' : '연재중', schedule: '자유 연재', days: [],
          chapters: chapterRows.map((chapter: Record<string, unknown>) => {
            const body = accessibleBodies.get(String(chapter.id)) ?? '';
            return { id: String(chapter.id), number: Number(chapter.chapter_number), title: String(chapter.title), publishedAt: String(chapter.published_at ?? '').slice(0, 10), price: Number(chapter.price_cookies), words: body.length, content: body ? body.split(/\n{2,}/).filter(Boolean) : [] };
          }),
        };
      });
      setCatalogNovelIds(Object.fromEntries((novelRows ?? []).map((row) => [String(row.slug), String(row.id)])));
      setCatalogNovels(nextCatalog);
    })();
    return () => { active = false; };
  }, [catalogRevision, viewer]);

  useEffect(() => {
    if (isDemoMode || !supabase) { setSyncing(false); return; }
    if (!viewer) {
      setState((previous) => ({ ...productionState, readerSettings: previous.readerSettings }));
      setSyncing(false);
      return;
    }

    let active = true;
    setSyncing(true);
    setSyncError('');
    const novelSlugByUuid = Object.fromEntries(Object.entries(catalogNovelIds).map(([slug, id]) => [id, slug]));

    void (async () => {
      const [wallet, unlocks, reactions, comments, application, posts, blocks, reports, works, postComments, postReactions] = await Promise.all([
        supabase.from('cookie_wallets').select('balance').eq('user_id', viewer.id).maybeSingle(),
        supabase.from('chapter_unlocks').select('chapter_id').eq('user_id', viewer.id),
        supabase.from('reactions').select('target_type,target_id,value').eq('user_id', viewer.id),
        supabase.from('comments').select('id,novel_id,body,created_at,profiles!comments_user_id_fkey(id,display_name)').not('novel_id', 'is', null).eq('status', 'visible').order('created_at', { ascending: false }).limit(300),
        supabase.from('author_applications').select('*').eq('user_id', viewer.id).maybeSingle(),
        supabase.from('community_posts').select('id,category,title,body,created_at,profiles!community_posts_user_id_fkey(id,display_name)').eq('status', 'visible').order('created_at', { ascending: false }).limit(100),
        supabase.from('user_blocks').select('blocked_id,profiles!user_blocks_blocked_id_fkey(display_name)').eq('blocker_id', viewer.id),
        supabase.from('content_reports').select('id,target_type,target_id,reason,details,status,created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('novels').select('id,slug,title,category,synopsis,status').eq('owner_id', viewer.id).order('updated_at', { ascending: false }),
        supabase.from('comments').select('post_id').not('post_id', 'is', null).eq('status', 'visible').limit(10000),
        supabase.from('reactions').select('target_id,value').eq('target_type', 'community_post').limit(10000),
      ]);
      const workIds = (works.data ?? []).map((row) => String(row.id));
      const workChapters = workIds.length
        ? await supabase.from('chapters').select('id,novel_id,chapter_number,title,body,status,updated_at').in('novel_id', workIds).order('chapter_number', { ascending: false })
        : { data: [], error: null };
      const applications = viewer.isAdmin
        ? await supabase.from('author_applications').select('*').eq('status', 'pending').order('submitted_at', { ascending: true }).limit(100)
        : { data: [], error: null };
      if (!active) return;

      const errors = [wallet.error, unlocks.error, reactions.error, comments.error, application.error, posts.error, blocks.error, reports.error, works.error, postComments.error, postReactions.error, workChapters.error, applications.error].filter(Boolean);
      if (errors.length) setSyncError(errors[0]?.message ?? '일부 데이터를 불러오지 못했습니다.');

      const reactionMap: Record<string, Reaction> = {};
      for (const row of reactions.data ?? []) {
        const targetId = String(row.target_id);
        const key = row.target_type === 'novel' ? (novelSlugByUuid[targetId] ?? NOVEL_SLUG_BY_UUID[targetId]) : `post:${targetId}`;
        if (key) reactionMap[key] = row.value === 1 ? 'like' : 'dislike';
      }

      const commentMap: Record<string, CommentItem[]> = {};
      for (const row of comments.data ?? []) {
        const novelUuid = String(row.novel_id);
        const slug = novelSlugByUuid[novelUuid] ?? NOVEL_SLUG_BY_UUID[novelUuid];
        if (!slug) continue;
        const profile = relatedProfile(row.profiles);
        (commentMap[slug] ??= []).push({ id: String(row.id), author: profile.display_name ?? '글리프 독자', authorId: profile.id, body: String(row.body), createdAt: displayDate(row.created_at) });
      }

      const postCommentCounts = new Map<string, number>();
      for (const row of postComments.data ?? []) {
        const postId = String(row.post_id ?? '');
        if (postId) postCommentCounts.set(postId, (postCommentCounts.get(postId) ?? 0) + 1);
      }
      const postLikeCounts = new Map<string, number>();
      for (const row of postReactions.data ?? []) {
        if (row.value !== 1) continue;
        const postId = String(row.target_id ?? '');
        if (postId) postLikeCounts.set(postId, (postLikeCounts.get(postId) ?? 0) + 1);
      }

      const remotePosts: CommunityPostItem[] = (posts.data ?? []).map((row) => {
        const profile = relatedProfile(row.profiles);
        const category = row.category as Exclude<CategoryId, 'all'>;
        const postId = String(row.id);
        return { id: postId, category, categoryLabel: getCategoryLabel(category), title: String(row.title), body: String(row.body), author: profile.display_name ?? '글리프 독자', authorId: profile.id, createdAt: displayDate(row.created_at), views: 0, comments: postCommentCounts.get(postId) ?? 0, likes: postLikeCounts.get(postId) ?? 0 };
      });

      setState((previous) => ({
        ...productionState,
        readerSettings: previous.readerSettings,
        favorites: previous.favorites,
        bookmarks: previous.bookmarks,
        cookieBalance: wallet.data?.balance ?? 0,
        unlocked: (unlocks.data ?? []).map((row) => CHAPTER_KEY_BY_UUID[String(row.chapter_id)] ?? String(row.chapter_id)).filter(Boolean),
        reactions: reactionMap,
        comments: commentMap,
        authorWorks: (works.data ?? []).map((row) => ({
          id: String(row.id),
          slug: String(row.slug),
          title: String(row.title),
          category: row.category as Exclude<CategoryId, 'all'>,
          synopsis: String(row.synopsis ?? ''),
          status: row.status as AuthorWork['status'],
        })),
        drafts: (workChapters.data ?? []).map((row) => ({
          id: String(row.id),
          novelId: String(row.novel_id),
          chapterNumber: Number(row.chapter_number),
          title: String(row.title),
          body: String(row.body ?? ''),
          status: row.status === 'published' ? '발행' : '초안',
          updatedAt: displayDate(row.updated_at),
        })),
        authorApplication: mapApplication(application.data as Record<string, unknown> | null),
        pendingApplications: (applications.data ?? []).map((row) => mapApplication(row as Record<string, unknown>)),
        userPosts: remotePosts,
        reports: (reports.data ?? []).map((row) => ({ id: String(row.id), targetId: String(row.target_id), targetType: row.target_type as ModerationReport['targetType'], targetAuthor: '신고 대상', reason: row.reason as ModerationReport['reason'], details: String(row.details), status: row.status as ModerationReport['status'], createdAt: displayDate(row.created_at) })),
        blockedUsers: (blocks.data ?? []).map((row) => relatedProfile(row.profiles).display_name).filter((name): name is string => Boolean(name)),
      }));
      setSyncing(false);
    })();

    return () => { active = false; };
  }, [catalogNovelIds, viewer]);

  const value = useMemo<AppContextValue>(() => ({
    ...state,
    catalogNovels,
    syncing,
    syncError,
    toggleFavorite: (novelId) => commit((previous) => ({ ...previous, favorites: previous.favorites.includes(novelId) ? previous.favorites.filter((id) => id !== novelId) : [...previous.favorites, novelId] })),
    toggleBookmark: (chapterId) => commit((previous) => ({ ...previous, bookmarks: previous.bookmarks.includes(chapterId) ? previous.bookmarks.filter((id) => id !== chapterId) : [...previous.bookmarks, chapterId] })),
    setReaction: (targetKey, reaction) => {
      if (!isDemoMode && (!supabase || !viewer)) {
        setSyncError('로그인 후 좋아요와 싫어요를 남길 수 있습니다.');
        return;
      }
      const next = state.reactions[targetKey] === reaction ? null : reaction;
      commit((previous) => ({ ...previous, reactions: { ...previous.reactions, [targetKey]: next } }));
      if (isDemoMode || !supabase || !viewer) return;
      const isPost = targetKey.startsWith('post:');
      const targetId = isPost ? targetKey.slice(5) : (catalogNovelIds[targetKey] ?? NOVEL_UUID_BY_SLUG[targetKey]);
      if (!targetId || !isUuid(targetId)) return;
      const request = next
        ? supabase.from('reactions').upsert({ user_id: viewer.id, target_type: isPost ? 'community_post' : 'novel', target_id: targetId, value: next === 'like' ? 1 : -1, updated_at: new Date().toISOString() })
        : supabase.from('reactions').delete().eq('user_id', viewer.id).eq('target_type', isPost ? 'community_post' : 'novel').eq('target_id', targetId);
      void request.then(({ error }) => { if (error) setSyncError(error.message); });
    },
    addComment: async (targetId, body) => {
      const clean = body.trim().slice(0, 1000);
      if (!clean) return { ok: false, reason: '댓글을 입력해 주세요.' };
      if (isDemoMode) {
        commit((previous) => ({ ...previous, comments: { ...previous.comments, [targetId]: [{ id: crypto.randomUUID(), author: '나', body: clean, createdAt: '방금 전' }, ...(previous.comments[targetId] ?? [])] } }));
        return { ok: true };
      }
      if (!supabase || !viewer) return { ok: false, reason: '로그인 후 댓글을 등록할 수 있습니다.' };
      const novelId = catalogNovelIds[targetId] ?? NOVEL_UUID_BY_SLUG[targetId];
      if (!novelId) return { ok: false, reason: '댓글 대상 작품을 찾을 수 없습니다.' };
      const { data, error } = await supabase.from('comments').insert({ user_id: viewer.id, novel_id: novelId, body: clean }).select('id,created_at').single();
      if (error) return { ok: false, reason: error.message };
      commit((previous) => ({ ...previous, comments: { ...previous.comments, [targetId]: [{ id: String(data.id), author: viewer.displayName, authorId: viewer.id, body: clean, createdAt: '방금 전' }, ...(previous.comments[targetId] ?? [])] } }));
      return { ok: true };
    },
    createCommunityPost: async (category, title, body) => {
      const cleanTitle = title.trim().slice(0, 120);
      const cleanBody = body.trim().slice(0, 10000);
      if (!cleanTitle || !cleanBody) return { ok: false, reason: '제목과 내용을 입력해 주세요.' };
      if (isDemoMode) {
        commit((previous) => ({ ...previous, userPosts: [{ id: crypto.randomUUID(), category, categoryLabel: getCategoryLabel(category), title: cleanTitle, body: cleanBody, author: '나', createdAt: '방금 전', views: 0, comments: 0, likes: 0 }, ...previous.userPosts] }));
        return { ok: true };
      }
      if (!supabase || !viewer) return { ok: false, reason: '로그인 후 글을 등록할 수 있습니다.' };
      const { data, error } = await supabase.from('community_posts').insert({ user_id: viewer.id, category, title: cleanTitle, body: cleanBody }).select('id,created_at').single();
      if (error) return { ok: false, reason: error.message };
      commit((previous) => ({ ...previous, userPosts: [{ id: String(data.id), category, categoryLabel: getCategoryLabel(category), title: cleanTitle, body: cleanBody, author: viewer.displayName, authorId: viewer.id, createdAt: '방금 전', views: 0, comments: 0, likes: 0 }, ...previous.userPosts] }));
      return { ok: true };
    },
    updateReaderSettings: (partial) => commit((previous) => ({ ...previous, readerSettings: { ...previous.readerSettings, ...partial } })),
    unlockChapter: async (chapterId, price) => {
      if (state.unlocked.includes(chapterId) || price === 0) return { ok: true };
      if (isDemoMode) {
        if (state.cookieBalance < price) return { ok: false, reason: '쿠키가 부족합니다.' };
        commit((previous) => ({ ...previous, cookieBalance: previous.cookieBalance - price, unlocked: [...previous.unlocked, chapterId] }));
        return { ok: true };
      }
      if (!supabase || !viewer) return { ok: false, reason: '로그인 후 회차를 소장할 수 있습니다.' };
      const chapterUuid = CHAPTER_UUID_BY_KEY[chapterId] ?? (isUuid(chapterId) ? chapterId : undefined);
      if (!chapterUuid) return { ok: false, reason: '회차 정보를 찾을 수 없습니다.' };
      const { data, error } = await supabase.rpc('unlock_chapter', { p_chapter_id: chapterUuid });
      if (error) return { ok: false, reason: error.message };
      if (!data) return { ok: false, reason: '쿠키가 부족합니다.' };
      const { data: wallet } = await supabase.from('cookie_wallets').select('balance').eq('user_id', viewer.id).single();
      commit((previous) => ({ ...previous, cookieBalance: wallet?.balance ?? Math.max(0, previous.cookieBalance - price), unlocked: [...previous.unlocked, chapterId] }));
      setCatalogRevision((value) => value + 1);
      return { ok: true };
    },
    grantAdReward: (amount) => {
      if (!isDemoMode) return false;
      commit((previous) => ({ ...previous, cookieBalance: previous.cookieBalance + amount, adRewardsToday: previous.adRewardsToday + 1 }));
      return true;
    },
    mockPurchase: (amount) => {
      if (!isDemoMode) return false;
      commit((previous) => ({ ...previous, cookieBalance: previous.cookieBalance + amount }));
      return true;
    },
    createNovel: async (title, category, synopsis) => {
      const cleanTitle = title.trim().slice(0, 100);
      const cleanSynopsis = synopsis.trim().slice(0, 3000);
      if (!cleanTitle) return { ok: false, reason: '작품 제목을 입력해 주세요.' };
      if (state.authorApplication.status !== 'approved') return { ok: false, reason: '작가 승인 후 작품을 등록할 수 있습니다.' };
      const work: AuthorWork = {
        id: crypto.randomUUID(),
        slug: `work-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`,
        title: cleanTitle,
        category,
        synopsis: cleanSynopsis,
        status: 'draft',
      };
      if (isDemoMode) {
        commit((previous) => ({ ...previous, authorWorks: [work, ...previous.authorWorks] }));
        return { ok: true };
      }
      if (!supabase || !viewer) return { ok: false, reason: '로그인 후 작품을 등록할 수 있습니다.' };
      const { data, error } = await supabase.from('novels').insert({ owner_id: viewer.id, slug: work.slug, title: work.title, category: work.category, synopsis: work.synopsis, status: 'draft' }).select('id,slug,title,category,synopsis,status').single();
      if (error) return { ok: false, reason: error.message };
      setCatalogNovelIds((previous) => ({ ...previous, [String(data.slug)]: String(data.id) }));
      commit((previous) => ({ ...previous, authorWorks: [{ id: String(data.id), slug: String(data.slug), title: String(data.title), category: data.category as Exclude<CategoryId, 'all'>, synopsis: String(data.synopsis ?? ''), status: data.status as AuthorWork['status'] }, ...previous.authorWorks] }));
      return { ok: true };
    },
    saveDraft: async (novelId, title, body, publish, draftId) => {
      const cleanTitle = title.trim().slice(0, 100);
      const cleanBody = body.trim().slice(0, 200000);
      if (!novelId || !state.authorWorks.some((work) => work.id === novelId)) return { ok: false, reason: '회차를 등록할 작품을 선택해 주세요.' };
      if (!cleanTitle) return { ok: false, reason: '회차 제목을 입력해 주세요.' };
      if (publish && cleanBody.length < 10) return { ok: false, reason: '발행할 본문을 10자 이상 입력해 주세요.' };
      if (state.authorApplication.status !== 'approved') return { ok: false, reason: '작가 승인 후 회차를 저장할 수 있습니다.' };
      const existing = draftId ? state.drafts.find((draft) => draft.id === draftId && draft.novelId === novelId) : undefined;
      const chapterNumber = existing?.chapterNumber ?? Math.max(0, ...state.drafts.filter((draft) => draft.novelId === novelId).map((draft) => draft.chapterNumber)) + 1;
      const draft: DraftEpisode = { id: existing?.id ?? crypto.randomUUID(), novelId, chapterNumber, title: cleanTitle, body: cleanBody, status: publish ? '발행' : '초안', updatedAt: '방금 전' };
      if (isDemoMode) {
        commit((previous) => ({ ...previous, drafts: existing ? previous.drafts.map((item) => item.id === existing.id ? draft : item) : [draft, ...previous.drafts], authorWorks: previous.authorWorks.map((work) => work.id === novelId && publish ? { ...work, status: 'serializing' } : work) }));
        return { ok: true };
      }
      if (!supabase || !viewer) return { ok: false, reason: '로그인 후 회차를 저장할 수 있습니다.' };
      const payload = { novel_id: novelId, chapter_number: chapterNumber, title: cleanTitle, body: cleanBody, price_cookies: 0, status: publish ? 'published' : 'draft', published_at: publish ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
      const request = existing
        ? supabase.from('chapters').update(payload).eq('id', existing.id).select('id,updated_at').single()
        : supabase.from('chapters').insert(payload).select('id,updated_at').single();
      const { data, error } = await request;
      if (error) return { ok: false, reason: error.message };
      if (publish) {
        const { error: novelError } = await supabase.from('novels').update({ status: 'serializing', updated_at: new Date().toISOString() }).eq('id', novelId);
        if (novelError) return { ok: false, reason: `회차는 저장됐지만 작품 상태를 갱신하지 못했습니다: ${novelError.message}` };
        setCatalogRevision((value) => value + 1);
      }
      commit((previous) => ({
        ...previous,
        drafts: existing
          ? previous.drafts.map((item) => item.id === existing.id ? { ...draft, id: String(data.id), updatedAt: displayDate(data.updated_at) } : item)
          : [{ ...draft, id: String(data.id), updatedAt: displayDate(data.updated_at) }, ...previous.drafts],
        authorWorks: previous.authorWorks.map((work) => work.id === novelId && publish ? { ...work, status: 'serializing' } : work),
      }));
      return { ok: true };
    },
    submitAuthorApplication: async (application) => {
      if (isDemoMode) {
        commit((previous) => ({ ...previous, authorApplication: { ...application, sampleName: application.sampleName, status: 'pending', submittedAt: '방금 전' } }));
        return { ok: true };
      }
      if (!supabase || !viewer) return { ok: false, reason: '로그인 후 작가 등록을 신청할 수 있습니다.' };
      let samplePath = '';
      if (application.sampleFile) {
        const safeName = application.sampleFile.name.normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
        samplePath = `${viewer.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('author-samples').upload(samplePath, application.sampleFile, { upsert: false });
        if (uploadError) return { ok: false, reason: `원고 업로드 실패: ${uploadError.message}` };
      }
      const { error } = await supabase.rpc('submit_author_application', { p_pen_name: application.penName, p_primary_genre: application.genre, p_introduction: application.introduction, p_portfolio_url: application.portfolioUrl || null, p_sample_path: samplePath || null, p_sample_excerpt: application.sampleExcerpt || null });
      if (error) {
        if (samplePath) await supabase.storage.from('author-samples').remove([samplePath]);
        return { ok: false, reason: error.message };
      }
      commit((previous) => ({ ...previous, authorApplication: { ...application, sampleName: application.sampleName, samplePath, userId: viewer.id, status: 'pending', submittedAt: '방금 전' } }));
      return { ok: true };
    },
    reportContent: async (report) => {
      if (isDemoMode) {
        commit((previous) => ({ ...previous, reports: [{ ...report, id: crypto.randomUUID(), status: 'received', createdAt: new Date().toISOString() }, ...previous.reports] }));
        return { ok: true };
      }
      if (!supabase || !viewer) return { ok: false, reason: '로그인 후 신고할 수 있습니다.' };
      if (!isUuid(report.targetId)) return { ok: false, reason: '샘플 콘텐츠는 운영 신고 대상이 아닙니다.' };
      const { data, error } = await supabase.from('content_reports').insert({ reporter_id: viewer.id, target_type: report.targetType, target_id: report.targetId, reason: report.reason, details: report.details }).select('id,created_at').single();
      if (error) return { ok: false, reason: error.message };
      commit((previous) => ({ ...previous, reports: [{ ...report, id: String(data.id), status: 'received', createdAt: displayDate(data.created_at) }, ...previous.reports] }));
      return { ok: true };
    },
    blockUser: async (displayName, userId) => {
      if (isDemoMode) {
        commit((previous) => ({ ...previous, blockedUsers: previous.blockedUsers.includes(displayName) ? previous.blockedUsers : [...previous.blockedUsers, displayName] }));
        return { ok: true };
      }
      if (!supabase || !viewer) return { ok: false, reason: '로그인 후 사용자를 차단할 수 있습니다.' };
      let blockedId = userId;
      if (!blockedId) {
        const { data } = await supabase.from('profiles').select('id').eq('display_name', displayName).limit(1).maybeSingle();
        blockedId = data?.id;
      }
      if (!blockedId || blockedId === viewer.id) return { ok: false, reason: '차단할 사용자를 찾을 수 없습니다.' };
      const { error } = await supabase.from('user_blocks').upsert({ blocker_id: viewer.id, blocked_id: blockedId });
      if (error) return { ok: false, reason: error.message };
      commit((previous) => ({ ...previous, blockedUsers: previous.blockedUsers.includes(displayName) ? previous.blockedUsers : [...previous.blockedUsers, displayName] }));
      return { ok: true };
    },
    unblockUser: async (displayName) => {
      if (isDemoMode) {
        commit((previous) => ({ ...previous, blockedUsers: previous.blockedUsers.filter((name) => name !== displayName) }));
        return { ok: true };
      }
      if (!supabase || !viewer) return { ok: false, reason: '로그인이 필요합니다.' };
      const { data } = await supabase.from('profiles').select('id').eq('display_name', displayName).limit(1).maybeSingle();
      if (!data?.id) return { ok: false, reason: '사용자를 찾을 수 없습니다.' };
      const { error } = await supabase.from('user_blocks').delete().eq('blocker_id', viewer.id).eq('blocked_id', data.id);
      if (error) return { ok: false, reason: error.message };
      commit((previous) => ({ ...previous, blockedUsers: previous.blockedUsers.filter((name) => name !== displayName) }));
      return { ok: true };
    },
    reviewAuthorApplication: async (userId, status, note) => {
      if (isDemoMode) {
        commit((previous) => ({ ...previous, authorApplication: { ...previous.authorApplication, status, reviewNote: note.trim().slice(0, 1000) }, pendingApplications: [] }));
        return { ok: true };
      }
      if (!supabase || !viewer?.isAdmin || !userId) return { ok: false, reason: '심사 권한이 없습니다.' };
      const { error } = await supabase.rpc('review_author_application', { p_user_id: userId, p_status: status, p_note: note.trim().slice(0, 1000) });
      if (error) return { ok: false, reason: error.message };
      commit((previous) => ({ ...previous, pendingApplications: previous.pendingApplications.filter((item) => item.userId !== userId) }));
      return { ok: true };
    },
    resolveReport: async (reportId, status) => {
      if (isDemoMode) {
        commit((previous) => ({ ...previous, reports: previous.reports.map((report) => report.id === reportId ? { ...report, status } : report) }));
        return { ok: true };
      }
      if (!supabase || !viewer?.isAdmin) return { ok: false, reason: '처리 권한이 없습니다.' };
      const { error } = await supabase.rpc('resolve_content_report', { p_report_id: reportId, p_status: status, p_note: '' });
      if (error) return { ok: false, reason: error.message };
      commit((previous) => ({ ...previous, reports: previous.reports.map((report) => report.id === reportId ? { ...report, status } : report) }));
      return { ok: true };
    },
    resetDemoData: () => commit(() => initialState),
  }), [catalogNovelIds, catalogNovels, state, syncError, syncing, viewer]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
