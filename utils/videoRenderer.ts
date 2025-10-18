import type { Scene } from '../types';

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const FRAME_RATE = 30;

// Helper to preload all images and handle potential errors
const loadImages = (scenes: Scene[]): Promise<HTMLImageElement[]> => {
    const promises = scenes.map(scene => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${scene.imageUrl}`));
            img.src = scene.imageUrl;
        });
    });
    return Promise.all(promises);
};

// Main function to render the video
export const renderVideo = (
  scenes: Scene[],
  audioUrl: string,
  onProgress: (progress: number) => void
): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    try {
        onProgress(0);
        
        const images = await loadImages(scenes);
        onProgress(5);

        const canvas = document.createElement('canvas');
        canvas.width = VIDEO_WIDTH;
        canvas.height = VIDEO_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get canvas context'));

        const audio = new Audio(audioUrl);
        await new Promise<void>(res => {
            audio.oncanplaythrough = () => res();
            audio.load();
        });

        const stream = canvas.captureStream(FRAME_RATE);
        
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(audio);
        const dest = audioContext.createMediaStreamDestination();
        source.connect(dest);
        
        const audioTrack = dest.stream.getAudioTracks()[0];
        stream.addTrack(audioTrack);
        
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9,opus' });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/mp4' }); // Even if recorded as webm, saving as mp4 usually works
            resolve(blob);
        };
        
        recorder.onerror = (e) => reject((e as any).error || new Error('MediaRecorder error'));

        let cumulativeDurations = scenes.reduce((acc, scene, index) => {
            acc.push((index > 0 ? acc[index - 1] : 0) + scene.duration);
            return acc;
        }, [] as number[]);

        let animationFrameId: number;

        const drawFrame = (time: number) => {
            const currentTime = audio.currentTime;

            const sceneIndex = cumulativeDurations.findIndex(d => currentTime < d);
            if(sceneIndex === -1 || !ctx) {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                return;
            }

            const currentScene = scenes[sceneIndex];
            const image = images[sceneIndex];
            const sceneStartTime = sceneIndex > 0 ? cumulativeDurations[sceneIndex - 1] : 0;
            const sceneElapsedTime = currentTime - sceneStartTime;
            const sceneProgress = Math.max(0, Math.min(1, sceneElapsedTime / currentScene.duration));

            // Clear canvas
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

            // Calculate aspect ratios
            const canvasAR = VIDEO_WIDTH / VIDEO_HEIGHT;
            const imageAR = image.width / image.height;

            let sWidth, sHeight, sx, sy;

            // Calculate dimensions for 'object-cover' to ensure 9:16 ratio
            if (imageAR > canvasAR) { // Image is wider than canvas, fit height
                sHeight = image.height;
                sWidth = sHeight * canvasAR;
                sx = (image.width - sWidth) / 2;
                sy = 0;
            } else { // Image is taller or same AR, fit width
                sWidth = image.width;
                sHeight = sWidth / canvasAR;
                sx = 0;
                sy = (image.height - sHeight) / 2;
            }

            // Apply Ken Burns zoom effect by adjusting the source rectangle
            const zoom = 1 + sceneProgress * 0.15; // Zoom from 1x to 1.15x
            const newSWidth = sWidth / zoom;
            const newSHeight = sHeight / zoom;
            const newSx = sx + (sWidth - newSWidth) / 2;
            const newSy = sy + (sHeight - newSHeight) / 2;
            
            ctx.drawImage(
                image,
                newSx, newSy, newSWidth, newSHeight, // source rect
                0, 0, VIDEO_WIDTH, VIDEO_HEIGHT // destination rect (entire canvas)
            );
            
            const totalProgress = (currentTime / 60) * 100;
            onProgress(Math.min(100, 5 + totalProgress * 0.95)); // 5% for loading, 95% for rendering

            if (audio.ended || audio.paused) {
                if(recorder.state === 'recording') recorder.stop();
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                return;
            }

            animationFrameId = requestAnimationFrame(drawFrame);
        };
        
        audio.onended = () => {
            if(recorder.state === 'recording') recorder.stop();
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            onProgress(100);
        };

        audio.play();
        recorder.start();
        animationFrameId = requestAnimationFrame(drawFrame);

    } catch (err) {
        reject(err);
    }
  });
};