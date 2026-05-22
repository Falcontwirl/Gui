import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { TEXT_PRIMARY } from '../lib/colors';

export default function AnimatedText({
  text,
  delay = 0,
  fontSize = 24,
  color = TEXT_PRIMARY,
  fontFamily = "'DM Sans', sans-serif",
  fontWeight = 400,
  style = {},
  translateY = 20,
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 100 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const y = interpolate(progress, [0, 1], [translateY, 0]);

  return (
    <div
      style={{
        fontSize,
        color,
        fontFamily,
        fontWeight,
        opacity,
        transform: `translateY(${y}px)`,
        ...style,
      }}
    >
      {text}
    </div>
  );
}
