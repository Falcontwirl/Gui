import { motion, AnimatePresence } from 'framer-motion';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ProgressRing({ percent, statusMessage }) {
  const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
  const glowOpacity = 0.08 + (percent / 100) * 0.2;

  return (
    <div className="relative flex flex-col items-center z-10">
      {/* SVG ring + number */}
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 140 140" className="absolute inset-0">
          {/* Glow filter */}
          <defs>
            <filter id="ring-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Track */}
          <circle
            cx="70" cy="70" r={RADIUS}
            fill="none"
            stroke="var(--color-border-subtle)"
            strokeWidth="3"
          />
          {/* Progress arc */}
          <circle
            cx="70" cy="70" r={RADIUS}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="progress-ring-circle"
            filter="url(#ring-glow)"
            style={{ opacity: 0.9 }}
          />
        </svg>

        {/* Center glow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, var(--color-accent) 0%, transparent 70%)`,
            opacity: glowOpacity,
            transition: 'opacity 1s ease-out',
          }}
        />

        {/* Percentage number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            style={{
              fontSize: 'clamp(2rem, 6vw, 3rem)',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {percent}
          </span>
          <span
            style={{
              fontSize: 'clamp(0.75rem, 2vw, 1rem)',
              fontFamily: "'JetBrains Mono', monospace",
              color: 'var(--color-text-secondary)',
              marginTop: 4,
            }}
          >
            %
          </span>
        </div>
      </div>

      {/* Status message */}
      <div className="mt-5 h-6 overflow-hidden text-center" style={{ maxWidth: 360 }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={statusMessage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {statusMessage || 'Starting...'}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
