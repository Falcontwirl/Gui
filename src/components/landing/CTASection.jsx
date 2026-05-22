import { motion } from 'framer-motion';
import AnimatedSection from './AnimatedSection';
import { supabase } from '../../lib/supabase';

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

export default function CTASection({ onGetStarted }) {
  return (
    <AnimatedSection
      style={{
        padding: 'clamp(3rem, 6vw, 5rem) clamp(1rem, 4vw, 2rem)',
        maxWidth: 1180,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          background: 'var(--color-bg-accent)',
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(2.5rem, 6vw, 4.5rem) clamp(1.5rem, 5vw, 3rem)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <h2
          className="serif"
          style={{
            fontSize: 'clamp(1.75rem, 5vw, 2.75rem)',
            fontWeight: 500,
            marginBottom: '1rem',
            color: 'var(--color-text-inverse)',
            letterSpacing: '-0.02em',
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.15,
          }}
        >
          Understand the next codebase before you touch a line.
        </h2>
        <p
          style={{
            color: 'var(--color-text-inverse)',
            opacity: 0.85,
            fontSize: '1rem',
            marginBottom: '2rem',
            maxWidth: 520,
            margin: '0 auto 2rem',
            lineHeight: 1.6,
          }}
        >
          Free for public repos. No account required. Three minutes from paste to map.
        </p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <button
            onClick={onGetStarted}
            style={{
              padding: '12px 28px',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              fontWeight: 600,
              background: 'var(--color-bg-base)',
              color: 'var(--color-accent-active)',
              border: '1px solid var(--color-bg-base)',
              cursor: 'pointer',
              transition: `all var(--duration-base) var(--ease-out)`,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-elevated)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg-base)'; }}
          >
            Analyze a repo
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: { scopes: 'repo read:user', redirectTo: window.location.origin },
              });
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              fontWeight: 500,
              background: 'transparent',
              color: 'var(--color-text-inverse)',
              border: '1px solid rgba(243,238,234,0.5)',
              cursor: 'pointer',
              transition: `all var(--duration-base) var(--ease-out)`,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(243,238,234,0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(243,238,234,0.5)'; }}
          >
            <Github size={14} strokeWidth={1.75} />
            Sign in with GitHub
          </button>
        </motion.div>
      </div>
    </AnimatedSection>
  );
}
