import { motion } from 'framer-motion';
import { FolderOpen, Search, Puzzle, Map } from 'lucide-react';

const STAGES = [
  { label: 'Files', Icon: FolderOpen, stageThreshold: 0 },
  { label: 'Analyze', Icon: Search, stageThreshold: 2 },
  { label: 'Synthesize', Icon: Puzzle, stageThreshold: 3 },
  { label: 'Complete', Icon: Map, stageThreshold: 6 },
];

export default function StageIndicator({ currentStage }) {
  const activeIdx = STAGES.findIndex((s, i) => {
    const next = STAGES[i + 1];
    return next ? currentStage < next.stageThreshold : true;
  });

  return (
    <div className="flex items-center justify-center gap-0 z-10 px-4" style={{ maxWidth: 380 }}>
      {STAGES.map((stage, i) => {
        const completed = currentStage >= (STAGES[i + 1]?.stageThreshold ?? 99);
        const active = i === activeIdx && !completed;
        const future = !completed && !active;

        return (
          <div key={stage.label} className="flex items-center">
            {/* Dot */}
            <div className="flex flex-col items-center" style={{ minWidth: 44 }}>
              <motion.div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 28,
                  height: 28,
                  background: completed
                    ? 'var(--color-success)'
                    : active
                      ? 'var(--color-accent)'
                      : 'transparent',
                  border: future
                    ? '1.5px solid var(--color-border-visible)'
                    : 'none',
                  boxShadow: active
                    ? '0 0 12px rgba(99, 102, 241, 0.4)'
                    : 'none',
                }}
                animate={active ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={active ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
              >
                <stage.Icon
                  size={14}
                  style={{
                    color: future
                      ? 'var(--color-text-tertiary)'
                      : '#fff',
                  }}
                />
              </motion.div>
              {/* Label — hidden on mobile */}
              <span
                className="mt-1.5 text-xs hidden sm:block"
                style={{
                  color: future
                    ? 'var(--color-text-tertiary)'
                    : completed
                      ? 'var(--color-success)'
                      : 'var(--color-text-secondary)',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {stage.label}
              </span>
            </div>

            {/* Connecting line */}
            {i < STAGES.length - 1 && (
              <div
                className="h-px flex-1"
                style={{
                  width: 40,
                  background: completed
                    ? 'var(--color-success)'
                    : 'var(--color-border-subtle)',
                  transition: 'background 0.5s ease-out',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
