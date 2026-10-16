import { Ban, FileText, LogOut, RotateCcw, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { runtimeLabel } from '../lib/supabase';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

export function AccountPage() {
  const { viewer, loading, signOut, demoMode } = useAuth();
  const { blockedUsers, unblockUser, resetDemoData } = useApp();

  if (loading) return <div className="page-container inner-page empty-state">계정을 확인하고 있습니다.</div>;
  if (!viewer) return <div className="page-container inner-page empty-state"><UserRound /><h1>로그인이 필요합니다</h1><p>계정에 로그인하면 소장 내역과 활동을 확인할 수 있습니다.</p><Link className="primary-button" to="/auth">로그인</Link></div>;

  return <div className="page-container inner-page account-page">
    <header className="page-title"><span className="section-kicker"><ShieldCheck size={15} /> 내 계정</span><h1>{viewer.displayName}</h1><p>{viewer.email} · {runtimeLabel}</p></header>
    {demoMode && <div className="config-notice">화면 검증용 데모 계정입니다. 실제 계정·결제·심사 데이터와 연결되어 있지 않습니다.</div>}
    <div className="account-grid">
      <section className="account-card"><h2>계정과 권한</h2><dl><div><dt>회원 유형</dt><dd>{viewer.isAdmin ? '운영자 미리보기' : '독자'}</dd></div><div><dt>로그인 보호</dt><dd>Supabase 세션 · 이메일/Google OAuth</dd></div></dl>{viewer.isAdmin && <Link className="secondary-button" to="/admin">운영자 센터</Link>}<button className="text-button danger" type="button" onClick={() => void signOut()}><LogOut size={16} /> 로그아웃</button></section>
      <section className="account-card"><h2><Ban size={18} /> 차단한 사용자</h2>{blockedUsers.length ? <ul className="blocked-list">{blockedUsers.map((name) => <li key={name}><span>{name}</span><button type="button" onClick={() => void unblockUser(name)}>차단 해제</button></li>)}</ul> : <p className="muted-copy">차단한 사용자가 없습니다.</p>}</section>
      <section className="account-card"><h2><FileText size={18} /> 약관과 내 정보</h2><div className="account-links"><Link to="/terms">이용약관</Link><Link to="/privacy">개인정보처리방침</Link><Link to="/community-policy">커뮤니티 운영정책</Link><Link to="/creator-policy">작가 운영·정산 정책</Link></div><p className="muted-copy">운영 환경의 계정 삭제 요청은 인증 후 서버에서 처리하며 법정 보존 항목을 제외한 데이터를 삭제합니다.</p></section>
      {demoMode && <section className="account-card"><h2><RotateCcw size={18} /> 데모 초기화</h2><p className="muted-copy">브라우저에 저장된 쿠키·댓글·신청·신고 상태를 초기 상태로 되돌립니다.</p><button className="secondary-button" type="button" onClick={resetDemoData}>데모 데이터 초기화</button></section>}
    </div>
  </div>;
}
