// Mock codebase data — Instagram-clone-ish app.
// 12 concepts laid out across 3 architectural layers, with a canonical reading order.
// Layer 0 = entry/shell, 1 = UI/feature, 2 = logic/services, 3 = data/infra.

const CONCEPT_COLORS = {
  teal:   { fill: '#D6E0D3', stroke: '#6E8A6A', text: '#2E3F2C', accent: '#6E8A6A' },
  purple: { fill: '#E3D5D9', stroke: '#9A6B78', text: '#3E2228', accent: '#9A6B78' },
  coral:  { fill: '#E8D6CD', stroke: '#A0614F', text: '#43251B', accent: '#A0614F' },
  blue:   { fill: '#D8DCE2', stroke: '#6B7F8C', text: '#26323A', accent: '#6B7F8C' },
  amber:  { fill: '#E0DACB', stroke: '#9A8F65', text: '#40381C', accent: '#9A8F65' },
  green:  { fill: '#D3D8CD', stroke: '#7F8A6E', text: '#2E3326', accent: '#7F8A6E' },
  gray:   { fill: '#E1DCD2', stroke: '#857D6A', text: '#2F2B22', accent: '#857D6A' },
};

// Order = canonical reading order (1..N). Layer = architectural band.
const CONCEPTS = [
  { id: 'app',      name: 'App Shell',          order: 1,  layer: 0, color: 'gray',   fileCount: 4,  summary: 'Entry point. Sets up routing, theme, auth context, and the shared layout frame every screen renders inside of.', importance: 'critical' },
  { id: 'router',   name: 'Routing',            order: 2,  layer: 0, color: 'gray',   fileCount: 3,  summary: 'React Router v6 configuration. Maps URLs → screens and protects private routes behind the session guard.', importance: 'important' },
  { id: 'auth',     name: 'Authentication',     order: 3,  layer: 1, color: 'coral',  fileCount: 6,  summary: 'Sign up, log in, password reset, session token refresh, and the guard hook that other screens check.', importance: 'critical' },
  { id: 'feed',     name: 'Feed',               order: 4,  layer: 1, color: 'teal',   fileCount: 8,  summary: 'The main timeline screen. Infinite scroll, optimistic likes, pull-to-refresh, and the post card component.', importance: 'critical' },
  { id: 'profile',  name: 'Profile',            order: 5,  layer: 1, color: 'purple', fileCount: 5,  summary: 'User profile page. Grid of their posts, follower/following counts, and the edit-profile modal.', importance: 'important' },
  { id: 'composer', name: 'Post Composer',      order: 6,  layer: 1, color: 'amber',  fileCount: 4,  summary: 'The "new post" flow. Image picker, caption editor, filter carousel, and upload progress UI.', importance: 'important' },
  { id: 'chat',     name: 'Messaging',          order: 7,  layer: 1, color: 'blue',   fileCount: 7,  summary: 'Direct-message screens. Conversation list, thread view, typing indicators, and presence.', importance: 'supporting' },
  { id: 'api',      name: 'API Client',         order: 8,  layer: 2, color: 'blue',   fileCount: 5,  summary: 'Typed fetch wrapper. Adds auth headers, retries on 401, handles rate limits, and shapes errors.', importance: 'critical' },
  { id: 'state',    name: 'State Store',        order: 9,  layer: 2, color: 'green',  fileCount: 4,  summary: 'Zustand slices for session, feed cache, composer draft, and UI state. One store, typed selectors.', importance: 'important' },
  { id: 'media',    name: 'Media Pipeline',     order: 10, layer: 2, color: 'amber',  fileCount: 3,  summary: 'Client-side image resize, compression, and filter application before upload. Uses OffscreenCanvas.', importance: 'supporting' },
  { id: 'db',       name: 'Database',           order: 11, layer: 3, color: 'purple', fileCount: 4,  summary: 'Postgres schemas, migrations, and the query builder. Users, posts, likes, follows, messages.', importance: 'critical' },
  { id: 'storage',  name: 'Object Storage',     order: 12, layer: 3, color: 'coral',  fileCount: 2,  summary: 'S3-compatible blob storage for images and video. Signed URLs, CDN integration, cleanup jobs.', importance: 'supporting' },
];

