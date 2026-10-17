import { ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { NovelCard } from '../components/NovelCard';
import { categories, type CategoryId, novels, type WeekdayId, weekdays } from '../data';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

type DayFilter = 'all' | WeekdayId;
type StatusFilter = '연재중' | '완결';
const statusOptions: Array<{ id: string; label: StatusFilter }> = [
  { id: 'ongoing', label: '연재중' },
  { id: 'complete', label: '완결' },
];

export function DiscoverPage() {
  const { catalogNovels } = useApp();
  const { demoMode } = useAuth();
  const visibleNovels = catalogNovels.length ? catalogNovels : demoMode ? novels : [];
  const [params, setParams] = useSearchParams();
  const initial = (params.get('category') as CategoryId) || 'all';
  const initialDay = (params.get('day') as DayFilter) || 'all';
  const initialStatuses = params.get('status')?.split(',').filter((value): value is StatusFilter => statusOptions.some((item) => item.id === value) || value === '연재중' || value === '완결').map((value) => statusOptions.find((item) => item.id === value)?.label ?? value as StatusFilter) ?? [];
  const [category, setCategory] = useState<CategoryId>(categories.some((item) => item.id === initial) ? initial : 'all');
  const [day, setDay] = useState<DayFilter>(initialDay === 'all' || weekdays.some((item) => item.id === initialDay) ? initialDay : 'all');
  const [statuses, setStatuses] = useState<StatusFilter[]>(Array.from(new Set(initialStatuses)));
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('popular');

  const filtered = useMemo(() => visibleNovels
    .filter((novel) => category === 'all' || novel.category === category)
    .filter((novel) => day === 'all' || novel.days.includes(day))
    .filter((novel) => statuses.length === 0 || statuses.includes(novel.status))
    .filter((novel) => `${novel.title} ${novel.author} ${novel.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'rating' ? b.rating - a.rating : sort === 'new' ? a.title.localeCompare(b.title) : b.likes - a.likes), [category, day, statuses, query, sort, visibleNovels]);
  const authorResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return Array.from(new Set(visibleNovels.map((novel) => novel.author)))
      .filter((author) => author.toLowerCase().includes(normalizedQuery));
  }, [query, visibleNovels]);

  const syncParams = (nextCategory: CategoryId, nextDay: DayFilter, nextStatuses: StatusFilter[]) => {
    const next = new URLSearchParams();
    if (nextCategory !== 'all') next.set('category', nextCategory);
    if (nextDay !== 'all') next.set('day', nextDay);
    if (nextStatuses.length) next.set('status', nextStatuses.map((status) => statusOptions.find((item) => item.label === status)?.id ?? status).join(','));
    setParams(next);
  };

  const selectCategory = (id: CategoryId) => {
    setCategory(id);
    syncParams(id, day, statuses);
  };

  const selectDay = (id: DayFilter) => {
    setDay(id);
    syncParams(category, id, statuses);
  };

  const toggleStatus = (status: StatusFilter) => {
    const nextStatuses = statuses.includes(status) ? statuses.filter((item) => item !== status) : [...statuses, status];
    setStatuses(nextStatuses);
    syncParams(category, day, nextStatuses);
  };

  return (
    <div className="page-container inner-page">
      <header className="page-title"><span className="section-kicker">작품·작가</span><h1>찾기</h1><p>작가나 작품을 검색하고, 요일·장르·연재 상태로 원하는 이야기를 찾아보세요.</p></header>
      <div className="discover-toolbar">
        <label className="search-field"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="작가 또는 작품 검색" aria-label="작가 또는 작품 검색" /></label>
        <label className="sort-field"><SlidersHorizontal size={18} /><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="정렬"><option value="popular">인기순</option><option value="rating">평점순</option><option value="new">최신순</option></select></label>
      </div>
      <div className="filter-groups">
        <div className="filter-row"><strong>요일</strong><div className="filter-chips" role="group" aria-label="요일 선택"><button type="button" className={day === 'all' ? 'active' : ''} onClick={() => selectDay('all')}>요일 전체</button>{weekdays.map((item) => <button key={item.id} type="button" className={day === item.id ? 'active' : ''} onClick={() => selectDay(item.id)}>{item.label}</button>)}</div></div>
        <div className="filter-row"><strong>장르</strong><div className="filter-chips" role="group" aria-label="장르 선택">{categories.map((item) => <button key={item.id} type="button" className={category === item.id ? 'active' : ''} onClick={() => selectCategory(item.id)}>{item.label === '전체' ? '장르 전체' : item.label}</button>)}</div></div>
        <div className="filter-row"><strong>상태</strong><div className="filter-chips" role="group" aria-label="연재 상태 선택"><button type="button" className={statuses.length === 0 ? 'active' : ''} aria-pressed={statuses.length === 0} onClick={() => { setStatuses([]); syncParams(category, day, []); }}>상태 전체</button>{statusOptions.map((item) => <button key={item.id} type="button" className={statuses.includes(item.label) ? 'active' : ''} aria-pressed={statuses.includes(item.label)} onClick={() => toggleStatus(item.label)}>{item.label}</button>)}</div></div>
      </div>
      {authorResults.length > 0 && <section className="author-search-results" aria-label="작가 검색 결과"><div className="results-line"><strong>{authorResults.length}</strong>명의 작가</div><div className="author-search-list">{authorResults.map((author) => <Link key={author} to={`/author/${encodeURIComponent(author)}`} className="author-search-item"><span className="author-search-avatar">{author.slice(0, 1)}</span><span><strong>{author}</strong><small>{visibleNovels.filter((novel) => novel.author === author).length}개 작품 · 작가 프로필 보기</small></span><ChevronRight size={17} /></Link>)}</div></section>}
      <div className="results-line"><strong>{filtered.length}</strong>개의 작품</div>
      {filtered.length > 0 ? <div className="novel-grid discover-grid">{filtered.map((novel) => <NovelCard key={novel.id} novel={novel} />)}</div> : <div className="empty-state"><Search size={32} /><h2>검색 결과가 없습니다</h2><p>다른 제목이나 태그로 찾아보세요.</p></div>}
    </div>
  );
}
