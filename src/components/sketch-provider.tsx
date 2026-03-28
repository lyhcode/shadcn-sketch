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

function applySketchToElement(el: HTMLElement, globalOpts: SketchConfig) {
  // Skip if already processed and not stale
  if (el.getAttribute("data-sketch-applied") === "true") return;

  const type = detectComponentType(el);
  if (type === "unknown") return;

  // Ensure positioned for overlay
  const pos = getComputedStyle(el).position;
  if (pos === "static") el.style.position = "relative";

  // Clear old overlays
  clearSketchOverlays(el);

  // Get type-specific options merged with global
  const typeOpts = getOptionsForType(type, el);
  const mergedOpts = {
    ...typeOpts,
    roughness: globalOpts.roughness ?? typeOpts.roughness,
    stroke: globalOpts.stroke ?? typeOpts.stroke,
    seed: (globalOpts.seed ?? 42) + hashString(el.className + el.textContent?.slice(0, 20)),
  };

  if (type === "separator") {
    // Draw a rough line instead of rect
    const svg = createOverlaySvg();
    const w = el.offsetWidth;
    drawSketchLine(svg, 0, 1, w, 1, mergedOpts);
    el.appendChild(svg);
  } else {
    // Draw rough border
    const svg = drawSketchBorder(el, mergedOpts);
    el.appendChild(svg);
  }

  // Hide CSS borders (rough.js replaces them)
  el.style.borderColor = "transparent";
  el.style.boxShadow = "none";

  el.setAttribute("data-sketch-applied", "true");
}

function removeSketchFromElement(el: HTMLElement) {
  clearSketchOverlays(el);
  el.style.borderColor = "";
  el.style.boxShadow = "";
  el.removeAttribute("data-sketch-applied");
}

/** Simple string hash for deterministic seeds */
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < Math.min(s.length, 50); i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 10000;
}

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
