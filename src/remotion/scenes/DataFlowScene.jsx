import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import SceneBackground from '../components/SceneBackground';
import AnimatedText from '../components/AnimatedText';
import { DARK_CONCEPT_COLORS, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, SURFACE, BORDER_SUBTLE } from '../lib/colors';

const NODE_SPACING = 160;
const NODE_Y = 360;
const ARROW_STAGGER = 20;

function FlowNode({ concept, x, y, delay, isActive, activeProgress }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 80 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const scale = interpolate(progress, [0, 1], [0.6, 1]);
  const colors = DARK_CONCEPT_COLORS[concept.color] || DARK_CONCEPT_COLORS.blue;
  const radius = concept.importance === 'critical' ? 36 : concept.importance === 'important' ? 30 : 24;

  const glowOpacity = isActive
    ? interpolate(activeProgress, [0, 1], [0, 0.6], { extrapolateRight: 'clamp' })
    : 0;

  return (
    <g transform={`translate(${x}, ${y})`} opacity={opacity}>
      {/* Glow */}
      <circle
        cx={0}
        cy={0}
        r={radius + 12}
        fill={colors.primary}
        opacity={glowOpacity * 0.15}
      />
      {/* Node circle */}
      <circle
        cx={0}
        cy={0}
        r={radius}
        fill={`${colors.primary}18`}
        stroke={colors.primary}
        strokeWidth={isActive ? 2.5 : 1.5}
        opacity={isActive ? 1 : 0.7}
        transform={`scale(${scale})`}
      />
      {/* Label */}
      <text
        x={0}
        y={radius + 22}
        textAnchor="middle"
        fill={isActive ? TEXT_PRIMARY : TEXT_SECONDARY}
        fontSize={13}
        fontWeight={isActive ? 600 : 400}
        fontFamily="'DM Sans', sans-serif"
      >
        {concept.name}
      </text>
      {/* Role badge */}
      {concept.importance === 'critical' && (
        <text
          x={0}
          y={-radius - 10}
          textAnchor="middle"
          fill={colors.primary}
          fontSize={9}
          fontWeight={600}
          fontFamily="'JetBrains Mono', monospace"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          CRITICAL
        </text>
      )}
    </g>
  );
}

