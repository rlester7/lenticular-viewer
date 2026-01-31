# Lenticular Viewer Design

A web-based 3D preview tool for lenticular billboard designs.

## Purpose

Help designers validate lenticular artwork before print production by simulating a physical zigzag billboard in 3D. Users can orbit around the virtual billboard to see how images flip based on viewing angle. GIF export enables sharing previews with stakeholders.

## Core Concept

The tool renders a zigzag/accordion-shaped 3D surface representing a physical lenticular billboard:

- All left-angled faces display Image A
- All right-angled faces display Image B

Users orbit around this billboard with their mouse to experience the flip effect - just like walking past a real lenticular billboard.

## User Interface

### Layout

**Left panel (controls):**
- Image A upload zone (drag-drop or click to browse)
- Image B upload zone (drag-drop or click to browse)
- Slat settings:
  - Number of slats (slider, e.g. 10-100)
  - Slat angle (slider, e.g. 30-60 degrees from vertical)
- Billboard dimensions (width/height inputs with aspect ratio lock option)
- Animation controls:
  - "Preview Animation" button
  - Speed slider
  - "Export GIF" button (enabled after preview)

**Right area (3D viewport):**
- Zigzag billboard rendered in 3D
- Click and drag to orbit horizontally around the billboard
- Subtle ground plane or grid for spatial reference
- Clean, neutral background

## 3D Geometry

### Zigzag Surface

- Single mesh of connected triangular faces
- Each "peak" consists of two triangles meeting at an apex
- Peaks run vertically (like vertical blinds/slats)
- Number of slats setting controls peak count across width

### Texture Mapping

- Image A UV-mapped across all left-facing faces
- Image B UV-mapped across all right-facing faces
- Each face shows a vertical slice of its respective image
- Slices distributed so full image is visible from correct angle

### Slat Angle Behavior

- Steeper angles (~60 degrees): sharper transition, narrower sweet spot per image
- Shallower angles (~30 degrees): gradual blend zone, more forgiving viewing angle

### Lighting

- Simple ambient + directional light to show 3D form
- No harsh shadows that distract from artwork preview

## GIF Export

### Workflow

1. Click "Preview Animation" button
2. Camera follows preset path sweeping across wide viewing arc (Image A to transition to Image B and back)
3. Animation plays in viewport as preview
4. Adjust speed slider if needed
5. Click "Export GIF" to download

### Behavior

- Premade camera path covering full flip effect
- What you see in preview is exactly what exports
- Client-side encoding, no server needed

## File Handling

### Supported Formats

- JPEG, PNG, WebP

### Validation

- Different aspect ratios: show warning, allow anyway
- Single image uploaded: display on both face sets (preview geometry before adding second image)
- Failed load: show error in upload zone

### Empty State

- Placeholder patterns on zigzag (solid colors or checkerboard)
- Call-to-action: "Drop images here to preview your lenticular design"

## Technical Architecture

### Stack

- HTML/CSS for layout and controls
- Vanilla JavaScript for logic
- Three.js for 3D rendering and orbit controls
- gif.js (or similar) for client-side GIF encoding

### File Structure

```
index.html       - Single page application
css/style.css    - Styling
js/app.js        - Main application logic
js/billboard.js  - Zigzag geometry generation
js/exporter.js   - GIF recording/export
lib/             - Three.js, gif.js dependencies
```

### Requirements

- No build step: open index.html and it works
- Hostable on any static server (GitHub Pages, Netlify, local file server)
- Modern browsers with WebGL support (Chrome, Firefox, Safari, Edge)

## Reference

Based on physical lenticular billboards like the HSBC example - triangular zigzag ridges where each face angle reveals a different image depending on viewer position.
