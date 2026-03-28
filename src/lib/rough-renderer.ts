import type { RoughSVG } from "roughjs/bin/svg";
import rough from "roughjs";

export interface SketchOptions {
  /** How "sketchy" the lines are. 0 = straight, 2 = very rough. Default 1.2 */
  roughness?: number;
  /** How curvy straight lines are. 0 = straight, 1 = default. */
  bowing?: number;
  /** Stroke color. Default '#1c1917' */
  stroke?: string;
  /** Stroke width. Default 1.5 */
  strokeWidth?: number;
  /** Border radius. Default 12 */
  radius?: number;
  /** Fill color (for filled elements like primary buttons). Default undefined */
  fill?: string;
  /** Fill style: 'solid' | 'hachure' | 'cross-hatch' | 'zigzag'. Default undefined */
  fillStyle?: string;
  /** Random seed for deterministic rendering. Default auto */
  seed?: number;
}

const DEFAULT_OPTIONS: Required<
  Pick<SketchOptions, "roughness" | "stroke" | "strokeWidth" | "radius">
> = {
  roughness: 1.2,
  stroke: "#1c1917",
  strokeWidth: 1.5,
  radius: 12,
};

/** Build an SVG path string for a rounded rectangle.
 *  Uses cubic bezier curves instead of arcs for smoother rough.js rendering. */
export function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): string {
  r = Math.min(r, w / 2, h / 2);
  const k = r * 0.5522847498;
  const right = x + w;
  const bottom = y + h;
  return [
    `M${x + r},${y}`,
    `L${right - r},${y}`,
    `C${right - r + k},${y} ${right},${y + r - k} ${right},${y + r}`,
    `L${right},${bottom - r}`,
    `C${right},${bottom - r + k} ${right - r + k},${bottom} ${right - r},${bottom}`,
    `L${x + r},${bottom}`,
    `C${x + r - k},${bottom} ${x},${bottom - r + k} ${x},${bottom - r}`,
    `L${x},${y + r}`,
    `C${x},${y + r - k} ${x + r - k},${y} ${x + r},${y}`,
  ].join(" ");
}

/** Sample a cubic bezier curve at parameter t */
function bezierPoint(
  t: number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number]
): [number, number] {
  const mt = 1 - t;
  return [
    mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0],
    mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1],
  ];
}

/** Sample points along a rounded rectangle for use with rc.curve().
 *  Returns a closed loop of points (last point === first point + overlap for smooth closure). */
export function sampleRoundedRect(
  x: number, y: number, w: number, h: number, r: number,
  pointsPerCorner = 8, pointsPerEdge = 3,
): [number, number][] {
  r = Math.min(r, w / 2, h / 2);
  const k = r * 0.5522847498;
  const right = x + w;
  const bottom = y + h;
  const pts: [number, number][] = [];

  // Helper: add evenly spaced points on a line (excluding start)
  function addLine(x1: number, y1: number, x2: number, y2: number) {
    for (let i = 1; i <= pointsPerEdge; i++) {
      const t = i / (pointsPerEdge + 1);
      pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
    }
    pts.push([x2, y2]); // endpoint
  }

  // Helper: add bezier curve points (excluding start)
  function addCorner(
    p0: [number, number], p1: [number, number],
    p2: [number, number], p3: [number, number],
  ) {
    for (let i = 1; i <= pointsPerCorner; i++) {
      pts.push(bezierPoint(i / pointsPerCorner, p0, p1, p2, p3));
    }
  }

  // Start point
  pts.push([x + r, y]);

  // Top edge → Top-right corner
  addLine(x + r, y, right - r, y);
  addCorner([right - r, y], [right - r + k, y], [right, y + r - k], [right, y + r]);

  // Right edge → Bottom-right corner
  addLine(right, y + r, right, bottom - r);
  addCorner([right, bottom - r], [right, bottom - r + k], [right - r + k, bottom], [right - r, bottom]);

  // Bottom edge → Bottom-left corner
  addLine(right - r, bottom, x + r, bottom);
  addCorner([x + r, bottom], [x + r - k, bottom], [x, bottom - r + k], [x, bottom - r]);

  // Left edge → Top-left corner
  addLine(x, bottom - r, x, y + r);
  addCorner([x, y + r], [x, y + r - k], [x + r - k, y], [x + r, y]);

  // Overlap first few points for smooth closure
  pts.push(pts[1], pts[2], pts[3]);

  return pts;
}

/** Build an SVG path using only L commands (no C bezier).
 *  This ensures preserveVertices works on ALL endpoints,
 *  since rough.js's _bezierTo ignores preserveVertices. */
export function roundedRectLinePath(
  x: number, y: number, w: number, h: number, r: number,
  pointsPerCorner = 12, pointsPerEdge = 3,
): string {
  const pts = sampleRoundedRect(x, y, w, h, r, pointsPerCorner, pointsPerEdge);
  // Remove the overlap closure points (last 3)
  let d = `M${pts[0][0]},${pts[0][1]}`;
  const end = pts.length - 3; // skip overlap points
  for (let i = 1; i < end; i++) {
    d += ` L${pts[i][0]},${pts[i][1]}`;
  }
  return d;
}

/** Create an SVG element positioned as an overlay */
export function createOverlaySvg(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:visible;";
  svg.setAttribute("data-sketch", "overlay");
  return svg;
}

/** Remove existing sketch overlays from an element (direct children only,
 *  so we don't accidentally remove overlays from nested sketch elements). */
