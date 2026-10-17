import { Bell, BookOpen, Bookmark, ChevronRight, Heart, Image as ImageIcon, ImagePlus, LockKeyhole, MessageCircle, PenLine, Play, Save, Share2, Square, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { BookCover } from '../components/BookCover';
import { ContentSafetyActions } from '../components/ContentSafetyActions';
import { Modal } from '../components/Modal';
import { getNovel } from '../data';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

export function NovelPage() {
  const { novelId } = useParams();
  const { catalogNovels, syncing, favorites, toggleFavorite, reactions, setReaction, comments, addComment, unlocked, blockedUsers, authorApplication, authorWorks, drafts, saveDraft, updateNovelAssets } = useApp();
  const { demoMode } = useAuth();
  const novel = catalogNovels.find((item) => item.id === novelId) ?? (demoMode ? getNovel(novelId) : undefined);
  const [comment, setComment] = useState('');
  const [copied, setCopied] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string>();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [managerMessage, setManagerMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!novel) return syncing ? <div className="page-loader" role="status">작품을 안전하게 불러오는 중입니다…</div> : <Navigate to="/discover" replace />;
  const favorite = favorites.includes(novel.id);
  const reaction = reactions[novel.id];
  const novelComments = (comments[novel.id] ?? []).filter((item) => !blockedUsers.includes(item.author));
  const creatorWork = authorWorks.find((work) => work.slug === novel.id);
  const canManage = Boolean(creatorWork && (demoMode || authorApplication.status === 'approved'));
  const workDrafts = creatorWork ? drafts.filter((draft) => draft.novelId === creatorWork.id) : [];

  const openNewEpisode = () => {
    setEditingDraftId(undefined);
    setTitle('');
    setBody('');
    setManagerMessage('');
    setEditorOpen(true);
  };

  const openDraft = (draft: typeof drafts[number]) => {
    setEditingDraftId(draft.id);
    setTitle(draft.title);
    setBody(draft.body);
    setManagerMessage('');
    setEditorOpen(true);
  };

  const submitEpisode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const action = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (!creatorWork) return;
    setSubmitting(true);
    setManagerMessage('');
    const result = await saveDraft(creatorWork.id, title || '제목 없는 회차', body, action?.value === 'publish', editingDraftId);
    setSubmitting(false);
    if (!result.ok) { setManagerMessage(result.reason ?? '회차를 저장하지 못했습니다.'); return; }
    setEditorOpen(false);
  };

  const submitAssets = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!creatorWork || (!coverFile && !bannerFile)) return;
    setSubmitting(true);
    setManagerMessage('');
    const result = await updateNovelAssets(creatorWork.id, coverFile, bannerFile);
    setSubmitting(false);
    if (!result.ok) { setManagerMessage(result.reason ?? '작품 사진을 업로드하지 못했습니다.'); return; }
    setCoverFile(null);
    setBannerFile(null);
    setAssetOpen(false);
  };

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
            <h1>{novel.title}</h1><p className="novel-tagline">{novel.tagline}</p><Link to="#author" className="author-link">{novel.author} 작가 <ChevronRight size={15} /></Link>
            <div className="novel-metrics"><span><Star size={17} fill="currentColor" /><strong>{novel.rating}</strong> 평점</span><span><strong>{novel.readers}</strong> 독자</span><span><strong>{novel.chapters.length}</strong>화</span></div>
            <p className="novel-description">{novel.description}</p>
            <div className="tag-row">{novel.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
            <div className="novel-actions"><Link className="primary-button" to={`/read/${novel.id}/${novel.chapters[0].id}`}><Play size={18} fill="currentColor" /> 첫 화 읽기</Link><button type="button" className={`secondary-button ${favorite ? 'selected' : ''}`} onClick={() => toggleFavorite(novel.id)}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /> {favorite ? '선호작' : '선호작 추가'}</button><button type="button" className="icon-button bordered" onClick={share} aria-label="공유"><Share2 size={19} /></button>{copied && <span className="copy-toast">링크 복사됨</span>}</div>
          </div>
        </div>
      </section>

      {canManage && creatorWork && <section className="page-container creator-work-tools">
        <header>
          <div><span className="section-kicker">작가 관리</span><h2>{novel.title} 관리</h2><p>이 작품의 회차와 이미지를 작품 페이지에서 관리합니다.</p></div>
          <div className="creator-work-actions"><button type="button" className="secondary-button" onClick={() => { setManagerMessage(''); setAssetOpen(true); }}><ImagePlus size={16} /> 사진 업로드</button><button type="button" className="primary-button" onClick={openNewEpisode}><PenLine size={16} /> 새 회차 쓰기</button></div>
        </header>
        <div className="creator-work-summary"><span>작품 상태 · {creatorWork.status === 'serializing' ? '연재중' : creatorWork.status === 'complete' ? '완결' : '초안'}</span><span>총 {novel.chapters.length}화</span><span>초안 {workDrafts.filter((draft) => draft.status === '초안').length}개</span></div>
        <section className="creator-upload-guide" aria-label="작품 이미지 업로드 규격"><header><div><span className="section-kicker"><ImageIcon size={14} /> 작품 이미지 규격</span><h3>이 작품의 추천 배너와 썸네일</h3></div></header><div className="creator-upload-specs"><div><span className="creator-spec-icon"><ImageIcon /></span><div><strong>오늘의 추천 배너</strong><b>1440 × 480px</b><p>JPG · PNG · WebP · 최대 5MB<br />문구는 왼쪽 안전 영역 45% 안에 배치</p></div></div><div><span className="creator-spec-icon"><Square /></span><div><strong>작품 썸네일</strong><b>800 × 800px</b><p>정방형 JPG · PNG · WebP · 최대 3MB<br />중요한 얼굴·제목은 중앙 80% 안에 배치</p></div></div></div><p className="creator-upload-note">이 작품에 사용할 이미지만 이 페이지에서 업로드할 수 있습니다.</p></section>
        {workDrafts.length > 0 && <div className="creator-draft-list">{workDrafts.map((draft) => <button type="button" className="creator-draft-row" key={draft.id} onClick={() => openDraft(draft)}><span><strong>{draft.chapterNumber}화 · {draft.title}</strong><small>{draft.status} · {draft.updatedAt}</small></span><ChevronRight size={16} /></button>)}</div>}
      </section>}

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

      {assetOpen && creatorWork && <Modal title={`${novel.title} · 사진 업로드`} onClose={() => setAssetOpen(false)} wide><form className="author-application-form" onSubmit={submitAssets}><p className="asset-upload-intro">작품 페이지와 홈 추천 영역에 사용할 이미지를 교체합니다. 한 장만 선택해도 기존 이미지는 유지됩니다.</p><fieldset className="work-image-fields"><legend>업로드할 사진</legend><label className="file-field"><ImageIcon /><span><strong>{coverFile?.name || '작품 썸네일 선택'}</strong><small>800 × 800px · JPG, PNG, WebP · 최대 3MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} /></label><label className="file-field"><ImageIcon /><span><strong>{bannerFile?.name || '오늘의 추천 배너 선택'}</strong><small>1440 × 480px · JPG, PNG, WebP · 최대 5MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => setBannerFile(event.target.files?.[0] ?? null)} /></label></fieldset>{managerMessage && <p className="form-message" role="status">{managerMessage}</p>}<div className="form-actions"><button className="secondary-button" type="button" onClick={() => setAssetOpen(false)}>취소</button><button className="primary-button" disabled={submitting || (!coverFile && !bannerFile)}><ImagePlus size={17} /> {submitting ? '업로드 중…' : '사진 저장'}</button></div></form></Modal>}
      {editorOpen && creatorWork && <Modal title={`${novel.title} · ${editingDraftId ? '회차 수정' : '새 회차'}`} onClose={() => setEditorOpen(false)} wide><form className="episode-editor" onSubmit={submitEpisode}><div className="editor-meta"><label>회차 제목<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="예: 북쪽으로 가는 길" /></label><span>{body.length.toLocaleString()}자</span></div><label><span className="sr-only">본문</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={200000} placeholder="이야기를 시작하세요…" autoFocus /></label><div className="editor-notice">입력한 텍스트는 HTML로 실행되지 않으며, 운영 환경에서는 서버에서 한 번 더 검증합니다.</div>{managerMessage && <p className="form-message" role="status">{managerMessage}</p>}<div className="form-actions"><button className="secondary-button" type="submit" value="draft" disabled={submitting}><Save size={17} /> 초안 저장</button><button className="primary-button" type="submit" value="publish" disabled={submitting || !title.trim() || body.trim().length < 10}><BookOpen size={17} /> 바로 발행</button></div></form></Modal>}
    </>
  );
}
