// Canvas-drawable icons to replace emojis
// Each icon is a function that draws on a canvas context at (0,0) within a given size

export function drawIcon(ctx, iconName, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const s = size * 0.5; // half-size for centering

  const drawFn = ICONS[iconName] || ICONS.box;
  drawFn(ctx, s);

  ctx.restore();
}

const ICONS = {
  // Database - cylinder
  database: (ctx, s) => {
    const w = s * 0.7, h = s * 0.85, ey = s * 0.22;
    ctx.beginPath();
    ctx.ellipse(0, -h + ey, w, ey, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w, -h + ey);
    ctx.lineTo(-w, h - ey);
    ctx.ellipse(0, h - ey, w, ey, 0, Math.PI, 0, true);
    ctx.lineTo(w, -h + ey);
    ctx.stroke();
    // middle line
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.15, w, ey * 0.8, 0, 0, Math.PI);
    ctx.stroke();
  },

  // Key/Lock - auth
  key: (ctx, s) => {
    const r = s * 0.3;
    ctx.beginPath();
    ctx.arc(-s * 0.2, -s * 0.15, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.2 + r, -s * 0.15);
    ctx.lineTo(s * 0.6, -s * 0.15);
    ctx.lineTo(s * 0.6, s * 0.1);
    ctx.moveTo(s * 0.4, -s * 0.15);
    ctx.lineTo(s * 0.4, s * 0.05);
    ctx.stroke();
  },

  // Home - feed
  home: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.65);
    ctx.lineTo(-s * 0.6, -s * 0.1);
    ctx.lineTo(-s * 0.45, -s * 0.1);
    ctx.lineTo(-s * 0.45, s * 0.5);
    ctx.lineTo(s * 0.45, s * 0.5);
    ctx.lineTo(s * 0.45, -s * 0.1);
    ctx.lineTo(s * 0.6, -s * 0.1);
    ctx.closePath();
    ctx.stroke();
    // door
    ctx.beginPath();
    ctx.moveTo(-s * 0.15, s * 0.5);
    ctx.lineTo(-s * 0.15, s * 0.15);
    ctx.lineTo(s * 0.15, s * 0.15);
    ctx.lineTo(s * 0.15, s * 0.5);
    ctx.stroke();
  },

  // Image/camera - posts
  image: (ctx, s) => {
    const w = s * 0.7, h = s * 0.55, r = s * 0.08;
    // Rounded rect
    ctx.beginPath();
    ctx.moveTo(-w + r, -h);
    ctx.lineTo(w - r, -h);
    ctx.quadraticCurveTo(w, -h, w, -h + r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(-w + r, h);
    ctx.quadraticCurveTo(-w, h, -w, h - r);
    ctx.lineTo(-w, -h + r);
    ctx.quadraticCurveTo(-w, -h, -w + r, -h);
    ctx.stroke();
    // Mountain
    ctx.beginPath();
    ctx.moveTo(-w + s * 0.05, h * 0.7);
    ctx.lineTo(-s * 0.2, -h * 0.1);
    ctx.lineTo(s * 0.05, h * 0.3);
    ctx.lineTo(s * 0.25, h * 0.0);
    ctx.lineTo(w - s * 0.05, h * 0.7);
    ctx.stroke();
    // Sun
    ctx.beginPath();
    ctx.arc(s * 0.35, -h * 0.4, s * 0.12, 0, Math.PI * 2);
    ctx.stroke();
  },

  // User - profiles
  user: (ctx, s) => {
    // Head
    ctx.beginPath();
    ctx.arc(0, -s * 0.25, s * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    // Body
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, s * 0.6);
    ctx.quadraticCurveTo(-s * 0.5, s * 0.1, 0, s * 0.1);
    ctx.quadraticCurveTo(s * 0.5, s * 0.1, s * 0.5, s * 0.6);
    ctx.stroke();
  },

  // Bell - notifications
  bell: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, s * 0.25);
    ctx.quadraticCurveTo(-s * 0.45, -s * 0.55, 0, -s * 0.55);
    ctx.quadraticCurveTo(s * 0.45, -s * 0.55, s * 0.45, s * 0.25);
    ctx.lineTo(-s * 0.45, s * 0.25);
    ctx.stroke();
    // top
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.55);
    ctx.lineTo(0, -s * 0.7);
    ctx.stroke();
    // bottom
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, s * 0.3);
    ctx.lineTo(s * 0.55, s * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, s * 0.38, s * 0.12, 0, Math.PI);
    ctx.stroke();
  },

  // Folder - media/storage
  folder: (ctx, s) => {
    const w = s * 0.65, h = s * 0.5;
    ctx.beginPath();
    ctx.moveTo(-w, -h * 0.6);
    ctx.lineTo(-w * 0.3, -h * 0.6);
    ctx.lineTo(-w * 0.1, -h);
    ctx.lineTo(w, -h);
    ctx.lineTo(w, h);
    ctx.lineTo(-w, h);
    ctx.closePath();
    ctx.stroke();
  },

  // Search - magnifier
  search: (ctx, s) => {
    const r = s * 0.35;
    ctx.beginPath();
    ctx.arc(-s * 0.08, -s * 0.08, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.6, r * 0.6);
    ctx.lineTo(s * 0.55, s * 0.55);
    ctx.stroke();
  },

  // Mail - email
  mail: (ctx, s) => {
    const w = s * 0.65, h = s * 0.45;
    ctx.beginPath();
    ctx.rect(-w, -h, w * 2, h * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w, -h);
    ctx.lineTo(0, s * 0.05);
    ctx.lineTo(w, -h);
    ctx.stroke();
  },

  // Fallback box
  box: (ctx, s) => {
    const half = s * 0.5;
    ctx.beginPath();
    ctx.rect(-half, -half, half * 2, half * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(0, half);
    ctx.moveTo(-half, 0);
    ctx.lineTo(half, 0);
    ctx.stroke();
  },
};

// Map emoji/concept IDs to icon names
export const CONCEPT_ICON_MAP = {
  'auth': 'key',
  'feed': 'home',
  'posts': 'image',
  'profiles': 'user',
  'notifications': 'bell',
  'media': 'folder',
  'search': 'search',
  'database': 'database',
  'email': 'mail',
};

export function getIconForNode(node) {
  // Try concept ID first
  if (CONCEPT_ICON_MAP[node.id]) return CONCEPT_ICON_MAP[node.id];
  // Default
  return 'box';
}
