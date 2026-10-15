import { BadgeCheck, BarChart3, BookOpen, CalendarClock, ChevronRight, Clock3, Eye, FileCheck2, FileText, FileUp, Link2, LockKeyhole, MessageCircle, PenLine, Plus, Save, Send, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { categories, novels } from '../data';
import { useApp } from '../state/AppContext';

export function StudioPage() {
  const { authorApplication, drafts, saveDraft, submitAuthorApplication } = useApp();
  const [editorOpen, setEditorOpen] = useState(false);
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [penName, setPenName] = useState(authorApplication.penName);
  const [genre, setGenre] = useState(authorApplication.genre || 'fantasy');
  const [introduction, setIntroduction] = useState(authorApplication.introduction);
  const [portfolioUrl, setPortfolioUrl] = useState(authorApplication.portfolioUrl);
  const [sampleName, setSampleName] = useState(authorApplication.sampleName);
  const [sampleExcerpt, setSampleExcerpt] = useState(authorApplication.sampleExcerpt);
  const sample = novels[0];
  const hasWorkSample = Boolean(portfolioUrl.trim() || sampleName || sampleExcerpt.trim().length >= 200);
  const applicationReady = penName.trim().length >= 2 && introduction.trim().length >= 50 && hasWorkSample;

  const submitEpisode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const action = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (!saveDraft(title || '제목 없는 회차', body, action?.value === 'publish')) return;
    setTitle(''); setBody(''); setEditorOpen(false);
  };

  const submitApplication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!applicationReady) return;
    submitAuthorApplication({
      penName: penName.trim().slice(0, 30),
      genre,
      introduction: introduction.trim().slice(0, 1000),
      portfolioUrl: portfolioUrl.trim().slice(0, 500),
      sampleName: sampleName.slice(0, 200),
      sampleExcerpt: sampleExcerpt.trim().slice(0, 10000),
    });
    setApplicationOpen(false);
  };

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

        {applicationOpen && <Modal title="작가 등록 신청" onClose={() => setApplicationOpen(false)} wide><form className="author-application-form" onSubmit={submitApplication}><div className="application-form-grid"><label>필명<input value={penName} onChange={(event) => setPenName(event.target.value)} minLength={2} maxLength={30} placeholder="독자에게 표시할 이름" required /></label><label>주요 장르<select value={genre} onChange={(event) => setGenre(event.target.value)}>{categories.filter((item) => item.id !== 'all').map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div><label>작가 소개 <small>{introduction.length}/1,000 · 50자 이상</small><textarea value={introduction} onChange={(event) => setIntroduction(event.target.value)} minLength={50} maxLength={1000} placeholder="쓰고 싶은 이야기와 연재 경험을 소개해 주세요." required /></label><fieldset><legend>작품 자료 <small>아래 중 하나 이상 필수</small></legend><label>포트폴리오 링크<div className="input-with-icon"><Link2 /><input type="url" value={portfolioUrl} onChange={(event) => setPortfolioUrl(event.target.value)} maxLength={500} placeholder="https://" /></div></label><div className="form-divider"><span>또는</span></div><label className="file-field"><FileUp /><span><strong>{sampleName || '원고 파일 선택'}</strong><small>PDF, DOCX, TXT, HWP · 운영 환경 최대 20MB</small></span><input type="file" accept=".pdf,.doc,.docx,.txt,.hwp" onChange={(event) => setSampleName(event.target.files?.[0]?.name ?? '')} /></label><label>원고 직접 붙여넣기 <small>{sampleExcerpt.length.toLocaleString()}/10,000 · 200자 이상</small><textarea value={sampleExcerpt} onChange={(event) => setSampleExcerpt(event.target.value)} maxLength={10000} placeholder="심사용 원고 일부를 붙여넣어 주세요." /></label></fieldset><div className="editor-notice">데모에서는 파일명만 저장됩니다. 운영 환경에서는 비공개 저장소에 업로드하고 심사자에게만 열람 권한을 부여합니다.</div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setApplicationOpen(false)}>취소</button><button className="primary-button" disabled={!applicationReady}><Send size={17} /> 심사 신청</button></div></form></Modal>}
      </div>
    );
  }

  return (
    <div className="studio-page">
      <div className="page-container inner-page">
        <header className="page-title split-title"><div><span className="section-kicker"><BadgeCheck size={15} /> 승인 작가</span><h1>안녕하세요, {authorApplication.penName} 작가님</h1><p>오늘도 독자들이 작가님의 다음 문장을 기다리고 있어요.</p></div><button className="primary-button" type="button" onClick={() => setEditorOpen(true)}><PenLine size={18} /> 새 회차 쓰기</button></header>
        <section className="settlement-banner"><div><span>이번 달 예상 정산액</span><strong>₩1,284,600</strong><small>데모 데이터 · 매월 정산서에서 거래별 공제 내역 제공</small></div><Link to="/creator-policy">정산 기준 확인 <ChevronRight size={16} /></Link></section>
        <div className="studio-stats"><div><span><Eye /></span><p>이번 주 조회</p><strong>18,420</strong><small>지난주보다 12% ↑</small></div><div><span><Users /></span><p>선호 독자</p><strong>8,421</strong><small>오늘 38명 추가</small></div><div><span><MessageCircle /></span><p>새 댓글</p><strong>126</strong><small>답변 대기 14개</small></div><div><span><BarChart3 /></span><p>평균 완독률</p><strong>82.4%</strong><small>상위 10%</small></div></div>
        <div className="studio-layout">
          <section className="studio-main">
            <div className="studio-work-card"><div className="studio-cover" style={{ background: sample.color }}><BookOpen /></div><div><span>연재중 · {sample.categoryLabel}</span><h2>{sample.title}</h2><p>총 {sample.chapters.length}화 · {sample.schedule}</p><div className="mini-progress"><span style={{ width: '72%' }} /></div><small>이번 주 연재 목표 3회 중 2회 완료</small></div><button type="button">작품 관리 <ChevronRight /></button></div>
            <div className="studio-panel"><header><div><h2>회차 관리</h2><p>초안을 이어 쓰거나 발행한 회차를 확인하세요.</p></div><button className="secondary-button small" type="button" onClick={() => setEditorOpen(true)}><Plus size={16} /> 새 회차</button></header><div className="draft-list">{drafts.map((draft) => <button type="button" key={draft.id} onClick={() => { setTitle(draft.title); setBody(draft.body); setEditorOpen(true); }}><span className={draft.status === '발행' ? 'published' : ''}><FileText /></span><div><strong>{draft.title}</strong><small>{draft.status} · {draft.updatedAt}{draft.body && ` · ${draft.body.length.toLocaleString()}자`}</small></div><ChevronRight /></button>)}</div></div>
          </section>
          <aside className="studio-side"><div className="schedule-card"><CalendarClock /><h3>다음 연재일</h3><strong>10월 16일 금요일</strong><p>오후 9:00 예약 발행</p><button type="button">일정 관리</button></div><div className="writing-tip"><span>오늘의 집필 팁</span><h3>장면의 끝에는<br />작은 질문을 남겨보세요.</h3><p>독자가 다음 회차를 누르게 만드는 가장 자연스러운 힘은 ‘궁금함’입니다.</p></div></aside>
        </div>
      </div>

      {editorOpen && <Modal title="새 회차 쓰기" onClose={() => setEditorOpen(false)} wide><form className="episode-editor" onSubmit={submitEpisode}><div className="editor-meta"><label>회차 제목<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="예: 4화. 북쪽으로 가는 길" /></label><span>{body.length.toLocaleString()}자</span></div><label><span className="sr-only">본문</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={50000} placeholder="이야기를 시작하세요…" autoFocus /></label><div className="editor-notice">입력한 텍스트는 HTML로 실행되지 않으며, 운영 환경에서는 서버에서 한 번 더 검증합니다.</div><div className="form-actions"><button className="secondary-button" type="submit" value="draft"><Save size={17} /> 초안 저장</button><button className="primary-button" type="submit" value="publish" disabled={!title.trim() || body.trim().length < 10}><BookOpen size={17} /> 바로 발행</button></div></form></Modal>}
    </div>
  );
}
