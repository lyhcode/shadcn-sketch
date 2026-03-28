"use client";

import React, { useEffect, useRef, type ReactNode } from "react";
import { useSketch } from "../hooks/use-sketch";
import {
  clearSketchOverlays,
  drawSketchBorder,
  type SketchOptions,
} from "../lib/rough-renderer";

interface SketchProps {
  children: ReactNode;
  /** Override sketch options for this element */
  options?: SketchOptions;
  /** Force enable even outside SketchProvider */
  force?: boolean;
  /** Element type to render. Default 'div' */
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Wrap any element to add a rough.js hand-drawn border.
 *
 * Works automatically inside <SketchProvider enabled>.
 * Use `force` to enable outside a provider.
 *
 * @example
 * ```tsx
 * <Sketch>
 *   <Card>Content</Card>
 * </Sketch>
 *
 * <Sketch options={{ fill: '#000', fillStyle: 'cross-hatch' }}>
 *   <Button>Primary</Button>
 * </Sketch>
 * ```
 */
export function Sketch({
  children,
  options,
  force = false,
  as: Tag = "div",
  className,
  style,
}: SketchProps) {
  const config = useSketch();
  const enabled = force || config.enabled;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) {
      if (el) {
        clearSketchOverlays(el);
        el.style.borderColor = "";
      }
      return;
    }

    const timer = setTimeout(() => {
      clearSketchOverlays(el);

      const mergedOpts: SketchOptions = {
        roughness: config.roughness,
        stroke: config.stroke,
        seed: (config.seed ?? 42) + (options?.seed ?? Math.floor(Math.random() * 1000)),
        ...options,
      };

      const svg = drawSketchBorder(el, mergedOpts);
      el.appendChild(svg);

      // Hide CSS border
      el.style.borderColor = "transparent";
      el.style.boxShadow = "none";
    }, 50);

    return () => clearTimeout(timer);
  }, [enabled, options, config]);

  return (
    <Tag
      ref={containerRef as any}
      className={className}
      style={{ position: "relative", ...style }}
    >
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </Tag>
  );
}
