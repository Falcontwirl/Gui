import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { usePostHog } from '@posthog/react';
import useStore from '../store/useStore';
import { supabase } from '../lib/supabase';
import LandingPage from './LandingPage';

import UploadScreen from './UploadScreen';
import ProcessingScreen from './ProcessingScreen';
import PyramidView from './pyramid/PyramidView';
import SettingsScreen from './SettingsScreen';
import MyProjects from './MyProjects';
import AdminDashboard from './AdminDashboard';
import DocsPage from './docs/DocsPage';

function ExplorerRedirect() {
  const pid = useStore(state => state.projectId) || localStorage.getItem('gui_active_project');
  return pid ? <Navigate to={`/explore/${pid}`} replace /> : <Navigate to="/" replace />;
}

const ADMIN_EMAIL = 'gordonj2016@outlook.com';

function AdminGate({ children }) {
  const user = useStore(state => state.user);
  if (!user || user.email !== ADMIN_EMAIL) return <Navigate to="/" replace />;
  return children;
}

export default function AppRoutes() {
  const location = useLocation();
  const setUser = useStore(state => state.setUser);
  const setSession = useStore(state => state.setSession);
  const setAuthLoading = useStore(state => state.setAuthLoading);
  const darkMode = useStore(state => state.darkMode);
  const posthog = usePostHog();

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = darkMode ? 'dark' : 'light';
    el.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);

      if (session?.provider_token) {
        localStorage.setItem('gui_github_token', session.provider_token);
      }
      if (session?.user) {
        posthog?.identify?.(session.user.id, { email: session.user.email });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.provider_token) {
        localStorage.setItem('gui_github_token', session.provider_token);
      }
      if (_event === 'SIGNED_IN' && session?.user) {
        posthog?.identify?.(session.user.id, { email: session.user.email });
        posthog?.capture?.('user_signed_in');
      }
      if (_event === 'SIGNED_OUT') {
        localStorage.removeItem('gui_github_token');
        posthog?.capture?.('user_signed_out');
        posthog?.reset?.();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const scrollableRoutes = ['/', '/upload', '/projects', '/settings', '/admin', '/docs'];
    const isScrollable = scrollableRoutes.includes(location.pathname) && !location.pathname.startsWith('/explore/');
    if (isScrollable) {
      document.body.classList.remove('no-scroll');
    } else {
      document.body.classList.add('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [location.pathname]);

  return (
    <div className="w-full h-full" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/upload" element={<UploadScreen />} />
        <Route path="/processing" element={<ProcessingScreen />} />
        <Route path="/explorer" element={<ExplorerRedirect />} />
        <Route path="/explore/:projectId" element={<PyramidView />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/projects" element={<MyProjects />} />
        <Route path="/admin" element={<AdminGate><AdminDashboard /></AdminGate>} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
