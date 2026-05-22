import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import SceneBackground from '../components/SceneBackground';
import AnimatedText from '../components/AnimatedText';
import { CATEGORY_COLORS, TEXT_PRIMARY, TEXT_SECONDARY, SURFACE, BORDER_SUBTLE, ACCENT } from '../lib/colors';

const INSIGHT_STAGGER = 25;

function InsightRow({ insight, index }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delay = 20 + index * INSIGHT_STAGGER;
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 80 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const y = interpolate(progress, [0, 1], [24, 0]);

  const color = CATEGORY_COLORS[insight.category] || ACCENT;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        background: SURFACE,
        border: `1px solid ${BORDER_SUBTLE}`,
        borderRadius: 12,
        padding: '20px 28px',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
      }}
    >
      {/* Category dot */}
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 12px ${color}50`,
          marginTop: 6,
          flexShrink: 0,
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: TEXT_PRIMARY,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {insight.title}
          </span>
          <span
            style={{
              fontSize: 11,
              color,
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {insight.category}
          </span>
        </div>
        <p
          style={{
            fontSize: 14,
            color: TEXT_SECONDARY,
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {insight.summary || insight.body || ''}
        </p>
      </div>
    </div>
  );
}

export default function InsightsScene({ insights, meta }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const topInsights = insights.slice(0, 3);

  // Closing CTA
  const ctaDelay = 20 + topInsights.length * INSIGHT_STAGGER + 20;
  const ctaProgress = spring({
    frame: frame - ctaDelay,
    fps,
    config: { damping: 200, stiffness: 60 },
  });
  const ctaOpacity = interpolate(ctaProgress, [0, 1], [0, 1]);
  const ctaScale = interpolate(ctaProgress, [0, 1], [0.9, 1]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SceneBackground accentColor="#06b6d4" glowX={60} glowY={40} />

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 80px',
        }}
      >
        <AnimatedText
          text="Key Insights"
          fontSize={32}
          fontWeight={700}
          delay={0}
          style={{ marginBottom: 6 }}
        />
        <AnimatedText
          text="What stands out about this codebase"
          fontSize={15}
          color={TEXT_SECONDARY}
          delay={8}
          style={{ marginBottom: 28 }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            flex: 1,
          }}
        >
          {topInsights.map((ins, i) => (
            <InsightRow key={ins.id || i} insight={ins} index={i} />
          ))}
        </div>

        {/* Closing CTA */}
        <div
          style={{
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            textAlign: 'center',
            marginTop: 'auto',
            paddingTop: 24,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: TEXT_PRIMARY,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Ready to explore?
          </span>
        </div>
      </div>
    </div>
  );
}
