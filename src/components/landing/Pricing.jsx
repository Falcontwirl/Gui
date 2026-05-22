import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const tiers = [
  {
    name: 'Free',
    tagline: 'OSS contributors & curious devs',
    price: '$0',
    priceNote: '',
    features: [
      'Public repos only',
      '5 analyses per month',
      'Interactive architecture map',
      'Guided tour + concept graph',
      'Community support',
    ],
    cta: 'Get started',
    primary: false,
  },
  {
    name: 'Pro',
    tagline: 'Individual engineers',
    price: '$19',
    priceNote: '/month',
    features: [
      'Unlimited public & private repos',
      'Full chat with the code',
      'Risk & pattern detection',
      'Export comprehension reports',
      'Priority AI model access',
    ],
    cta: 'Start free trial',
    primary: true,
  },
  {
    name: 'Team',
    tagline: 'Engineering teams',
    price: '$49',
    priceNote: '/seat/mo',
    features: [
      'Everything in Pro',
      'Shared workspaces',
      'Onboarding templates',
      'SSO + audit log',
      'Role-based access',
    ],
    cta: 'Start free trial',
    primary: false,
  },
  {
    name: 'Enterprise',
    tagline: 'Due diligence · M&A · legacy mod',
    price: 'Custom',
    priceNote: '',
    features: [
      'Self-hosted option',
      'SOC2 · VPC deploy',
      'Dedicated support',
      'Custom integrations',
      'Per-codebase contracts',
    ],
    cta: 'Contact sales',
    primary: false,
  },
];

export default function Pricing({ onGetStarted }) {
  return (
    <AnimatedSection
      id="lp-pricing"
      style={{ padding: 'clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 2rem)', maxWidth: 1240, margin: '0 auto' }}
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
        Pricing that scales with the work
      </h2>
      <p
        style={{
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          maxWidth: 520,
          margin: '0 auto clamp(2rem, 5vw, 3.5rem)',
          fontSize: '1rem',
        }}
      >
        Free for public repos. Paid tiers unlock private code, team features, and enterprise deployment.
      </p>

      <div
        className="lp-pricing-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
        }}
      >
        {tiers.map((tier, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            style={{
              background: tier.primary ? 'var(--color-bg-elevated)' : 'var(--color-bg-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(1.5rem, 3vw, 2rem)',
              border: tier.primary
                ? '1.5px solid var(--color-accent)'
                : '1px solid var(--color-border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: tier.primary ? 'var(--shadow-md)' : 'var(--shadow-xs)',
              position: 'relative',
            }}
          >
            {tier.primary && (
              <div
                style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-accent)',
                  color: 'var(--color-text-inverse)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Most popular
              </div>
            )}
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 2,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {tier.name}
            </div>
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 12, marginBottom: '1.25rem' }}>
              {tier.tagline}
            </div>
            <div
              className="serif"
              style={{
                fontSize: 36,
                fontWeight: 500,
                marginBottom: '1.5rem',
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.03em',
                display: 'flex',
                alignItems: 'baseline',
                gap: 4,
              }}
            >
              {tier.price}
              {tier.priceNote && (
                <span
                  className="font-heading"
                  style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-tertiary)' }}
                >
                  {tier.priceNote}
                </span>
              )}
            </div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                flex: 1,
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {tier.features.map((f, j) => (
                <li
                  key={j}
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    lineHeight: 1.5,
                  }}
                >
                  <Check
                    size={14}
                    strokeWidth={2}
                    color="var(--color-accent)"
                    style={{ marginTop: 3, flexShrink: 0 }}
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={onGetStarted}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: 600,
                background: tier.primary ? 'var(--color-accent)' : 'transparent',
                color: tier.primary ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                border: `1px solid ${tier.primary ? 'var(--color-accent)' : 'var(--color-border-visible)'}`,
                cursor: 'pointer',
                transition: `all var(--duration-base) var(--ease-out)`,
              }}
              onMouseEnter={e => {
                if (tier.primary) e.currentTarget.style.background = 'var(--color-accent-hover)';
                else {
                  e.currentTarget.style.background = 'var(--color-bg-elevated)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (tier.primary) e.currentTarget.style.background = 'var(--color-accent)';
                else {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }
              }}
            >
              {tier.cta}
            </button>
          </motion.div>
        ))}
      </div>

      <style>{`
        @media (max-width: 1100px) { .lp-pricing-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 600px)  { .lp-pricing-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </AnimatedSection>
  );
}
