import type { ReactNode } from "react";
import { horizonPath, leafPath, petalPath, ribbonPath, surfacePath } from "@/lib/poster/geometry";
import type { Paint, PosterSpec, Shape } from "@/lib/poster/types";

type Props = {
  spec: PosterSpec;
  /**
   * Alt text. When given, the poster is announced as an image with this
   * description; when omitted, it's treated as decorative and hidden from
   * assistive technology.
   */
  title?: string;
  className?: string;
};

// Renders a PosterSpec as static SVG. All design decisions live in
// lib/poster/generate.ts; this file only translates shapes into SVG elements.
export function Poster({ spec, title, className }: Props) {
  const ids = {
    title: `${spec.id}-title`,
    background: `${spec.id}-bg`,
    gradient: (paint: Exclude<Paint, string>) =>
      `${spec.id}-g-${paint.from.slice(1)}-${paint.to.slice(1)}`,
    grain: `${spec.id}-grain`,
    mottle: `${spec.id}-mottle`,
  };

  const gradients = new Map<string, Exclude<Paint, string>>();
  for (const shape of spec.shapes) {
    if (typeof shape.fill !== "string") gradients.set(ids.gradient(shape.fill), shape.fill);
  }

  const { frame, texture } = spec;

  const paint = (fill: Paint) => (typeof fill === "string" ? fill : `url(#${ids.gradient(fill)})`);

  const accessibility = title
    ? { role: "img", "aria-labelledby": ids.title }
    : { "aria-hidden": true, focusable: false };

  return (
    <svg
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...accessibility}
    >
      {title && <title id={ids.title}>{title}</title>}
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

      {spec.shapes.map((shape, index) => (
        <g
          key={index}
          transform={`translate(${shape.x} ${shape.y}) rotate(${shape.rotation})`}
          opacity={shape.opacity}
        >
          {renderShape(shape, paint(shape.fill))}
        </g>
      ))}

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

function renderShape(shape: Shape, fill: string): ReactNode {
  const { width: w, height: h } = shape;

  switch (shape.type) {
    case "band":
      return <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={Math.min(h / 2, 6)} fill={fill} />;
    case "softBand":
    case "stroke":
      return <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={fill} />;
    case "wash":
      return <ellipse rx={w / 2} ry={h / 2} fill={fill} />;
    case "horizon":
      return <path d={horizonPath(w, h, shape.curvature)} fill={fill} />;
    case "layer":
      return (
        <path d={surfacePath(w, h, shape.surface ?? { tilt: 0, meniscus: 0, waves: [] })} fill={fill} />
      );
    case "ribbon":
      return shape.ribbon ? <path d={ribbonPath(w, shape.ribbon)} fill={fill} /> : null;
    case "circle":
    case "dot":
      return <circle r={w / 2} fill={fill} />;
    case "ring": {
      const stroke = shape.strokeWidth ?? 8;
      return <circle r={w / 2 - stroke / 2} fill="none" stroke={fill} strokeWidth={stroke} />;
    }
    case "bubble":
      return (
        <circle
          r={w / 2}
          fill={fill}
          fillOpacity={0.2}
          stroke={fill}
          strokeWidth={shape.strokeWidth ?? 1}
        />
      );
    case "leaf":
      return <path d={leafPath(w, h, shape.curvature)} fill={fill} />;
    case "petal":
      return <path d={petalPath(w, h)} fill={fill} />;
  }
}
