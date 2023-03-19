import { useCallback, useEffect, useRef } from 'react';

import image1 from '@/assets/bouquet-1.png';
import image2 from '@/assets/bouquet-2.png';
import image3 from '@/assets/bouquet-3.png';
import gameLoop from '@/constants/gameLoop';

const imagePaths = [
  image1.src,
  image2.src,
  image3.src,
];

type Bouquet = {
  image: HTMLImageElement,
  transform: {
    x: number,
    y: number,
    z: number,
    rotation: number,
  },
  velocity: {
    x: number,
    y: number,
    z: number,
    angular: number,
  },
  scale: number,
}

const bouquetAvgScale = 0.1;
const bouquetMinWidth = 130;
const bouquetMaxWidth = 200;
const timeScale = 0.0002;
const gravity = 70;
const groundHeight = 0.6;
const groundDepth = 0.68;
const spawnInterval = 200;

export default function BouquetCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const permaCanvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[] | null>(null);
  const bouquetsRef = useRef<Bouquet[]>([]);
  const permaDrawQueueRef = useRef<Bouquet[]>([]);

  const startUpdateLoop = useCallback(() => {
    const update = (delta: number) => {
      bouquetsRef.current.forEach((bouquet, index) => updateBouquet(delta, bouquet, index));
    };

    const updateBouquet = (delta: number, bouquet: Bouquet, index: number) => {
      const scalar = timeScale * delta;
      bouquet.transform.x += bouquet.velocity.x * scalar;
      bouquet.transform.y += bouquet.velocity.y * scalar;
      bouquet.transform.z += bouquet.velocity.z * scalar;
      bouquet.transform.rotation += bouquet.velocity.angular * scalar;

      bouquet.velocity.y += gravity * scalar;
      if (bouquet.velocity.y > 0) {
        if (bouquet.transform.y > 1.3) {
          bouquetsRef.current.splice(index, 1);
        }
        if (
          bouquet.transform.z <= groundDepth &&
          bouquet.transform.y <= groundHeight + 0.1 &&
          bouquet.transform.y >= groundHeight - 0.1 + bouquet.transform.z * 0.2
        ) {
          bouquetsRef.current.splice(index, 1);
          permaDrawQueueRef.current.push(bouquet);
        }
      }
    };

    return gameLoop(update);
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      canvasRef.current!.width = containerRef.current!.offsetWidth;
      canvasRef.current!.height = containerRef.current!.offsetHeight;
      permaCanvasRef.current!.width = containerRef.current!.offsetWidth;
      permaCanvasRef.current!.height = containerRef.current!.offsetHeight;
    });
    observer.observe(containerRef.current!);
    return () => { observer.disconnect(); };
  }, []);

  const startRenderLoop = useCallback(() => {
    const render = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      permaDrawQueueRef.current.forEach(bouquet => renderBouquet(permaCanvasRef.current!, bouquet));
      permaDrawQueueRef.current = [];

      bouquetsRef.current.forEach(bouquet => renderBouquet(canvas, bouquet));
    };

    const renderBouquet = (canvas: HTMLCanvasElement, bouquet: Bouquet) => {
      const ctx = canvas.getContext('2d')!;

      const naiveWidth = canvas.width * bouquetAvgScale * bouquet.scale;
      const w = Math.min(Math.max(naiveWidth, bouquetMinWidth), bouquetMaxWidth);
      const h = w * bouquet.image.naturalHeight / bouquet.image.naturalWidth;
      const vw = w * bouquet.transform.z;
      const vh = h * bouquet.transform.z;
      const x = bouquet.transform.x * canvas.width;
      const y = bouquet.transform.y * canvas.height;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(bouquet.transform.rotation);
      ctx.drawImage(bouquet.image, -vw / 2, -vh / 2, vw, vh);
      ctx.restore();
    };
    
    return gameLoop(render);
  }, []);

  const startSpawnLoop = useCallback(() => {
    const spawnBouquet = () => {
      if (imagesRef.current === null) return;
      const randomImage = () => {
        const images = imagesRef.current!;
        return images[Math.floor(Math.random() * images.length)];
      };
      const transform = {
        x: Math.random(),
        y: 1,
        z: 1,
        rotation: Math.random(),
      };
      bouquetsRef.current?.push({
        image: randomImage(),
        transform,
        velocity: {
          x: (0.5 - transform.x + Math.random() * 0.6 - 0.3) * 4,
          y: Math.random() * -2 - 8,
          z: Math.random() * 0.7 - 2.1,
          angular: Math.sign(Math.random() - 0.5) * (Math.random() * 0.3 + 0.2) * 100,
        },
        scale: 1.5 + Math.random() * 0.4,
      });
    };

    console.log('starting spawn loop');
    const timer = setInterval(spawnBouquet, spawnInterval);
    return () => {
      console.log('cancelling spawn loop');
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const loadImages = () => {
      imagesRef.current = [];
      return Promise.all(imagePaths.map(path => new Promise(resolve => {
        const image = new Image();
        image.onload = resolve;
        image.src = path;
        imagesRef.current!.push(image);
      }))).then(() => {});
    };
    
    console.log('starting');
    let cancelRender: (() => void) | undefined;
    let cancelUpdate: (() => void) | undefined;
    let cancelSpawn: (() => void) | undefined;
    const loadPromise = loadImages().then(() => {
      cancelRender = startRenderLoop();
      cancelUpdate = startUpdateLoop();
      cancelSpawn = startSpawnLoop();
    });
    return () => {
      console.log('ending');
      loadPromise.then(() => {
        cancelRender!();
        cancelUpdate!();
        cancelSpawn!();
      });
    };
  }, [startRenderLoop, startUpdateLoop, startSpawnLoop]);

  return (
    <div className='bouquet-canvas-container' ref={containerRef}>
      <canvas className='bouquet-canvas' ref={permaCanvasRef}></canvas>
      <canvas className='bouquet-canvas' ref={canvasRef}></canvas>
    </div>
  );
}
