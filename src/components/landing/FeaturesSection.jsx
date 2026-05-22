import { motion } from 'framer-motion';
import { Network, Compass, MessageSquare, ShieldAlert, Zap, Lock } from 'lucide-react';
import AnimatedSection, { staggerContainer, fadeUp } from './AnimatedSection';

const features = [
  {
    Icon: Network,
    title: 'Architecture map',
    desc: 'See every service, module, and data store as an interactive graph with real dependency relationships — not a static diagram.',
    span: true,
  },
  {
    Icon: Compass,
    title: 'Guided walkthroughs',
    desc: 'AI narrates the codebase in order of importance so you grasp the system before you touch a line.',
  },
  {
    Icon: MessageSquare,
    title: 'Chat with the code',
    desc: 'Ask about patterns, trade-offs, or risky areas. Answers cite specific files.',
  },
  {
    Icon: ShieldAlert,
    title: 'Risk & pattern detection',
    desc: 'Surface tight coupling, stale code, and design debt — useful for due diligence and legacy audits.',
  },
  {
    Icon: Zap,
    title: 'Any stack, zero config',
    desc: 'TypeScript, Go, Python, Rust, Java, C#. Drop a zip or paste a URL — no CLI, no setup.',
  },
  {
    Icon: Lock,
    title: 'Private & in-your-control',
    desc: 'Self-host for proprietary code or run against any public repo anonymously.',
  },
];

export default function FeaturesSection() {
  return (
    <AnimatedSection
      id="lp-features"
      style={{ padding: 'clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 2rem)', maxWidth: 1180, margin: '0 auto' }}
    >
      <h2
        className="serif"
        style={{
          fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
          fontWeight: 500,
          textAlign: 'center',
          marginBottom: '0.75rem',
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        Built for the work, not the classroom
      </h2>
      <p
        style={{
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          maxWidth: 560,
          margin: '0 auto 3rem',
          fontSize: '1rem',
          lineHeight: 1.6,
        }}
      >
        Everything you need to feel at home in a codebase you&apos;ve never seen before.
      </p>

      <motion.div
        className="lp-bento"
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-50px' }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
        }}
      >
        {features.map(({ Icon, title, desc, span }, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(1.25rem, 3vw, 2rem)',
              border: '1px solid var(--color-border-subtle)',
              boxShadow: 'var(--shadow-sm)',
              gridColumn: span ? '1 / -1' : undefined,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Icon size={20} strokeWidth={1.5} color="var(--color-accent)" />
            </div>
            <h3
              style={{
                fontWeight: 600,
                marginBottom: '0.5rem',
                fontSize: '1.05rem',
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '.92rem', lineHeight: 1.6 }}>{desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <style>{`
        @media (max-width: 900px) { .lp-bento { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 560px) { .lp-bento { grid-template-columns: 1fr !important; } }
      `}</style>
    </AnimatedSection>
  );
}
