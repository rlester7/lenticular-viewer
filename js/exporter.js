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
            const sweepAngle = Math.PI * (100 / 180); // 100 degrees total sweep (±50° from center)
            const originalAzimuth = orbitControls.getAzimuthalAngle();
            const distance = camera.position.length();

            // Capture frames - start left, sweep to right, return to left
            for (let i = 0; i < frameCount; i++) {
                const progress = i / frameCount;
                const angle = -Math.cos(progress * Math.PI * 2) * (sweepAngle / 2);

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

            // Reset camera to original position
            camera.position.x = Math.sin(originalAzimuth) * distance;
            camera.position.z = Math.cos(originalAzimuth) * distance;
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
