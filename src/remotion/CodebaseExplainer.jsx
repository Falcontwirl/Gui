import { useVideoConfig, Series, useCurrentFrame, interpolate } from 'remotion';
import { getSceneTimings, TRANSITION } from './lib/sceneTiming';
import TitleScene from './scenes/TitleScene';
import DataFlowScene from './scenes/DataFlowScene';
import ArchitectureXRayScene from './scenes/ArchitectureXRayScene';
import InsightsScene from './scenes/InsightsScene';

function FadeWrapper({ children }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade in over first 15 frames, fade out over last 15 frames
  const opacity = interpolate(
    frame,
    [0, TRANSITION, durationInFrames - TRANSITION, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return <div style={{ width: '100%', height: '100%', opacity }}>{children}</div>;
}

export default function CodebaseExplainer({ projectMeta, concepts, conceptEdges, files, insights, explorationPath }) {
  const { fps } = useVideoConfig();
  const timings = getSceneTimings({ concepts, files, insights, edges: conceptEdges }, fps);

  const scenes = [];

  if (timings.title > 0) {
    scenes.push({ key: 'title', duration: timings.title, element: <TitleScene meta={projectMeta} /> });
  }
  if (timings.dataFlow > 0) {
    scenes.push({
      key: 'dataFlow',
      duration: timings.dataFlow,
      element: (
        <DataFlowScene
          concepts={concepts}
          edges={conceptEdges}
          explorationPath={explorationPath}
        />
      ),
    });
  }
  if (timings.xray > 0) {
    scenes.push({
      key: 'xray',
      duration: timings.xray,
      element: (
        <ArchitectureXRayScene
          files={files}
          concepts={concepts}
          edges={conceptEdges}
        />
      ),
    });
  }
  if (timings.insights > 0) {
    scenes.push({
      key: 'insights',
      duration: timings.insights,
      element: <InsightsScene insights={insights} meta={projectMeta} />,
    });
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a14',
        fontFamily: "'DM Sans', sans-serif",
        overflow: 'hidden',
      }}
    >
      <Series>
        {scenes.map((scene, i) => (
          <Series.Sequence
            key={scene.key}
            durationInFrames={scene.duration}
            offset={i > 0 ? -TRANSITION : 0}
          >
            <FadeWrapper>{scene.element}</FadeWrapper>
          </Series.Sequence>
        ))}
      </Series>
    </div>
  );
}
