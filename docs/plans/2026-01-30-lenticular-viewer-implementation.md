# Lenticular Viewer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web-based 3D preview tool that simulates physical lenticular billboards, allowing designers to upload two images and see how they flip based on viewing angle.

**Architecture:** Vanilla HTML/CSS/JS app with Three.js for 3D rendering. A zigzag mesh geometry displays two images on alternating angled faces. Orbit controls let users view the effect from different angles. gif.js handles client-side GIF export.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES6+), Three.js, gif.js

---

## Task 1: Project Scaffolding

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/app.js`

**Step 1: Create index.html with basic structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lenticular Viewer</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="app">
        <aside class="controls">
            <h1>Lenticular Viewer</h1>
            <!-- Controls will go here -->
        </aside>
        <main class="viewport">
            <!-- Three.js canvas will go here -->
        </main>
    </div>
    <script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
        }
    }
    </script>
    <script type="module" src="js/app.js"></script>
</body>
</html>
```

**Step 2: Create css/style.css with layout**

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html, body {
    height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1a1a1a;
    color: #fff;
}

.app {
    display: flex;
    height: 100%;
}

.controls {
    width: 300px;
    padding: 20px;
    background: #242424;
    overflow-y: auto;
    flex-shrink: 0;
}

.controls h1 {
    font-size: 18px;
    margin-bottom: 20px;
    font-weight: 500;
}

.viewport {
    flex: 1;
    position: relative;
}

