import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import SceneBackground from '../components/SceneBackground';
import { TEXT_PRIMARY, TEXT_SECONDARY, ACCENT, SURFACE, BORDER_SUBTLE } from '../lib/colors';

function Badge({ label, value, delay }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 80 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const y = interpolate(progress, [0, 1], [24, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: SURFACE,
        border: `1px solid ${BORDER_SUBTLE}`,
        borderRadius: 10,
        padding: '10px 20px',
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: TEXT_SECONDARY,
          fontFamily: "'DM Sans', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 16,
          color: TEXT_PRIMARY,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function TitleScene({ meta }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 60 },
  });

  const titleScale = interpolate(titleProgress, [0, 1], [0.7, 1]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  const subtitleProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200, stiffness: 80 },
  });
  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);
  const subtitleY = interpolate(subtitleProgress, [0, 1], [16, 0]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SceneBackground glowX={50} glowY={35} />

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          padding: '0 80px',
        }}
      >
        {/* Label */}
        <div
          style={{
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            fontSize: 13,
            color: ACCENT,
            fontFamily: "'DM Sans', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontWeight: 600,
          }}
        >
          Architecture Overview
        </div>

        {/* Project name */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
            fontSize: 52,
            fontWeight: 700,
            color: TEXT_PRIMARY,
            fontFamily: "'DM Sans', sans-serif",
            textAlign: 'center',
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          {meta.name || 'Untitled Project'}
        </div>

        {/* Summary */}
        {meta.summary && (
          <div
            style={{
              opacity: subtitleOpacity,
              transform: `translateY(${subtitleY}px)`,
              fontSize: 18,
              color: TEXT_SECONDARY,
              fontFamily: "'DM Sans', sans-serif",
              textAlign: 'center',
              lineHeight: 1.6,
              maxWidth: 680,
            }}
          >
            {meta.summary.length > 120 ? meta.summary.slice(0, 117) + '...' : meta.summary}
          </div>
        )}

        {/* Badges */}
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          {meta.framework && <Badge label="Framework" value={meta.framework} delay={25} />}
          {meta.language && <Badge label="Language" value={meta.language} delay={35} />}
          {meta.file_count && (
            <Badge label="Files" value={String(meta.file_count)} delay={45} />
          )}
        </div>
      </div>
    </div>
  );
}
