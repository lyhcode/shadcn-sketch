import type { RoughSVG } from "roughjs/bin/svg";
import rough from "roughjs";

export interface SketchOptions {
  /** How "sketchy" the lines are. 0 = straight, 2 = very rough. Default 1.2 */
  roughness?: number;
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

/** Build an SVG path string for a rounded rectangle */
export function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): string {
  r = Math.min(r, w / 2, h / 2);
  return `M${x + r},${y} L${x + w - r},${y} A${r},${r} 0 0 1 ${x + w},${y + r} L${x + w},${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} L${x + r},${y + h} A${r},${r} 0 0 1 ${x},${y + h - r} L${x},${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}

/** Create an SVG element positioned as an overlay */
export function createOverlaySvg(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:visible;";
  svg.setAttribute("data-sketch", "overlay");
  return svg;
}

/** Remove existing sketch overlays from an element */
export function clearSketchOverlays(el: HTMLElement) {
  el.querySelectorAll('[data-sketch="overlay"]').forEach((s) => s.remove());
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
  const d = roundedRectPath(pad, pad, width - pad * 2, height - pad * 2, opts.radius);

  svg.appendChild(
    rc.path(d, {
      stroke: opts.stroke,
      strokeWidth: opts.strokeWidth,
      roughness: opts.roughness,
      seed: opts.seed ?? Math.floor(Math.random() * 10000),
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
      return { radius: 12, roughness: 1.2 };
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
      return { radius: 4, roughness: 0.6 };
    case "tabs":
      return { radius: 6, roughness: 0.8 };
    case "alert":
      return { radius: 8, roughness: 1 };
    case "dialog":
      return { radius: 12, roughness: 1 };
    case "separator":
      return { roughness: 1 };
    default:
      return {};
  }
}