export function clearSketchOverlays(el: HTMLElement) {
  for (const child of Array.from(el.children)) {
    if (child.getAttribute("data-sketch") === "overlay") child.remove();
  }
}

/** Draw a rough rounded rectangle border on the element */
export function drawSketchBorder(
  el: HTMLElement,
  options?: SketchOptions
): SVGSVGElement {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { width, height } = el.getBoundingClientRect();
  if (width === 0 || height === 0) return createOverlaySvg();

  const svg = createOverlaySvg();
  const rc = rough.svg(svg);

  const pad = 1;
  const seed = opts.seed ?? Math.floor(Math.random() * 10000);
  const shortEdge = Math.min(width, height);
  const isSmall = shortEdge < 60;

  // Small elements: bezier C commands give smooth rounded corners.
  //   _bezierTo's spike from ignoring preserveVertices is tiny at small scale.
  // Large elements: L-only commands avoid visible _bezierTo spikes at corners.
  const d = isSmall
    ? roundedRectPath(pad, pad, width - pad * 2, height - pad * 2, opts.radius)
    : roundedRectLinePath(pad, pad, width - pad * 2, height - pad * 2, opts.radius, 12,
        shortEdge < 150 ? 2 : 3);

  svg.appendChild(
    rc.path(d, {
      stroke: opts.stroke,
      strokeWidth: opts.strokeWidth,
      roughness: opts.roughness,
      bowing: opts.bowing ?? (isSmall ? 0.5 : 0.6),
      seed,
      preserveVertices: true,
      fill: opts.fill,
      fillStyle: opts.fillStyle as any,
      fillWeight: opts.fill ? 1 : undefined,
      hachureGap: opts.fill ? 4 : undefined,
    })
  );

  return svg;
}

/** Draw a rough line */
export function drawSketchLine(
  svg: SVGSVGElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: SketchOptions
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rc = rough.svg(svg);
  svg.appendChild(
    rc.line(x1, y1, x2, y2, {
      stroke: opts.stroke,
      strokeWidth: opts.strokeWidth,
      roughness: opts.roughness,
      seed: opts.seed ?? Math.floor(Math.random() * 10000),
    })
  );
}

/** Draw a rough circle */
export function drawSketchCircle(
  svg: SVGSVGElement,
  cx: number,
  cy: number,
  diameter: number,
  options?: SketchOptions
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rc = rough.svg(svg);
  svg.appendChild(
    rc.circle(cx, cy, diameter, {
      stroke: opts.stroke,
      strokeWidth: opts.strokeWidth,
      roughness: opts.roughness,
      seed: opts.seed ?? Math.floor(Math.random() * 10000),
      fill: opts.fill,
      fillStyle: (opts.fillStyle as any) ?? "solid",
    })
  );
}

/** Auto-detect shadcn component type from DOM element */
export type ShadcnComponentType =
  | "card"
  | "button"
  | "badge"
  | "input"
  | "table"
  | "tabs"
  | "alert"
  | "dialog"
  | "separator"
  | "unknown";

export function detectComponentType(el: HTMLElement): ShadcnComponentType {
  // shadcn v2+ uses data-slot
  const slot = el.getAttribute("data-slot");
  if (slot) {
    const slotMap: Record<string, ShadcnComponentType> = {
      card: "card",
      button: "button",
      badge: "badge",
      input: "input",
      table: "table",
      "tabs-list": "tabs",
      alert: "alert",
      "alert-dialog-content": "dialog",
      "dialog-content": "dialog",
      separator: "separator",
    };
    if (slot in slotMap) return slotMap[slot];
  }

  // Fallback: class-based detection
  const cl = el.className;
  if (typeof cl !== "string") return "unknown";

  if (cl.includes("rounded-xl") && cl.includes("border")) return "card";
  if (el.tagName === "BUTTON" && cl.includes("inline-flex")) return "button";
  if (cl.includes("rounded-full") && cl.includes("border")) return "badge";
  if (el.tagName === "INPUT" && cl.includes("border")) return "input";
  if (el.tagName === "TABLE") return "table";
  if (cl.includes("rounded-lg") && cl.includes("border") && cl.includes("p-4"))
    return "alert";

  return "unknown";
}

/** Get appropriate sketch options for a component type */
export function getOptionsForType(
  type: ShadcnComponentType,
  el: HTMLElement
): SketchOptions {
  switch (type) {
    case "card":
      return { radius: 12, roughness: 1.2, bowing: 0.5 };
    case "button": {
      const isPrimary =
        el.classList.contains("bg-primary") ||
        el.getAttribute("data-variant") === "default";
      if (isPrimary) {
        return {
          radius: 6,
          roughness: 1,
          fill: "#1c1917",
          fillStyle: "cross-hatch",
        };
      }
      return { radius: 6, roughness: 0.8 };
    }
    case "badge":
      return { radius: 10, roughness: 0.8, strokeWidth: 1.2 };
    case "input":
      return { radius: 6, roughness: 0.8 };
    case "table":
      return { radius: 4, roughness: 0.6, bowing: 0.3 };
    case "tabs":
      return { radius: 6, roughness: 0.6, bowing: 0.3 };
    case "alert":
      return { radius: 8, roughness: 1, bowing: 0.5 };
    case "dialog":
      return { radius: 12, roughness: 1, bowing: 0.5 };
    case "separator":
      return { roughness: 1 };
    default:
      return {};
  }
}
