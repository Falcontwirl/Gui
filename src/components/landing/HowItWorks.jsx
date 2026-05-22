import { motion } from 'framer-motion';
import { Upload, Sparkles, Compass } from 'lucide-react';
import AnimatedSection, { staggerContainer, fadeUp } from './AnimatedSection';

const steps = [
  {
    num: '01',
    Icon: Upload,
    title: 'Point us at the code',
    desc: 'Paste a GitHub URL, drop a zip, or connect your GitHub for private repos. No CLI, no setup.',
  },
  {
    num: '02',
    Icon: Sparkles,
    title: 'We map its architecture',
    desc: 'Claude reads every file, identifies concepts, and traces dependencies in 1–3 minutes.',
  },
  {
    num: '03',
    Icon: Compass,
    title: 'Explore and ask',
    desc: 'Click through the map, take the guided tour, or ask questions. Export a summary when you\u2019re done.',
  },
];

export default function HowItWorks() {
  return (
    <AnimatedSection
      id="lp-how"
      style={{ padding: 'clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 2rem)', maxWidth: 1180, margin: '0 auto' }}
    >
      <h2
        className="serif"
        style={{
          fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
          fontWeight: 500,
          textAlign: 'center',
          marginBottom: 'clamp(2rem, 5vw, 3.5rem)',
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        From repo URL to architecture map in three steps
      </h2>

      <motion.div
        className="lp-steps"
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-50px' }}
        style={{
          display: 'flex',
          gap: '1.25rem',
          maxWidth: 980,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {steps.map(({ num, Icon, title, desc }, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            style={{
              flex: 1,
              background: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1.25rem, 3vw, 2rem)',
              border: '1px solid var(--color-border-subtle)',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
            }}
          >
            <div
              className="serif"
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
                fontStyle: 'italic',
                color: 'var(--color-text-tertiary)',
                lineHeight: 1,
                marginBottom: '0.5rem',
                letterSpacing: '-0.03em',
              }}
            >
              {num}
            </div>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Icon size={18} strokeWidth={1.5} color="var(--color-accent)" />
            </div>
            <h3
              style={{
                fontWeight: 600,
                marginBottom: '.5rem',
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
        @media (max-width: 900px) { .lp-steps { flex-direction: column !important; } }
      `}</style>
    </AnimatedSection>
  );
}
