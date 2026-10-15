import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { isDemoMode } from '../lib/supabase';

export type ReaderTheme = 'paper' | 'sepia' | 'night' | 'charcoal';
export type ReaderMode = 'page' | 'scroll';

export type ReaderSettings = {
  fontSize: number;
  lineHeight: number;
  theme: ReaderTheme;
  mode: ReaderMode;
  fontFamily: 'serif' | 'sans';
  brightness: number;
  contentWidth: number;
};

export type CommentItem = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

type DraftEpisode = {
  id: string;
  title: string;
  body: string;
  status: '초안' | '발행';
  updatedAt: string;
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
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  penName: string;
  genre: string;
  introduction: string;
  portfolioUrl: string;
  sampleName: string;
  sampleExcerpt: string;
  submittedAt?: string;
  reviewNote?: string;
};

type PersistedState = {
  cookieBalance: number;
  unlocked: string[];
  favorites: string[];
  bookmarks: string[];
  reactions: Record<string, Reaction>;
  comments: Record<string, CommentItem[]>;
  readerSettings: ReaderSettings;
  drafts: DraftEpisode[];
  adRewardsToday: number;
  authorApplication: AuthorApplication;
  reports: ModerationReport[];
  blockedUsers: string[];
};

type AppContextValue = PersistedState & {
  toggleFavorite: (novelId: string) => void;
  toggleBookmark: (chapterId: string) => void;
  setReaction: (targetId: string, reaction: Reaction) => void;
  addComment: (targetId: string, body: string) => void;
  updateReaderSettings: (partial: Partial<ReaderSettings>) => void;
  unlockChapter: (chapterId: string, price: number) => { ok: boolean; reason?: string };
  grantAdReward: (amount: number) => void;
  mockPurchase: (amount: number) => void;
  saveDraft: (title: string, body: string, publish: boolean) => boolean;
  submitAuthorApplication: (application: Omit<AuthorApplication, 'status' | 'submittedAt' | 'reviewNote'>) => void;
  reportContent: (report: Omit<ModerationReport, 'id' | 'status' | 'createdAt'>) => void;
  blockUser: (displayName: string) => void;
  unblockUser: (displayName: string) => void;
  reviewAuthorApplication: (status: 'approved' | 'rejected', note: string) => void;
  resolveReport: (reportId: string, status: 'resolved' | 'dismissed') => void;
  resetDemoData: () => void;
};

const STORAGE_KEY = 'glyph-demo-state-v3';

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
    { id: 'draft-1', title: '4화. 북쪽으로 가는 길', body: '산맥 너머에서 검은 연기가 피어올랐다.', status: '초안', updatedAt: '오늘 20:14' },
    { id: 'published-3', title: '3화. 열세 번째 발자국', body: '', status: '발행', updatedAt: '10월 12일' },
  ],
  adRewardsToday: 0,
  authorApplication: { status: 'not_submitted', penName: '', genre: 'fantasy', introduction: '', portfolioUrl: '', sampleName: '', sampleExcerpt: '' },
  reports: [],
  blockedUsers: [],
};

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    return { ...initialState, ...JSON.parse(raw) } as PersistedState;
  } catch {
    return initialState;
  }
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadState);

  const commit = (producer: (previous: PersistedState) => PersistedState) => {
    setState((previous) => {
      const next = producer(previous);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo<AppContextValue>(() => ({
    ...state,
    toggleFavorite: (novelId) => commit((previous) => ({
      ...previous,
      favorites: previous.favorites.includes(novelId)
        ? previous.favorites.filter((id) => id !== novelId)
        : [...previous.favorites, novelId],
    })),
    toggleBookmark: (chapterId) => commit((previous) => ({
      ...previous,
      bookmarks: previous.bookmarks.includes(chapterId)
        ? previous.bookmarks.filter((id) => id !== chapterId)
        : [...previous.bookmarks, chapterId],
    })),
    setReaction: (targetId, reaction) => commit((previous) => ({
      ...previous,
      reactions: { ...previous.reactions, [targetId]: previous.reactions[targetId] === reaction ? null : reaction },
    })),
    addComment: (targetId, body) => {
      const clean = body.trim().slice(0, 1000);
      if (!clean) return;
      commit((previous) => ({
        ...previous,
        comments: {
          ...previous.comments,
          [targetId]: [
            { id: crypto.randomUUID(), author: '나', body: clean, createdAt: '방금 전' },
            ...(previous.comments[targetId] ?? []),
          ],
        },
      }));
    },
    updateReaderSettings: (partial) => commit((previous) => ({
      ...previous,
      readerSettings: { ...previous.readerSettings, ...partial },
    })),
    unlockChapter: (chapterId, price) => {
      if (!isDemoMode) return { ok: false, reason: '운영 결제 서버 연결이 필요합니다.' };
      if (state.unlocked.includes(chapterId)) return { ok: true };
      if (state.cookieBalance < price) return { ok: false, reason: '쿠키가 부족합니다.' };
      commit((previous) => ({
        ...previous,
        cookieBalance: previous.cookieBalance - price,
        unlocked: [...previous.unlocked, chapterId],
      }));
      return { ok: true };
    },
    grantAdReward: (amount) => {
      if (!isDemoMode) return;
      commit((previous) => ({
        ...previous,
        cookieBalance: previous.cookieBalance + amount,
        adRewardsToday: previous.adRewardsToday + 1,
      }));
    },
    mockPurchase: (amount) => {
      if (!isDemoMode) return;
      commit((previous) => ({ ...previous, cookieBalance: previous.cookieBalance + amount }));
    },
    saveDraft: (title, body, publish) => {
      if (state.authorApplication.status !== 'approved') return false;
      commit((previous) => ({
        ...previous,
        drafts: [{
          id: crypto.randomUUID(),
          title: title.trim().slice(0, 100),
          body: body.slice(0, 50000),
          status: publish ? '발행' : '초안',
          updatedAt: '방금 전',
        }, ...previous.drafts],
      }));
      return true;
    },
    submitAuthorApplication: (application) => commit((previous) => ({
      ...previous,
      authorApplication: { ...application, status: 'pending', submittedAt: '방금 전' },
    })),
    reportContent: (report) => commit((previous) => ({
      ...previous,
      reports: [{
        ...report,
        id: crypto.randomUUID(),
        status: 'received',
        createdAt: new Date().toISOString(),
      }, ...previous.reports],
    })),
    blockUser: (displayName) => commit((previous) => ({
      ...previous,
      blockedUsers: previous.blockedUsers.includes(displayName) ? previous.blockedUsers : [...previous.blockedUsers, displayName],
    })),
    unblockUser: (displayName) => commit((previous) => ({
      ...previous,
      blockedUsers: previous.blockedUsers.filter((name) => name !== displayName),
    })),
    reviewAuthorApplication: (status, note) => commit((previous) => ({
      ...previous,
      authorApplication: {
        ...previous.authorApplication,
        status,
        reviewNote: note.trim().slice(0, 1000),
      },
    })),
    resolveReport: (reportId, status) => commit((previous) => ({
      ...previous,
      reports: previous.reports.map((report) => report.id === reportId ? { ...report, status } : report),
    })),
    resetDemoData: () => commit(() => initialState),
  }), [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
