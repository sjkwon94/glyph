import { BadgeCheck, BarChart3, BookOpen, CalendarClock, ChevronRight, Clock3, Eye, FileCheck2, FileUp, Link2, LockKeyhole, MessageCircle, Plus, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { ImageCropEditor } from '../components/ImageCropEditor';
import { categories, getCategoryLabel } from '../data';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

export function StudioPage() {
  const { authorApplication, authorWorks, createNovel, submitAuthorApplication } = useApp();
  const { viewer, demoMode } = useAuth();
  const [workOpen, setWorkOpen] = useState(false);
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [workTitle, setWorkTitle] = useState('');
  const [workCategory, setWorkCategory] = useState<'martial' | 'fantasy' | 'romance' | 'mystery' | 'sf' | 'daily'>('fantasy');
  const [workSynopsis, setWorkSynopsis] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [penName, setPenName] = useState(authorApplication.penName);
  const [genre, setGenre] = useState(authorApplication.genre || 'fantasy');
  const [introduction, setIntroduction] = useState(authorApplication.introduction);
  const [portfolioUrl, setPortfolioUrl] = useState(authorApplication.portfolioUrl);
  const [sampleName, setSampleName] = useState(authorApplication.sampleName);
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [sampleExcerpt, setSampleExcerpt] = useState(authorApplication.sampleExcerpt);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hasWorkSample = Boolean(portfolioUrl.trim() || sampleFile || (demoMode && sampleName) || sampleExcerpt.trim().length >= 200);
  const applicationReady = penName.trim().length >= 2 && introduction.trim().length >= 50 && hasWorkSample;

  const submitWork = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const result = await createNovel(workTitle, workCategory, workSynopsis, coverFile, bannerFile);
    setSubmitting(false);
    if (!result.ok) { setMessage(result.reason ?? '작품을 등록하지 못했습니다.'); return; }
    setWorkTitle(''); setWorkSynopsis(''); setCoverFile(null); setBannerFile(null); setWorkOpen(false);
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

  return (
    <div className="studio-page">
      <div className="page-container inner-page">
        <header className="page-title split-title"><div><span className="section-kicker"><BadgeCheck size={15} /> 작가 페이지</span><h1>안녕하세요, {authorApplication.penName} 작가님</h1><p>작품 성과와 정산, 독자 반응을 한 곳에서 확인하세요.</p></div><div className="studio-header-actions"><button className="primary-button" type="button" onClick={() => setWorkOpen(true)}><Plus size={17} /> 새 작품 쓰기</button></div></header>
        <section className="settlement-banner"><div><span>총 정산액</span><strong>{demoMode ? '₩1,284,600' : '₩0'}</strong><small>{demoMode ? '누적 정산 데모 데이터' : '정산 데이터 집계 전'} · 거래별 공제 내역은 정산서에서 확인</small></div><Link to="/creator-policy">정산 기준 확인 <ChevronRight size={16} /></Link></section>
        <div className="studio-stats"><div><span><Eye /></span><p>총 조회수</p><strong>{demoMode ? '18,420' : '0'}</strong><small>{demoMode ? '지난주보다 12% ↑' : '집계 전'}</small></div><div><span><BookOpen /></span><p>작품 수</p><strong>{authorWorks.length}</strong><small>{authorWorks.length ? '등록된 작품' : '첫 작품을 등록해 주세요'}</small></div><div><span><MessageCircle /></span><p>새 댓글</p><strong>{demoMode ? '126' : '0'}</strong><small>{demoMode ? '답변 대기 14개' : '새 댓글 없음'}</small></div><div><span><BarChart3 /></span><p>평균 완독률</p><strong>{demoMode ? '82.4%' : '-'}</strong><small>{demoMode ? '상위 10%' : '데이터 집계 전'}</small></div></div>
        <div className="studio-layout">
          <section className="studio-main">
            <section className="studio-panel studio-works-panel"><header><div><h2>내 작품</h2><p>작품을 선택하면 작품 페이지로 이동합니다. 회차와 이미지는 작품 페이지에서 관리하세요.</p></div><button className="secondary-button small" type="button" onClick={() => setWorkOpen(true)}><Plus size={16} /> 작품 추가</button></header><div className="studio-work-list">{authorWorks.length ? authorWorks.map((work) => <article className="studio-work-list-item" key={work.id}><Link to={`/novel/${work.slug}`} className="studio-work-list-link"><span className="studio-list-cover">{work.coverUrl ? <img src={work.coverUrl} alt="" /> : <BookOpen />}</span><span><strong>{work.title}</strong><small>{work.status === 'serializing' ? '연재중' : work.status === 'complete' ? '완결' : '초안'} · {getCategoryLabel(work.category)}</small><em>{work.synopsis || '작품 소개가 아직 없습니다.'}</em></span></Link></article>) : <div className="studio-list-empty">아직 등록한 작품이 없습니다. 오른쪽 위 ‘새 작품 쓰기’부터 시작해 보세요.</div>}</div></section>
          </section>
          <aside className="studio-side"><div className="schedule-card"><CalendarClock /><h3>연재 일정</h3><strong>회차별 직접 발행</strong><p>초안은 비공개로 저장되고, 발행한 회차만 공개됩니다.</p></div><div className="writing-tip"><span>오늘의 집필 팁</span><h3>장면의 끝에는<br />작은 질문을 남겨보세요.</h3><p>독자가 다음 회차를 누르게 만드는 가장 자연스러운 힘은 ‘궁금함’입니다.</p></div></aside>
        </div>
      </div>

      {workOpen && <Modal title="새 작품 등록" onClose={() => setWorkOpen(false)} wide><form className="author-application-form" onSubmit={submitWork}><div className="application-form-grid"><label>작품 제목<input value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} minLength={1} maxLength={100} placeholder="작품 제목" required /></label><label>장르<select value={workCategory} onChange={(event) => setWorkCategory(event.target.value as typeof workCategory)}>{categories.filter((item) => item.id !== 'all').map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div><label>작품 소개 <small>{workSynopsis.length.toLocaleString()}/3,000</small><textarea value={workSynopsis} onChange={(event) => setWorkSynopsis(event.target.value)} maxLength={3000} placeholder="독자에게 보여줄 작품 소개를 작성해 주세요." /></label><fieldset className="work-image-fields"><legend>작품 이미지 <small>선택 입력</small></legend><ImageCropEditor label="작품 썸네일" width={800} height={800} maxBytes={3 * 1024 * 1024} value={coverFile} onChange={setCoverFile} /><ImageCropEditor label="오늘의 추천 배너" width={1440} height={480} maxBytes={5 * 1024 * 1024} value={bannerFile} onChange={setBannerFile} /></fieldset><div className="editor-notice">작품은 먼저 비공개 초안으로 만들어집니다. 이미지는 규격을 확인한 뒤 승인된 작가의 전용 저장소에 안전하게 업로드됩니다.</div>{message && <p className="form-message" role="status">{message}</p>}<div className="form-actions"><button className="secondary-button" type="button" onClick={() => setWorkOpen(false)}>취소</button><button className="primary-button" disabled={!workTitle.trim() || submitting}><Plus size={17} /> {submitting ? '등록 중…' : '작품 등록'}</button></div></form></Modal>}
    </div>
  );
}
