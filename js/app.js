import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBillboardGroup } from './billboard.js';
import { GifExporter } from './exporter.js';

class LenticularViewer {
    constructor() {
        // Board presets from spec sheets
        this.presets = {
            '20136': {
                name: '20136 - Sunset Blvd',
                width: 36,      // 36 feet
                height: 6,      // 6 feet
                slats: 27,      // 54 triangles / 2 faces per slat
                angle: 45,      // Default, can be refined
                location: 'LA - 6409 Sunset Blvd'
            },
            'M-74': {
                name: 'M-74 - Grand St',
                width: 13.17,   // 13'2" = 13.17 feet
                height: 5.5,    // 5'6" = 5.5 feet
                slats: 40,      // Estimate for hand-painted
                angle: 45,
                location: 'NYC - Grand St & Thompson St, SoHo'
            }
        };

        this.currentPreset = null;
        this.presetOriginalSettings = null;

        this.settings = {
            width: 3,
            height: 1.5,
            slats: 50,
            angle: 45
        };

        this.textureA = null;
        this.textureB = null;
        this.imageAspectA = null;
        this.imageAspectB = null;

        this.isAnimating = false;
        this.animationSpeed = 2;
        this.sweepAngle = 110;

        this.loadFromLocalStorage();
        this.initScene();
        this.initControls();
        this.initUploadZones();
        this.initSettingsControls();
        this.initAnimationControls();
        this.animate();
    }