.viewport canvas {
    display: block;
}
```

**Step 3: Create js/app.js with Three.js initialization**

```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class LenticularViewer {
    constructor() {
        this.initScene();
        this.initControls();
        this.animate();
    }

    initScene() {
        const viewport = document.querySelector('.viewport');

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        this.camera = new THREE.PerspectiveCamera(
            50,
            viewport.clientWidth / viewport.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        viewport.appendChild(this.renderer.domElement);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const directional = new THREE.DirectionalLight(0xffffff, 0.4);
        directional.position.set(5, 5, 5);
        this.scene.add(directional);

        // Grid helper for spatial reference
        const grid = new THREE.GridHelper(10, 10, 0x333333, 0x333333);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = -0.5;
        this.scene.add(grid);

        // Placeholder cube (will be replaced with zigzag)
        const geometry = new THREE.BoxGeometry(2, 1.5, 0.1);
        const material = new THREE.MeshStandardMaterial({ color: 0x444444 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);

        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }

    initControls() {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.minPolarAngle = Math.PI / 2;
        this.orbitControls.maxPolarAngle = Math.PI / 2;
        this.orbitControls.enableZoom = true;
        this.orbitControls.enablePan = false;
    }

    onResize() {
        const viewport = document.querySelector('.viewport');
        this.camera.aspect = viewport.clientWidth / viewport.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.orbitControls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

new LenticularViewer();
```

**Step 4: Test in browser**

Open `index.html` in a browser (use a local server like `python -m http.server` for module imports).
Expected: See a dark gray box with grid behind it, orbit controls work horizontally.

**Step 5: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "feat: scaffold project with Three.js scene"
```

---

## Task 2: Zigzag Billboard Geometry

**Files:**
- Create: `js/billboard.js`
- Modify: `js/app.js`

**Step 1: Create js/billboard.js with geometry generator**

```javascript
import * as THREE from 'three';

export function createZigzagGeometry(width, height, slats, angle) {
    const geometry = new THREE.BufferGeometry();

    // Convert angle from degrees to radians
    const angleRad = (angle * Math.PI) / 180;

    // Calculate peak depth based on angle
    const slatWidth = width / slats;
    const peakDepth = (slatWidth / 2) * Math.tan(angleRad);

    const vertices = [];
    const uvs = [];
    const indices = [];

    // Generate vertices for each slat
    for (let i = 0; i <= slats; i++) {
        const x = (i / slats) * width - width / 2;
        const isPeak = i % 1 === 0; // All integer positions

        if (i < slats) {
            const xLeft = x;
            const xMid = x + slatWidth / 2;
            const xRight = x + slatWidth;

            // Left edge (valley)
            vertices.push(xLeft, -height / 2, 0);
            vertices.push(xLeft, height / 2, 0);

            // Peak
            vertices.push(xMid, -height / 2, peakDepth);
            vertices.push(xMid, height / 2, peakDepth);

            // Right edge (valley)
            vertices.push(xRight, -height / 2, 0);
            vertices.push(xRight, height / 2, 0);

            // UV coordinates for left face (Image A)
            const uLeft = i / slats;
            const uMid = (i + 0.5) / slats;
            const uRight = (i + 1) / slats;

            // UVs: bottom-left, top-left, bottom-mid, top-mid, bottom-right, top-right
            uvs.push(uLeft, 0, uLeft, 1);
            uvs.push(uMid, 0, uMid, 1);
            uvs.push(uRight, 0, uRight, 1);

            // Indices for two triangles per face
            const base = i * 6;

            // Left face (valley to peak) - will show Image A
            indices.push(base, base + 2, base + 1);
            indices.push(base + 1, base + 2, base + 3);

            // Right face (peak to valley) - will show Image B
            indices.push(base + 2, base + 4, base + 3);
            indices.push(base + 3, base + 4, base + 5);
        }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

export function createBillboardMesh(width, height, slats, angle, textureA, textureB) {
    const geometry = createZigzagGeometry(width, height, slats, angle);

    // For now, use a simple material with placeholder color
    const material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        side: THREE.DoubleSide
    });

    return new THREE.Mesh(geometry, material);
}
```

**Step 2: Update js/app.js to use billboard geometry**

Replace the placeholder cube section in `initScene()`:

```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBillboardMesh } from './billboard.js';

class LenticularViewer {
    constructor() {
        this.settings = {
            width: 2,
            height: 1.5,
            slats: 20,
            angle: 45
        };

        this.initScene();
        this.initControls();
        this.animate();
    }

    initScene() {
        const viewport = document.querySelector('.viewport');

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        this.camera = new THREE.PerspectiveCamera(
            50,
            viewport.clientWidth / viewport.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        viewport.appendChild(this.renderer.domElement);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const directional = new THREE.DirectionalLight(0xffffff, 0.4);
        directional.position.set(5, 5, 5);
        this.scene.add(directional);

        // Grid helper for spatial reference
        const grid = new THREE.GridHelper(10, 10, 0x333333, 0x333333);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = -0.5;
        this.scene.add(grid);

        // Billboard mesh
        this.billboard = createBillboardMesh(
            this.settings.width,
            this.settings.height,
            this.settings.slats,
            this.settings.angle
        );
        this.scene.add(this.billboard);

        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }

    initControls() {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.minPolarAngle = Math.PI / 2;
        this.orbitControls.maxPolarAngle = Math.PI / 2;
        this.orbitControls.enableZoom = true;
        this.orbitControls.enablePan = false;
    }

    onResize() {
        const viewport = document.querySelector('.viewport');
        this.camera.aspect = viewport.clientWidth / viewport.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.orbitControls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

new LenticularViewer();
```

**Step 3: Test in browser**

Refresh browser.
Expected: See zigzag corrugated surface instead of flat box. Orbiting shows the peaks and valleys.

**Step 4: Commit**

```bash
git add js/billboard.js js/app.js
git commit -m "feat: add zigzag billboard geometry"
```

---

## Task 3: Dual-Texture Material for Left/Right Faces

**Files:**
- Modify: `js/billboard.js`

**Step 1: Rewrite geometry to separate left and right face groups**

Replace `js/billboard.js` entirely:

```javascript
import * as THREE from 'three';

export function createZigzagGeometry(width, height, slats, angle) {
    // Convert angle from degrees to radians
    const angleRad = (angle * Math.PI) / 180;

    // Calculate peak depth based on angle
    const slatWidth = width / slats;
    const peakDepth = (slatWidth / 2) * Math.tan(angleRad);

    // Separate geometry for left faces (Image A) and right faces (Image B)
    const leftVertices = [];
    const leftUvs = [];
    const rightVertices = [];
    const rightUvs = [];

    for (let i = 0; i < slats; i++) {
        const xLeft = (i / slats) * width - width / 2;
        const xMid = ((i + 0.5) / slats) * width - width / 2;
        const xRight = ((i + 1) / slats) * width - width / 2;

        const uLeft = i / slats;
        const uMid = (i + 0.5) / slats;
        const uRight = (i + 1) / slats;

        // Left face: valley to peak (shows Image A from the left)
        // Triangle 1: bottom-left, bottom-mid, top-left
        leftVertices.push(
            xLeft, -height / 2, 0,
            xMid, -height / 2, peakDepth,
            xLeft, height / 2, 0
        );
        leftUvs.push(
            uLeft, 0,
            uMid, 0,
            uLeft, 1
        );

        // Triangle 2: top-left, bottom-mid, top-mid
        leftVertices.push(
            xLeft, height / 2, 0,
            xMid, -height / 2, peakDepth,
            xMid, height / 2, peakDepth
        );
        leftUvs.push(
            uLeft, 1,
            uMid, 0,
            uMid, 1
        );

        // Right face: peak to valley (shows Image B from the right)
        // Triangle 1: bottom-mid, bottom-right, top-mid
        rightVertices.push(
            xMid, -height / 2, peakDepth,
            xRight, -height / 2, 0,
            xMid, height / 2, peakDepth
        );
        rightUvs.push(
            uMid, 0,
            uRight, 0,
            uMid, 1
        );

        // Triangle 2: top-mid, bottom-right, top-right
        rightVertices.push(
            xMid, height / 2, peakDepth,
            xRight, -height / 2, 0,
            xRight, height / 2, 0
        );
        rightUvs.push(
            uMid, 1,
            uRight, 0,
            uRight, 1
        );
    }

    const leftGeometry = new THREE.BufferGeometry();
    leftGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leftVertices, 3));
    leftGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(leftUvs, 2));
    leftGeometry.computeVertexNormals();

    const rightGeometry = new THREE.BufferGeometry();
    rightGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rightVertices, 3));
    rightGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(rightUvs, 2));
    rightGeometry.computeVertexNormals();

    return { leftGeometry, rightGeometry };
}

export function createBillboardGroup(width, height, slats, angle, textureA = null, textureB = null) {
    const { leftGeometry, rightGeometry } = createZigzagGeometry(width, height, slats, angle);

    const group = new THREE.Group();

    // Material for left faces (Image A)
    const materialA = new THREE.MeshStandardMaterial({
        color: textureA ? 0xffffff : 0x4a90d9,
        map: textureA,
        side: THREE.FrontSide
    });

    // Material for right faces (Image B)
    const materialB = new THREE.MeshStandardMaterial({
        color: textureB ? 0xffffff : 0xd94a4a,
        map: textureB,
        side: THREE.FrontSide
    });

    const leftMesh = new THREE.Mesh(leftGeometry, materialA);
    const rightMesh = new THREE.Mesh(rightGeometry, materialB);

    group.add(leftMesh);
    group.add(rightMesh);

    // Store references for texture updates
    group.userData = {
        leftMesh,
        rightMesh,
        materialA,
        materialB
    };

    return group;
}
```

**Step 2: Update js/app.js to use createBillboardGroup**

Change import and usage:

```javascript
import { createBillboardGroup } from './billboard.js';

// In initScene(), replace the billboard creation:
this.billboard = createBillboardGroup(
    this.settings.width,
    this.settings.height,
    this.settings.slats,
    this.settings.angle
);
this.scene.add(this.billboard);
```

**Step 3: Test in browser**

Refresh browser.
Expected: Zigzag with blue on left-facing slats, red on right-facing slats. Orbiting left shows blue, orbiting right shows red.

**Step 4: Commit**

```bash
git add js/billboard.js js/app.js
git commit -m "feat: separate materials for left/right slat faces"
```

---

## Task 4: Image Upload UI

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/app.js`

**Step 1: Add upload zones to index.html**

Replace the controls aside content:

```html
<aside class="controls">
    <h1>Lenticular Viewer</h1>

    <section class="control-group">
        <h2>Images</h2>
        <div class="upload-zone" id="uploadA">
            <input type="file" id="fileA" accept="image/*" hidden>
            <div class="upload-content">
                <span class="upload-label">Image A</span>
                <span class="upload-hint">Drop image or click</span>
            </div>
            <img class="upload-preview" alt="">
        </div>
        <div class="upload-zone" id="uploadB">
            <input type="file" id="fileB" accept="image/*" hidden>
            <div class="upload-content">
                <span class="upload-label">Image B</span>
                <span class="upload-hint">Drop image or click</span>
            </div>
            <img class="upload-preview" alt="">
        </div>
    </section>
</aside>
```

**Step 2: Add upload zone styles to css/style.css**

```css
.control-group {
    margin-bottom: 24px;
}

.control-group h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #888;
    margin-bottom: 12px;
}

.upload-zone {
    border: 2px dashed #444;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: border-color 0.2s, background-color 0.2s;
    position: relative;
    min-height: 80px;
}

.upload-zone:hover {
    border-color: #666;
    background: #2a2a2a;
}

.upload-zone.dragover {
    border-color: #4a90d9;
    background: rgba(74, 144, 217, 0.1);
}

.upload-zone.has-image .upload-content {
    display: none;
}

.upload-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.upload-label {
    font-weight: 500;
}

.upload-hint {
    font-size: 12px;
    color: #666;
}

.upload-preview {
    display: none;
    width: 100%;
    height: auto;
    border-radius: 4px;
}

.upload-zone.has-image .upload-preview {
    display: block;
}
```

**Step 3: Add upload handling to js/app.js**

Add method to the class:

```javascript
initUploadZones() {
    const setupZone = (zoneId, fileInputId, imageKey) => {
        const zone = document.getElementById(zoneId);
        const fileInput = document.getElementById(fileInputId);
        const preview = zone.querySelector('.upload-preview');

        zone.addEventListener('click', () => fileInput.click());

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadImage(file, imageKey, preview, zone);
            }
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadImage(file, imageKey, preview, zone);
            }
        });
    };

    setupZone('uploadA', 'fileA', 'textureA');
    setupZone('uploadB', 'fileB', 'textureB');
}

