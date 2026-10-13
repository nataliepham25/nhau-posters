import type { Ribbon, Surface, Wave } from "./types";

// SVG path data for shapes drawn centered on the origin. The renderer moves
// and rotates them into place with a transform.

const n = (value: number) => Math.round(value * 10) / 10;

/**
 * A pointed leaf lying along the x axis, `width` long and about `height`
 * thick. `curvature` (-1 to 1) shifts the two bulges in opposite directions
 * so the leaf looks hand-drawn rather than symmetrical.
 */
export function leafPath(width: number, height: number, curvature = 0): string {
  const hw = width / 2;
  const k = curvature * hw * 0.6;
  return `M ${n(-hw)} 0 Q ${n(k)} ${n(-height)} ${n(hw)} 0 Q ${n(-k)} ${n(height)} ${n(-hw)} 0 Z`;
}

/** A lens-shaped petal along the y axis, pointed at both ends. */
export function petalPath(width: number, height: number): string {
  const hw = width / 2;
  const hh = height / 2;
  return [
    `M 0 ${n(-hh)}`,
    `C ${n(hw)} ${n(-hh / 2)} ${n(hw)} ${n(hh / 2)} 0 ${n(hh)}`,
    `C ${n(-hw)} ${n(hh / 2)} ${n(-hw)} ${n(-hh / 2)} 0 ${n(-hh)}`,
    "Z",
  ].join(" ");
}

/**
 * A full-width form whose flat bottom sits at +height/2 and whose top is a
 * gentle curve peaking at `height`. `curvature` (-1 to 1) tilts it and moves
 * the peak sideways, like a horizon.
 */
export function horizonPath(width: number, height: number, curvature = 0): string {
  const hw = width / 2;
  const bottom = height / 2;
  // Heights above the bottom edge at the left and right sides.
  const left = height * (0.7 + 0.25 * curvature);
  const right = height * (0.7 - 0.25 * curvature);
  // Quadratic control point placed so the curve's midpoint reaches `height`.
  const control = (4 * height - left - right) / 2;
  return [
    `M ${n(-hw)} ${n(bottom)}`,
    `L ${n(-hw)} ${n(bottom - left)}`,
    `Q ${n(curvature * hw * 0.5)} ${n(bottom - control)} ${n(hw)} ${n(bottom - right)}`,
    `L ${n(hw)} ${n(bottom)}`,
    "Z",
  ].join(" ");
}

const SAMPLES = 24;

type Point = [number, number];

/** A smooth curve through the points (Catmull-Rom converted to cubic Béziers). */
function smoothThrough(points: Point[]): string {
  let d = "";
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [points[i - 1] ?? points[i], points[i], points[i + 1], points[i + 2] ?? points[i + 1]];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d;
}

function waveAt(waves: Wave[], u: number): number {
  return waves.reduce((sum, w) => sum + w.amplitude * Math.sin(w.frequency * Math.PI * u + w.phase), 0);
}

/**
 * A full-width layer: flat bottom at +height/2, and a top edge at -height/2
 * that tilts, lifts at the sides (meniscus) and ripples with soft waves.
 */
export function surfacePath(width: number, height: number, surface: Surface): string {
  const hw = width / 2;
  const slope = Math.tan((surface.tilt * Math.PI) / 180);
  const top: Point[] = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const u = (i / SAMPLES) * 2 - 1; // -1 at the left edge, 1 at the right
    const x = u * hw;
    const y = -height / 2 + slope * x - surface.meniscus * u ** 4 + waveAt(surface.waves, u);
    return [x, y];
  });
  return `M ${n(-hw)} ${n(height / 2)} L ${n(top[0][0])} ${n(top[0][1])}${smoothThrough(top)} L ${n(hw)} ${n(height / 2)} Z`;
}

/** A full-width ribbon whose centerline sways and whose thickness swells and thins. */
export function ribbonPath(width: number, ribbon: Ribbon): string {
  const hw = width / 2;
  const slope = Math.tan((ribbon.tilt * Math.PI) / 180);
  const [thin, thick] = ribbon.thickness;
  const samples = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const u = (i / SAMPLES) * 2 - 1;
    const x = u * hw;
    const center = slope * x + waveAt([ribbon.wave], u);
    const half =
      (thin + (thick - thin) * (0.5 + 0.5 * Math.sin(1.7 * ribbon.wave.frequency * Math.PI * u + ribbon.wave.phase * 1.3))) / 2;
    return { x, upper: center - half, lower: center + half };
  });
  const upper: Point[] = samples.map((s) => [s.x, s.upper]);
  const lower: Point[] = samples.map((s): Point => [s.x, s.lower]).reverse();
  return `M ${n(upper[0][0])} ${n(upper[0][1])}${smoothThrough(upper)} L ${n(lower[0][0])} ${n(lower[0][1])}${smoothThrough(lower)} Z`;
}
