import { ArrowLeft, BadgeCheck, BarChart3, BookOpen, CalendarClock, ChevronRight, Clock3, Eye, FileCheck2, FileUp, Image as ImageIcon, ImagePlus, Link2, LockKeyhole, MessageCircle, PenLine, Plus, Save, Send, ShieldCheck, Sparkles, Square } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { ImageCropEditor } from '../components/ImageCropEditor';
import { categories, getCategoryLabel } from '../data';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

export function StudioPage() {
  const { authorApplication, authorWorks, drafts, createNovel, submitAuthorApplication, saveDraft, updateNovelAssets } = useApp();
  const { viewer, demoMode } = useAuth();
  const { workId } = useParams<{ workId?: string }>();
  const [workOpen, setWorkOpen] = useState(false);
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [workTitle, setWorkTitle] = useState('');
  const [workCategory, setWorkCategory] = useState<'martial' | 'fantasy' | 'romance' | 'mystery' | 'sf' | 'daily'>('fantasy');
  const [workSynopsis, setWorkSynopsis] = useState('');
  const [penName, setPenName] = useState(authorApplication.penName);
  const [genre, setGenre] = useState(authorApplication.genre || 'fantasy');
  const [introduction, setIntroduction] = useState(authorApplication.introduction);
  const [portfolioUrl, setPortfolioUrl] = useState(authorApplication.portfolioUrl);
  const [sampleName, setSampleName] = useState(authorApplication.sampleName);
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [sampleExcerpt, setSampleExcerpt] = useState(authorApplication.sampleExcerpt);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);
  const [activeWorkId, setActiveWorkId] = useState('');
  const [editingDraftId, setEditingDraftId] = useState<string>();
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeBody, setEpisodeBody] = useState('');
  const [assetCoverFile, setAssetCoverFile] = useState<File | null>(null);
  const [assetBannerFile, setAssetBannerFile] = useState<File | null>(null);
  const [managerMessage, setManagerMessage] = useState('');
  const hasWorkSample = Boolean(portfolioUrl.trim() || sampleFile || (demoMode && sampleName) || sampleExcerpt.trim().length >= 200);
  const applicationReady = penName.trim().length >= 2 && introduction.trim().length >= 50 && hasWorkSample;
  const activeWork = authorWorks.find((work) => work.id === (workId ?? activeWorkId)) ?? authorWorks[0];
  const activeDrafts = activeWork ? drafts.filter((draft) => draft.novelId === activeWork.id) : [];

  const submitWork = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const result = await createNovel(workTitle, workCategory, workSynopsis);
    setSubmitting(false);
    if (!result.ok) { setMessage(result.reason ?? '작품을 등록하지 못했습니다.'); return; }
    setWorkTitle(''); setWorkSynopsis(''); setWorkOpen(false);
  };


  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!applicationReady) return;
    setSubmitting(true);
    setMessage('');
    const result = await submitAuthorApplication({
      penName: penName.trim().slice(0, 30),
      genre,
      introduction: introduction.trim().slice(0, 1000),
      portfolioUrl: portfolioUrl.trim().slice(0, 500),
      sampleName: sampleName.slice(0, 200),
      sampleFile,
      sampleExcerpt: sampleExcerpt.trim().slice(0, 10000),
    });
    setSubmitting(false);
    if (!result.ok) { setMessage(result.reason ?? '신청서를 접수하지 못했습니다.'); return; }
    setApplicationOpen(false);
  };

  const openNewEpisode = (workId = activeWork?.id) => {
    if (!workId) return;
    setActiveWorkId(workId);
    setEditingDraftId(undefined);
    setEpisodeTitle('');
    setEpisodeBody('');
    setManagerMessage('');
    setEditorOpen(true);
  };

  const openDraft = (draft: typeof drafts[number]) => {
    setActiveWorkId(draft.novelId);
    setEditingDraftId(draft.id);
    setEpisodeTitle(draft.title);
    setEpisodeBody(draft.body);
    setManagerMessage('');
    setEditorOpen(true);
  };

  const openAssetEditor = (workId = activeWork?.id) => {
    if (!workId) return;
    setActiveWorkId(workId);
    setAssetCoverFile(null);
    setAssetBannerFile(null);
    setManagerMessage('');
    setAssetOpen(true);
  };

  const submitEpisode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const action = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (!activeWork) return;
    setSubmitting(true);
    setManagerMessage('');
    const result = await saveDraft(activeWork.id, episodeTitle || '제목 없는 회차', episodeBody, action?.value === 'publish', editingDraftId);
    setSubmitting(false);
    if (!result.ok) { setManagerMessage(result.reason ?? '회차를 저장하지 못했습니다.'); return; }
    setEditorOpen(false);
  };

  const submitAssets = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeWork || (!assetCoverFile && !assetBannerFile)) return;
    setSubmitting(true);
    setManagerMessage('');
    const result = await updateNovelAssets(activeWork.id, assetCoverFile, assetBannerFile);
    setSubmitting(false);
    if (!result.ok) { setManagerMessage(result.reason ?? '작품 사진을 업로드하지 못했습니다.'); return; }
    setAssetCoverFile(null);
    setAssetBannerFile(null);
    setAssetOpen(false);
  };

  if (!demoMode && !viewer) {
    return <div className="page-container inner-page empty-state"><LockKeyhole /><h1>로그인이 필요합니다</h1><p>작가 등록 신청과 원고 제출은 본인 계정으로 로그인한 뒤 진행해 주세요.</p><Link className="primary-button" to="/auth">로그인</Link></div>;
  }

  if (authorApplication.status !== 'approved') {
    const pending = authorApplication.status === 'pending';
    return (
      <div className="studio-page">
        <div className="page-container inner-page">
          <header className="page-title"><span className="section-kicker"><Sparkles size={15} /> 연재 스튜디오</span><h1>{pending ? '작가 등록 심사 중입니다' : '승인된 작가만 연재할 수 있어요'}</h1><p>{pending ? '제출한 자료를 운영팀이 확인하고 있습니다. 심사 결과는 알림과 이메일로 안내됩니다.' : '포트폴리오 링크 또는 원고 예시를 제출하면 운영팀 심사 후 스튜디오가 열립니다.'}</p></header>

          {pending ? (
            <section className="application-status-card">
              <span className="status-icon"><Clock3 /></span><div><small>현재 상태</small><h2>검토 대기</h2><p><strong>{authorApplication.penName}</strong> 작가님의 신청서가 안전하게 접수되었습니다.</p><dl><div><dt>신청 장르</dt><dd>{categories.find((item) => item.id === authorApplication.genre)?.label}</dd></div><div><dt>제출 자료</dt><dd>{authorApplication.portfolioUrl ? '포트폴리오 링크' : authorApplication.sampleName || '원고 예시'}</dd></div><div><dt>접수 시각</dt><dd>{authorApplication.submittedAt}</dd></div></dl></div>
              <div className="review-lock"><LockKeyhole /><span>승인 전에는 작품·회차 등록 기능이 잠겨 있습니다.</span></div>
            </section>
          ) : (
            <>
              <section className="creator-approval-hero"><div><span className="approval-badge"><ShieldCheck /> 사전 심사제</span><h2>좋은 작품이 독자에게<br />안전하게 닿도록</h2><p>필명과 소개를 작성하고, 아래 두 자료 중 하나 이상을 보내주세요.</p><div className="submission-options"><span><Link2 /><b>포트폴리오</b><small>공개 작품 또는 개인 문서 링크</small></span><em>또는</em><span><FileUp /><b>원고 예시</b><small>파일 첨부 또는 200자 이상 붙여넣기</small></span></div><button className="primary-button" type="button" onClick={() => setApplicationOpen(true)}><Send size={17} /> 작가 등록 신청</button></div><FileCheck2 className="approval-illustration" /></section>
              <section className="approval-steps" aria-label="작가 등록 절차"><div><b>1</b><span><strong>신청서 제출</strong><small>필명·소개·작품 자료</small></span></div><ChevronRight /><div><b>2</b><span><strong>운영팀 심사</strong><small>표절·품질·정책 확인</small></span></div><ChevronRight /><div><b>3</b><span><strong>작가 승인</strong><small>작품 등록 기능 활성화</small></span></div></section>
              <div className="approval-notice"><BadgeCheck /><div><strong>승인은 운영자만 처리합니다.</strong><p>브라우저에서 승인 상태를 바꿀 수 없으며, 실제 서비스에서는 서버 권한으로만 승인됩니다.</p></div></div>
            </>
          )}
          <section className="creator-revenue-summary"><div><span className="section-kicker">작가 수익 원칙</span><h2>유료 회차 70% · 후원 90% · 광고 70%</h2><p>실제 공제 항목과 거래별 계산식은 매월 정산서에 투명하게 표시합니다. 플랫폼 부담 2배 이벤트는 작가 정산액을 줄이지 않습니다.</p></div><Link className="secondary-button" to="/creator-policy">정산 정책 보기</Link></section>
        </div>

        {applicationOpen && <Modal title="작가 등록 신청" onClose={() => setApplicationOpen(false)} wide><form className="author-application-form" onSubmit={submitApplication}><div className="application-form-grid"><label>필명<input value={penName} onChange={(event) => setPenName(event.target.value)} minLength={2} maxLength={30} placeholder="독자에게 표시할 이름" required /></label><label>주요 장르<select value={genre} onChange={(event) => setGenre(event.target.value)}>{categories.filter((item) => item.id !== 'all').map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div><label>작가 소개 <small>{introduction.length}/1,000 · 50자 이상</small><textarea value={introduction} onChange={(event) => setIntroduction(event.target.value)} minLength={50} maxLength={1000} placeholder="쓰고 싶은 이야기와 연재 경험을 소개해 주세요." required /></label><fieldset><legend>작품 자료 <small>아래 중 하나 이상 필수</small></legend><label>포트폴리오 링크<div className="input-with-icon"><Link2 /><input type="url" value={portfolioUrl} onChange={(event) => setPortfolioUrl(event.target.value)} maxLength={500} placeholder="https://" /></div></label><div className="form-divider"><span>또는</span></div><label className="file-field"><FileUp /><span><strong>{sampleName || '원고 파일 선택'}</strong><small>PDF, DOCX, TXT, HWP · 최대 20MB · 심사자만 열람</small></span><input type="file" accept=".pdf,.doc,.docx,.txt,.hwp" onChange={(event) => { const file = event.target.files?.[0] ?? null; setSampleFile(file); setSampleName(file?.name ?? ''); }} /></label><label>원고 직접 붙여넣기 <small>{sampleExcerpt.length.toLocaleString()}/10,000 · 200자 이상</small><textarea value={sampleExcerpt} onChange={(event) => setSampleExcerpt(event.target.value)} maxLength={10000} placeholder="심사용 원고 일부를 붙여넣어 주세요." /></label></fieldset><div className="editor-notice">{demoMode ? '데모에서는 파일명만 저장됩니다.' : '첨부 원고는 비공개 저장소에 암호화 전송되며 신청자와 승인된 심사자만 열람할 수 있습니다.'}</div>{message && <p className="form-message" role="status">{message}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => setApplicationOpen(false)}>취소</button><button className="primary-button" disabled={!applicationReady || submitting}><Send size={17} /> {submitting ? '안전하게 제출 중…' : '심사 신청'}</button></div></form></Modal>}
      </div>
    );
  }

  if (workId) {
    if (!activeWork) return <div className="page-container inner-page empty-state"><BookOpen /><h1>작품을 찾을 수 없습니다</h1><p>작가 페이지에서 관리할 작품을 다시 선택해 주세요.</p><Link className="primary-button" to="/studio">작가 페이지로 돌아가기</Link></div>;
    return (
      <div className="studio-page">
        <div className="page-container inner-page studio-work-page">
          <Link className="back-link" to="/studio"><ArrowLeft size={16} /> 작가 페이지로 돌아가기</Link>
          <section className="studio-panel creator-work-tools studio-work-management"><header><div><span className="section-kicker">작품 관리</span><div className="studio-work-heading"><span className="studio-work-thumb">{activeWork.coverUrl ? <img src={activeWork.coverUrl} alt="" /> : <BookOpen size={22} />}</span><h1>{activeWork.title}</h1></div><p>이 작품의 회차와 이미지를 관리하는 전용 페이지입니다. 독자 화면은 홈이나 찾기에서 확인하세요.</p></div><div className="creator-work-actions"><Link to={`/novel/${activeWork.slug}`} className="secondary-button">독자 화면 보기</Link><button type="button" className="secondary-button" onClick={() => openAssetEditor(activeWork.id)}><ImagePlus size={16} /> 사진 업로드</button><button type="button" className="primary-button" onClick={() => openNewEpisode(activeWork.id)}><PenLine size={16} /> 새 회차 쓰기</button></div></header><div className="creator-work-summary"><span>작품 상태 · {activeWork.status === 'serializing' ? '연재중' : activeWork.status === 'complete' ? '완결' : '초안'}</span><span>총 {activeDrafts.filter((draft) => draft.status === '발행').length}화</span><span>초안 {activeDrafts.filter((draft) => draft.status === '초안').length}개</span></div><div className="creator-draft-list">{activeDrafts.length ? activeDrafts.map((draft) => <button type="button" className="creator-draft-row" key={draft.id} onClick={() => openDraft(draft)}><span><strong>{draft.chapterNumber}화 · {draft.title}</strong><small>{draft.status} · {draft.updatedAt}</small></span><ChevronRight size={16} /></button>) : <div className="studio-list-empty">아직 저장한 회차가 없습니다. ‘새 회차 쓰기’로 초안을 작성해 보세요.</div>}</div></section>
        </div>
        {assetOpen && <Modal title={`${activeWork.title} · 사진 업로드`} onClose={() => setAssetOpen(false)} wide><form className="author-application-form" onSubmit={submitAssets}><p className="asset-upload-intro">작품 페이지와 홈 추천 영역에 사용할 이미지를 편집한 뒤 저장합니다. 한 장만 선택해도 기존 이미지는 유지됩니다.</p><fieldset className="work-image-fields"><legend>업로드할 사진</legend><ImageCropEditor label="작품 썸네일" width={800} height={800} maxBytes={3 * 1024 * 1024} value={assetCoverFile} onChange={setAssetCoverFile} /><ImageCropEditor label="오늘의 추천 배너" width={1440} height={480} maxBytes={5 * 1024 * 1024} value={assetBannerFile} onChange={setAssetBannerFile} /></fieldset>{managerMessage && <p className="form-message" role="status">{managerMessage}</p>}<div className="form-actions"><button className="secondary-button" type="button" onClick={() => setAssetOpen(false)}>취소</button><button className="primary-button" disabled={submitting || (!assetCoverFile && !assetBannerFile)}><ImagePlus size={17} /> {submitting ? '업로드 중…' : '사진 저장'}</button></div></form></Modal>}
        {editorOpen && <Modal title={`${activeWork.title} · ${editingDraftId ? '회차 수정' : '새 회차'}`} onClose={() => setEditorOpen(false)} wide><form className="episode-editor" onSubmit={submitEpisode}><div className="editor-meta"><label>회차 제목<input value={episodeTitle} onChange={(event) => setEpisodeTitle(event.target.value)} maxLength={100} placeholder="예: 북쪽으로 가는 길" /></label></div><label><span className="sr-only">본문</span><textarea value={episodeBody} onChange={(event) => setEpisodeBody(event.target.value)} maxLength={200000} placeholder="이야기를 시작하세요…" autoFocus /></label><div className="editor-notice">입력한 텍스트는 HTML로 실행되지 않으며, 운영 환경에서는 서버에서 한 번 더 검증합니다.</div>{managerMessage && <p className="form-message" role="status">{managerMessage}</p>}<div className="form-actions"><button className="secondary-button" type="submit" value="draft" disabled={submitting}><Save size={17} /> 초안 저장</button><button className="primary-button" type="submit" value="publish" disabled={submitting || !episodeTitle.trim() || episodeBody.trim().length < 10}><BookOpen size={17} /> 바로 발행</button></div></form></Modal>}
      </div>
    );
  }

  return (
    <div className="studio-page">
      <div className="page-container inner-page">
        <header className="page-title split-title"><div><span className="section-kicker"><BadgeCheck size={15} /> 작가 페이지</span><h1>안녕하세요, {authorApplication.penName} 작가님</h1><p>작품 성과와 정산, 독자 반응을 한 곳에서 확인하세요.</p></div><div className="studio-header-actions"><button className="primary-button" type="button" onClick={() => setWorkOpen(true)}><Plus size={17} /> 새 작품 쓰기</button></div></header>
        <section className="settlement-banner"><div><span>총 정산액</span><strong>{demoMode ? '₩1,284,600' : '₩0'}</strong><small>{demoMode ? '누적 정산 데모 데이터' : '정산 데이터 집계 전'} · 거래별 공제 내역은 정산서에서 확인</small></div><Link to="/creator-policy">정산 기준 확인 <ChevronRight size={16} /></Link></section>
        <div className="studio-stats"><div><span><Eye /></span><p>총 조회수</p><strong>{demoMode ? '18,420' : '0'}</strong><small>{demoMode ? '지난주보다 12% ↑' : '집계 전'}</small></div><div><span><BookOpen /></span><p>작품 수</p><strong>{authorWorks.length}</strong><small>{authorWorks.length ? '등록된 작품' : '첫 작품을 등록해 주세요'}</small></div><div><span><MessageCircle /></span><p>새 댓글</p><strong>{demoMode ? '126' : '0'}</strong><small>{demoMode ? '답변 대기 14개' : '새 댓글 없음'}</small></div><div><span><BarChart3 /></span><p>평균 완독률</p><strong>{demoMode ? '82.4%' : '-'}</strong><small>{demoMode ? '상위 10%' : '데이터 집계 전'}</small></div></div>
        <div className="studio-layout">
          <section className="studio-main">
            <section className="studio-panel studio-works-panel"><header><div><h2>내 작품</h2><p>작품을 누르면 작품 관리 페이지로 이동합니다. 독자 화면은 홈이나 찾기에서 확인하세요.</p></div><button className="secondary-button small" type="button" onClick={() => setWorkOpen(true)}><Plus size={16} /> 작품 추가</button></header><div className="studio-work-list">{authorWorks.length ? authorWorks.map((work) => <article className="studio-work-list-item" key={work.id}><Link to={`/studio/work/${work.id}`} className="studio-work-list-link"><span className="studio-list-cover">{work.coverUrl ? <img src={work.coverUrl} alt="" /> : <BookOpen />}</span><span><strong>{work.title}</strong><small>{work.status === 'serializing' ? '연재중' : work.status === 'complete' ? '완결' : '초안'} · {getCategoryLabel(work.category)}</small><em>{work.synopsis || '작품 소개가 아직 없습니다.'}</em></span></Link><div className="studio-work-list-actions"><Link to={`/studio/work/${work.id}`} className="secondary-button small">관리</Link></div></article>) : <div className="studio-list-empty">아직 등록한 작품이 없습니다. 오른쪽 위 ‘새 작품 쓰기’부터 시작해 보세요.</div>}</div></section>
            {workId && activeWork && <section className="studio-panel creator-work-tools studio-work-management"><header><div><span className="section-kicker">작가 관리</span><h2>{activeWork.title} 관리</h2><p>이 작품의 회차와 이미지를 연재 스튜디오에서 관리합니다. 작품 페이지는 독자와 같은 화면으로 열립니다.</p></div><div className="creator-work-actions"><button type="button" className="secondary-button" onClick={() => openAssetEditor(activeWork.id)}><ImagePlus size={16} /> 사진 업로드</button><button type="button" className="primary-button" onClick={() => openNewEpisode(activeWork.id)}><PenLine size={16} /> 새 회차 쓰기</button></div></header><div className="creator-work-summary"><span>작품 상태 · {activeWork.status === 'serializing' ? '연재중' : activeWork.status === 'complete' ? '완결' : '초안'}</span><span>총 {activeDrafts.filter((draft) => draft.status === '발행').length}화</span><span>초안 {activeDrafts.filter((draft) => draft.status === '초안').length}개</span></div><section className="creator-upload-guide" aria-label="작품 이미지 업로드 규격"><header><div><span className="section-kicker"><ImageIcon size={14} /> 작품 이미지 규격</span><h3>이 작품의 추천 배너와 썸네일</h3></div></header><div className="creator-upload-specs"><div><span className="creator-spec-icon"><ImageIcon /></span><div><strong>오늘의 추천 배너</strong><b>1440 × 480px</b><p>JPG · PNG · WebP · 최대 5MB<br />문구는 왼쪽 안전 영역 45% 안에 배치</p></div></div><div><span className="creator-spec-icon"><Square /></span><div><strong>작품 썸네일</strong><b>800 × 800px</b><p>정방형 JPG · PNG · WebP · 최대 3MB<br />중요한 얼굴·제목은 중앙 80% 안에 배치</p></div></div></div><p className="creator-upload-note">이 작품에 사용할 이미지는 작품별 관리 화면에서만 업로드할 수 있습니다.</p></section><div className="creator-draft-list">{activeDrafts.length ? activeDrafts.map((draft) => <button type="button" className="creator-draft-row" key={draft.id} onClick={() => openDraft(draft)}><span><strong>{draft.chapterNumber}화 · {draft.title}</strong><small>{draft.status} · {draft.updatedAt}</small></span><ChevronRight size={16} /></button>) : <div className="studio-list-empty">아직 저장한 회차가 없습니다. ‘새 회차 쓰기’로 초안을 작성해 보세요.</div>}</div></section>}
          </section>
          <aside className="studio-side"><div className="schedule-card"><CalendarClock /><h3>연재 일정</h3><strong>회차별 직접 발행</strong><p>초안은 비공개로 저장되고, 발행한 회차만 공개됩니다.</p></div><div className="writing-tip"><span>오늘의 집필 팁</span><h3>장면의 끝에는<br />작은 질문을 남겨보세요.</h3><p>독자가 다음 회차를 누르게 만드는 가장 자연스러운 힘은 ‘궁금함’입니다.</p></div></aside>
        </div>
      </div>

      {workOpen && <Modal title="새 작품 등록" onClose={() => setWorkOpen(false)} wide><form className="author-application-form" onSubmit={submitWork}><div className="application-form-grid"><label>작품 제목<input value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} minLength={1} maxLength={100} placeholder="작품 제목" required /></label><label>장르<select value={workCategory} onChange={(event) => setWorkCategory(event.target.value as typeof workCategory)}>{categories.filter((item) => item.id !== 'all').map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div><label>작품 소개 <small>{workSynopsis.length.toLocaleString()}/3,000</small><textarea value={workSynopsis} onChange={(event) => setWorkSynopsis(event.target.value)} maxLength={3000} placeholder="독자에게 보여줄 작품 소개를 작성해 주세요." /></label><div className="editor-notice">작품은 먼저 비공개 초안으로 만들어집니다. 작품을 등록한 뒤 작품 관리 페이지에서 썸네일·추천 배너를 업로드할 수 있습니다.</div>{message && <p className="form-message" role="status">{message}</p>}<div className="form-actions"><button className="secondary-button" type="button" onClick={() => setWorkOpen(false)}>취소</button><button className="primary-button" disabled={!workTitle.trim() || submitting}><Plus size={17} /> {submitting ? '등록 중…' : '작품 등록'}</button></div></form></Modal>}
      {assetOpen && activeWork && <Modal title={`${activeWork.title} · 사진 업로드`} onClose={() => setAssetOpen(false)} wide><form className="author-application-form" onSubmit={submitAssets}><p className="asset-upload-intro">작품 페이지와 홈 추천 영역에 사용할 이미지를 편집한 뒤 저장합니다. 한 장만 선택해도 기존 이미지는 유지됩니다.</p><fieldset className="work-image-fields"><legend>업로드할 사진</legend><ImageCropEditor label="작품 썸네일" width={800} height={800} maxBytes={3 * 1024 * 1024} value={assetCoverFile} onChange={setAssetCoverFile} /><ImageCropEditor label="오늘의 추천 배너" width={1440} height={480} maxBytes={5 * 1024 * 1024} value={assetBannerFile} onChange={setAssetBannerFile} /></fieldset>{managerMessage && <p className="form-message" role="status">{managerMessage}</p>}<div className="form-actions"><button className="secondary-button" type="button" onClick={() => setAssetOpen(false)}>취소</button><button className="primary-button" disabled={submitting || (!assetCoverFile && !assetBannerFile)}><ImagePlus size={17} /> {submitting ? '업로드 중…' : '사진 저장'}</button></div></form></Modal>}
      {editorOpen && activeWork && <Modal title={`${activeWork.title} · ${editingDraftId ? '회차 수정' : '새 회차'}`} onClose={() => setEditorOpen(false)} wide><form className="episode-editor" onSubmit={submitEpisode}><div className="editor-meta"><label>회차 제목<input value={episodeTitle} onChange={(event) => setEpisodeTitle(event.target.value)} maxLength={100} placeholder="예: 북쪽으로 가는 길" /></label></div><label><span className="sr-only">본문</span><textarea value={episodeBody} onChange={(event) => setEpisodeBody(event.target.value)} maxLength={200000} placeholder="이야기를 시작하세요…" autoFocus /></label><div className="editor-notice">입력한 텍스트는 HTML로 실행되지 않으며, 운영 환경에서는 서버에서 한 번 더 검증합니다.</div>{managerMessage && <p className="form-message" role="status">{managerMessage}</p>}<div className="form-actions"><button className="secondary-button" type="submit" value="draft" disabled={submitting}><Save size={17} /> 초안 저장</button><button className="primary-button" type="submit" value="publish" disabled={submitting || !episodeTitle.trim() || episodeBody.trim().length < 10}><BookOpen size={17} /> 바로 발행</button></div></form></Modal>}
    </div>
  );
}
