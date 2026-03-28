"use client";

import React, { useEffect, useMemo, useRef, type ReactNode } from "react";
import { SketchContext, type SketchConfig } from "../hooks/use-sketch";
import {
  clearSketchOverlays,
  createOverlaySvg,
  detectComponentType,
  drawSketchBorder,
  drawSketchLine,
  getOptionsForType,
} from "../lib/rough-renderer";

interface SketchProviderProps {
  children: ReactNode;
  /** Enable/disable sketch mode */
  enabled?: boolean;
  /** Global roughness (0-3). Default 1.2 */
  roughness?: number;
  /** Stroke color. Default '#1c1917' */
  stroke?: string;
  /** Handwriting font. Default JasonHandwriting */
  fontFamily?: string;
  /** Seed for deterministic rendering */
  seed?: number;
}

/** CSS selectors for shadcn components that should get sketch borders */
const SKETCH_SELECTORS = [
  '[data-slot="card"]',
  '[data-slot="button"]',
  '[data-slot="badge"]',
  '[data-slot="input"]',
  '[data-slot="alert"]',
  '[data-slot="dialog-content"]',
  '[data-slot="separator"]',
  // Fallback class-based selectors
  ".rounded-xl.border.bg-card",
  "button.inline-flex.items-center",
  ".inline-flex.items-center.rounded-full.border",
  "input.flex.rounded-md.border",
  ".rounded-lg.border.p-4",
].join(", ");

/** Void elements cannot contain children – overlay must be a sibling */
const VOID_ELEMENTS = new Set([
  "INPUT", "IMG", "BR", "HR", "AREA", "COL", "EMBED",
  "LINK", "META", "SOURCE", "TRACK", "WBR",
]);

/** Check if SVG overlay must be placed as a sibling instead of a child.
 *  Needed for void elements and elements whose overflow would clip the SVG. */
function needsSiblingOverlay(el: HTMLElement): boolean {
  if (VOID_ELEMENTS.has(el.tagName)) return true;
  const overflow = getComputedStyle(el).overflow;
  return overflow !== "visible";
}

/** Remove sibling overlay placed after the element */
function removeSiblingOverlay(el: HTMLElement) {
  const next = el.nextElementSibling;
  if (next?.getAttribute("data-sketch") === "overlay") next.remove();
}

/** Place SVG as a sibling positioned over the element */
function insertSiblingOverlay(el: HTMLElement, svg: SVGSVGElement) {
  const parent = el.parentElement;
  if (!parent) return;
  if (getComputedStyle(parent).position === "static") {
    parent.style.position = "relative";
  }
  svg.style.cssText =
    `position:absolute;pointer-events:none;z-index:10;overflow:visible;`
    + `top:${el.offsetTop}px;left:${el.offsetLeft}px;`
    + `width:${el.offsetWidth}px;height:${el.offsetHeight}px;`;
  el.insertAdjacentElement("afterend", svg);
}

function applySketchToElement(el: HTMLElement, globalOpts: SketchConfig) {
  // Skip if already processed and not stale
  if (el.getAttribute("data-sketch-applied") === "true") return;

  const type = detectComponentType(el);
  if (type === "unknown") return;

  const useSibling = needsSiblingOverlay(el);

  // Clear old overlays
  clearSketchOverlays(el);
  if (useSibling) removeSiblingOverlay(el);

  // Get type-specific options merged with global
  const typeOpts = getOptionsForType(type, el);
  const mergedOpts = {
    ...typeOpts,
    roughness: globalOpts.roughness ?? typeOpts.roughness,
    stroke: globalOpts.stroke ?? typeOpts.stroke,
    seed: (globalOpts.seed ?? 42) + instanceCounter++,
  };

  if (type === "separator") {
    const svg = createOverlaySvg();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const isThin = h <= 10;
    const lineY = isThin ? 2 : h - 1;
    drawSketchLine(svg, 0, lineY, w, lineY, mergedOpts);
    if (useSibling) {
      insertSiblingOverlay(el, svg);
    } else {
      el.appendChild(svg);
    }
    // Must set AFTER placement — cssText in createOverlaySvg/insertSiblingOverlay overwrites earlier styles
    if (isThin) svg.style.height = "4px";
  } else {
    const svg = drawSketchBorder(el, mergedOpts);
    if (useSibling) {
      insertSiblingOverlay(el, svg);
    } else {
      const pos = getComputedStyle(el).position;
      if (pos === "static") el.style.position = "relative";
      el.appendChild(svg);
    }
  }

  // Hide CSS borders (rough.js replaces them)
  if (useSibling) {
    // Hide border visually but keep border-width — using border:none
    // would disrupt border-collapse:collapse in child tables.
    // Use !important because CSS frameworks (Tailwind) may use !important.
    el.style.setProperty("border-color", "transparent", "important");
    el.style.setProperty("overflow", "hidden", "important");
  } else {
    el.style.borderColor = "transparent";
  }
  el.style.boxShadow = "none";

  el.setAttribute("data-sketch-applied", "true");
}

function removeSketchFromElement(el: HTMLElement) {
  clearSketchOverlays(el);
  removeSiblingOverlay(el);
  el.style.removeProperty("border");
  el.style.removeProperty("border-color");
  el.style.removeProperty("overflow");
  el.style.boxShadow = "";
  el.removeAttribute("data-sketch-applied");
}

/** Global counter for unique seeds per element instance */
let instanceCounter = 1;

export function SketchProvider({
  children,
  enabled = true,
  roughness = 1.2,
  stroke = "#1c1917",
  fontFamily = "'JasonHandwriting', cursive",
  seed = 42,
}: SketchProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const config = useMemo<SketchConfig>(
    () => ({ enabled, roughness, stroke, fontFamily, seed }),
    [enabled, roughness, stroke, fontFamily, seed]
  );

  // Apply sketch overlays when enabled
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!enabled) {
      // Remove all sketch overlays
      container.querySelectorAll("[data-sketch-applied]").forEach((el) => {
        removeSketchFromElement(el as HTMLElement);
      });
      container.style.fontFamily = "";
      return;
    }

    // Apply handwriting font
    container.style.fontFamily = fontFamily;

    // Apply sketch to all matching elements
    const applyAll = () => {
      container.querySelectorAll(SKETCH_SELECTORS).forEach((el) => {
        applySketchToElement(el as HTMLElement, config);
      });
    };

    // Initial apply (with delay for layout)
    const timer = setTimeout(applyAll, 100);

    // Watch for DOM changes (new components rendered)
    const observer = new MutationObserver((mutations) => {
      let needsUpdate = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          needsUpdate = true;
          break;
        }
      }
      if (needsUpdate) {
        requestAnimationFrame(applyAll);
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    // Reapply on resize
    const resizeObserver = new ResizeObserver(() => {
      // Clear all and reapply (dimensions changed)
      container.querySelectorAll("[data-sketch-applied]").forEach((el) => {
        el.removeAttribute("data-sketch-applied");
      });
      requestAnimationFrame(applyAll);
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [enabled, config, fontFamily]);

  return (
    <SketchContext.Provider value={config}>
      <div ref={containerRef} data-sketch-root={enabled ? "true" : "false"}>
        {children}
      </div>
    </SketchContext.Provider>
  );
}
