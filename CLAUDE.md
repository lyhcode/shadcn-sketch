# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

shadcn-sketch is a React library that transforms shadcn/ui components into hand-drawn, Excalidraw-style wireframes using rough.js. It overlays SVG sketches on top of existing components, hiding their CSS borders/shadows and replacing them with wobbly hand-drawn lines.

## Commands

- `npm run dev` — Start Next.js dev server on port 3333 (for demo)
- `npm run build:lib` — Build library to dist/ (ESM + CJS + .d.ts via tsup)
- `npm run build` — Build Next.js app
- `npm run lint` — Run ESLint

## Architecture

The library has four layers:

### 1. SketchProvider (`src/components/sketch-provider.tsx`)
Global wrapper that automatically detects and applies sketch styles to all matching shadcn/ui components in its subtree. Uses MutationObserver for new DOM nodes and ResizeObserver for dimension changes. Applies overlays with a 100ms debounce for layout settlement.

### 2. Sketch (`src/components/sketch.tsx`)
Single-element wrapper for fine-grained control. Can work standalone with `force` prop or inherit config from SketchProvider. Uses 50ms debounce before applying.

### 3. useSketch hook (`src/hooks/use-sketch.ts`)
React Context hook exposing `SketchConfig` (enabled, roughness, stroke, fontFamily, seed) to child components.

### 4. rough-renderer (`src/lib/rough-renderer.ts`)
Core rendering logic. Key functions:
- `detectComponentType(el)` — Identifies shadcn component type via `data-slot` attributes (v2+) with CSS class fallback
- `getOptionsForType(type, el)` — Returns type-specific rough.js options (different roughness/fill per component)
- `drawSketchBorder(el, options?)` — Main function: creates SVG overlay with rough.js rounded rect path
- `clearSketchOverlays(el)` — Removes all `[data-sketch="overlay"]` elements

### Rendering Flow

SketchProvider detects matching elements → calls `drawSketchBorder()` which creates an absolutely-positioned SVG overlay (`pointer-events: none`, `z-index: 10`) → hides original CSS borders (`border-color: transparent`) → marks element with `data-sketch-applied` to prevent reprocessing.

### Component Detection

Two strategies in `detectComponentType()`:
1. **Primary**: `data-slot` attribute lookup (shadcn v2+)
2. **Fallback**: CSS class pattern matching (e.g., `.rounded-xl.border` → card)

Supported types: Card, Button, Badge, Input, Table, Tabs, Alert, Dialog, Separator.

### Seed Management

Each element gets a unique seed: `(globalSeed + instanceCounter++) % 10000`. This ensures different rough.js randomization per element while remaining deterministic across renders.

## Key Files

- `src/index.ts` — Barrel exports for all public API
- `demo/index.html` — Standalone interactive demo (loads rough.js + fonts from CDN, contains inline JS port of the library)
- Default font: JasonHandwriting (Chinese + English handwriting font via jsdelivr CDN)

## Build Output

Library builds to `dist/` with three outputs: `index.js` (CJS), `index.mjs` (ESM), `index.d.ts` (types). Also exports `fonts.css` at `shadcn-sketch/fonts.css`.

## Peer Dependencies

React >=18, react-dom >=18, roughjs >=4.6
