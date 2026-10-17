import { ArrowLeft, BookOpen, CalendarDays, ChevronRight, PenLine } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { NovelCard } from '../components/NovelCard';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

const authorNotes: Record<string, { introduction: string; history: string[] }> = {
  담운: {
    introduction: '무협의 오래된 결을 빌려, 오늘의 마음과 선택을 이야기합니다.',
    history: ['무협 장르 중심 연재', '글리프 정식 연재 작가'],
  },
  해무: {
    introduction: '검과 사람 사이에 남는 약속을 오래 들여다보는 작가입니다.',
    history: ['정통무협 장르 활동', '글리프 정식 연재 작가'],
  },
};

function safeDecode(value: string | undefined) {
  if (!value) return '';
  try { return decodeURIComponent(value); } catch { return value; }
}

export function AuthorProfilePage() {
  const { authorName: encodedAuthorName } = useParams();
  const authorName = safeDecode(encodedAuthorName);
  const { catalogNovels, syncing, authorApplication } = useApp();
  const { demoMode } = useAuth();
  const works = catalogNovels.filter((novel) => novel.author === authorName);

  if (!authorName || (!works.length && !syncing && !demoMode)) return <Navigate to="/discover" replace />;
  if (!works.length && syncing) return <div className="page-loader" role="status">작가 프로필을 안전하게 불러오는 중입니다…</div>;

  const note = authorNotes[authorName];
  const ownIntroduction = authorApplication.status === 'approved' && authorApplication.penName === authorName ? authorApplication.introduction.trim() : '';
  const introduction = ownIntroduction || note?.introduction || `${authorName} 작가가 글리프에서 선보이는 작품과 활동을 소개합니다.`;
  const categories = Array.from(new Set(works.map((novel) => novel.categoryLabel)));
  const statusLabels = Array.from(new Set(works.map((novel) => novel.status)));
  const history = note?.history ?? [`${categories.join(' · ')} 장르 활동`, '글리프 정식 연재 작가'];

  return (
    <div className="page-container inner-page author-profile-page">
      <Link className="back-link" to="/discover"><ArrowLeft size={16} /> 찾기로 돌아가기</Link>
      <section className="author-profile-hero">
        <div className="author-profile-avatar" aria-hidden="true">{authorName.slice(0, 1)}</div>
        <div className="author-profile-heading">
          <span className="section-kicker">작가 프로필</span>
          <h1>{authorName}</h1>
          <p>{introduction}</p>
        </div>
      </section>

      <div className="author-profile-grid">
        <aside className="author-profile-sidebar">
          <section className="author-info-card">
            <h2>작가 정보</h2>
            <dl>
              <div><dt><BookOpen size={15} /> 작품</dt><dd>{works.length}개</dd></div>
              <div><dt><PenLine size={15} /> 활동 장르</dt><dd>{categories.join(' · ') || '작품 준비 중'}</dd></div>
              <div><dt><CalendarDays size={15} /> 연재 상태</dt><dd>{statusLabels.join(' · ') || '공개 작품 없음'}</dd></div>
            </dl>
          </section>
          <section className="author-history-card">
            <h2>활동 이력</h2>
            <ul>{history.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        </aside>

        <section className="author-works-section">
          <header className="content-section-heading"><div><h2>{authorName} 작가의 작품</h2><p>글리프에서 공개 중인 작품입니다.</p></div><ChevronRight size={18} /></header>
          {works.length ? <div className="novel-grid author-works-grid">{works.map((novel) => <NovelCard key={novel.id} novel={novel} />)}</div> : <div className="empty-state"><BookOpen size={30} /><h2>공개된 작품이 없습니다</h2><p>새 작품이 공개되면 이곳에서 확인할 수 있습니다.</p></div>}
        </section>
      </div>
    </div>
  );
}
