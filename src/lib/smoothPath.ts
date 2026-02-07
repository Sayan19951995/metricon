// Converts array of points to smooth SVG path using Catmull-Rom to Bezier conversion
export function getSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';

  const path = [`M ${points[0].x},${points[0].y}`];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Control points using Catmull-Rom to Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }

  return path.join(' ');
}

// Converts array of points to smooth filled area path
export function getSmoothAreaPath(
  points: { x: number; y: number }[],
  bottomY: number,
  startX: number,
  endX: number
): string {
  if (points.length < 2) return '';

  const linePath = getSmoothPath(points);
  return `${linePath} L ${endX},${bottomY} L ${startX},${bottomY} Z`;
}
