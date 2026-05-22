import { motion } from 'framer-motion';
import HeroGraph from './HeroGraph';

export default function HeroSection({ onGetStarted, scrollProgress }) {
  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: 'clamp(5rem, 12vh, 7rem) clamp(1rem, 4vw, 2rem) clamp(3rem, 8vh, 5rem)',
        background: 'var(--color-bg-base)',
      }}
    >
      {/* Interactive graph background */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        <HeroGraph scrollProgress={scrollProgress} />
      </div>

      {/* Soft wash overlay so text stays readable */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at center, rgba(243,238,234,0.4) 0%, rgba(243,238,234,0.75) 55%, rgba(243,238,234,0.95) 100%)',
        }}
      />

      {/* Bottom fade into next section */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '25%',
          pointerEvents: 'none',
          background: 'linear-gradient(to top, var(--color-bg-base) 0%, transparent 100%)',
        }}
      />

      {/* Hero content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 860 }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--color-accent-soft)',
            color: 'var(--color-accent-active)',
            fontSize: 12,
            fontWeight: 500,
            marginBottom: '1.75rem',
            border: '1px solid var(--color-border-strong)',
            letterSpacing: '0.01em',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              background: 'var(--color-accent)',
              borderRadius: '50%',
            }}
          />
          Public beta — now with GitHub URL import
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.6 }}
          style={{
            fontSize: 'clamp(2.25rem, 7vw, 4rem)',
            fontWeight: 500,
            lineHeight: 1.08,
            marginBottom: '1.25rem',
            letterSpacing: '-0.03em',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Understand any codebase in{' '}
          <span
            className="serif"
            style={{
              fontStyle: 'italic',
              fontWeight: 500,
              color: 'var(--color-accent-active)',
            }}
          >
            minutes
          </span>
          , not weeks.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{
            fontSize: 'clamp(1rem, 1.6vw, 1.1rem)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.65,
            marginBottom: '2.25rem',
            maxWidth: 680,
            margin: '0 auto 2.25rem',
          }}
        >
          Paste a GitHub URL or drop a zip. Get an interactive architecture map showing the design
          decisions, data flow, and risks — built for open-source contributors, new hires, due
          diligence, and anyone inheriting legacy code.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.6 }}
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={onGetStarted}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              fontWeight: 600,
              background: 'var(--color-accent)',
              color: 'var(--color-text-inverse)',
              border: '1px solid var(--color-accent)',
              cursor: 'pointer',
              transition: `all var(--duration-base) var(--ease-out)`,
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-accent-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-accent)'; }}
          >
            Analyze a repo
          </button>
          <button
            onClick={() => {
              const el = document.querySelector('#lp-features');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              fontWeight: 500,
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-visible)',
              cursor: 'pointer',
              transition: `all var(--duration-base) var(--ease-out)`,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-elevated)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            See a case study
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.64, duration: 0.6 }}
          style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
          }}
        >
          No account required for public repos · Works with any language ·{' '}
          <strong style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Your code stays private
          </strong>
        </motion.p>
      </div>
    </section>
  );
}
