// Mock graph data for the landing page hero — 5 clusters, ~42 nodes, ~58 edges

export const clusterColors = {
  auth:  { node: '#06b6d4', glow: 'rgba(6,182,212,0.6)',   bg: 'rgba(6,182,212,0.12)' },
  api:   { node: '#8b5cf6', glow: 'rgba(139,92,246,0.6)',  bg: 'rgba(139,92,246,0.12)' },
  data:  { node: '#10b981', glow: 'rgba(16,185,129,0.6)',  bg: 'rgba(16,185,129,0.12)' },
  ui:    { node: '#f59e0b', glow: 'rgba(245,158,11,0.6)',  bg: 'rgba(245,158,11,0.12)' },
  infra: { node: '#ec4899', glow: 'rgba(236,72,153,0.6)',  bg: 'rgba(236,72,153,0.12)' },
};

function cluster(group, count, baseSize) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${group}-${i}`,
    group,
    size: baseSize + Math.random() * 8,
  }));
}

export const heroNodes = [
  // Central hub nodes (larger)
  { id: 'auth-hub', group: 'auth', size: 18 },
  { id: 'api-hub',  group: 'api',  size: 20 },
  { id: 'data-hub', group: 'data', size: 17 },
  { id: 'ui-hub',   group: 'ui',   size: 19 },
  { id: 'infra-hub', group: 'infra', size: 16 },
  // Cluster members
  ...cluster('auth', 7, 5),
  ...cluster('api', 8, 5),
  ...cluster('data', 7, 5),
  ...cluster('ui', 9, 4),
  ...cluster('infra', 6, 5),
];

// Intra-cluster edges (each member connects to its hub)
const intraEdges = heroNodes
  .filter(n => !n.id.endsWith('-hub'))
  .map(n => ({ source: n.id, target: `${n.group}-hub` }));

// Inter-cluster edges (hubs connect to each other + a few cross-links)
const interEdges = [
  { source: 'auth-hub', target: 'api-hub' },
  { source: 'api-hub',  target: 'data-hub' },
  { source: 'data-hub', target: 'ui-hub' },
  { source: 'ui-hub',   target: 'infra-hub' },
  { source: 'infra-hub', target: 'auth-hub' },
  { source: 'auth-hub', target: 'data-hub' },
  { source: 'api-hub',  target: 'ui-hub' },
  // Cross-cluster connections for visual interest
  { source: 'auth-2', target: 'api-3' },
  { source: 'data-1', target: 'ui-4' },
  { source: 'infra-2', target: 'api-5' },
  { source: 'ui-3', target: 'data-4' },
  { source: 'auth-5', target: 'infra-3' },
];

export const heroEdges = [...intraEdges, ...interEdges];

// Cluster center positions (normalized 0-1, will be scaled to canvas)
export const clusterCenters = {
  auth:  { x: 0.25, y: 0.3 },
  api:   { x: 0.75, y: 0.25 },
  data:  { x: 0.5,  y: 0.55 },
  ui:    { x: 0.2,  y: 0.72 },
  infra: { x: 0.8,  y: 0.7 },
};
