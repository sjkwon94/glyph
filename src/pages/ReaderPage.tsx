import { ArrowLeft, Bookmark, Check, ChevronLeft, ChevronRight, Coins, List, LockKeyhole, Maximize, Minus, Moon, Settings, Star, Sun, Type, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { getNovel } from '../data';
import { EVENT_AD_REWARD } from '../promotions';
import { paginateParagraphs, safePercent } from '../readerUtils';
import { isUuid } from '../lib/platformIds';
import { supabase } from '../lib/supabase';
import { type ReaderTheme, useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

function RewardAd({ onComplete, onClose }: { onComplete: () => void; onClose: () => void }) {
  const [seconds, setSeconds] = useState(30);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds]);

  useEffect(() => {
    if (running && seconds === 0) onComplete();
  }, [onComplete, running, seconds]);

  return (
    <Modal title="30초 광고 보고 쿠키 받기" onClose={onClose}>
      <div className="ad-demo">
        <div className="ad-screen"><span>GLYPH REWARDED</span><strong>{running ? seconds : '30'}</strong><small>{running ? '광고 재생 중 · 창을 닫으면 보상이 취소됩니다' : '데모 광고입니다'}</small></div>
        <p>광고를 끝까지 보면 2배 이벤트 쿠키 {EVENT_AD_REWARD}개가 지급됩니다. 하루 최대 5회까지 받을 수 있습니다.</p>
        <button className="primary-button full" type="button" disabled={running} onClick={() => setRunning(true)}>{running ? `${seconds}초 남음` : '광고 시작하기'}</button>
      </div>
    </Modal>
  );
}

function UnlockDialog({ chapterTitle, price, onUnlock, onAd, onClose, insufficient, adEnabled }: { chapterTitle: string; price: number; onUnlock: () => void; onAd: () => void; onClose: () => void; insufficient: boolean; adEnabled: boolean }) {
  const { cookieBalance } = useApp();
  return (
    <Modal title="다음 이야기를 열어볼까요?" onClose={onClose}>
        <div className="unlock-dialog"><div className="unlock-icon"><LockKeyhole /></div><h3>{chapterTitle}</h3><p>구매한 회차는 계속 소장되며 다시 쿠키가 차감되지 않습니다.</p><div className="balance-row"><span>내 쿠키</span><strong><Coins size={17} /> {cookieBalance}</strong></div>{insufficient && <div className="inline-alert">쿠키가 부족합니다. 광고를 보거나 쿠키를 충전해 주세요.</div>}<button className="primary-button full" type="button" onClick={onUnlock}><Coins size={18} /> {price} 쿠키로 소장하기</button><button className="secondary-button full" type="button" disabled={!adEnabled} onClick={onAd}>{adEnabled ? `30초 광고 보고 ${EVENT_AD_REWARD} 쿠키 받기` : '광고 보상 연동 준비 중'}</button><Link className="text-link centered" to="/wallet">쿠키 충전소 가기</Link></div>
    </Modal>
  );
}

