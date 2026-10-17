import { Bell, Bookmark, ChevronRight, Heart, LockKeyhole, MessageCircle, Play, Share2, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { BookCover } from '../components/BookCover';
import { ContentSafetyActions } from '../components/ContentSafetyActions';
import { getNovel } from '../data';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

export function NovelPage() {
  const { novelId } = useParams();
  const { catalogNovels, syncing, favorites, toggleFavorite, reactions, setReaction, comments, addComment, unlocked, blockedUsers } = useApp();
  const { demoMode } = useAuth();
  const novel = catalogNovels.find((item) => item.id === novelId) ?? (demoMode ? getNovel(novelId) : undefined);
  const [comment, setComment] = useState('');
  const [copied, setCopied] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');

  if (!novel) return syncing ? <div className="page-loader" role="status">작품을 안전하게 불러오는 중입니다…</div> : <Navigate to="/discover" replace />;
  const favorite = favorites.includes(novel.id);
  const reaction = reactions[novel.id];
  const novelComments = (comments[novel.id] ?? []).filter((item) => !blockedUsers.includes(item.author));
  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    const result = await addComment(novel.id, comment);
    if (!result.ok) { setCommentMessage(result.reason ?? '댓글을 등록하지 못했습니다.'); return; }
    setComment('');
    setCommentMessage('댓글을 등록했습니다.');
  };

  const share = async () => {
    const payload = { title: novel.title, text: novel.tagline, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(payload);
      else { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch { /* 사용자가 공유 창을 닫은 경우 */ }
  };

  return (
    <>
      <section className="novel-hero" style={{ '--novel-color': novel.color, '--novel-accent': novel.accent } as React.CSSProperties}>
        <div className="novel-hero-blur" />
        <div className="page-container novel-hero-inner">
          <BookCover novel={novel} className="detail-cover" />
          <div className="novel-info">
            <div className="badge-line">{novel.badge && <span>{novel.badge}</span>}<span>{novel.categoryLabel}</span><span>{novel.status}</span></div>
            <h1>{novel.title}</h1><p className="novel-tagline">{novel.tagline}</p><Link to={`/author/${encodeURIComponent(novel.author)}`} className="author-link" aria-label={`${novel.author} 작가 프로필`}>{novel.author} 작가 <ChevronRight size={15} /></Link>
            <div className="novel-metrics"><span><Star size={17} fill="currentColor" /><strong>{novel.rating}</strong> 평점</span><span><strong>{novel.readers}</strong> 독자</span><span><strong>{novel.chapters.length}</strong>화</span></div>
            <p className="novel-description">{novel.description}</p>
            <div className="tag-row">{novel.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
            <div className="novel-actions"><Link className="primary-button" to={`/read/${novel.id}/${novel.chapters[0].id}`}><Play size={18} fill="currentColor" /> 첫 화 읽기</Link><button type="button" className={`secondary-button ${favorite ? 'selected' : ''}`} onClick={() => toggleFavorite(novel.id)}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /> {favorite ? '선호작' : '선호작 추가'}</button><button type="button" className="icon-button bordered" onClick={share} aria-label="공유"><Share2 size={19} /></button>{copied && <span className="copy-toast">링크 복사됨</span>}</div>
          </div>
        </div>
      </section>

      <div className="page-container novel-content-grid">
        <section>
          <div className="content-section-heading"><div><h2>회차 목록</h2><p>{novel.schedule} · 최신화부터 3쿠키</p></div><button type="button" className="text-button"><Bell size={17} /> 업데이트 알림</button></div>
          <div className="chapter-list">
            {[...novel.chapters].reverse().map((chapter) => {
              const isUnlocked = chapter.price === 0 || unlocked.includes(chapter.id);
              return <Link key={chapter.id} to={`/read/${novel.id}/${chapter.id}`} className="chapter-row"><div><strong>{chapter.number}화. {chapter.title}</strong><small>{chapter.publishedAt}</small></div><span className={isUnlocked ? 'unlocked' : ''}>{isUnlocked ? <><Play size={16} /> 읽기</> : <><LockKeyhole size={15} /> {chapter.price} 쿠키</>}</span></Link>;
            })}
          </div>

          <section className="comments-section">
            <div className="content-section-heading"><div><h2>독자 댓글 <span>{novelComments.length}</span></h2><p>작품에 대한 감상을 나눠주세요.</p></div></div>
            <form className="comment-form" onSubmit={submitComment}><label><span className="sr-only">댓글 내용</span><textarea value={comment} onChange={(event) => { setComment(event.target.value); setCommentMessage(''); }} maxLength={1000} placeholder="서로를 존중하는 댓글을 남겨주세요." /></label><div><small>{comment.length}/1000</small><button className="primary-button small" disabled={!comment.trim()}>댓글 등록</button></div>{commentMessage && <p className="form-message" role="status">{commentMessage}</p>}</form>
            <div className="comment-list">{novelComments.map((item) => <article key={item.id} className="comment-item"><div className="avatar">{item.author.slice(0, 1)}</div><div><header><strong>{item.author}</strong><small>{item.createdAt}</small></header><p>{item.body}</p><div className="comment-actions"><button type="button"><ThumbsUp size={14} /> 공감</button><ContentSafetyActions targetId={item.id} targetType="comment" author={item.author} authorId={item.authorId} /></div></div></article>)}</div>
          </section>
        </section>
        <aside className="reaction-panel">
          <span>이 작품, 어떠셨나요?</span><div><button className={reaction === 'like' ? 'selected positive' : ''} type="button" onClick={() => setReaction(novel.id, 'like')}><ThumbsUp size={20} /><strong>{(novel.likes + (reaction === 'like' ? 1 : 0)).toLocaleString()}</strong><small>좋아요</small></button><button className={reaction === 'dislike' ? 'selected negative' : ''} type="button" onClick={() => setReaction(novel.id, 'dislike')}><ThumbsDown size={20} /><strong>{novel.dislikes + (reaction === 'dislike' ? 1 : 0)}</strong><small>싫어요</small></button></div><p>반응은 작가에게 큰 힘이 됩니다.</p><Link to={`/community/${novel.category}`}><MessageCircle size={17} /> {novel.categoryLabel} 커뮤니티</Link><button type="button" className="text-button"><Bookmark size={17} /> 나중에 읽기</button>
        </aside>
      </div>

    </>
  );
}
