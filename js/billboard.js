import * as THREE from 'three';

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

    // Store references for texture updates
    group.userData = {
        leftMesh,
        rightMesh,
        materialA,
        materialB
    };

    return group;
}