loadImage(file, textureKey, previewEl, zoneEl) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const url = e.target.result;
        previewEl.src = url;
        zoneEl.classList.add('has-image');

        const loader = new THREE.TextureLoader();
        loader.load(url, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            this[textureKey] = texture;
            this.updateBillboard();
        });
    };
    reader.readAsDataURL(file);
}
```

Call `this.initUploadZones()` in constructor after `initControls()`.

**Step 4: Test in browser**

Refresh browser. Upload two different images.
Expected: Images appear in preview thumbnails, and textures update on billboard.

**Step 5: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "feat: add image upload with drag-drop support"
```

---

## Task 5: Billboard Update Method

**Files:**
- Modify: `js/app.js`

**Step 1: Add updateBillboard method**

```javascript
updateBillboard() {
    // Remove old billboard
    if (this.billboard) {
        this.scene.remove(this.billboard);
        this.billboard.userData.leftMesh.geometry.dispose();
        this.billboard.userData.rightMesh.geometry.dispose();
        this.billboard.userData.materialA.dispose();
        this.billboard.userData.materialB.dispose();
    }

    // Create new billboard with current settings and textures
    this.billboard = createBillboardGroup(
        this.settings.width,
        this.settings.height,
        this.settings.slats,
        this.settings.angle,
        this.textureA || null,
        this.textureB || null
    );
    this.scene.add(this.billboard);
}
```

