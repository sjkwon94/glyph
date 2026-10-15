import { LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { hasSupabaseConfig } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';

export function AuthPage() {
  const { viewer, demoMode, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (viewer) return <Navigate to="/account" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, displayName, accepted);
    setMessage(result.message);
    setBusy(false);
  };

  return <div className="page-container inner-page auth-page"><section className="auth-card">
    <span className="status-icon"><ShieldCheck /></span>
    <h1>{mode === 'signin' ? '글리프 로그인' : '독자 계정 만들기'}</h1>
    <p>읽던 위치, 소장 회차, 쿠키, 댓글과 작가 신청 내역을 안전하게 보관합니다.</p>
    {!hasSupabaseConfig && <div className="config-notice">현재 빌드는 {demoMode ? '데모 모드' : '설정 대기 상태'}입니다. 실제 회원가입은 Supabase 공개 환경 변수를 연결하면 활성화됩니다.</div>}
    <div className="auth-tabs"><button className={mode === 'signin' ? 'active' : ''} type="button" onClick={() => setMode('signin')}>로그인</button><button className={mode === 'signup' ? 'active' : ''} type="button" onClick={() => setMode('signup')}>회원가입</button></div>
    <form onSubmit={submit}>
      {mode === 'signup' && <label>표시 이름<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={1} maxLength={30} autoComplete="nickname" required /></label>}
      <label>이메일<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
      <label>비밀번호<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required /></label>
      {mode === 'signup' && <label className="checkbox-line"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span><Link to="/terms">이용약관</Link>과 <Link to="/privacy">개인정보처리방침</Link>에 동의합니다. (필수)</span></label>}
      {message && <p className="form-message" role="status">{message}</p>}
      <button className="primary-button full" disabled={busy || !hasSupabaseConfig}>{mode === 'signin' ? <LogIn size={18} /> : <UserPlus size={18} />}{busy ? '처리 중…' : mode === 'signin' ? '로그인' : '회원가입'}</button>
    </form>
  </section></div>;
}
