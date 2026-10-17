import { BookOpen, CircleUserRound, Coins, Compass, House, Menu, PenLine, Users, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

const navigation = [
  { to: '/', label: '홈', icon: House, end: true },
  { to: '/discover', label: '찾기', icon: Compass },
  { to: '/community/martial', label: '커뮤니티', icon: Users },
  { to: '/studio', label: '연재 스튜디오', icon: PenLine },
];

export function AppShell({ children, readerMode }: { children: ReactNode; readerMode: boolean }) {
  const { cookieBalance } = useApp();
  const { viewer, demoMode } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navClass = (to: string, isActive: boolean) => isActive || (to.startsWith('/community/') && location.pathname.startsWith('/community/')) ? 'active' : '';

  if (readerMode) return <>{children}</>;

  return (
    <div className="app-shell">
      <div className="demo-ribbon" role="status">
        {demoMode ? '데모 버전 · 실제 결제 없음' : '운영 연결 모드 · 결제 공급자 검증 전'}
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="글리프 홈">
            <span className="brand-mark"><BookOpen size={19} strokeWidth={2.2} /></span>
            <span>글리프</span>
          </Link>
          <nav className="desktop-nav" aria-label="주 메뉴">
            {navigation.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => navClass(to, isActive)}>{label}</NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <Link className="cookie-pill" to="/wallet" aria-label={`쿠키 ${cookieBalance}개, 두 배 이벤트 중`}>
              <Coins size={17} /><strong>{cookieBalance}</strong><span>쿠키</span><em>2배</em>
            </Link>
            <Link className="icon-button profile-button" to={viewer ? '/account' : '/auth'} aria-label={viewer ? '내 정보' : '로그인'}><CircleUserRound size={22} /></Link>
            <button className="icon-button mobile-menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="메뉴 열기">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mobile-drawer" aria-label="모바일 주 메뉴">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => navClass(to, isActive)} onClick={() => setMenuOpen(false)}>
                <Icon size={19} />{label}
              </NavLink>
            ))}
            <Link to="/wallet" onClick={() => setMenuOpen(false)}><Coins size={19} />쿠키 충전</Link>
            <Link to={viewer ? '/account' : '/auth'} onClick={() => setMenuOpen(false)}><CircleUserRound size={19} />{viewer ? '내 정보' : '로그인'}</Link>
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div>
          <Link className="brand footer-brand" to="/"><span className="brand-mark"><BookOpen size={18} /></span><span>글리프</span></Link>
          <p>이야기가 머물고, 독자가 만나는 곳.</p>
        </div>
        <div className="footer-links"><Link to="/terms">이용약관</Link><Link to="/privacy">개인정보처리방침</Link><Link to="/community-policy">운영정책</Link><a href="mailto:help@example.com">고객센터</a></div>
        <small>© 2026 Glyph. {demoMode ? '데모 콘텐츠입니다.' : 'All rights reserved.'}</small>
      </footer>
      <nav className="bottom-nav" aria-label="하단 메뉴">
        {navigation.slice(0, 4).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => navClass(to, isActive)}><Icon size={20} /><span>{label === '연재 스튜디오' ? '연재' : label}</span></NavLink>
        ))}
      </nav>
    </div>
  );
}