**Step 2: Initialize texture properties in constructor**

Add before `initScene()`:

```javascript
this.textureA = null;
this.textureB = null;
```

**Step 3: Test in browser**

Upload images and verify billboard updates with textures.
Expected: Left faces show Image A, right faces show Image B.

**Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: billboard updates when textures change"
```

---

## Task 6: Slat Settings UI

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/app.js`

**Step 1: Add slat controls to index.html**

After the Images section:

```html
<section class="control-group">
    <h2>Slat Settings</h2>
    <div class="slider-control">
        <label for="slatsSlider">Number of Slats</label>
        <div class="slider-row">
            <input type="range" id="slatsSlider" min="5" max="100" value="20">
            <span class="slider-value" id="slatsValue">20</span>
        </div>
    </div>
    <div class="slider-control">
        <label for="angleSlider">Slat Angle</label>
        <div class="slider-row">
            <input type="range" id="angleSlider" min="30" max="60" value="45">
            <span class="slider-value" id="angleValue">45°</span>
        </div>
    </div>
</section>

<section class="control-group">
    <h2>Billboard Size</h2>
    <div class="input-row">
        <div class="input-control">
            <label for="widthInput">Width</label>
            <input type="number" id="widthInput" value="2" min="0.5" max="10" step="0.1">
        </div>
        <div class="input-control">
            <label for="heightInput">Height</label>
            <input type="number" id="heightInput" value="1.5" min="0.5" max="10" step="0.1">
        </div>
    </div>
    <label class="checkbox-control">
        <input type="checkbox" id="lockAspect">
        <span>Lock aspect ratio</span>
    </label>
</section>
```

