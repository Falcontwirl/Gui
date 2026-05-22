import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass } from 'lucide-react';

// Inline GitHub icon — lucide-react v1.7 doesn't export one.
const Github = ({ size = 14, strokeWidth = 1.75, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';

const NAV_LINKS = [
  { label: 'Features', id: 'lp-features' },
  { label: 'How it works', id: 'lp-how' },
  { label: 'Pricing', id: 'lp-pricing' },
  { label: 'Docs', route: '/docs' },
];

const handleGitHubSignIn = async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: 'repo read:user',
      redirectTo: window.location.origin,
    },
  });
};

export default function NavBar({ onGetStarted, scrolled }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useStore(state => state.user);
  const signOut = useStore(state => state.signOut);
  const navigate = useNavigate();

  const scrollTo = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  }, []);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(1rem, 3vw, 2rem)',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        background: scrolled ? 'rgba(243,238,234,0.85)' : 'transparent',
        borderBottom: scrolled ? '1px solid var(--color-border-subtle)' : '1px solid transparent',
        transition: 'all .3s ease',
      }}
    >
      {/* Logo */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          letterSpacing: '-0.01em',
          padding: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Compass size={16} strokeWidth={2} color="var(--color-text-inverse)" />
        </div>
        <span>Codebase Explorer</span>
      </button>

      {/* Desktop links */}
      <div className="lp-nav-desktop" style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '2rem',
        alignItems: 'center',
      }}>
        {NAV_LINKS.map(link => (
          <a
            key={link.label}
            href={link.route || `#${link.id}`}
            onClick={e => {
              e.preventDefault();
              if (link.route) navigate(link.route);
              else scrollTo(link.id);
            }}
            style={{
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              transition: 'color .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent-active)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <>
            <button
              onClick={() => navigate('/settings')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--color-accent-soft)',
                color: 'var(--color-accent-active)',
                border: '1px solid var(--color-border-strong)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-pill)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-elevated)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-accent-soft)'; }}
            >
              <img
                src={user.user_metadata?.avatar_url}
                alt=""
                style={{ width: 22, height: 22, borderRadius: '50%' }}
              />
            </button>
            <button
              onClick={() => { signOut(); navigate('/'); }}
              style={{
                background: 'none',
                color: 'var(--color-text-tertiary)',
                border: 'none',
                fontSize: 13,
                cursor: 'pointer',
                padding: 8,
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleGitHubSignIn}
              className="lp-nav-desktop"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-visible)',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-elevated)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            >
              <Github size={14} strokeWidth={1.75} />
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--color-accent)',
                color: 'var(--color-text-inverse)',
                border: '1px solid var(--color-accent)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-accent-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-accent)'; }}
            >
              Get started
            </button>
          </>
        )}

        {/* Hamburger (mobile) */}
        <button
          className="lp-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
          style={{
            display: 'none',
            flexDirection: 'column',
            gap: 4,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 8,
          }}
        >
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                width: 22,
                height: 2,
                background: 'var(--color-text-primary)',
                borderRadius: 1,
              }}
            />
          ))}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: 60,
              left: 0,
              right: 0,
              background: 'var(--color-bg-elevated)',
              backdropFilter: 'blur(12px)',
              padding: '1rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              borderBottom: '1px solid var(--color-border-subtle)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {NAV_LINKS.map(link => (
              <a
                key={link.label}
                href={link.route || `#${link.id}`}
                onClick={e => {
                  e.preventDefault();
                  if (link.route) { setMobileOpen(false); navigate(link.route); }
                  else scrollTo(link.id);
                }}
                style={{
                  color: 'var(--color-text-secondary)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  padding: '10px 0',
                }}
              >
                {link.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media(max-width:900px){
          .lp-nav-desktop{display:none!important}
          .lp-hamburger{display:flex!important}
        }
      `}</style>
    </nav>
  );
}
