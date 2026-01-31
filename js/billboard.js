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