**Step 2: Add slider and input styles to css/style.css**

```css
.slider-control {
    margin-bottom: 16px;
}

.slider-control label {
    display: block;
    font-size: 13px;
    margin-bottom: 6px;
}

.slider-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.slider-row input[type="range"] {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    background: #444;
    border-radius: 2px;
    outline: none;
}

.slider-row input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #fff;
    border-radius: 50%;
    cursor: pointer;
}

.slider-value {
    min-width: 36px;
    text-align: right;
    font-size: 13px;
    color: #888;
}

.input-row {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
}

.input-control {
    flex: 1;
}

.input-control label {
    display: block;
    font-size: 13px;
    margin-bottom: 6px;
}

.input-control input[type="number"] {
    width: 100%;
    padding: 8px;
    background: #333;
    border: 1px solid #444;
    border-radius: 4px;
    color: #fff;
    font-size: 14px;
}

.checkbox-control {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    cursor: pointer;
}

.checkbox-control input[type="checkbox"] {
    width: 16px;
    height: 16px;
}
```

**Step 3: Add settings listeners to js/app.js**

Add method:

```javascript
initSettingsControls() {
    const slatsSlider = document.getElementById('slatsSlider');
    const slatsValue = document.getElementById('slatsValue');
    const angleSlider = document.getElementById('angleSlider');
    const angleValue = document.getElementById('angleValue');
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    const lockAspect = document.getElementById('lockAspect');

    slatsSlider.addEventListener('input', (e) => {
        this.settings.slats = parseInt(e.target.value);
        slatsValue.textContent = this.settings.slats;
        this.updateBillboard();
    });

    angleSlider.addEventListener('input', (e) => {
        this.settings.angle = parseInt(e.target.value);
        angleValue.textContent = this.settings.angle + '°';
        this.updateBillboard();
    });

    widthInput.addEventListener('input', (e) => {
        const newWidth = parseFloat(e.target.value) || 1;
        if (lockAspect.checked) {
            const ratio = this.settings.height / this.settings.width;
            this.settings.height = newWidth * ratio;
            heightInput.value = this.settings.height.toFixed(1);
        }
        this.settings.width = newWidth;
        this.updateBillboard();
    });

    heightInput.addEventListener('input', (e) => {
        const newHeight = parseFloat(e.target.value) || 1;
        if (lockAspect.checked) {
            const ratio = this.settings.width / this.settings.height;
            this.settings.width = newHeight * ratio;
            widthInput.value = this.settings.width.toFixed(1);
        }
        this.settings.height = newHeight;
        this.updateBillboard();
    });
}
```

Call `this.initSettingsControls()` in constructor.

**Step 4: Test in browser**

Adjust sliders and dimension inputs.
Expected: Billboard updates in real-time as settings change.