function ChapterRating({ chapter, userRating, onRate }: { chapter: NonNullable<ReturnType<typeof getNovel>>['chapters'][number]; userRating?: number; onRate: (rating: number) => void }) {
  const baseCount = chapter.ratingCount ?? 0;
  const baseRating = chapter.rating ?? 0;
  const responseCount = baseCount + (userRating ? 1 : 0);
  const average = responseCount ? ((baseRating * baseCount + (userRating ?? 0)) / responseCount).toFixed(1) : '-';

  return <section className="chapter-rating" aria-label="회차 평점"><div className="chapter-rating-summary"><span>이 회차는 어땠나요?</span><div><strong>{average}</strong><small>평점 · 반응 {responseCount.toLocaleString('ko-KR')}명</small></div></div><div className="chapter-rating-stars" role="group" aria-label={`${chapter.number}화 별점 선택`}>{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" className={userRating && rating <= userRating ? 'selected' : ''} aria-label={`${rating}점`} aria-pressed={userRating === rating} onClick={(event) => { event.stopPropagation(); onRate(rating); }}><Star size={20} fill={userRating && rating <= userRating ? 'currentColor' : 'none'} /></button>)}</div><p>{userRating ? `내 평점 ${userRating}점이 반영되었습니다.` : '별점을 선택해 회차에 대한 반응을 남겨주세요.'}</p></section>;
}

export function ReaderPage() {
  const { demoMode } = useAuth();
  const { novelId, chapterId } = useParams();
  const navigate = useNavigate();
  const { catalogNovels, syncing, readerSettings, updateReaderSettings, bookmarks, toggleBookmark, chapterRatings, rateChapter, unlocked, unlockChapter, grantAdReward, adRewardsToday } = useApp();
  const novel = catalogNovels.find((item) => item.id === novelId) ?? (demoMode ? getNovel(novelId) : undefined);
  const chapterIndex = novel?.chapters.findIndex((item) => item.id === chapterId) ?? -1;
  const chapter = chapterIndex >= 0 ? novel?.chapters[chapterIndex] : undefined;
  const [page, setPage] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<number | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [insufficient, setInsufficient] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [, setForensicToken] = useState('');
  const touchStart = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const charBudget = useMemo(() => {
    const horizontalPadding = viewport.width <= 680 ? 54 : 140;
    const usableWidth = Math.max(260, Math.min(readerSettings.contentWidth, viewport.width - horizontalPadding));
    const usableHeight = Math.max(460, viewport.height - 150);
    const widthFactor = Math.max(0.4, Math.min(1.2, usableWidth / 720));
    const heightFactor = Math.max(0.7, Math.min(1.3, usableHeight / 670));
    const fontFactor = 19 / readerSettings.fontSize;
    const leadingFactor = 1.9 / readerSettings.lineHeight;
    return Math.round(940 * widthFactor * heightFactor * fontFactor * leadingFactor);
  }, [readerSettings.contentWidth, readerSettings.fontSize, readerSettings.lineHeight, viewport]);
  const pages = useMemo(() => paginateParagraphs(chapter?.content ?? [], charBudget, Math.round(charBudget * .72)), [chapter?.content, charBudget]);
  const hasAccess = !!chapter && (chapter.price === 0 || unlocked.includes(chapter.id));
  const bookmarked = !!chapter && bookmarks.includes(chapter.id);
  const targetChapter = unlockTarget !== null ? novel?.chapters[unlockTarget] : chapter;

  useEffect(() => { setPage(0); setScrollProgress(0); }, [chapterId]);
  useEffect(() => { if (chapter && !hasAccess) setUnlockTarget(chapterIndex); }, [chapter, chapterIndex, hasAccess]);
  useEffect(() => {
    let active = true;
    setForensicToken('');
    if (!chapter || !hasAccess) return () => { active = false; };
    if (demoMode) {
      setForensicToken(crypto.randomUUID().replace(/-/g, ''));
      return () => { active = false; };
    }
    if (!supabase || !novel || !isUuid(chapter.id)) return () => { active = false; };
    let sessionId = sessionStorage.getItem('glyph-watermark-session');
    if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem('glyph-watermark-session', sessionId); }
    void supabase.rpc('issue_reader_watermark', { p_novel_slug: novel.id, p_chapter_id: chapter.id, p_session_id: sessionId }).then(({ data, error }) => {
      if (error) {
        console.error('[Glyph reader] watermark issue failed', { code: error.code, message: error.message, novelSlug: novel.id, chapterId: chapter.id });
        return;
      }
      if (!active) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.token) setForensicToken(String(row.token));
    });
    return () => { active = false; };
  }, [chapter, demoMode, hasAccess, novel]);
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const openChapter = useCallback((index: number) => {
    if (!novel || index < 0 || index >= novel.chapters.length) return;
    const target = novel.chapters[index];
    if (target.price > 0 && !unlocked.includes(target.id)) {
      setUnlockTarget(index); setInsufficient(false); return;
    }
    setTocOpen(false);
    navigate(`/read/${novel.id}/${target.id}`);
  }, [navigate, novel, unlocked]);

  const previous = useCallback(() => {
    if (readerSettings.mode === 'scroll') return;
    if (page > 0) setPage((value) => value - 1);
    else if (chapterIndex > 0) openChapter(chapterIndex - 1);
  }, [chapterIndex, openChapter, page, readerSettings.mode]);

  const next = useCallback(() => {
    if (readerSettings.mode === 'scroll') return;
    if (page < pages.length - 1) setPage((value) => value + 1);
    else if (novel && chapterIndex < novel.chapters.length - 1) openChapter(chapterIndex + 1);
  }, [chapterIndex, novel, openChapter, page, pages.length, readerSettings.mode]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight' || event.key === ' ') { event.preventDefault(); next(); }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [next, previous]);

  if (!novel || !chapter) return syncing ? <div className="reader-loading">작품을 안전하게 불러오는 중입니다…</div> : <Navigate to="/discover" replace />;

  const progress = readerSettings.mode === 'scroll' ? scrollProgress : safePercent(page + 1, pages.length);
  const themeStyles = { '--reader-size': `${readerSettings.fontSize}px`, '--reader-leading': readerSettings.lineHeight, '--reader-width': `${readerSettings.contentWidth}px`, '--reader-brightness': readerSettings.brightness / 100 } as React.CSSProperties;

  const purchaseTarget = async () => {
    if (!targetChapter || unlockTarget === null) return;
    const result = await unlockChapter(targetChapter.id, targetChapter.price);
    if (!result.ok) { setInsufficient(true); return; }
    const targetId = targetChapter.id;
    setUnlockTarget(null); setInsufficient(false);
    navigate(`/read/${novel.id}/${targetId}`);
  };

  const finishAd = () => {
    grantAdReward(EVENT_AD_REWARD);
    setShowAd(false);
  };

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    setScrollProgress(safePercent(node.scrollTop, node.scrollHeight - node.clientHeight));
  };

  return (
    <div className={`reader reader-${readerSettings.theme} reader-${readerSettings.fontFamily} ${chromeVisible ? '' : 'chrome-hidden'}`} style={themeStyles} onContextMenu={(event) => event.preventDefault()}>
      <div className="brightness-layer" />
      <header className="reader-header">
        <Link to={`/novel/${novel.id}`} className="reader-icon-button" aria-label="작품으로 돌아가기"><ArrowLeft /></Link>
        <div><strong>{novel.title}</strong><span>{chapter.number}화. {chapter.title}</span></div>
        <div><button type="button" className={`reader-icon-button ${bookmarked ? 'active' : ''}`} onClick={() => toggleBookmark(chapter.id)} aria-label="책갈피"><Bookmark fill={bookmarked ? 'currentColor' : 'none'} /></button><button type="button" className="reader-icon-button" onClick={() => document.documentElement.requestFullscreen?.()} aria-label="전체 화면"><Maximize /></button><button type="button" className="reader-icon-button" onClick={() => setSettingsOpen(true)} aria-label="읽기 설정"><Settings /></button></div>
      </header>

      {!hasAccess ? (
        <div className="locked-reader"><LockKeyhole size={34} /><h1>소장 후 읽을 수 있는 회차입니다</h1><p>쿠키로 소장하거나 광고를 보고 쿠키를 받을 수 있습니다.</p><button className="primary-button" type="button" onClick={() => setUnlockTarget(chapterIndex)}>회차 열기</button></div>
      ) : readerSettings.mode === 'page' ? (
        <main className="reader-page-stage" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => { if (touchStart.current === null) return; const diff = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(diff) > 55) diff > 0 ? previous() : next(); touchStart.current = null; }}>
          <button className="tap-zone tap-left" type="button" onClick={previous} aria-label="이전 페이지"><ChevronLeft /></button>
          <article className="reader-content" draggable={false} onCopy={(event) => event.preventDefault()} onCut={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()} onClick={() => { if (window.getSelection()?.toString()) return; setChromeVisible((visible) => !visible); }}>
            {page === 0 && <div className="chapter-heading"><span>{chapter.number}화</span><h1>{chapter.title}</h1><i /></div>}
            {pages[page].map((paragraph, index) => <p key={`${page}-${index}`}>{paragraph}</p>)}
            {page === pages.length - 1 && <div className="chapter-end"><span>✦</span><p>{chapter.number}화 끝</p><ChapterRating chapter={chapter} userRating={chapterRatings[chapter.id]} onRate={(rating) => rateChapter(chapter.id, rating)} />{chapterIndex < novel.chapters.length - 1 && <button type="button" className="secondary-button" onClick={(event) => { event.stopPropagation(); openChapter(chapterIndex + 1); }}>다음 화 보기 <ChevronRight size={17} /></button>}</div>}
          </article>
          <button className="tap-zone tap-right" type="button" onClick={next} aria-label="다음 페이지"><ChevronRight /></button>
        </main>
      ) : (
        <main className="reader-scroll-stage" ref={scrollRef} onScroll={onScroll}>
          <article className="reader-content scroll-content" draggable={false} onCopy={(event) => event.preventDefault()} onCut={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()} onClick={() => setChromeVisible((visible) => !visible)}>
            <div className="chapter-heading"><span>{chapter.number}화</span><h1>{chapter.title}</h1><i /></div>
            {chapter.content.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            <div className="chapter-end"><span>✦</span><p>{chapter.number}화 끝</p><ChapterRating chapter={chapter} userRating={chapterRatings[chapter.id]} onRate={(rating) => rateChapter(chapter.id, rating)} />{chapterIndex < novel.chapters.length - 1 && <button type="button" className="secondary-button" onClick={(event) => { event.stopPropagation(); openChapter(chapterIndex + 1); }}>다음 화 보기 <ChevronRight size={17} /></button>}</div>
          </article>
        </main>
      )}

      <footer className="reader-footer"><button type="button" onClick={() => setTocOpen(true)}><List /> 목차</button><div className="reader-progress"><div><span style={{ width: `${progress}%` }} /></div><small>{readerSettings.mode === 'page' ? `${page + 1} / ${pages.length}` : `${progress}%`}</small></div><button type="button" onClick={() => setSettingsOpen(true)}><Type /> 설정</button></footer>

      {tocOpen && <div className="reader-side-panel toc-panel"><header><div><strong>{novel.title}</strong><span>총 {novel.chapters.length}화</span></div><button type="button" onClick={() => setTocOpen(false)} aria-label="닫기"><X /></button></header><div>{novel.chapters.map((item, index) => { const accessible = item.price === 0 || unlocked.includes(item.id); return <button type="button" key={item.id} className={item.id === chapter.id ? 'active' : ''} onClick={() => openChapter(index)}><span><strong>{item.number}화. {item.title}</strong><small>{item.publishedAt}</small></span>{accessible ? item.id === chapter.id && <Check /> : <LockKeyhole />}</button>; })}</div></div>}

      {settingsOpen && <div className="reader-settings-sheet"><header><strong>읽기 설정</strong><button type="button" onClick={() => setSettingsOpen(false)} aria-label="닫기"><X /></button></header><div className="setting-group"><label>보기 방식</label><div className="segmented"><button className={readerSettings.mode === 'page' ? 'active' : ''} onClick={() => updateReaderSettings({ mode: 'page' })}>페이지</button><button className={readerSettings.mode === 'scroll' ? 'active' : ''} onClick={() => updateReaderSettings({ mode: 'scroll' })}>스크롤</button></div></div><div className="setting-group"><label>글자 크기 <strong>{readerSettings.fontSize}px</strong></label><div className="stepper"><button onClick={() => updateReaderSettings({ fontSize: Math.max(14, readerSettings.fontSize - 1) })}><Minus /></button><span style={{ fontSize: readerSettings.fontSize }}>가나다</span><button onClick={() => updateReaderSettings({ fontSize: Math.min(28, readerSettings.fontSize + 1) })}>+</button></div></div><div className="setting-group"><label>줄 간격</label><input type="range" min="1.5" max="2.4" step="0.1" value={readerSettings.lineHeight} onChange={(event) => updateReaderSettings({ lineHeight: Number(event.target.value) })} /></div><div className="setting-group"><label>화면 밝기 <strong>{readerSettings.brightness}%</strong></label><div className="range-line"><Moon /><input type="range" min="55" max="100" value={readerSettings.brightness} onChange={(event) => updateReaderSettings({ brightness: Number(event.target.value) })} /><Sun /></div></div><div className="setting-group"><label>글꼴</label><div className="segmented"><button className={readerSettings.fontFamily === 'serif' ? 'active' : ''} onClick={() => updateReaderSettings({ fontFamily: 'serif' })}>바탕체</button><button className={readerSettings.fontFamily === 'sans' ? 'active' : ''} onClick={() => updateReaderSettings({ fontFamily: 'sans' })}>고딕체</button></div></div><div className="setting-group"><label>배경</label><div className="theme-choices">{([['paper', '#f7f3eb'], ['sepia', '#eee1c5'], ['charcoal', '#292827'], ['night', '#121820']] as [ReaderTheme, string][]).map(([theme, color]) => <button key={theme} className={readerSettings.theme === theme ? 'active' : ''} style={{ background: color }} onClick={() => updateReaderSettings({ theme })} aria-label={`${theme} 배경`} />)}</div></div></div>}

      {unlockTarget !== null && targetChapter && !showAd && <UnlockDialog chapterTitle={`${targetChapter.number}화. ${targetChapter.title}`} price={targetChapter.price} onUnlock={() => void purchaseTarget()} onAd={() => { if (!demoMode || adRewardsToday >= 5) { setInsufficient(true); return; } setShowAd(true); }} onClose={() => { setUnlockTarget(null); if (!hasAccess) navigate(`/novel/${novel.id}`); }} insufficient={insufficient} adEnabled={demoMode} />}
      {showAd && <RewardAd onComplete={finishAd} onClose={() => setShowAd(false)} />}
    </div>
  );
}
