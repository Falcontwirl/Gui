import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import SceneBackground from '../components/SceneBackground';
import AnimatedText from '../components/AnimatedText';
import { DARK_CONCEPT_COLORS, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, SURFACE, BORDER_SUBTLE, ACCENT } from '../lib/colors';

const ROLE_COLORS = {
  entry_point: '#f59e0b',
  core_logic: '#6366f1',
  data: '#10b981',
  ui: '#06b6d4',
  utility: '#8b5cf6',
  config: '#64748b',
  test: '#f43f5e',
  types: '#94a3b8',
};

const ROLE_LABELS = {
  entry_point: 'Entry Points',
  core_logic: 'Core Logic',
  data: 'Data Layer',
  ui: 'UI Components',
  utility: 'Utilities',
  config: 'Config',
  test: 'Tests',
  types: 'Type Defs',
};

const COMPLEXITY_COLORS = {
  complex: '#f43f5e',
  moderate: '#f59e0b',
  simple: '#10b981',
};

function RoleBar({ label, count, total, color, delay, maxCount }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 80 },
  });

  const barWidth = interpolate(progress, [0, 1], [0, (count / maxCount) * 340]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div style={{ opacity, display: 'flex', alignItems: 'center', gap: 12, height: 28 }}>
      <span style={{
        width: 90,
        fontSize: 11,
        color: TEXT_SECONDARY,
        fontFamily: "'JetBrains Mono', monospace",
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{
        flex: 1,
        height: 18,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: barWidth,
          height: '100%',
          background: `linear-gradient(90deg, ${color}40, ${color}90)`,
          borderRadius: 4,
          transition: 'width 0.3s ease-out',
        }} />
      </div>
      <span style={{
        width: 28,
        fontSize: 13,
        color: TEXT_PRIMARY,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {count}
      </span>
    </div>
  );
}

function HubNode({ concept, connections, rank, delay }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 80 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const x = interpolate(progress, [0, 1], [30, 0]);
  const colors = DARK_CONCEPT_COLORS[concept.color] || DARK_CONCEPT_COLORS.blue;

  return (
    <div style={{
      opacity,
      transform: `translateX(${x}px)`,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 0',
    }}>
      <div style={{
        width: 20,
        fontSize: 11,
        color: TEXT_TERTIARY,
        fontFamily: "'JetBrains Mono', monospace",
        textAlign: 'center',
        flexShrink: 0,
      }}>
        #{rank}
      </div>
      <div style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: colors.primary,
        boxShadow: `0 0 8px ${colors.primary}50`,
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 14,
        color: TEXT_PRIMARY,
        fontWeight: 500,
        fontFamily: "'DM Sans', sans-serif",
        flex: 1,
      }}>
        {concept.name}
      </span>
      <span style={{
        fontSize: 12,
        color: colors.primary,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
      }}>
        {connections} links
      </span>
    </div>
  );
}

function ComplexityDot({ complexity, x, y, delay }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 120 },
  });

  const color = COMPLEXITY_COLORS[complexity] || COMPLEXITY_COLORS.simple;
  const size = complexity === 'complex' ? 10 : complexity === 'moderate' ? 7 : 5;
  const scale = interpolate(progress, [0, 1], [0, 1]);

  return (
    <circle
      cx={x}
      cy={y}
      r={size * scale}
      fill={color}
      opacity={0.7}
    />
  );
}