**Step 5: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "feat: add slat and dimension controls"
```

---

## Task 7: Empty State and Placeholder

**Files:**
- Modify: `js/billboard.js`
- Modify: `js/app.js`

**Step 1: Add checkerboard texture generator to billboard.js**

Add at the top:

```javascript
export function createCheckerboardTexture(color1 = 0x333333, color2 = 0x444444, size = 8) {
    const canvas = document.createElement('canvas');
    canvas.width = size * 8;
    canvas.height = size * 8;
    const ctx = canvas.getContext('2d');

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const isEven = (x + y) % 2 === 0;
            ctx.fillStyle = isEven ? `#${color1.toString(16).padStart(6, '0')}` : `#${color2.toString(16).padStart(6, '0')}`;
            ctx.fillRect(x * size, y * size, size, size);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
}
```

**Step 2: Use placeholder textures when none provided**

In `createBillboardGroup`, update material creation:

```javascript
export function createBillboardGroup(width, height, slats, angle, textureA = null, textureB = null) {
    const { leftGeometry, rightGeometry } = createZigzagGeometry(width, height, slats, angle);

    const group = new THREE.Group();

    // Create placeholder textures if none provided
    const placeholderA = createCheckerboardTexture(0x3a5a8a, 0x4a6a9a);
    const placeholderB = createCheckerboardTexture(0x8a3a3a, 0x9a4a4a);

    // Material for left faces (Image A)
    const materialA = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: textureA || placeholderA,
        side: THREE.FrontSide
    });

    // Material for right faces (Image B)
    const materialB = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: textureB || placeholderB,
        side: THREE.FrontSide
    });

    const leftMesh = new THREE.Mesh(leftGeometry, materialA);
    const rightMesh = new THREE.Mesh(rightGeometry, materialB);

    group.add(leftMesh);
    group.add(rightMesh);

    group.userData = {
        leftMesh,
        rightMesh,
        materialA,
        materialB
    };

    return group;
}
```

**Step 3: Test in browser**

Refresh with no images uploaded.
Expected: See blue checkerboard on left faces, red checkerboard on right faces.

**Step 4: Commit**

```bash
git add js/billboard.js
git commit -m "feat: add checkerboard placeholder textures"
```

---

## Task 8: Aspect Ratio Warning

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/app.js`

**Step 1: Add warning element to index.html**

After the Images section h2:

```html
<section class="control-group">
    <h2>Images</h2>
    <div class="warning" id="aspectWarning" hidden>
        Images have different aspect ratios
    </div>
    <!-- existing upload zones -->
```

**Step 2: Add warning styles to css/style.css**

```css
.warning {
    background: rgba(217, 166, 74, 0.15);
    border: 1px solid rgba(217, 166, 74, 0.4);
    color: #d9a64a;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 12px;
}

.warning[hidden] {
    display: none;
}
```

**Step 3: Add aspect ratio checking to js/app.js**

Add property tracking and check method:

```javascript
// In constructor, add:
this.imageAspectA = null;
this.imageAspectB = null;

// Add method:
checkAspectRatios() {
    const warning = document.getElementById('aspectWarning');
    if (this.imageAspectA && this.imageAspectB) {
        const diff = Math.abs(this.imageAspectA - this.imageAspectB);
        warning.hidden = diff < 0.05; // 5% tolerance
    } else {
        warning.hidden = true;
    }
}

// Update loadImage to track aspect:
loadImage(file, textureKey, previewEl, zoneEl) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const url = e.target.result;
        previewEl.src = url;
        zoneEl.classList.add('has-image');

        const img = new Image();
        img.onload = () => {
            const aspect = img.width / img.height;
            if (textureKey === 'textureA') {
                this.imageAspectA = aspect;
            } else {
                this.imageAspectB = aspect;
            }
            this.checkAspectRatios();
        };
        img.src = url;

        const loader = new THREE.TextureLoader();
        loader.load(url, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            this[textureKey] = texture;
            this.updateBillboard();
        });
    };
    reader.readAsDataURL(file);
}
```

**Step 4: Test in browser**

Upload two images with different aspect ratios.
Expected: Warning appears when ratios differ significantly.

