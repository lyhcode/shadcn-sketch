"use client";

import { createContext, useContext } from "react";

export interface SketchConfig {
  /** Whether sketch mode is enabled */
  enabled: boolean;
  /** Global roughness override */
  roughness?: number;
  /** Global stroke color override */
  stroke?: string;
  /** Handwriting font family */
  fontFamily?: string;
  /** Random seed for deterministic rendering across re-renders */
  seed?: number;
}

const defaultConfig: SketchConfig = {
  enabled: false,
  roughness: 1.2,
  stroke: "#1c1917",
  fontFamily: "'JasonHandwriting', cursive",
  seed: 42,
};

export const SketchContext = createContext<SketchConfig>(defaultConfig);

export function useSketch(): SketchConfig {
  return useContext(SketchContext);
}
