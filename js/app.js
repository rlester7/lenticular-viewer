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