**Step 5: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "feat: warn when image aspect ratios differ"
```

---

## Task 9: GIF Export - Animation Preview

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/app.js`

**Step 1: Add animation controls to index.html**

After Billboard Size section:

```html
<section class="control-group">
    <h2>Animation</h2>
    <div class="slider-control">
        <label for="speedSlider">Speed</label>
        <div class="slider-row">
            <input type="range" id="speedSlider" min="1" max="10" value="5">
            <span class="slider-value" id="speedValue">5</span>
        </div>
    </div>
    <button class="btn" id="previewBtn">Preview Animation</button>
    <button class="btn btn-primary" id="exportBtn" disabled>Export GIF</button>
</section>
```

**Step 2: Add button styles to css/style.css**

```css
.btn {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    margin-bottom: 8px;
    background: #333;
    color: #fff;
    transition: background-color 0.2s;
}

.btn:hover:not(:disabled) {
    background: #444;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-primary {
    background: #4a90d9;
}

.btn-primary:hover:not(:disabled) {
    background: #5aa0e9;
}
```

**Step 3: Add animation preview to js/app.js**

Add properties and methods:

```javascript
// In constructor, add:
this.isAnimating = false;
this.animationSpeed = 5;

// Add methods:
initAnimationControls() {
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const previewBtn = document.getElementById('previewBtn');
    const exportBtn = document.getElementById('exportBtn');

    speedSlider.addEventListener('input', (e) => {
        this.animationSpeed = parseInt(e.target.value);
        speedValue.textContent = this.animationSpeed;
    });

    previewBtn.addEventListener('click', () => this.playPreview());
}

playPreview() {
    if (this.isAnimating) return;

    this.isAnimating = true;
    const previewBtn = document.getElementById('previewBtn');
    const exportBtn = document.getElementById('exportBtn');
    previewBtn.disabled = true;

    // Store original camera position
    const startAzimuth = this.orbitControls.getAzimuthalAngle();

    // Animation parameters
    const duration = 3000 / (this.animationSpeed / 5); // Base 3 seconds at speed 5
    const startTime = performance.now();
    const sweepAngle = Math.PI * 0.8; // 144 degrees total sweep

    const animatePreview = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease in-out sine wave for smooth back-and-forth
        const angle = startAzimuth + Math.sin(progress * Math.PI * 2) * (sweepAngle / 2);

        // Set camera position on orbit
        const distance = this.camera.position.length();
        this.camera.position.x = Math.sin(angle) * distance;
        this.camera.position.z = Math.cos(angle) * distance;
        this.camera.lookAt(0, 0, 0);

        if (progress < 1) {
            requestAnimationFrame(animatePreview);
        } else {
            this.isAnimating = false;
            previewBtn.disabled = false;
            exportBtn.disabled = false;

            // Reset to original position
            this.camera.position.x = Math.sin(startAzimuth) * distance;
            this.camera.position.z = Math.cos(startAzimuth) * distance;
            this.camera.lookAt(0, 0, 0);
        }
    };

    requestAnimationFrame(animatePreview);
}
```

Call `this.initAnimationControls()` in constructor.

**Step 4: Test in browser**

Click "Preview Animation" button.
Expected: Camera smoothly sweeps left and right, revealing the flip effect. Export button enables after preview.

**Step 5: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "feat: add animation preview with speed control"
```

---

## Task 10: GIF Export

**Files:**
- Modify: `index.html`
- Create: `js/exporter.js`
- Modify: `js/app.js`

**Step 1: Add gif.js library to index.html**

Before the app.js script:

```html
<script src="https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js"></script>
```

**Step 2: Create js/exporter.js**

```javascript
export class GifExporter {
    constructor(renderer, width, height) {
        this.renderer = renderer;
        this.width = width;
        this.height = height;
    }

