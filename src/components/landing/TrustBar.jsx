import { motion } from 'framer-motion';
import { TrendingUp, Globe, Zap, Lock } from 'lucide-react';
import AnimatedSection, { staggerContainer, fadeUp } from './AnimatedSection';

const stats = [
  { Icon: TrendingUp, label: '10K+ codebases mapped' },
  { Icon: Globe, label: '50+ languages supported' },
  { Icon: Zap, label: '< 2 min to first insight' },
  { Icon: Lock, label: '100% browser-based' },
];

export default function TrustBar() {
  return (
    <AnimatedSection
      style={{
        padding: 'clamp(2rem, 4vw, 3rem) clamp(1rem, 4vw, 2rem)',
        background: 'var(--color-bg-surface)',
        borderTop: '1px solid var(--color-border-subtle)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="lp-trust-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '2rem',
          maxWidth: 980,
          margin: '0 auto',
        }}
      >
        {stats.map(({ Icon, label }, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={16} strokeWidth={1.75} color="var(--color-accent)" />
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
                textAlign: 'left',
              }}
            >
              {label}
            </div>
          </motion.div>
        ))}
      </motion.div>
      <style>{`
        @media (max-width: 900px) { .lp-trust-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 480px) { .lp-trust-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </AnimatedSection>
  );
}
