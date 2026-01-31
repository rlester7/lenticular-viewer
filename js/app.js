import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBillboardGroup } from './billboard.js';

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

        this.initScene();
        this.initControls();
        this.initUploadZones();
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
