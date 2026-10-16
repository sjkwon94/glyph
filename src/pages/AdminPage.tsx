import { BadgeCheck, Check, Flag, ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';
import { categories } from '../data';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

const reasonLabels = { spam: '스팸·도배', abuse: '욕설·괴롭힘', spoiler: '악의적 스포일러', copyright: '저작권 침해', other: '기타' };

export function AdminPage() {
  const { viewer, demoMode } = useAuth();
  const { authorApplication, pendingApplications, reports, reviewAuthorApplication, resolveReport, syncError } = useApp();
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const application = pendingApplications[0] ?? (demoMode && authorApplication.status === 'pending' ? authorApplication : null);

  if (!viewer?.isAdmin) return <div className="page-container inner-page empty-state"><ShieldAlert /><h1>접근 권한이 없습니다</h1><p>운영자 권한은 서버의 관리자 테이블에서만 부여됩니다.</p></div>;

  return <div className="page-container inner-page admin-page">
    <header className="page-title"><span className="section-kicker"><ShieldAlert size={15} /> 운영자 센터</span><h1>심사와 신고 처리</h1><p>작가 승인과 콘텐츠 제재는 기록을 남기고 최소 권한으로 처리합니다.</p></header>
    {demoMode && <div className="config-notice">데모 미리보기입니다. 이 화면의 처리는 현재 브라우저에만 반영됩니다.</div>}
    {(message || syncError) && <div className="config-notice" role="status">{message || syncError}</div>}
    <div className="admin-grid">
      <section className="admin-panel"><header><div><span className="admin-icon"><BadgeCheck /></span><h2>작가 등록 심사</h2></div><small>{application ? `${Math.max(1, pendingApplications.length)}건 대기` : '대기 없음'}</small></header>
        {application ? <div className="review-item"><div><strong>{application.penName}</strong><span>{categories.find((item) => item.id === application.genre)?.label} · {application.submittedAt}</span></div><p>{application.introduction}</p><dl><div><dt>포트폴리오</dt><dd>{application.portfolioUrl || '없음'}</dd></div><div><dt>원고</dt><dd>{application.sampleName || `${application.sampleExcerpt.length}자 직접 입력`}</dd></div></dl><label>심사 메모<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="승인 근거 또는 보완 사유" /></label><div className="review-actions"><button className="secondary-button" type="button" onClick={() => void reviewAuthorApplication(application.userId, 'rejected', note || '제출 자료를 보완해 주세요.').then((result) => setMessage(result.ok ? '보완 요청으로 처리했습니다.' : result.reason ?? '처리하지 못했습니다.'))}><X size={17} /> 보완 요청</button><button className="primary-button" type="button" onClick={() => void reviewAuthorApplication(application.userId, 'approved', note || '등록 기준을 충족했습니다.').then((result) => setMessage(result.ok ? '작가 승인을 완료했습니다.' : result.reason ?? '처리하지 못했습니다.'))}><Check size={17} /> 승인</button></div></div> : <div className="panel-empty">현재 심사할 신청이 없습니다.</div>}
      </section>
      <section className="admin-panel"><header><div><span className="admin-icon"><Flag /></span><h2>콘텐츠 신고</h2></div><small>{reports.filter((report) => report.status === 'received').length}건 대기</small></header>
        <div className="report-queue">{reports.length ? reports.map((report) => <article key={report.id}><div><strong>{reasonLabels[report.reason]}</strong><span>{report.targetType === 'comment' ? '댓글' : '게시글'} · {report.targetAuthor}</span></div><p>{report.details || '상세 설명 없음'}</p><small>{report.status}</small>{report.status === 'received' && <div><button type="button" onClick={() => void resolveReport(report.id, 'dismissed').then((result) => setMessage(result.ok ? '문제 없음으로 처리했습니다.' : result.reason ?? '처리하지 못했습니다.'))}>문제 없음</button><button type="button" onClick={() => void resolveReport(report.id, 'resolved').then((result) => setMessage(result.ok ? '조치 완료로 처리했습니다.' : result.reason ?? '처리하지 못했습니다.'))}>조치 완료</button></div>}</article>) : <div className="panel-empty">접수된 신고가 없습니다.</div>}</div>
      </section>
    </div>
  </div>;
}
