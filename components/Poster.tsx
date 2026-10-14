import type { CSSProperties, ReactNode } from "react";
import { horizonPath, leafPath, petalPath, ribbonPath, surfacePath } from "@/lib/poster/geometry";
import type { Paint, PosterSpec, Shape } from "@/lib/poster/types";

type Props = {
  spec: PosterSpec;
  /**
   * Alt text, exposed as aria-label (not an SVG <title>, which browsers show
   * as a hover tooltip). When omitted, the poster is decorative and hidden
   * from assistive technology.
   */
  label?: string;
  className?: string;
  /**
   * Adds the ambient motion from each shape's animation hint (rising bubbles,
   * swaying leaves) and butterfly pea's shift to pink on hover. The CSS in
   * globals.css only runs it without prefers-reduced-motion.
   */
  live?: boolean;
  /**
   * Moves shapes with CSS instead of SVG attributes, so a regenerated spec
   * transitions smoothly from the previous one instead of jumping.
   */
  morph?: boolean;
  /** Prefix for SVG ids. Defaults to the spec id; set it when one page shows the same poster twice. */
  idPrefix?: string;
};

// Renders a PosterSpec as SVG. All design decisions live in
// lib/poster/generate.ts; this file only translates shapes into SVG elements.
export function Poster({ spec, label, className, live = false, morph = false, idPrefix = spec.id }: Props) {
  const ids = {
    background: `${idPrefix}-bg`,
    gradient: (paint: Exclude<Paint, string>) =>
      `${idPrefix}-g-${paint.from.slice(1)}-${paint.to.slice(1)}`,
    grain: `${idPrefix}-grain`,
    mottle: `${idPrefix}-mottle`,
  };

  const gradients = new Map<string, Exclude<Paint, string>>();
  for (const shape of spec.shapes) {
    if (typeof shape.fill !== "string") gradients.set(ids.gradient(shape.fill), shape.fill);
  }

  const { frame, texture } = spec;
  const keys = shapeKeys(spec.shapes);

  const paint = (fill: Paint) => (typeof fill === "string" ? fill : `url(#${ids.gradient(fill)})`);

  const accessibility = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true, focusable: false };

  return (
    <svg
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      xmlns="http://www.w3.org/2000/svg"
      className={[className, live && "poster-live", morph && "poster-morph"].filter(Boolean).join(" ") || undefined}
      {...accessibility}
    >
      <defs>
        <linearGradient id={ids.background} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={spec.background.top} />
          <stop offset="1" stopColor={spec.background.bottom} />
        </linearGradient>
        {[...gradients].map(([id, gradient]) => (
          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={gradient.from} />
            <stop offset="1" stopColor={gradient.to} />
          </linearGradient>
        ))}
        {/* Fine grain and broad mottling, desaturated and laid over the art. */}
        {[
          { id: ids.grain, frequency: texture.grain.frequency, octaves: 3 },
          { id: ids.mottle, frequency: texture.mottle.frequency, octaves: 2 },
        ].map(({ id, frequency, octaves }) => (
          <filter key={id} id={id} x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={frequency}
              numOctaves={octaves}
              seed={texture.seed}
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        ))}
      </defs>

      <rect width={spec.width} height={spec.height} fill={`url(#${ids.background})`} />

      {spec.shapes.map((shape, index) => {
        const transform = `translate(${shape.x} ${shape.y}) rotate(${shape.rotation})`;
        const body = renderShape(shape, paint(shape.fill), morph);
        return (
          <g
            key={keys[index]}
            className="poster-shape"
            transform={transform}
            style={morph ? { transform: `translate(${shape.x}px, ${shape.y}px) rotate(${shape.rotation}deg)` } : undefined}
            opacity={shape.opacity}
          >
            {live && shape.animation ? animate(shape, body, morph) : body}
          </g>
        );
      })}

      <rect
        width={spec.width}
        height={spec.height}
        filter={`url(#${ids.mottle})`}
        opacity={texture.mottle.opacity}
        style={{ mixBlendMode: "soft-light" }}
      />
      <rect
        width={spec.width}
        height={spec.height}
        filter={`url(#${ids.grain})`}
        opacity={texture.grain.opacity}
        style={{ mixBlendMode: "overlay" }}
      />

      {/* Drawn last so no shape or texture ever covers it. */}
      <rect
        data-frame=""
        x={frame.inset}
        y={frame.inset}
        width={spec.width - frame.inset * 2}
        height={spec.height - frame.inset * 2}
        fill="none"
        stroke={frame.color}
        strokeWidth={frame.strokeWidth}
        opacity={frame.opacity}
      />
    </svg>
  );
}

