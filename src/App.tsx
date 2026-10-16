import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage').then((module) => ({ default: module.DiscoverPage })));
const NovelPage = lazy(() => import('./pages/NovelPage').then((module) => ({ default: module.NovelPage })));
const ReaderPage = lazy(() => import('./pages/ReaderPage').then((module) => ({ default: module.ReaderPage })));
const CommunityPage = lazy(() => import('./pages/CommunityPage').then((module) => ({ default: module.CommunityPage })));
const StudioPage = lazy(() => import('./pages/StudioPage').then((module) => ({ default: module.StudioPage })));
const WalletPage = lazy(() => import('./pages/WalletPage').then((module) => ({ default: module.WalletPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then((module) => ({ default: module.AccountPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const PolicyPage = lazy(() => import('./pages/PolicyPage').then((module) => ({ default: module.PolicyPage })));

export default function App() {
  const location = useLocation();
  const isReader = location.pathname.startsWith('/read/');

  return (
    <AppShell readerMode={isReader}>
      <Suspense fallback={<div className="page-loader" role="status">페이지를 불러오는 중…</div>}><Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/novel/:novelId" element={<NovelPage />} />
        <Route path="/read/:novelId/:chapterId" element={<ReaderPage />} />
        <Route path="/community" element={<Navigate to="/community/martial" replace />} />
        <Route path="/community/:categoryId" element={<CommunityPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/terms" element={<PolicyPage kind="terms" />} />
        <Route path="/privacy" element={<PolicyPage kind="privacy" />} />
        <Route path="/community-policy" element={<PolicyPage kind="community" />} />
        <Route path="/creator-policy" element={<PolicyPage kind="creator" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense>
    </AppShell>
  );
}
