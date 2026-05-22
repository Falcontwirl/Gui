import { CONCEPT_COLORS } from '../../data/sampleData';

// Adapt the warm/muted CONCEPT_COLORS for dark video backgrounds.
// stroke values read well on dark; fill becomes a low-opacity glow.
export const DARK_CONCEPT_COLORS = Object.fromEntries(
  Object.entries(CONCEPT_COLORS).map(([key, val]) => [
    key,
    {
      primary: val.stroke,
      glow: val.stroke + '26', // 15% opacity
      dimmed: val.stroke + '66', // 40% opacity
      text: '#e2e8f0',
    },
  ])
);

export const CATEGORY_COLORS = {
  architecture: '#6366f1',
  risk: '#f43f5e',
  pattern: '#6366f1',
  praise: '#10b981',
  suggestion: '#f59e0b',
  complexity: '#06b6d4',
};

export const SCENE_BG = '#0a0a14';
export const SURFACE = '#12131f';
export const ELEVATED = '#1a1b2e';
export const TEXT_PRIMARY = '#e2e8f0';
export const TEXT_SECONDARY = '#94a3b8';
export const TEXT_TERTIARY = '#64748b';
export const ACCENT = '#6366f1';
export const BORDER_SUBTLE = 'rgba(255, 255, 255, 0.06)';