/**
 * Keys that follow an ingredient across regenerations ("lime-3" stays the
 * third lime shape), so React updates the same element and CSS can
 * transition it instead of redrawing.
 */
export function shapeKeys(shapes: Shape[]): string[] {
  const counts = new Map<string, number>();
  return shapes.map((shape) => {
    const owner = shape.ingredientId ?? shape.layer;
    const count = counts.get(owner) ?? 0;
    counts.set(owner, count + 1);
    return `${owner}-${count}`;
  });
}

/** Wraps a shape's body in the motion its animation hint describes. */
function animate(shape: Shape, body: ReactNode, morph: boolean): ReactNode {
  const hint = shape.animation!;
  const timing = (duration: number, delay: number) => ({
    "--duration": `${duration}s`,
    // Negative, so every shape starts mid-cycle and they never move in unison.
    "--delay": `${-delay}s`,
  });

  switch (hint.kind) {
    case "rise":
      return (
        <g className="poster-rise" style={{ "--rise": `${-hint.distance}px`, ...timing(hint.duration, hint.delay) } as CSSProperties}>
          {body}
        </g>
      );
    case "sway":
      return (
        <g
          className="poster-sway"
          style={
            {
              "--sway": `${hint.angle}deg`,
              ...timing(hint.duration, hint.delay),
              // Leaves pivot at their base, which sits at the left end of the path.
              transformOrigin: `${-shape.width / 2}px 0px`,
            } as CSSProperties
          }
        >
          {body}
        </g>
      );
    case "colorShift":
      // A copy in the target color, faded in on hover by CSS.
      return (
        <>
          {body}
          <g className="poster-shift">{renderShape(shape, hint.to, morph)}</g>
        </>
      );
  }
}

/**
 * Geometry as SVG attributes. With `morph`, it's repeated as CSS so it can
 * transition; browsers that can't animate a property (Safari and path `d`)
 * fall back to the attribute and simply jump.
 */
function geometry(attrs: Record<string, string | number>, morph: boolean) {
  if (!morph) return attrs;
  const style: Record<string, string> = {};
  for (const [name, value] of Object.entries(attrs)) {
    style[name] = name === "d" ? `path("${value}")` : typeof value === "number" ? `${value}px` : value;
  }
  return { ...attrs, style };
}

function renderShape(shape: Shape, fill: string, morph = false): ReactNode {
  const { width: w, height: h } = shape;
  const g = (attrs: Record<string, string | number>) => geometry(attrs, morph);

  switch (shape.type) {
    case "band":
      return <rect {...g({ x: -w / 2, y: -h / 2, width: w, height: h, rx: Math.min(h / 2, 6), fill })} />;
    case "softBand":
    case "stroke":
      return <rect {...g({ x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill })} />;
    case "wash":
      return <ellipse {...g({ rx: w / 2, ry: h / 2, fill })} />;
    case "horizon":
      return <path {...g({ d: horizonPath(w, h, shape.curvature), fill })} />;
    case "layer":
      return <path {...g({ d: surfacePath(w, h, shape.surface ?? { tilt: 0, meniscus: 0, waves: [] }), fill })} />;
    case "ribbon":
      return shape.ribbon ? <path {...g({ d: ribbonPath(w, shape.ribbon), fill })} /> : null;
    case "circle":
    case "dot":
      return <circle {...g({ r: w / 2, fill })} />;
    case "ring": {
      const stroke = shape.strokeWidth ?? 8;
      return <circle {...g({ r: w / 2 - stroke / 2, fill: "none", stroke: fill, strokeWidth: stroke })} />;
    }
    case "bubble":
      return (
        <circle {...g({ r: w / 2, fill, stroke: fill, strokeWidth: shape.strokeWidth ?? 1 })} fillOpacity={0.2} />
      );
    case "leaf":
      return <path {...g({ d: leafPath(w, h, shape.curvature), fill })} />;
    case "petal":
      return <path {...g({ d: petalPath(w, h), fill })} />;
  }
}
