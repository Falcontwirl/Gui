import { motion } from 'framer-motion';
import AnimatedSection, { staggerContainer, fadeUp } from './AnimatedSection';

const testimonials = [
  {
    q: 'My new contributors now actually understand the project before they PR. Onboarding notes went from a 40-page doc to a link.',
    name: 'S. Park',
    role: 'Maintainer, popular TS library',
    initials: 'SP',
  },
  {
    q: 'Cut our new-hire ramp-up from 3 weeks to 4 days. The guided tour is doing work our senior engineers used to do in 1-on-1s.',
    name: 'M. Alvarez',
    role: 'Engineering Manager · Mid-stage SaaS',
    initials: 'MA',
  },
  {
    q: 'We used Codebase Explorer for technical due diligence on two acquisitions. Saved us from a bad deal by surfacing hidden coupling nobody flagged in interviews.',
    name: 'J. Iwasa',
    role: 'Partner · Growth VC',
    initials: 'JI',
  },
  {
    q: 'First time anyone has been able to explain this 10-year-old Java monolith to a new engineer without me sitting next to them for a week.',
    name: 'R. Kenway',
    role: 'Principal Engineer · Enterprise',
    initials: 'RK',
  },
];

export default function Testimonials() {
  return (
    <AnimatedSection
      style={{
        padding: 'clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 2rem)',
        maxWidth: 1180,
        margin: '0 auto',
      }}
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
        Trusted by engineers at every stage
      </h2>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-50px' }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(1.5rem, 3vw, 2rem)',
              boxShadow: 'var(--shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <p
              className="serif"
              style={{
                fontStyle: 'italic',
                color: 'var(--color-text-primary)',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
                fontSize: '1rem',
                flex: 1,
              }}
            >
              &ldquo;{t.q}&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  color: 'var(--color-text-inverse)',
                  fontSize: 12,
                  background: 'var(--color-accent)',
                }}
              >
                {t.initials}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{t.name}</div>
                <div style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </AnimatedSection>
  );
}