export default function ArchitectureXRayScene({ files, concepts, edges }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Role distribution
  const roleCounts = {};
  files.forEach(f => {
    const role = f.role || 'utility';
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });

  const sortedRoles = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxCount = sortedRoles.length > 0 ? sortedRoles[0][1] : 1;

  // Hub analysis: which concepts have the most connections
  const connectionCounts = {};
  concepts.forEach(c => { connectionCounts[c.id] = 0; });
  edges.forEach(e => {
    if (connectionCounts[e.source] !== undefined) connectionCounts[e.source]++;
    if (connectionCounts[e.target] !== undefined) connectionCounts[e.target]++;
  });

  const conceptMap = {};
  concepts.forEach(c => { conceptMap[c.id] = c; });

  const hubs = Object.entries(connectionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, count]) => ({ concept: conceptMap[id], connections: count }))
    .filter(h => h.concept && h.connections > 0);

  // Complexity breakdown
  const complexityCounts = { complex: 0, moderate: 0, simple: 0 };
  files.forEach(f => {
    const c = f.complexity || 'simple';
    if (complexityCounts[c] !== undefined) complexityCounts[c]++;
  });
  const totalFiles = files.length || 1;

  // Phase timing: left panel appears first, right panel second
  const phase2Delay = 40;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SceneBackground accentColor="#f43f5e" glowX={40} glowY={45} />

      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 80px',
      }}>
        <AnimatedText
          text="Architecture X-Ray"
          fontSize={32}
          fontWeight={700}
          delay={0}
          style={{ marginBottom: 6 }}
        />
        <AnimatedText
          text="The structural shape of this codebase"
          fontSize={15}
          color={TEXT_SECONDARY}
          delay={8}
          style={{ marginBottom: 32 }}
        />

        <div style={{
          display: 'flex',
          gap: 32,
          flex: 1,
          alignItems: 'flex-start',
        }}>
          {/* Left: File role distribution */}
          <div style={{
            flex: 1,
            background: SURFACE,
            border: `1px solid ${BORDER_SUBTLE}`,
            borderRadius: 12,
            padding: '20px 24px',
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: TEXT_TERTIARY,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 16,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              File Roles
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sortedRoles.map(([role, count], i) => (
                <RoleBar
                  key={role}
                  label={ROLE_LABELS[role] || role}
                  count={count}
                  total={totalFiles}
                  color={ROLE_COLORS[role] || '#94a3b8'}
                  delay={20 + i * 8}
                  maxCount={maxCount}
                />
              ))}
            </div>

            {/* Complexity breakdown */}
            <div style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${BORDER_SUBTLE}`,
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: TEXT_TERTIARY,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 12,
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Complexity
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {Object.entries(complexityCounts).map(([level, count]) => {
                  const pct = Math.round((count / totalFiles) * 100);
                  const delay2 = 35 + Object.keys(complexityCounts).indexOf(level) * 10;
                  const progress = spring({ frame: frame - delay2, fps, config: { damping: 200, stiffness: 80 } });
                  const opacity = interpolate(progress, [0, 1], [0, 1]);

                  return (
                    <div key={level} style={{ opacity, textAlign: 'center' }}>
                      <div style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: COMPLEXITY_COLORS[level],
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {pct}%
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: TEXT_TERTIARY,
                        textTransform: 'capitalize',
                        fontFamily: "'DM Sans', sans-serif",
                      }}>
                        {level}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Hub analysis */}
          <div style={{
            flex: 1,
            background: SURFACE,
            border: `1px solid ${BORDER_SUBTLE}`,
            borderRadius: 12,
            padding: '20px 24px',
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: TEXT_TERTIARY,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 16,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Most Connected Concepts
            </div>

            {hubs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {hubs.map((hub, i) => (
                  <HubNode
                    key={hub.concept.id}
                    concept={hub.concept}
                    connections={hub.connections}
                    rank={i + 1}
                    delay={phase2Delay + i * 12}
                  />
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: TEXT_TERTIARY }}>
                No connections analyzed yet
              </div>
            )}

            {/* Entry points callout */}
            {files.some(f => f.role === 'entry_point') && (
              <div style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: `1px solid ${BORDER_SUBTLE}`,
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: TEXT_TERTIARY,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 10,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  Entry Points
                </div>
                {files.filter(f => f.role === 'entry_point').slice(0, 3).map((f, i) => {
                  const entryDelay = phase2Delay + 40 + i * 8;
                  const progress = spring({ frame: frame - entryDelay, fps, config: { damping: 200, stiffness: 80 } });
                  const opacity = interpolate(progress, [0, 1], [0, 1]);

                  return (
                    <div key={f.id} style={{
                      opacity,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 0',
                    }}>
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: ROLE_COLORS.entry_point,
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 12,
                        color: TEXT_SECONDARY,
                        fontFamily: "'JetBrains Mono', monospace",
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {f.name || f.id}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
