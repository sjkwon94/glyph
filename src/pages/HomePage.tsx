import { ArrowRight, Clock3, MessageCircleMore, Play, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BookCover } from '../components/BookCover';
import { NovelCard } from '../components/NovelCard';
import { categories, communityPosts, novels } from '../data';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

export function HomePage() {
  const { catalogNovels } = useApp();
  const { demoMode } = useAuth();
  const visibleNovels = catalogNovels.length ? catalogNovels : demoMode ? novels : [];
  const featured = visibleNovels[0];

  if (!featured) return <div className="page-loader" role="status">작품을 안전하게 불러오는 중입니다…</div>;

  return (
    <>
      <section className="home-spotlight">
        <div className="page-container spotlight-card" style={featured.bannerUrl ? ({ '--spotlight-image': `url("${featured.bannerUrl}")` } as React.CSSProperties) : undefined}>
          <div className="spotlight-copy">
            <span className="spotlight-label">오늘의 추천</span>
            <h1>{featured.title}</h1>
            <p className="spotlight-tagline">{featured.tagline}</p>
            <span className="spotlight-author">작가 {featured.author}</span>
            <p className="spotlight-description">{featured.description}</p>
            <div className="spotlight-meta">
              <span>{featured.categoryLabel}</span>
              <span><Star size={14} fill="currentColor" /> {featured.rating}</span>
              <span>{featured.schedule}</span>
            </div>
            <div className="spotlight-actions">
              <Link className="primary-button" to={`/read/${featured.id}/${featured.chapters[0].id}`}><Play size={17} fill="currentColor" /> 첫 화 보기</Link>
              <Link className="secondary-button" to={`/novel/${featured.id}`}>작품 정보</Link>
            </div>
          </div>
          <div className="spotlight-visual" aria-label={`${featured.title} 추천 이미지`}><BookCover novel={featured} className="spotlight-cover" /><span>{featured.badge ?? featured.categoryLabel}</span></div>
        </div>
      </section>

      <nav className="home-category-nav" aria-label="장르 바로가기">
        <div className="page-container">
          {categories.filter((category) => category.id !== 'all').map((category) => (
            <Link key={category.id} to={`/discover?category=${category.id}`}>{category.label}</Link>
          ))}
        </div>
      </nav>

      <section className="home-section page-container">
        <div className="simple-section-heading"><h2>인기 웹소설</h2><Link to="/discover">전체보기 <ArrowRight size={15} /></Link></div>
        <div className="novel-grid home-novel-grid">
          {visibleNovels.slice(0, 5).map((novel, index) => <NovelCard key={novel.id} novel={novel} rank={index + 1} />)}
        </div>
      </section>

      <section className="home-section page-container home-update-layout">
        <div>
          <div className="simple-section-heading"><h2>오늘 업데이트</h2><Link to="/discover">더보기 <ArrowRight size={15} /></Link></div>
          <div className="update-list">
            {visibleNovels.slice(0, 4).map((novel) => (
              <Link key={novel.id} to={`/novel/${novel.id}`} className="update-row">
                <BookCover novel={novel} />
                <div><strong>{novel.title}</strong><span>{novel.author}</span><small>{novel.chapters.length}화 · {novel.schedule}</small></div>
                <b>UP</b>
              </Link>
            ))}
          </div>
        </div>
        <aside className="ranking-box">
          <div className="simple-section-heading"><h2>실시간 인기</h2><span>전체</span></div>
          <ol>{visibleNovels.map((novel, index) => <li key={novel.id}><Link to={`/novel/${novel.id}`}><b>{index + 1}</b><span><strong>{novel.title}</strong><small>{novel.author} · {novel.categoryLabel}</small></span>{index < 2 ? <em>▲</em> : <em>―</em>}</Link></li>)}</ol>
        </aside>
      </section>

      <section className="community-home-section">
        <div className="page-container">
          <div className="simple-section-heading"><h2>커뮤니티 인기글</h2><Link to="/community/martial">장르별 보기 <ArrowRight size={15} /></Link></div>
          <div className="community-home-list">
            {communityPosts.slice(0, 4).map((post) => (
              <Link key={post.id} to={`/community/${post.category}`}>
                <span>{post.categoryLabel}</span><strong>{post.title}</strong><small><MessageCircleMore size={14} /> {post.comments}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="creator-strip">
        <div className="page-container"><div><Clock3 size={20} /><span><strong>작품을 연재하고 싶으신가요?</strong><small>포트폴리오 또는 원고 예시를 제출하고 작가 심사를 신청하세요.</small></span></div><Link to="/studio">작가 등록 <ArrowRight size={16} /></Link></div>
      </section>
    </>
  );
}
