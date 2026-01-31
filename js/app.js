import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBillboardGroup } from './billboard.js';
import { GifExporter } from './exporter.js';

class LenticularViewer {
    constructor() {
        this.settings = {
            width: 2,
            height: 1.5,
            slats: 20,
            angle: 45
        };

        this.textureA = null;
        this.textureB = null;
        this.imageAspectA = null;
        this.imageAspectB = null;

        this.isAnimating = false;
        this.animationSpeed = 5;

        this.initScene();
        this.initControls();
        this.initUploadZones();
        this.initSettingsControls();
        this.initAnimationControls();
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
        this.orbitControls.dampingFactor = 0.05;
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
    }

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
        exportBtn.addEventListener('click', () => this.exportGif());
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
