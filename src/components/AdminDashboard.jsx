import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, Activity, TrendingUp, Cpu, Zap,
  ChevronUp, ChevronDown, Calendar, Layers, MessageSquare,
  Brain, FileSearch, Sparkles, GitBranch, Network, HelpCircle,
  BarChart3,
} from 'lucide-react';
import BackBar from './BackBar';
import { API_BASE } from '../lib/api';

const fmt = (n) => n?.toLocaleString('en-US') ?? '0';
const fmtUsd = (n) => `$${(n || 0).toFixed(2)}`;
const fmtUsdCompact = (n) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${(n || 0).toFixed(2)}`;

const OP_META = {
  folder_describe:        { label: 'Folder Describe',     icon: Layers,        color: '#6366f1' },
  file_describe:          { label: 'File Describe',       icon: FileSearch,    color: '#10b981' },
  function_group:         { label: 'Function Group',      icon: GitBranch,     color: '#f59e0b' },
  chat:                   { label: 'Chat',                icon: MessageSquare, color: '#3b82f6' },
};

const getOpMeta = (op) => OP_META[op] || { label: op, icon: Activity, color: 'var(--color-accent)' };

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function Skeleton({ width = '100%', height = 20, radius = 'var(--radius-sm)', delay = 0 }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'var(--color-bg-sunken)',
      animation: `pulse 1.5s ease-in-out infinite ${delay}s`,
    }} />
  );
}

function StatCard({ icon: Icon, label, value, subtext, color, loading, delay = 0 }) {
  return (
    <div style={{
      flex: 1, minWidth: 180,
      padding: '20px 24px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border-subtle)',
      boxShadow: 'var(--shadow-xs)',
      display: 'flex', flexDirection: 'column', gap: 12,
      animation: `fade-in 0.4s var(--ease-out) ${delay}s both`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-md)',
          background: `${color}18`,
          border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} strokeWidth={1.5} style={{ color }} />
        </div>
        <span style={{
          fontSize: 12, fontWeight: 500, letterSpacing: '0.03em',
          color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
        }}>
          {label}
        </span>
      </div>
      {loading ? (
        <Skeleton height={32} width="60%" />
      ) : (
        <div style={{
          fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-primary)', lineHeight: 1,
          letterSpacing: '-0.02em',
        }}>
          {value}
        </div>
      )}
      {!loading && subtext && (
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          {subtext}
        </span>
      )}
    </div>
  );
}

function ModelBar({ data, loading }) {
  if (loading) return <Skeleton height={48} radius="var(--radius-md)" />;
  if (!data || data.length === 0) return null;

  const total = data.reduce((s, m) => s + m.cost, 0);
  if (total === 0) return null;

  const sonnet = data.find(m => m.model?.includes('sonnet'));
  const haiku = data.find(m => m.model?.includes('haiku'));

  const items = [
    { label: 'Sonnet', cost: sonnet?.cost || 0, calls: sonnet?.calls || 0, color: '#6366f1' },
    { label: 'Haiku', cost: haiku?.cost || 0, calls: haiku?.calls || 0, color: '#10b981' },
  ].filter(m => m.cost > 0);

  return (
    <div style={{
      padding: '20px 24px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border-subtle)',
      boxShadow: 'var(--shadow-xs)',
      animation: 'fade-in 0.4s var(--ease-out) 0.15s both',
    }}>
      <div style={{
        fontSize: 12, fontWeight: 500, letterSpacing: '0.03em',
        color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        Model Breakdown
      </div>
      <div style={{
        display: 'flex', height: 12, borderRadius: 'var(--radius-pill)',
        overflow: 'hidden', background: 'var(--color-bg-sunken)',
        marginBottom: 16,
      }}>
        {items.map(m => (
          <div key={m.label} style={{
            width: `${(m.cost / total) * 100}%`,
            background: m.color,
            transition: 'width 0.6s var(--ease-out)',
            minWidth: m.cost > 0 ? 4 : 0,
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {items.map(m => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.color }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {m.label}
            </span>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
              {fmtUsd(m.cost)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              ({fmt(m.calls)} calls)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OperationBreakdown({ data, loading }) {
  if (loading) {
    return (
      <div style={{
        padding: '20px 24px', borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
      }}>
        <Skeleton height={14} width={120} delay={0} />
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(5)].map((_, i) => <Skeleton key={i} height={28} delay={i * 0.05} />)}
        </div>
      </div>
    );
  }
  if (!data || data.length === 0) return null;

  const maxCost = Math.max(...data.map(d => d.cost));

  return (
    <div style={{
      padding: '20px 24px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border-subtle)',
      boxShadow: 'var(--shadow-xs)',
      animation: 'fade-in 0.4s var(--ease-out) 0.2s both',
    }}>
      <div style={{
        fontSize: 12, fontWeight: 500, letterSpacing: '0.03em',
        color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        Cost by Operation
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((op, i) => {
          const meta = getOpMeta(op.operation);
          const OpIcon = meta.icon;
          const pct = maxCost > 0 ? (op.cost / maxCost) * 100 : 0;
          return (
            <div key={op.operation} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              animation: `fade-in 0.3s var(--ease-out) ${0.25 + i * 0.03}s both`,
            }}>
              <div style={{ width: 130, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <OpIcon size={14} strokeWidth={1.5} style={{ color: meta.color, flexShrink: 0 }} />
                <span style={{
                  fontSize: 12, color: 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {meta.label}
                </span>
              </div>
              <div style={{
                flex: 1, height: 8, borderRadius: 'var(--radius-pill)',
                background: 'var(--color-bg-sunken)', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 'var(--radius-pill)',
                  background: meta.color, opacity: 0.85,
                  width: `${pct}%`,
                  transition: 'width 0.6s var(--ease-out)',
                }} />
              </div>
              <span style={{
                width: 56, textAlign: 'right', flexShrink: 0,
                fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)',
              }}>
                {fmtUsd(op.cost)}
              </span>
              <span style={{
                width: 50, textAlign: 'right', flexShrink: 0,
                fontSize: 11, color: 'var(--color-text-tertiary)',
              }}>
                {fmt(op.calls)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Timeline({ data, loading }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (loading) {
    return (
      <div style={{
        padding: '20px 24px', borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
      }}>
        <Skeleton height={14} width={100} />
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
          {[...Array(14)].map((_, i) => (
            <Skeleton key={i} height={20 + Math.random() * 80} width="100%" delay={i * 0.03} />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const maxCost = Math.max(...data.map(d => d.cost), 0.01);

  return (
    <div style={{
      padding: '20px 24px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border-subtle)',
      boxShadow: 'var(--shadow-xs)',
      animation: 'fade-in 0.4s var(--ease-out) 0.25s both',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16,
      }}>
        <span style={{
          fontSize: 12, fontWeight: 500, letterSpacing: '0.03em',
          color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
        }}>
          Daily Spend
        </span>
        {hoveredIdx !== null && data[hoveredIdx] && (
          <span style={{
            fontSize: 12, fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-secondary)',
          }}>
            {data[hoveredIdx].date}: {fmtUsd(data[hoveredIdx].cost)} ({data[hoveredIdx].calls} calls)
          </span>
        )}
      </div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 2, height: 140,
        padding: '0 2px',
      }}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.cost / maxCost) * 130);
          const isHovered = hoveredIdx === i;
          return (
            <div
              key={d.date}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                flex: 1, minWidth: 3, maxWidth: 32,
                height: h,
                borderRadius: '3px 3px 0 0',
                background: isHovered ? 'var(--color-accent-hover)' : 'var(--color-accent)',
                opacity: isHovered ? 1 : 0.7,
                cursor: 'pointer',
                transition: 'all var(--duration-fast) var(--ease-out)',
                animation: `grow-up 0.5s var(--ease-out) ${0.3 + i * 0.02}s both`,
              }}
            />
          );
        })}
      </div>
      {data.length > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 8, paddingTop: 8,
          borderTop: '1px solid var(--color-border-subtle)',
        }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {data[0].date}
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {data[data.length - 1].date}
          </span>
        </div>
      )}
    </div>
  );
}

const TABLE_COLS = [
  { key: 'name', label: 'Project', align: 'left', width: undefined },
  { key: 'framework', label: 'Framework', align: 'left', width: 110 },
  { key: 'calls', label: 'Calls', align: 'right', width: 80 },
  { key: 'input_tokens', label: 'In Tokens', align: 'right', width: 100 },
  { key: 'output_tokens', label: 'Out Tokens', align: 'right', width: 100 },
  { key: 'cost', label: 'Cost', align: 'right', width: 90 },
];

function ProjectTable({ data, loading }) {
  const [sortKey, setSortKey] = useState('cost');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return null;
    const I = sortDir === 'asc' ? ChevronUp : ChevronDown;
    return <I size={12} strokeWidth={2} style={{ flexShrink: 0 }} />;
  };

  if (loading) {
    return (
      <div style={{
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        padding: '20px 24px',
      }}>
        <Skeleton height={14} width={100} />
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(5)].map((_, i) => <Skeleton key={i} height={44} delay={i * 0.06} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border-subtle)',
      boxShadow: 'var(--shadow-xs)',
      overflow: 'hidden',
      animation: 'fade-in 0.4s var(--ease-out) 0.3s both',
    }}>
      <div style={{
        fontSize: 12, fontWeight: 500, letterSpacing: '0.03em',
        color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
        padding: '16px 24px 0',
      }}>
        Cost by Project
      </div>

      {/* Desktop table */}
      <div className="admin-table-desktop" style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          fontSize: 13, marginTop: 12,
        }}>
          <thead>
            <tr>
              {TABLE_COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    textAlign: col.align,
                    padding: '10px 16px',
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                    color: sortKey === col.key ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    width: col.width,
                    transition: 'color var(--duration-fast) var(--ease-out)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={TABLE_COLS.length} style={{
                  padding: 32, textAlign: 'center',
                  color: 'var(--color-text-tertiary)', fontSize: 13,
                }}>
                  No usage data yet
                </td>
              </tr>
            ) : sorted.map((p, i) => (
              <tr
                key={p.project_id}
                style={{
                  borderBottom: i < sorted.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                  transition: 'background var(--duration-fast) var(--ease-out)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{
                  padding: '12px 16px', fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.name}
                </td>
                <td style={{
                  padding: '12px 16px',
                  color: 'var(--color-text-tertiary)', fontSize: 12,
                }}>
                  {p.framework || '\u2014'}
                </td>
                <td style={{
                  padding: '12px 16px', textAlign: 'right',
                  fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)',
                }}>
                  {fmt(p.calls)}
                </td>
                <td style={{
                  padding: '12px 16px', textAlign: 'right',
                  fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-tertiary)',
                }}>
                  {fmt(p.input_tokens)}
                </td>
                <td style={{
                  padding: '12px 16px', textAlign: 'right',
                  fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-tertiary)',
                }}>
                  {fmt(p.output_tokens)}
                </td>
                <td style={{
                  padding: '12px 16px', textAlign: 'right',
                  fontFamily: 'var(--font-mono)', fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}>
                  {fmtUsd(p.cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="admin-table-mobile" style={{ display: 'none', padding: '12px 16px' }}>
        {sorted.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            No usage data yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.map(p => (
              <div key={p.project_id} style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 10,
                }}>
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: '60%',
                  }}>
                    {p.name}
                  </span>
                  <span style={{
                    fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700,
                    color: 'var(--color-text-primary)',
                  }}>
                    {fmtUsd(p.cost)}
                  </span>
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
                }}>
                  {[
                    { label: 'Calls', val: fmt(p.calls) },
                    { label: 'In', val: fmt(p.input_tokens) },
                    { label: 'Out', val: fmt(p.output_tokens) },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                        {s.val}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [range, setRange] = useState(defaultDateRange);
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const qs = `from=${range.from}&to=${range.to}`;

    Promise.all([
      fetch(`${API_BASE}/api/admin/usage/summary?${qs}`).then(r => r.json()),
      fetch(`${API_BASE}/api/admin/usage/by-project?${qs}`).then(r => r.json()),
      fetch(`${API_BASE}/api/admin/usage/timeline?${qs}`).then(r => r.json()),
    ]).then(([s, p, t]) => {
      if (cancelled) return;
      setSummary(s);
      setProjects(p);
      setTimeline(t?.data || []);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [range.from, range.to]);

  const avgPerProject = summary && projects?.length
    ? summary.total_cost / projects.length
    : 0;

  return (
    <div style={{
      width: '100%', minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      background: 'var(--color-bg-base)',
    }}>
      <BackBar label="Spending Dashboard" to="/settings" />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 3vw, 2rem)',
        maxWidth: 960, width: '100%', margin: '0 auto',
      }}>
        {/* Date range */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 24, flexWrap: 'wrap',
        }}>
          <Calendar size={15} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            type="date"
            value={range.from}
            onChange={e => setRange(r => ({ ...r, from: e.target.value }))}
            style={{
              padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font-mono)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-sunken)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-secondary)',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>to</span>
          <input
            type="date"
            value={range.to}
            onChange={e => setRange(r => ({ ...r, to: e.target.value }))}
            style={{
              padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font-mono)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-sunken)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-secondary)',
              outline: 'none',
            }}
          />
        </div>

        {/* Summary cards */}
        <div style={{
          display: 'flex', gap: 14, marginBottom: 20,
          flexWrap: 'wrap',
        }}>
          <StatCard
            icon={DollarSign} label="Total Spend"
            value={fmtUsd(summary?.total_cost)}
            subtext={`${fmt(summary?.total_input_tokens)} in / ${fmt(summary?.total_output_tokens)} out tokens`}
            color="#6366f1" loading={loading} delay={0}
          />
          <StatCard
            icon={Activity} label="API Calls"
            value={fmt(summary?.total_calls)}
            subtext={summary ? `${summary.by_model?.length || 0} models used` : ''}
            color="#10b981" loading={loading} delay={0.05}
          />
          <StatCard
            icon={TrendingUp} label="Avg / Project"
            value={fmtUsd(avgPerProject)}
            subtext={projects ? `across ${projects.length} projects` : ''}
            color="#f59e0b" loading={loading} delay={0.1}
          />
        </div>

        {/* Model + Operations side by side on desktop, stacked on mobile */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}>
          <ModelBar data={summary?.by_model} loading={loading} />
          <OperationBreakdown data={summary?.by_operation} loading={loading} />
        </div>

        {/* Timeline */}
        <div style={{ marginBottom: 20 }}>
          <Timeline data={timeline} loading={loading} />
        </div>

        {/* Project table */}
        <ProjectTable data={projects} loading={loading} />
      </div>

      <style>{`
        @keyframes grow-up {
          from { transform: scaleY(0); transform-origin: bottom; }
          to { transform: scaleY(1); transform-origin: bottom; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.25; }
        }
        @media (max-width: 640px) {
          .admin-table-desktop { display: none !important; }
          .admin-table-mobile { display: block !important; }
        }
      `}</style>
    </div>
  );
}
