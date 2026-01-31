export class GifExporter {
    constructor(renderer, width, height) {
        this.renderer = renderer;
        this.width = width;
        this.height = height;
    }

    async export(scene, camera, orbitControls, speed, onProgress, billboardWidth, billboardHeight, sweepAngleDegrees, filename) {
        return new Promise((resolve, reject) => {
            // Crop viewport to match billboard aspect ratio
            const billboardAspect = billboardWidth / billboardHeight;
            const viewportAspect = this.width / this.height;

            let cropWidth, cropHeight, cropX, cropY;

            if (viewportAspect > billboardAspect) {
                // Viewport is wider than billboard - crop sides
                cropHeight = this.height;
                cropWidth = Math.floor(this.height * billboardAspect);
                cropX = Math.floor((this.width - cropWidth) / 2);
                cropY = 0;
            } else {
                // Viewport is taller than billboard - crop top/bottom
                cropWidth = this.width;
                cropHeight = Math.floor(this.width / billboardAspect);
                cropX = 0;
                cropY = Math.floor((this.height - cropHeight) / 2);
            }

            // Scale down to max 700px width
            const maxWidth = 700;
            const scale = Math.min(1, maxWidth / cropWidth);
            const outputWidth = Math.floor(cropWidth * scale);
            const outputHeight = Math.floor(cropHeight * scale);

            const gif = new GIF({
                workers: 2,
                quality: 5,
                width: outputWidth,
                height: outputHeight,
                workerScript: 'js/gif.worker.js'
            });

            // Create a temporary canvas for cropping and scaling
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = outputWidth;
            cropCanvas.height = outputHeight;
            const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });

            const frameCount = 120;
            const duration = 3000 / (speed / 5);
            const sweepAngle = Math.PI * (sweepAngleDegrees / 180);
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

                // Crop and scale the frame
                const canvas = this.renderer.domElement;
                cropCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);
                gif.addFrame(cropCanvas, { copy: true, delay: duration / frameCount });

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
                a.download = `${filename}.gif`;
                a.click();
                URL.revokeObjectURL(url);
                resolve();
            });

            gif.render();
        });
    }
}