    async export(scene, camera, orbitControls, speed, onProgress) {
        return new Promise((resolve, reject) => {
            const gif = new GIF({
                workers: 2,
                quality: 10,
                width: this.width,
                height: this.height,
                workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
            });

            const frameCount = 30;
            const duration = 3000 / (speed / 5);
            const sweepAngle = Math.PI * 0.8;
            const startAzimuth = orbitControls.getAzimuthalAngle();
            const distance = camera.position.length();

            // Capture frames
            for (let i = 0; i < frameCount; i++) {
                const progress = i / frameCount;
                const angle = startAzimuth + Math.sin(progress * Math.PI * 2) * (sweepAngle / 2);

                camera.position.x = Math.sin(angle) * distance;
                camera.position.z = Math.cos(angle) * distance;
                camera.lookAt(0, 0, 0);

                this.renderer.render(scene, camera);

                const canvas = this.renderer.domElement;
                gif.addFrame(canvas, { copy: true, delay: duration / frameCount });

                if (onProgress) {
                    onProgress((i + 1) / frameCount * 0.5); // First 50% is frame capture
                }
            }

            // Reset camera
            camera.position.x = Math.sin(startAzimuth) * distance;
            camera.position.z = Math.cos(startAzimuth) * distance;
            camera.lookAt(0, 0, 0);

            gif.on('progress', (p) => {
                if (onProgress) {
                    onProgress(0.5 + p * 0.5); // Last 50% is encoding
                }
            });

            gif.on('finished', (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'lenticular-preview.gif';
                a.click();
                URL.revokeObjectURL(url);
                resolve();
            });

            gif.render();
        });
    }
}
```

**Step 3: Integrate exporter into js/app.js**

Add import and export handler:

```javascript
import { GifExporter } from './exporter.js';

// In initAnimationControls, add export handler:
exportBtn.addEventListener('click', () => this.exportGif());

// Add method:
async exportGif() {
    const exportBtn = document.getElementById('exportBtn');
    const previewBtn = document.getElementById('previewBtn');

    exportBtn.disabled = true;
    previewBtn.disabled = true;
    exportBtn.textContent = 'Exporting...';

    const viewport = document.querySelector('.viewport');
    const exporter = new GifExporter(
        this.renderer,
        viewport.clientWidth,
        viewport.clientHeight
    );

    try {
        await exporter.export(
            this.scene,
            this.camera,
            this.orbitControls,
            this.animationSpeed,
            (progress) => {
                exportBtn.textContent = `Exporting ${Math.round(progress * 100)}%`;
            }
        );
    } finally {
        exportBtn.textContent = 'Export GIF';
        exportBtn.disabled = false;
        previewBtn.disabled = false;
    }
}
```

**Step 4: Test in browser**

Preview animation, then click "Export GIF".
Expected: Progress shows during export, GIF downloads automatically.

**Step 5: Commit**

```bash
git add index.html js/exporter.js js/app.js
git commit -m "feat: add GIF export with progress indicator"
```

---

## Task 11: Final Polish

**Files:**
- Modify: `css/style.css`
- Modify: `index.html`

**Step 1: Add empty state call-to-action**

In index.html, add after viewport main:

```html
<main class="viewport">
    <div class="empty-state" id="emptyState">
        <p>Drop images on the left panel to preview your lenticular design</p>
    </div>
</main>
```

**Step 2: Add empty state styles**

```css
.empty-state {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.6);
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 13px;
    color: #888;
    pointer-events: none;
}

.empty-state[hidden] {
    display: none;
}
```

**Step 3: Hide empty state when images are loaded**

In js/app.js loadImage method, add:

```javascript
// After zoneEl.classList.add('has-image'):
if (this.textureA || this.textureB) {
    document.getElementById('emptyState').hidden = true;
}
```

**Step 4: Test in browser**

Verify empty state shows on load, hides when first image is uploaded.

**Step 5: Final commit**

```bash
git add css/style.css index.html js/app.js
git commit -m "feat: add empty state guidance"
```

---

## Summary

The implementation is complete with:
- 3D zigzag billboard geometry
- Dual-texture materials for left/right faces
- Image upload with drag-drop
- Configurable slat count, angle, and dimensions
- Aspect ratio warning
- Animation preview
- GIF export

All code runs without a build step - just open index.html with a local server.