function FlowArrow({ x1, y1, x2, y2, label, delay, isActive }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 60 },
  });

  const length = Math.hypot(x2 - x1, y2 - y1);
  const dashOffset = interpolate(progress, [0, 1], [length, 0]);
  const labelOpacity = interpolate(progress, [0, 0.6, 1], [0, 0, 1]);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 - 18;

  // Arrowhead
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowLen = 10;
  const arrowAngle = Math.PI / 6;
  const ax1 = x2 - arrowLen * Math.cos(angle - arrowAngle);
  const ay1 = y2 - arrowLen * Math.sin(angle - arrowAngle);
  const ax2 = x2 - arrowLen * Math.cos(angle + arrowAngle);
  const ay2 = y2 - arrowLen * Math.sin(angle + arrowAngle);

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}
        strokeWidth={isActive ? 2 : 1.2}
        strokeDasharray={length}
        strokeDashoffset={dashOffset}
      />
      {/* Arrowhead */}
      <polygon
        points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`}
        fill={isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}
        opacity={interpolate(progress, [0, 1], [0, 1])}
      />
      {/* Relationship label */}
      {label && (
        <text
          x={midX}
          y={midY}
          textAnchor="middle"
          fill={TEXT_TERTIARY}
          fontSize={10}
          fontFamily="'JetBrains Mono', monospace"
          opacity={labelOpacity}
          fontStyle="italic"
        >
          {label.length > 30 ? label.slice(0, 28) + '...' : label}
        </text>
      )}
    </g>
  );
}

export default function DataFlowScene({ concepts, edges, explorationPath }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Use exploration path to order concepts, fall back to importance ranking
  const IMPORTANCE_RANK = { critical: 4, important: 3, supporting: 1 };
  let orderedConcepts;
  if (explorationPath?.length >= 3) {
    const conceptMap = {};
    concepts.forEach(c => { conceptMap[c.id] = c; });
    orderedConcepts = explorationPath
      .map(id => conceptMap[id])
      .filter(Boolean)
      .slice(0, 6);
  } else {
    orderedConcepts = [...concepts]
      .sort((a, b) => (IMPORTANCE_RANK[b.importance] || 1) - (IMPORTANCE_RANK[a.importance] || 1))
      .slice(0, 6);
  }

  const count = orderedConcepts.length;
  if (count === 0) return null;

  // Layout: horizontal flow with scroll
  const totalWidth = (count - 1) * NODE_SPACING;
  const startX = 640 - totalWidth / 2;

  // Which node is currently "active" (spotlight sweeps through)
  const sweepDuration = durationInFrames - 60;
  const activeFloat = interpolate(frame, [30, sweepDuration], [0, count - 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const activeIndex = Math.round(activeFloat);

  // Build edge lookup
  const edgeMap = {};
  edges.forEach(e => {
    edgeMap[`${e.source}→${e.target}`] = e.label || e.relationship || '';
    edgeMap[`${e.target}→${e.source}`] = e.label || e.relationship || '';
  });

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SceneBackground accentColor="#6366f1" glowX={50} glowY={50} />

      <div style={{ position: 'absolute', top: 40, left: 80, zIndex: 2 }}>
        <AnimatedText
          text="How It Connects"
          fontSize={32}
          fontWeight={700}
          delay={0}
        />
        <AnimatedText
          text="The flow of logic through the architecture"
          fontSize={15}
          color={TEXT_SECONDARY}
          delay={8}
          style={{ marginTop: 6 }}
        />
      </div>

      {/* Active concept metaphor */}
      {orderedConcepts[activeIndex] && (
        <div style={{
          position: 'absolute',
          bottom: 60,
          left: 80,
          right: 80,
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            background: SURFACE,
            border: `1px solid ${BORDER_SUBTLE}`,
            borderRadius: 12,
            padding: '14px 24px',
            maxWidth: 600,
            textAlign: 'center',
            opacity: interpolate(
              frame % (sweepDuration / count),
              [0, 10, sweepDuration / count - 10, sweepDuration / count],
              [0, 1, 1, 0],
              { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
            ),
          }}>
            <div style={{
              fontSize: 14,
              color: TEXT_PRIMARY,
              fontWeight: 600,
              marginBottom: 4,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {orderedConcepts[activeIndex].name}
            </div>
            <div style={{
              fontSize: 12,
              color: TEXT_SECONDARY,
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.5,
            }}>
              {orderedConcepts[activeIndex].metaphor || orderedConcepts[activeIndex].one_liner || ''}
            </div>
          </div>
        </div>
      )}

      <svg
        viewBox="0 0 1280 720"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {/* Arrows between consecutive nodes */}
        {orderedConcepts.slice(0, -1).map((c, i) => {
          const x1 = startX + i * NODE_SPACING + 30;
          const x2 = startX + (i + 1) * NODE_SPACING - 30;
          const nextC = orderedConcepts[i + 1];
          const edgeKey = `${c.id}→${nextC.id}`;
          const label = edgeMap[edgeKey] || '';

          return (
            <FlowArrow
              key={`arrow-${i}`}
              x1={x1}
              y1={NODE_Y}
              x2={x2}
              y2={NODE_Y}
              label={label}
              delay={20 + i * ARROW_STAGGER}
              isActive={i === activeIndex || i === activeIndex - 1}
            />
          );
        })}

        {/* Nodes */}
        {orderedConcepts.map((c, i) => {
          const nodeDelay = 10 + i * 12;
          const isActive = i === activeIndex;
          const activeProgress = spring({
            frame: frame - Math.max(0, frame - 5),
            fps,
            config: { damping: 200, stiffness: 100 },
          });

          return (
            <FlowNode
              key={c.id}
              concept={c}
              x={startX + i * NODE_SPACING}
              y={NODE_Y}
              delay={nodeDelay}
              isActive={isActive}
              activeProgress={isActive ? 1 : 0}
            />
          );
        })}
      </svg>
    </div>
  );
}
