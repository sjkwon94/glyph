import type { User } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { getGoogleDisplayName, getGoogleOAuthRedirectUrl, GOOGLE_CONSENT_STORAGE_KEY, REQUIRED_POLICY_VERSION } from '../authUtils';
import { isDemoMode, supabase } from '../lib/supabase';

type AuthResult = { ok: true; message: string } | { ok: false; message: string };

type Viewer = {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
};

type AuthContextValue = {
  viewer: Viewer | null;
  loading: boolean;
  demoMode: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: (acceptPolicies: boolean) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName: string, acceptPolicies: boolean) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const DEMO_VIEWER: Viewer = {
  id: 'demo-reader',
  email: 'reader@glyph.demo',
  displayName: '글리프 독자',
  isAdmin: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);
let googleConsentSync: Promise<void> | null = null;

async function completePendingGoogleConsent(user: User) {
  if (!supabase || typeof window === 'undefined') return;
  const pendingVersion = window.sessionStorage.getItem(GOOGLE_CONSENT_STORAGE_KEY);
  if (pendingVersion !== REQUIRED_POLICY_VERSION) return;
  if (googleConsentSync) return googleConsentSync;

  googleConsentSync = (async () => {
    const { data: existing, error: readError } = await supabase
      .from('consent_logs')
      .select('policy_type')
      .eq('user_id', user.id)
      .eq('policy_version', REQUIRED_POLICY_VERSION)
      .eq('accepted', true)
      .in('policy_type', ['terms', 'privacy']);
    if (readError) throw readError;

    const accepted = new Set((existing ?? []).map((row) => row.policy_type));
    const missing = ['terms', 'privacy']
      .filter((policyType) => !accepted.has(policyType))
      .map((policyType) => ({
        user_id: user.id,
        policy_type: policyType,
        policy_version: REQUIRED_POLICY_VERSION,
        accepted: true,
      }));
    if (missing.length) {
      const { error: insertError } = await supabase.from('consent_logs').insert(missing);
      if (insertError) throw insertError;
    }

    window.sessionStorage.removeItem(GOOGLE_CONSENT_STORAGE_KEY);
  })().finally(() => {
    googleConsentSync = null;
  });

  return googleConsentSync;
}

async function buildViewer(user: User): Promise<Viewer> {
  if (!supabase) return DEMO_VIEWER;
  const [{ data: initialProfile }, { data: admin }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
    supabase.from('admin_roles').select('user_id').eq('user_id', user.id).maybeSingle(),
  ]);

  const providerDisplayName = getGoogleDisplayName(user.user_metadata);
  let displayName = initialProfile?.display_name ?? '';
  if (providerDisplayName && (!displayName || displayName === '새 독자')) {
    const { error } = await supabase.from('profiles').update({ display_name: providerDisplayName }).eq('id', user.id);
    if (!error) displayName = providerDisplayName;
  }

  return {
    id: user.id,
    email: user.email ?? '',
    displayName: displayName || providerDisplayName || '글리프 독자',
    isAdmin: Boolean(admin),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<Viewer | null>(isDemoMode ? DEMO_VIEWER : null);
  const [loading, setLoading] = useState(Boolean(supabase) && !isDemoMode);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (data.session?.user) {
        await completePendingGoogleConsent(data.session.user).catch((error) => console.error('Google consent sync failed', error));
      }
      setViewer(data.session?.user ? await buildViewer(data.session.user) : null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (!active) return;
        if (session?.user) {
          await completePendingGoogleConsent(session.user).catch((error) => console.error('Google consent sync failed', error));
        }
        setViewer(session?.user ? await buildViewer(session.user) : null);
        setLoading(false);
      })();
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    viewer,
    loading,
    demoMode: isDemoMode,
    signIn: async (email, password) => {
      if (!supabase) return { ok: false, message: 'Supabase 환경 변수를 먼저 설정해 주세요.' };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { ok: false, message: error.message } : { ok: true, message: '로그인했습니다.' };
    },
    signInWithGoogle: async (acceptPolicies) => {
      if (!acceptPolicies) return { ok: false, message: '필수 약관에 동의해 주세요.' };
      if (!supabase) return { ok: false, message: 'Supabase 환경 변수를 먼저 설정해 주세요.' };
      window.sessionStorage.setItem(GOOGLE_CONSENT_STORAGE_KEY, REQUIRED_POLICY_VERSION);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getGoogleOAuthRedirectUrl() },
      });
      if (error) {
        window.sessionStorage.removeItem(GOOGLE_CONSENT_STORAGE_KEY);
        return { ok: false, message: error.message };
      }
      return { ok: true, message: 'Google 로그인 페이지로 이동합니다.' };
    },
    signUp: async (email, password, displayName, acceptPolicies) => {
      if (!acceptPolicies) return { ok: false, message: '필수 약관에 동의해 주세요.' };
      if (!supabase) return { ok: false, message: 'Supabase 환경 변수를 먼저 설정해 주세요.' };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: {
          display_name: displayName.trim().slice(0, 30),
          accepted_terms_version: '2026-10-15',
          accepted_privacy_version: '2026-10-15',
        } },
      });
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: data.session ? '가입과 로그인이 완료되었습니다.' : '확인 메일을 보냈습니다.' };
    },
    signOut: async () => {
      if (supabase) await supabase.auth.signOut();
      if (!isDemoMode) setViewer(null);
    },
  }), [loading, viewer]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