    saveToLocalStorage() {
        const data = {
            settings: this.settings,
            animationSpeed: this.animationSpeed,
            sweepAngle: this.sweepAngle,
            currentPreset: this.currentPreset
        };
        try {
            localStorage.setItem('lenticularViewer', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('lenticularViewer');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.settings) {
                    this.settings = { ...this.settings, ...data.settings };
                }
                if (data.animationSpeed) {
                    this.animationSpeed = data.animationSpeed;
                }
                if (data.sweepAngle) {
                    this.sweepAngle = data.sweepAngle;
                }
                if (data.currentPreset) {
                    this.currentPreset = data.currentPreset;
                    if (this.presets[data.currentPreset]) {
                        this.presetOriginalSettings = { ...this.presets[data.currentPreset] };
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
        }
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
        this.grid = new THREE.GridHelper(10, 10, 0x333333, 0x333333);
        this.grid.rotation.x = Math.PI / 2;
        this.grid.position.z = -0.5;
        this.scene.add(this.grid);

        // Billboard mesh
        this.billboard = createBillboardGroup(
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
        this.orbitControls.dampingFactor = 0.03;
        this.orbitControls.minPolarAngle = Math.PI / 2;
        this.orbitControls.maxPolarAngle = Math.PI / 2;
        this.orbitControls.enableZoom = true;
        this.orbitControls.enablePan = false;
    }

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

        // Swap images button
        document.getElementById('swapBtn').addEventListener('click', () => {
            this.swapImages();
        });
    }

    swapImages() {
        // Swap textures
        const tempTexture = this.textureA;
        this.textureA = this.textureB;
        this.textureB = tempTexture;

        // Swap aspect ratios
        const tempAspect = this.imageAspectA;
        this.imageAspectA = this.imageAspectB;
        this.imageAspectB = tempAspect;

        // Swap preview images
        const previewA = document.querySelector('#uploadA .upload-preview');
        const previewB = document.querySelector('#uploadB .upload-preview');
        const tempSrc = previewA.src;
        previewA.src = previewB.src;
        previewB.src = tempSrc;

        // Update billboard
        this.updateBillboard();
    }

    initSettingsControls() {
        const presetSelect = document.getElementById('presetSelect');
        const presetWarning = document.getElementById('presetWarning');
        const slatsSlider = document.getElementById('slatsSlider');
        const slatsValue = document.getElementById('slatsValue');
        const angleSlider = document.getElementById('angleSlider');
        const angleValue = document.getElementById('angleValue');
        const widthInput = document.getElementById('widthInput');
        const heightInput = document.getElementById('heightInput');
        const lockAspect = document.getElementById('lockAspect');

        // Set initial values from loaded settings
        slatsSlider.value = this.settings.slats;
        slatsValue.textContent = this.settings.slats;
        angleSlider.value = this.settings.angle;
        angleValue.textContent = this.settings.angle + '°';
        widthInput.value = this.settings.width;
        heightInput.value = this.settings.height;

        // Restore preset selection if saved
        if (this.currentPreset && this.presets[this.currentPreset]) {
            presetSelect.value = this.currentPreset;
        }

        // Preset selection handler
        presetSelect.addEventListener('change', (e) => {
            const presetId = e.target.value;
            if (presetId && this.presets[presetId]) {
                this.applyPreset(presetId);
            } else {
                this.currentPreset = null;
                this.presetOriginalSettings = null;
                presetWarning.hidden = true;
            }
        });

        // Check for preset modifications
        const checkPresetModified = () => {
            if (this.currentPreset && this.presetOriginalSettings) {
                const modified =
                    this.settings.width !== this.presetOriginalSettings.width ||
                    this.settings.height !== this.presetOriginalSettings.height ||
                    this.settings.slats !== this.presetOriginalSettings.slats ||
                    this.settings.angle !== this.presetOriginalSettings.angle;
                presetWarning.hidden = !modified;
            }
        };

        slatsSlider.addEventListener('input', (e) => {
            this.settings.slats = parseInt(e.target.value);
            slatsValue.textContent = this.settings.slats;
            this.updateBillboard();
            this.saveToLocalStorage();
            checkPresetModified();
        });

        angleSlider.addEventListener('input', (e) => {
            this.settings.angle = parseInt(e.target.value);
            angleValue.textContent = this.settings.angle + '°';
            this.updateBillboard();
            this.saveToLocalStorage();
            checkPresetModified();
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
            this.saveToLocalStorage();
            checkPresetModified();
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
            checkPresetModified();
            this.saveToLocalStorage();
        });

        const showGrid = document.getElementById('showGrid');
        showGrid.addEventListener('change', (e) => {
            this.grid.visible = e.target.checked;
        });
    }

    applyPreset(presetId) {
        const preset = this.presets[presetId];
        if (!preset) return;

        this.currentPreset = presetId;
        this.settings.width = preset.width;
        this.settings.height = preset.height;
        this.settings.slats = preset.slats;
        this.settings.angle = preset.angle;

        // Store original settings for modification detection
        this.presetOriginalSettings = { ...this.settings };

        // Update UI
        document.getElementById('widthInput').value = preset.width;
        document.getElementById('heightInput').value = preset.height;
        document.getElementById('slatsSlider').value = preset.slats;
        document.getElementById('slatsValue').textContent = preset.slats;
        document.getElementById('angleSlider').value = preset.angle;
        document.getElementById('angleValue').textContent = preset.angle + '°';
        document.getElementById('presetWarning').hidden = true;

        this.updateBillboard();
        this.saveToLocalStorage();
    }

    initAnimationControls() {
        const sweepSlider = document.getElementById('sweepSlider');
        const sweepValue = document.getElementById('sweepValue');
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');
        const previewBtn = document.getElementById('previewBtn');
        const exportBtn = document.getElementById('exportBtn');

        // Set initial values from loaded settings
        sweepSlider.value = this.sweepAngle;
        sweepValue.textContent = this.sweepAngle + '°';
        speedSlider.value = this.animationSpeed;
        speedValue.textContent = this.animationSpeed;

        // Sweep angle control - move camera to extreme while adjusting
        let sweepTimeout = null;
        sweepSlider.addEventListener('input', (e) => {
            this.sweepAngle = parseInt(e.target.value);
            sweepValue.textContent = this.sweepAngle + '°';

            // Move camera to left extreme to show sweep boundary
            const sweepRad = Math.PI * (this.sweepAngle / 180);
            const distance = this.camera.position.length();
            const extremeAngle = -sweepRad / 2; // Left extreme

            this.camera.position.x = Math.sin(extremeAngle) * distance;
            this.camera.position.z = Math.cos(extremeAngle) * distance;
            this.camera.lookAt(0, 0, 0);

            // Clear previous timeout
            if (sweepTimeout) clearTimeout(sweepTimeout);

            // Return to center after user stops adjusting
            sweepTimeout = setTimeout(() => {
                this.camera.position.x = 0;
                this.camera.position.z = distance;
                this.camera.lookAt(0, 0, 0);
            }, 1000);

            this.saveToLocalStorage();
        });

        speedSlider.addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
            speedValue.textContent = this.animationSpeed;
            this.saveToLocalStorage();
        });

        const showSafezone = document.getElementById('showSafezone');
        showSafezone.addEventListener('change', (e) => {
            const overlay = document.getElementById('safezoneOverlay');
            overlay.classList.toggle('visible', e.target.checked);
            if (e.target.checked) {
                this.updateSafezone();
            }
        });

        const resetCameraBtn = document.getElementById('resetCameraBtn');
        resetCameraBtn.addEventListener('click', () => {
            this.camera.position.set(0, 0, 5);
            this.camera.lookAt(0, 0, 0);
            this.orbitControls.reset();
        });

        previewBtn.addEventListener('click', () => this.playPreview());
        exportBtn.addEventListener('click', () => this.exportGif());
    }

