const TRANSITION_FRAMES = 15;

export function getSceneTimings(data, fps) {
  const { concepts = [], files = [], insights = [], edges = [] } = data;

  // Brief title intro
  const title = 3 * fps;

  // Data flow: longer to let the spotlight sweep through concepts
  const flowConceptCount = Math.min(concepts.length, 6);
  const dataFlow =
    flowConceptCount >= 2
      ? Math.min(10 * fps, 5 * fps + flowConceptCount * fps)
      : 0;

  // Architecture X-Ray: show file roles, complexity, hubs
  const xray =
    files.length > 0
      ? Math.min(8 * fps, 5 * fps + Math.floor(files.length / 15) * fps)
      : 0;

  // Insights scene (kept, but only if insights exist)
  const insightsScene =
    insights.length > 0
      ? Math.min(6 * fps, 4 * fps + Math.min(insights.length, 3) * 30)
      : 0;

  return { title, dataFlow, xray, insights: insightsScene };
}

export function getTotalDuration(data, fps) {
  const t = getSceneTimings(data, fps);
  const scenes = [t.title, t.dataFlow, t.xray, t.insights];
  const activeScenes = scenes.filter((d) => d > 0);

  const total = activeScenes.reduce((sum, d) => sum + d, 0);
  const transitions = Math.max(0, activeScenes.length - 1) * TRANSITION_FRAMES;

  return Math.max(fps, total - transitions); // at least 1 second
}

export const TRANSITION = TRANSITION_FRAMES;
