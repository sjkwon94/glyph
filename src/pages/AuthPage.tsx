import { LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { hasSupabaseConfig } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';

export function AuthPage() {
  const { viewer, demoMode, signIn, signInWithGoogle, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [acceptedGoogle, setAcceptedGoogle] = useState(false);
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

  const continueWithGoogle = async () => {
    setBusy(true);
    setMessage('');
    const result = await signInWithGoogle(acceptedGoogle);
    setMessage(result.message);
    if (!result.ok) setBusy(false);
  };

  return <div className="page-container inner-page auth-page"><section className="auth-card">
    <span className="status-icon"><ShieldCheck /></span>
    <h1>{mode === 'signin' ? '글리프 로그인' : '독자 계정 만들기'}</h1>
    <p>읽던 위치, 소장 회차, 쿠키, 댓글과 작가 신청 내역을 안전하게 보관합니다.</p>
    {!hasSupabaseConfig && <div className="config-notice">현재 빌드는 {demoMode ? '데모 모드' : '설정 대기 상태'}입니다. 실제 회원가입은 Supabase 공개 환경 변수를 연결하면 활성화됩니다.</div>}
    <div className="social-auth">
      <label className="checkbox-line google-consent"><input type="checkbox" checked={acceptedGoogle} onChange={(event) => setAcceptedGoogle(event.target.checked)} /><span><Link to="/terms">이용약관</Link>과 <Link to="/privacy">개인정보처리방침</Link>에 동의합니다. (필수)</span></label>
      <button className="google-button" type="button" disabled={busy || !hasSupabaseConfig || !acceptedGoogle} onClick={() => void continueWithGoogle()}>
        <svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.702-1.567 2.684-3.875 2.684-6.614Z"/><path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.715H.956v2.333A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.963 10.705A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.168.281-1.705V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.333Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.333C4.672 5.165 6.656 3.58 9 3.58Z"/></svg>
        {busy ? '연결 중…' : 'Google로 계속하기'}
      </button>
    </div>
    <div className="auth-divider"><span>또는 이메일로 계속</span></div>
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
