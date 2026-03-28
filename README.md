# shadcn-sketch

Turn **shadcn/ui** components into hand-drawn wireframes with **rough.js**.

One `<SketchProvider>` and your polished UI becomes an Excalidraw-style wireframe — perfect for prototyping, design reviews, and client demos.

## Quick Start

```bash
npm install shadcn-sketch roughjs
```

```tsx
import { SketchProvider } from 'shadcn-sketch';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

function App() {
  const [sketch, setSketch] = useState(true);

  return (
    <SketchProvider enabled={sketch}>
      <Button onClick={() => setSketch(!sketch)}>
        Toggle Wireframe
      </Button>

      <Card>
        <CardHeader>Dashboard</CardHeader>
        <CardContent>This looks hand-drawn!</CardContent>
      </Card>
    </SketchProvider>
  );
}
```

## What It Does

| Normal Mode | Sketch Mode |
|---|---|
| CSS borders | rough.js hand-drawn lines |
| `border-radius` | Wobbly imperfect curves |
| Solid fills | Cross-hatch / hachure patterns |
| System font | Handwriting font |
| Box shadows | None (sketch feel) |

## API

### `<SketchProvider>`

Wrap your app or a section to enable sketch mode globally.

```tsx
<SketchProvider
  enabled={true}        // Toggle on/off
  roughness={1.2}       // 0 = straight, 3 = very rough
  stroke="#1c1917"      // Line color
  fontFamily="'JasonHandwriting', cursive"
  seed={42}             // Deterministic rendering
>
  {children}
</SketchProvider>
```

### `<Sketch>`

Wrap any single element to add sketch border.

```tsx
import { Sketch } from 'shadcn-sketch';

<Sketch>
  <Card>Just this card gets sketch borders</Card>
</Sketch>

<Sketch options={{ fill: '#000', fillStyle: 'cross-hatch' }}>
  <Button>Filled button</Button>
</Sketch>
```

### `useSketch()`

Access sketch config from any child component.

```tsx
import { useSketch } from 'shadcn-sketch';

function MyComponent() {
  const { enabled, roughness } = useSketch();
  // Conditionally render based on sketch mode
}
```

## Auto-Detection

`<SketchProvider>` automatically detects shadcn/ui components via:
- `data-slot` attributes (shadcn v2+)
- CSS class patterns (fallback)

Supported: Card, Button, Badge, Input, Table, Tabs, Alert, Dialog, Separator.

## Handwriting Fonts

The default font is [JasonHandwriting (清松手寫體)](https://github.com/max32002/JasonHandWritingFonts) — a beautiful Chinese + English handwriting font.

```css
/* Add to your global CSS */
@font-face {
  font-family: 'JasonHandwriting';
  src: url('https://cdn.jsdelivr.net/gh/max32002/JasonHandWritingFonts@20251204/webfont/JasonHandwriting1-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

## License

MIT
