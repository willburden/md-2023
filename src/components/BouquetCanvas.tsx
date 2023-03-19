import { useCallback, useEffect, useRef } from 'react';

import image1 from '@/assets/bouquet-1.png';
import image2 from '@/assets/bouquet-2.png';
import image3 from '@/assets/bouquet-3.png';

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
const timeScale = 0.005;
const gravity = 70;
const groundHeight = 0.8;

export default function BouquetCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const permaCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef<number | null>(null);
  const imagesRef = useRef<HTMLImageElement[] | null>(null);
  const bouquetsRef = useRef<Bouquet[]>([]);
  const permaDrawQueueRef = useRef<Bouquet[]>([]);

  useEffect(() => {
    const fixedUpdate = () => {
      bouquetsRef.current.forEach(updateBouquet);
    };

    const updateBouquet = (bouquet: Bouquet, index: number) => {
      bouquet.transform.x += bouquet.velocity.x * timeScale;
      bouquet.transform.y += bouquet.velocity.y * timeScale;
      bouquet.transform.z += bouquet.velocity.z * timeScale;
      bouquet.transform.rotation += bouquet.velocity.angular * timeScale;

      bouquet.velocity.y += gravity * timeScale;
      if (
        bouquet.velocity.y > 0 &&
        bouquet.transform.y >= groundHeight - 0.1 + bouquet.transform.z * 0.18
      ) {
        bouquetsRef.current.splice(index, 1);
        permaDrawQueueRef.current.push(bouquet);
      }
    };

    const timer = setInterval(fixedUpdate, 1000 / 30);
    return () => {
      clearInterval(timer);
    };
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
      const x = bouquet.transform.x * canvas.width - (w / 2);
      const y = bouquet.transform.y * canvas.height - (h / 2);
      const hw = vw / 2;
      const hh = vh / 2;

      ctx.save();
      ctx.translate(x + hw, y + hh);
      ctx.rotate(bouquet.transform.rotation);
      ctx.drawImage(bouquet.image, -hw, -hh, vw, vh);
      ctx.restore();
    };

    const tick = () => {
      render();
      requestTick();
    };

    const requestTick = () => {
      requestIdRef.current = requestAnimationFrame(tick);
    };

    const cancelTicks = () => {
      if (requestIdRef.current !== null) {
        cancelAnimationFrame(requestIdRef.current);
        requestIdRef.current = null;
      }
    };
  
    requestTick();
    return cancelTicks;
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
          z: Math.random() * -0.7 - 1.5,
          angular: Math.sign(Math.random() - 0.5) * (Math.random() * 0.3 + 0.2) * 100,
        },
        scale: 1.5 + Math.random() * 0.4,
      });
    };

    let timer: NodeJS.Timeout;
    const spawnNext = () => {
      timer = setTimeout(() => {
        spawnBouquet();
        spawnNext();
      }, 250);
    };

    spawnNext();
    return () => {
      clearTimeout(timer);
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

    loadImages().then(() => {
      startRenderLoop();
      startSpawnLoop();
    });
  }, [startRenderLoop, startSpawnLoop]);

  return (
    <div className='bouquet-canvas-container' ref={containerRef}>
      <canvas className='bouquet-canvas' ref={permaCanvasRef}></canvas>
      <canvas className='bouquet-canvas' ref={canvasRef}></canvas>
    </div>
  );
}
