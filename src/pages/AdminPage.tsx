import { BadgeCheck, BookOpen, Check, Flag, MessageSquare, ShieldAlert, UserRound, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { categories, novels as demoNovels } from '../data';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

const reasonLabels = { spam: '스팸·도배', abuse: '욕설·괴롭힘', spoiler: '악의적 스포일러', copyright: '저작권 침해', other: '기타' };
const targetTypeLabels = { comment: '댓글', community_post: '게시글', general: '신고마당' };
const evidenceStatusLabels = { queued: '워터마크 서버 대조 중', detected: '워터마크 일치', not_detected: '자동 탐지 없음', needs_review: '운영자 확인 필요', failed: '분석 실패' };
type AdminTab = 'applications' | 'reports' | 'authors' | 'works' | 'inquiries';

export function AdminPage() {
  const { viewer, demoMode } = useAuth();
  const { authorApplication, authorWorks, catalogNovels, pendingApplications, reports, reviewAuthorApplication, resolveReport, syncError } = useApp();
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('applications');
  const application = pendingApplications[0] ?? (demoMode && authorApplication.status === 'pending' ? authorApplication : null);
  const visibleWorks = catalogNovels.length ? catalogNovels : demoMode ? demoNovels : [];
  const authorRows = useMemo(() => {
    const rows = new Map<string, number>();
    visibleWorks.forEach((novel) => rows.set(novel.author, (rows.get(novel.author) ?? 0) + 1));
    if (!rows.size && authorApplication.penName) rows.set(authorApplication.penName, authorWorks.length);
    return Array.from(rows, ([name, count]) => ({ name, count }));
  }, [authorApplication.penName, authorWorks.length, visibleWorks]);
  const tabs: { id: AdminTab; label: string; icon: typeof BadgeCheck; count: number }[] = [
    { id: 'applications', label: '작가 심사', icon: BadgeCheck, count: application ? Math.max(1, pendingApplications.length) : 0 },
    { id: 'reports', label: '콘텐츠 신고', icon: Flag, count: reports.filter((report) => report.status === 'received').length },
    { id: 'authors', label: '작가 관리', icon: UserRound, count: authorRows.length },
    { id: 'works', label: '작품 관리', icon: BookOpen, count: visibleWorks.length },
    { id: 'inquiries', label: '문의', icon: MessageSquare, count: 0 },
  ];

  if (!viewer?.isAdmin) return <div className="page-container inner-page empty-state"><ShieldAlert /><h1>접근 권한이 없습니다</h1><p>운영자 권한은 서버의 관리자 테이블에서만 부여됩니다.</p></div>;

  return <div className="page-container inner-page admin-page">
    <header className="page-title"><span className="section-kicker"><ShieldAlert size={15} /> 운영자 센터</span><h1>심사와 신고 처리</h1><p>작가 승인과 콘텐츠 제재는 기록을 남기고 최소 권한으로 처리합니다.</p></header>
    {demoMode && <div className="config-notice">데모 미리보기입니다. 이 화면의 처리는 현재 브라우저에만 반영됩니다.</div>}
    {(message || syncError) && <div className="config-notice" role="status">{message || syncError}</div>}

    <nav className="admin-tabs" aria-label="운영자 메뉴">
      {tabs.map(({ id, label, icon: Icon, count }) => <button key={id} type="button" className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined}><Icon size={17} /><span>{label}</span>{count > 0 && <small>{count}</small>}</button>)}
    </nav>

    <div className="admin-tab-content">
      {activeTab === 'applications' && <section className="admin-panel"><header><div><span className="admin-icon"><BadgeCheck /></span><h2>작가 등록 심사</h2></div><small>{application ? `${Math.max(1, pendingApplications.length)}건 대기` : '대기 없음'}</small></header>
        {application ? <div className="review-item"><div><strong>{application.penName}</strong><span>{categories.find((item) => item.id === application.genre)?.label} · {application.submittedAt}</span></div><p>{application.introduction}</p><dl><div><dt>포트폴리오</dt><dd>{application.portfolioUrl || '없음'}</dd></div><div><dt>원고</dt><dd>{application.sampleName || `${application.sampleExcerpt.length}자 직접 입력`}</dd></div></dl><label>심사 메모<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="승인 근거 또는 보완 사유" /></label><div className="review-actions"><button className="secondary-button" type="button" onClick={() => void reviewAuthorApplication(application.userId, 'rejected', note || '제출 자료를 보완해 주세요.').then((result) => setMessage(result.ok ? '보완 요청으로 처리했습니다.' : result.reason ?? '처리하지 못했습니다.'))}><X size={17} /> 보완 요청</button><button className="primary-button" type="button" onClick={() => void reviewAuthorApplication(application.userId, 'approved', note || '등록 기준을 충족했습니다.').then((result) => setMessage(result.ok ? '작가 승인을 완료했습니다.' : result.reason ?? '처리하지 못했습니다.'))}><Check size={17} /> 승인</button></div></div> : <div className="panel-empty">현재 심사할 신청이 없습니다.</div>}
      </section>}

      {activeTab === 'reports' && <section className="admin-panel"><header><div><span className="admin-icon"><Flag /></span><h2>콘텐츠 신고</h2></div><small>{reports.filter((report) => report.status === 'received').length}건 대기</small></header>
        <div className="report-queue">{reports.length ? reports.map((report) => <article key={report.id}><div><strong>{reasonLabels[report.reason]}</strong><span>{targetTypeLabels[report.targetType]} · {report.targetAuthor}</span></div><p>{report.details || '상세 설명 없음'}</p>{report.evidence && <div className={`evidence-result evidence-${report.evidence.status}`}><strong>증거 사진 · {evidenceStatusLabels[report.evidence.status]}</strong><span>{report.evidence.fileName} · 분석 신뢰도 {Math.round((report.evidence.confidence ?? 0) * 100)}%</span>{report.evidence.matchedDisplayName && <b>발급 사용자: {report.evidence.matchedDisplayName} ({report.evidence.matchedUserId})</b>}<small>{report.evidence.note}</small></div>}<small>{report.status}</small>{report.status === 'received' && <div><button type="button" onClick={() => void resolveReport(report.id, 'dismissed').then((result) => setMessage(result.ok ? '문제 없음으로 처리했습니다.' : result.reason ?? '처리하지 못했습니다.'))}>문제 없음</button><button type="button" onClick={() => void resolveReport(report.id, 'resolved').then((result) => setMessage(result.ok ? '조치 완료로 처리했습니다.' : result.reason ?? '처리하지 못했습니다.'))}>조치 완료</button></div>}</article>) : <div className="panel-empty">접수된 신고가 없습니다.</div>}</div>
      </section>}

      {activeTab === 'authors' && <section className="admin-panel"><header><div><span className="admin-icon"><UserRound /></span><h2>작가 관리</h2></div><small>{authorRows.length}명</small></header><p className="admin-tab-note">현재 공개 작품과 연결된 작가를 기준으로 표시합니다.</p><div className="admin-list">{authorRows.length ? authorRows.map((author) => <article className="admin-list-item" key={author.name}><div><strong>{author.name}</strong><span>작품 {author.count}개</span></div><p>공개 작품과 연재 상태를 작품 관리 탭에서 확인할 수 있습니다.</p></article>) : <div className="panel-empty">연결된 작가가 없습니다.</div>}</div></section>}

      {activeTab === 'works' && <section className="admin-panel"><header><div><span className="admin-icon"><BookOpen /></span><h2>작품 관리</h2></div><small>{visibleWorks.length}개</small></header><p className="admin-tab-note">공개 카탈로그에 등록된 작품의 상태를 확인합니다.</p><div className="admin-list">{visibleWorks.length ? visibleWorks.map((novel) => <article className="admin-list-item" key={novel.id}><div><strong>{novel.title}</strong><span>{novel.categoryLabel} · {novel.status}</span></div><p>{novel.author} · {novel.chapters.length}화 · {novel.schedule}</p></article>) : <div className="panel-empty">등록된 작품이 없습니다.</div>}</div></section>}

      {activeTab === 'inquiries' && <section className="admin-panel"><header><div><span className="admin-icon"><MessageSquare /></span><h2>문의</h2></div><small>대기 없음</small></header><div className="admin-empty"><MessageSquare size={28} /><h3>접수된 문의가 없습니다</h3><p>문의 접수 기능이 연결되면 이곳에서 문의 상태와 답변을 관리할 수 있습니다.</p></div></section>}
    </div>
  </div>;
}
