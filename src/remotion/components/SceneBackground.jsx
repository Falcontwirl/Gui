import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { SCENE_BG, ACCENT } from '../lib/colors';

export default function SceneBackground({ accentColor = ACCENT, glowX = 50, glowY = 40 }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Subtle glow drift over the scene lifetime
  const driftX = interpolate(frame, [0, durationInFrames], [glowX - 5, glowX + 5], {
    extrapolateRight: 'clamp',
  });
  const driftY = interpolate(frame, [0, durationInFrames], [glowY - 3, glowY + 3], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: SCENE_BG,
      }}
    >
      {/* Accent radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 60% 50% at ${driftX}% ${driftY}%, ${accentColor}12, transparent 70%)`,
        }}
      />
      {/* Grid pattern - very subtle */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          opacity: 0.5,
        }}
      />
    </div>
  );
}
