import { Heart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Novel } from '../data';
import { useApp } from '../state/AppContext';
import { BookCover } from './BookCover';

export function NovelCard({ novel, rank }: { novel: Novel; rank?: number }) {
  const { favorites, toggleFavorite } = useApp();
  const favorite = favorites.includes(novel.id);
  const favoriteCount = novel.favoriteCount + (favorite ? 1 : 0);

  return (
    <article className="novel-card">
      <Link to={`/novel/${novel.id}`} className="novel-cover-link">
        {rank && <span className="rank-badge">{rank}</span>}
        <BookCover novel={novel} />
      </Link>
      <div className="novel-card-copy">
        <div className="eyebrow">{novel.categoryLabel} · {novel.status}</div>
        <Link to={`/novel/${novel.id}`}><h3>{novel.title}</h3></Link>
        <p>{novel.tagline}</p>
        <div className="card-meta"><span><Star size={14} fill="currentColor" /> {novel.rating}</span><span className={`favorite-meta ${favorite ? 'selected' : ''}`} aria-label={`선호 고객 ${favoriteCount.toLocaleString('ko-KR')}명`} title="선호 고객 수"><Heart size={13} fill={favorite ? 'currentColor' : 'none'} /> {favoriteCount.toLocaleString('ko-KR')}</span><span>{novel.readers}명</span></div>
      </div>
      <button className={`favorite-button ${favorite ? 'selected' : ''}`} type="button" onClick={() => toggleFavorite(novel.id)} aria-label={favorite ? '선호작 해제' : '선호작 등록'}>
        <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}
