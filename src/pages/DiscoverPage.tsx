import { Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NovelCard } from '../components/NovelCard';
import { categories, type CategoryId, novels, type WeekdayId, weekdays } from '../data';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

type DayFilter = 'all' | WeekdayId;

export function DiscoverPage() {
  const { catalogNovels } = useApp();
  const { demoMode } = useAuth();
  const visibleNovels = catalogNovels.length ? catalogNovels : demoMode ? novels : [];
  const [params, setParams] = useSearchParams();
  const initial = (params.get('category') as CategoryId) || 'all';
  const initialDay = (params.get('day') as DayFilter) || 'all';
  const [category, setCategory] = useState<CategoryId>(categories.some((item) => item.id === initial) ? initial : 'all');
  const [day, setDay] = useState<DayFilter>(initialDay === 'all' || weekdays.some((item) => item.id === initialDay) ? initialDay : 'all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('popular');

  const filtered = useMemo(() => visibleNovels
    .filter((novel) => category === 'all' || novel.category === category)
    .filter((novel) => day === 'all' || novel.days.includes(day))
    .filter((novel) => `${novel.title} ${novel.author} ${novel.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'rating' ? b.rating - a.rating : sort === 'new' ? a.title.localeCompare(b.title) : b.likes - a.likes), [category, day, query, sort, visibleNovels]);

  const syncParams = (nextCategory: CategoryId, nextDay: DayFilter) => {
    const next = new URLSearchParams();
    if (nextCategory !== 'all') next.set('category', nextCategory);
    if (nextDay !== 'all') next.set('day', nextDay);
    setParams(next);
  };

  const selectCategory = (id: CategoryId) => {
    setCategory(id);
    syncParams(id, day);
  };

  const selectDay = (id: DayFilter) => {
    setDay(id);
    syncParams(category, id);
  };

  return (
    <div className="page-container inner-page">
      <header className="page-title"><span className="section-kicker">웹소설</span><h1>작품 찾기</h1><p>요일과 장르를 따로 또는 함께 선택해 원하는 작품을 찾아보세요.</p></header>
      <div className="discover-toolbar">
        <label className="search-field"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="작품명, 작가, 태그 검색" aria-label="작품 검색" /></label>
        <label className="sort-field"><SlidersHorizontal size={18} /><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="정렬"><option value="popular">인기순</option><option value="rating">평점순</option><option value="new">최신순</option></select></label>
      </div>
      <div className="filter-groups">
        <div className="filter-row"><strong>요일</strong><div className="filter-chips" role="group" aria-label="요일 선택"><button type="button" className={day === 'all' ? 'active' : ''} onClick={() => selectDay('all')}>요일 전체</button>{weekdays.map((item) => <button key={item.id} type="button" className={day === item.id ? 'active' : ''} onClick={() => selectDay(item.id)}>{item.label}</button>)}</div></div>
        <div className="filter-row"><strong>장르</strong><div className="filter-chips" role="group" aria-label="장르 선택">{categories.map((item) => <button key={item.id} type="button" className={category === item.id ? 'active' : ''} onClick={() => selectCategory(item.id)}>{item.label === '전체' ? '장르 전체' : item.label}</button>)}</div></div>
      </div>
      <div className="results-line"><strong>{filtered.length}</strong>개의 작품</div>
      {filtered.length > 0 ? <div className="novel-grid discover-grid">{filtered.map((novel) => <NovelCard key={novel.id} novel={novel} />)}</div> : <div className="empty-state"><Search size={32} /><h2>검색 결과가 없습니다</h2><p>다른 제목이나 태그로 찾아보세요.</p></div>}
    </div>
  );
}