    updateSafezone() {
        const overlay = document.getElementById('safezoneOverlay');
        if (!overlay.classList.contains('visible')) return;

        const viewport = document.querySelector('.viewport');
        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;

        const billboardAspect = this.settings.width / this.settings.height;
        const viewportAspect = viewportWidth / viewportHeight;

        let cropWidth, cropHeight, cropX, cropY;

        if (viewportAspect > billboardAspect) {
            // Viewport is wider - crop sides
            cropHeight = viewportHeight;
            cropWidth = Math.floor(viewportHeight * billboardAspect);
            cropX = Math.floor((viewportWidth - cropWidth) / 2);
            cropY = 0;
        } else {
            // Viewport is taller - crop top/bottom
            cropWidth = viewportWidth;
            cropHeight = Math.floor(viewportWidth / billboardAspect);
            cropX = 0;
            cropY = Math.floor((viewportHeight - cropHeight) / 2);
        }

        const top = overlay.querySelector('.safezone-top');
        const bottom = overlay.querySelector('.safezone-bottom');
        const left = overlay.querySelector('.safezone-left');
        const right = overlay.querySelector('.safezone-right');
        const border = overlay.querySelector('.safezone-border');

        top.style.height = `${cropY}px`;
        bottom.style.height = `${cropY}px`;
        left.style.top = `${cropY}px`;
        left.style.width = `${cropX}px`;
        left.style.height = `${cropHeight}px`;
        right.style.top = `${cropY}px`;
        right.style.width = `${cropX}px`;
        right.style.height = `${cropHeight}px`;

        border.style.top = `${cropY}px`;
        border.style.left = `${cropX}px`;
        border.style.width = `${cropWidth}px`;
        border.style.height = `${cropHeight}px`;
    }

    playPreview() {
        if (this.isAnimating) return;

        this.isAnimating = true;
        const previewBtn = document.getElementById('previewBtn');
        const exportBtn = document.getElementById('exportBtn');
        previewBtn.disabled = true;

        // Store original camera position to restore after animation
        const originalAzimuth = this.orbitControls.getAzimuthalAngle();
        const distance = this.camera.position.length();

        // Animation parameters
        const duration = 3000 / (this.animationSpeed / 5); // Base 3 seconds at speed 5
        const startTime = performance.now();
        const sweepAngle = Math.PI * (this.sweepAngle / 180);

        const animatePreview = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Start left, sweep to right, return to left using cosine
            const angle = -Math.cos(progress * Math.PI * 2) * (sweepAngle / 2);

            // Set camera position on orbit (stays in front of billboard)
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
                this.camera.position.x = Math.sin(originalAzimuth) * distance;
                this.camera.position.z = Math.cos(originalAzimuth) * distance;
                this.camera.lookAt(0, 0, 0);
            }
        };

        requestAnimationFrame(animatePreview);
    }

    async exportGif() {
        const exportBtn = document.getElementById('exportBtn');
        const previewBtn = document.getElementById('previewBtn');
        const filenameInput = document.getElementById('filenameInput');

        exportBtn.disabled = true;
        previewBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';

        const viewport = document.querySelector('.viewport');
        const exporter = new GifExporter(
            this.renderer,
            viewport.clientWidth,
            viewport.clientHeight
        );

        const filename = filenameInput.value.trim() || 'lenticular-preview';

        try {
            await exporter.export(
                this.scene,
                this.camera,
                this.orbitControls,
                this.animationSpeed,
                (progress) => {
                    exportBtn.textContent = `Exporting ${Math.round(progress * 100)}%`;
                },
                this.settings.width,
                this.settings.height,
                this.sweepAngle,
                filename
            );
        } finally {
            exportBtn.textContent = 'Export GIF';
            exportBtn.disabled = false;
            previewBtn.disabled = false;
        }
    }

    checkAspectRatios() {
        const warning = document.getElementById('aspectWarning');
        if (this.imageAspectA && this.imageAspectB) {
            const diff = Math.abs(this.imageAspectA - this.imageAspectB);
            warning.hidden = diff < 0.05; // 5% tolerance
        } else {
            warning.hidden = true;
        }
    }

    loadImage(file, textureKey, previewEl, zoneEl) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const url = e.target.result;
            previewEl.src = url;
            zoneEl.classList.add('has-image');
            document.getElementById('emptyState').hidden = true;

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
        this.updateSafezone();
    }

    onResize() {
        const viewport = document.querySelector('.viewport');
        this.camera.aspect = viewport.clientWidth / viewport.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
        this.updateSafezone();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.orbitControls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

new LenticularViewer();