// Sub-concepts per parent — shown on expansion.
const SUB_CONCEPTS = {
  auth: [
    { id: 'auth.login', name: 'Login Form', fileCount: 2, summary: 'Email/password form with validation.' },
    { id: 'auth.signup', name: 'Sign-Up Flow', fileCount: 2, summary: 'Multi-step signup with verification email.' },
    { id: 'auth.session', name: 'Session', fileCount: 1, summary: 'Token storage, refresh loop, logout.' },
    { id: 'auth.guard', name: 'Route Guard', fileCount: 1, summary: 'Redirects to /login if no session.' },
  ],
  feed: [
    { id: 'feed.timeline', name: 'Timeline', fileCount: 3, summary: 'Infinite scroll list container.' },
    { id: 'feed.card', name: 'Post Card', fileCount: 2, summary: 'Individual post with like/comment.' },
    { id: 'feed.comments', name: 'Comments', fileCount: 2, summary: 'Inline comment thread.' },
    { id: 'feed.like', name: 'Like Button', fileCount: 1, summary: 'Optimistic like with haptic.' },
  ],
  api: [
    { id: 'api.client', name: 'Fetch Wrapper', fileCount: 2, summary: 'Adds auth headers, parses JSON.' },
    { id: 'api.retry', name: 'Retry Logic', fileCount: 1, summary: 'Exponential backoff on 5xx.' },
    { id: 'api.errors', name: 'Error Shaping', fileCount: 1, summary: 'Normalizes errors across endpoints.' },
    { id: 'api.types', name: 'Types', fileCount: 1, summary: 'TS types generated from OpenAPI.' },
  ],
  db: [
    { id: 'db.schema', name: 'Schema', fileCount: 1, summary: 'Table definitions.' },
    { id: 'db.migrations', name: 'Migrations', fileCount: 1, summary: 'Versioned migration files.' },
    { id: 'db.queries', name: 'Query Builder', fileCount: 1, summary: 'Typed query helpers.' },
    { id: 'db.seeds', name: 'Seeds', fileCount: 1, summary: 'Dev-only fixture data.' },
  ],
};

// Directed edges — source → target with a short relationship label.
const EDGES = [
  { source: 'app',      target: 'router',   label: 'mounts' },
  { source: 'app',      target: 'auth',     label: 'provides session' },
  { source: 'app',      target: 'state',    label: 'hydrates' },
  { source: 'router',   target: 'feed',     label: 'routes to' },
  { source: 'router',   target: 'profile',  label: 'routes to' },
  { source: 'router',   target: 'composer', label: 'routes to' },
  { source: 'router',   target: 'chat',     label: 'routes to' },
  { source: 'auth',     target: 'api',      label: 'uses' },
  { source: 'feed',     target: 'api',      label: 'fetches from' },
  { source: 'feed',     target: 'state',    label: 'reads/writes' },
  { source: 'profile',  target: 'api',      label: 'fetches from' },
  { source: 'composer', target: 'media',    label: 'processes via' },
  { source: 'composer', target: 'api',      label: 'uploads via' },
  { source: 'chat',     target: 'api',      label: 'streams from' },
  { source: 'chat',     target: 'state',    label: 'subscribes' },
  { source: 'api',      target: 'db',       label: 'queries' },
  { source: 'media',    target: 'storage',  label: 'writes to' },
  { source: 'api',      target: 'storage',  label: 'reads from' },
];

window.CONCEPT_COLORS = CONCEPT_COLORS;
window.CONCEPTS = CONCEPTS;
window.SUB_CONCEPTS = SUB_CONCEPTS;
window.EDGES = EDGES;
