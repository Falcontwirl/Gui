import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { AlertTriangle, ArrowLeft, RefreshCw, X } from 'lucide-react';
import useStore from '../../store/useStore';
import { usePipelineListener } from '../../hooks/usePipelineListener';
import useSmoothedProgress from './useSmoothedProgress';
import ProgressRing from './ProgressRing';
import StageIndicator from './StageIndicator';
import ActivityFeed from './ActivityFeed';
import OrbitalBackground from './OrbitalBackground';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function ProcessingScreen() {
  const processingStatus = useStore((s) => s.processingStatus);
  const pipelineProgress = useStore((s) => s.pipelineProgress);
  const pipelineStatus = useStore((s) => s.pipelineStatus);
  const processingError = useStore((s) => s.processingError);
  const projectId = useStore((s) => s.projectId);
  const percent = useSmoothedProgress(pipelineProgress);
  const currentStage = pipelineProgress?.stage ?? 0;
  const navigate = useNavigate();
  const { startListening } = usePipelineListener();

  const isError = processingError
    || pipelineStatus === 'failed'
    || (typeof processingStatus === 'string' && processingStatus.startsWith('Failed'));

  const errorMessage = processingError?.message
    || (pipelineStatus === 'failed' ? 'Pipeline failed. Please try again.' : null)
    || processingStatus
    || 'Something went wrong.';

  return (
    <div
      className="w-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--color-bg-base)', minHeight: '100dvh' }}
    >
      <OrbitalBackground percent={isError ? 0 : percent} />

      {isError ? (
        <motion.div
          className="flex flex-col items-center z-10"
          style={{ gap: 'clamp(16px, 3vw, 24px)', padding: 'clamp(16px, 4vw, 32px)', maxWidth: 420 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'color-mix(in srgb, var(--color-error) 12%, var(--color-bg-surface))',
            border: '1px solid color-mix(in srgb, var(--color-error) 20%, transparent)',
          }}>
            <AlertTriangle size={24} strokeWidth={1.5} style={{ color: 'var(--color-error)' }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.35rem)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 8,
            }}>
              Unable to analyze repository
            </h2>
            <p style={{
              fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
            }}>
              {errorMessage}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={async () => {
                const success = await useStore.getState().rerunPipeline();
                if (success && projectId) startListening(projectId);
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 'var(--radius-sm)',
                fontSize: 13, fontWeight: 600, minHeight: 44,
                background: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms ease-out',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <RefreshCw size={15} strokeWidth={2} />
              Retry Analysis
            </button>
            <button
              onClick={() => navigate('/upload', { replace: true })}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 'var(--radius-sm)',
                fontSize: 13, fontWeight: 600, minHeight: 44,
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-visible)',
                cursor: 'pointer',
                transition: 'all 150ms ease-out',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg-elevated)'; }}
            >
              <ArrowLeft size={15} strokeWidth={2} />
              Back to upload
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="flex flex-col items-center w-full"
          style={{ gap: 'clamp(20px, 4vw, 32px)' }}
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp}>
            <ProgressRing percent={percent} statusMessage={processingStatus} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <StageIndicator currentStage={currentStage} />
          </motion.div>

          <motion.div variants={fadeUp} className="w-full flex justify-center">
            <ActivityFeed statusMessage={processingStatus} />
          </motion.div>

          <motion.div variants={fadeUp} className="flex justify-center" style={{ marginTop: 8 }}>
            <button
              onClick={async () => {
                await useStore.getState().cancelPipeline();
                navigate('/upload', { replace: true });
              }}
              style={{
                background: 'none', border: 'none',
                color: 'var(--color-text-tertiary)', fontSize: '0.8rem',
                cursor: 'pointer', padding: '8px 16px',
                display: 'flex', alignItems: 'center', gap: 6,
                borderRadius: 'var(--radius-sm)',
                transition: 'color 150ms ease',
                minHeight: 44,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
            >
              <X size={13} strokeWidth={2} />
              Cancel analysis
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
