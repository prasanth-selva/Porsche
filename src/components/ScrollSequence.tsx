'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useScroll, useTransform, motion, useMotionValueEvent } from 'framer-motion';

const TOTAL_FRAMES = 300;
const INITIAL_FRAMES = 12;
const FRAME_CONCURRENCY = 6;
const SCROLL_GATE_TIMEOUT_MS = 10_000;
const FRAME_PREFIX = '/hero/ezgif-frame-';
const FRAME_SUFFIX = '.webp';

export default function ScrollSequence() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [scrollUnlocked, setScrollUnlocked] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // Framer Motion scroll hook tied to the component's div
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Map scroll progress to a frame index
  const currentIndex = useTransform(scrollYProgress, [0, 1], [0, TOTAL_FRAMES - 1]);

  // Keep the page still until the opening frames have settled. Always release
  // the lock on readiness, failure, timeout, or unmount.
  useEffect(() => {
    if (scrollUnlocked) return;

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    const timeout = window.setTimeout(() => {
      setLoadingTimedOut(true);
      setScrollUnlocked(true);
    }, SCROLL_GATE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeout);
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [scrollUnlocked]);

  // Load a small opening window first, then stream the remaining frames with
  // bounded concurrency instead of creating 300 simultaneous requests.
  useEffect(() => {
    let cancelled = false;
    let settledCount = 0;
    let initialSettledCount = 0;
    let successfulInitialCount = 0;
    const loadedImagesArray: HTMLImageElement[] = new Array(TOTAL_FRAMES);

    const loadFrame = (frameNumber: number) => new Promise<void>((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (!cancelled) {
          loadedImagesArray[frameNumber - 1] = image;
          settledCount += 1;
          if (frameNumber <= INITIAL_FRAMES) successfulInitialCount += 1;
          setLoadingProgress(Math.round((settledCount / TOTAL_FRAMES) * 100));

          if (frameNumber <= INITIAL_FRAMES) {
            setIsLoaded(true);
            setImages([...loadedImagesArray]);
          }
          if (settledCount % 12 === 0 || settledCount === TOTAL_FRAMES) {
            setImages([...loadedImagesArray]);
          }
        }
        resolve();
      };
      image.onerror = () => {
        if (!cancelled) {
          settledCount += 1;
          setLoadingProgress(Math.round((settledCount / TOTAL_FRAMES) * 100));
        }
        resolve();
      };
      image.src = `${FRAME_PREFIX}${String(frameNumber).padStart(3, '0')}${FRAME_SUFFIX}`;
    });

    const runQueue = async (firstFrame: number, lastFrame: number) => {
      let nextFrame = firstFrame;
      const worker = async () => {
        while (!cancelled) {
          const frameNumber = nextFrame++;
          if (frameNumber > lastFrame) return;
          await loadFrame(frameNumber);
          if (frameNumber <= INITIAL_FRAMES) {
            initialSettledCount += 1;
            if (initialSettledCount === INITIAL_FRAMES && !cancelled) {
              setImages([...loadedImagesArray]);
              if (successfulInitialCount === 0) setLoadFailed(true);
              setScrollUnlocked(true);
            }
          }
        }
      };
      await Promise.all(Array.from(
        { length: Math.min(FRAME_CONCURRENCY, lastFrame - firstFrame + 1) },
        () => worker()
      ));
    };

    void runQueue(1, TOTAL_FRAMES);
    return () => {
      cancelled = true;
    };
  }, []);

  // Use motion value event to trigger the canvas render draw on scroll update
  useMotionValueEvent(currentIndex, "change", (latestRef) => {
      if (!isLoaded || !canvasRef.current || images.length === 0) return;
      
      const index = Math.min(Math.max(Math.floor(latestRef), 0), TOTAL_FRAMES - 1);
      const image = images[index];
      
      if (image && image.complete && image.naturalWidth !== 0) {
        drawToCanvas(image);
      }
  });

  // Also initial draw when loaded
  useEffect(() => {
    const firstAvailableImage = images.find(Boolean);
    if (isLoaded && firstAvailableImage) {
      drawToCanvas(firstAvailableImage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  const drawToCanvas = (image: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match the window to act as container
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Calculate scaling mechanism to guarantee aspect ratio "cover"
    // This ensures the image fills the entire screen on both mobile and desktop without black bars
    const hRatio = canvas.width / image.width;
    const vRatio = canvas.height / image.height;
    const ratio = Math.max(hRatio, vRatio);

    const centerShift_x = (canvas.width - image.width * ratio) / 2;
    const centerShift_y = (canvas.height - image.height * ratio) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dark mode bg (pure dark #000000 as configured for the background color)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw image smoothly centered
    ctx.drawImage(
      image,
      0,
      0,
      image.width,
      image.height,
      centerShift_x,
      centerShift_y,
      image.width * ratio,
      image.height * ratio
    );
  };

  // Re-draw the canvas when resizing the browser window
  useEffect(() => {
    const handleResize = () => {
      if (isLoaded && images.length > 0) {
        const index = Math.min(Math.max(Math.floor(currentIndex.get()), 0), TOTAL_FRAMES - 1);
        const image = images[index];
        if (image && image.complete) {
          drawToCanvas(image);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, images]);

  return (
    <div ref={containerRef} className="relative h-[800vh] md:h-[1000vh] bg-black">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        
        {!scrollUnlocked && !loadingTimedOut && !loadFailed && (
          <div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-white"
            role="status"
            aria-live="polite"
          >
            <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-white" aria-hidden="true" />
            <p className="text-sm uppercase tracking-widest text-white/60">Preparing the drive… {loadingProgress}%</p>
            <progress className="sr-only" max={100} value={loadingProgress} aria-label="Loading Porsche frame sequence" />
          </div>
        )}
        {!isLoaded && (loadingTimedOut || loadFailed) && (
          <div
            className="absolute inset-x-4 top-6 z-50 mx-auto flex max-w-lg items-center justify-between gap-4 rounded-sm border border-white/20 bg-black/90 px-4 py-3 text-sm text-white"
            role="status"
            aria-live="polite"
          >
            <span>
              {loadFailed
                ? 'The Porsche animation could not load. Scrolling is available.'
                : 'Frame loading is taking longer than expected. Scrolling is available.'}
            </span>
            <button
              type="button"
              className="shrink-0 underline underline-offset-4"
              onClick={() => {
                setLoadingTimedOut(false);
                setLoadFailed(false);
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover transition-opacity duration-1000 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Text Overlays (The Story) map to their scroll positions */}
        <div className="absolute inset-0 pointer-events-none layout-container flex items-center">
             
             {/* 0% Scroll: Hero Headline (Centered) */}
             <motion.div 
               className="w-full text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4"
               style={{
                 opacity: useTransform(scrollYProgress, [0, 0.1, 0.15], [1, 1, 0])
               }}
             >
               <h1 className="text-white/90 text-4xl md:text-6xl font-semibold tracking-tight">The Art of Engineering</h1>
             </motion.div>

             {/* 30% Scroll: Feature / Message #1 (Left aligned) */}
             <motion.div 
               className="w-full absolute left-4 md:left-24 max-w-xs md:max-w-sm px-4 md:px-0"
               style={{
                 opacity: useTransform(scrollYProgress, [0.2, 0.3, 0.4], [0, 1, 0]),
                 y: useTransform(scrollYProgress, [0.2, 0.4], [20, -20])
               }}
             >
               <h2 className="text-white/90 text-2xl md:text-3xl font-medium mb-3">Precision Deconstructed</h2>
               <p className="text-white/60 text-base leading-relaxed hidden sm:block">
                 Every component is meticulously crafted. The balance of aerodynamics and mechanical perfection.
               </p>
             </motion.div>

             {/* 60% Scroll: Feature / Message #2 (Right aligned) */}
             <motion.div 
               className="w-full absolute right-4 md:right-24 max-w-xs md:max-w-sm text-right flex flex-col items-end px-4 md:px-0"
               style={{
                 opacity: useTransform(scrollYProgress, [0.5, 0.6, 0.7], [0, 1, 0]),
                 y: useTransform(scrollYProgress, [0.5, 0.7], [20, -20])
               }}
             >
               <h2 className="text-white/90 text-2xl md:text-3xl font-medium mb-3">Uncompromising Power</h2>
               <p className="text-white/60 text-base leading-relaxed text-right hidden sm:block">
                 The heart of the beast lies within its meticulously balanced core.
               </p>
             </motion.div>

             {/* 90% Scroll: CTA / Final Message (Centered) */}
             <motion.div 
               className="w-full text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4"
               style={{
                 opacity: useTransform(scrollYProgress, [0.8, 0.9, 1], [0, 1, 1]),
                 y: useTransform(scrollYProgress, [0.8, 1], [20, 0])
               }}
             >
               <h2 className="text-white/90 text-4xl md:text-5xl font-semibold mb-6 tracking-tight">The Vision Reborn</h2>
               <button className="px-8 py-3 bg-white text-black font-medium text-sm tracking-widest uppercase hover:bg-white/80 transition-colors rounded-sm pointer-events-auto">
                 Experience The Drive
               </button>
             </motion.div>
        </div>

      </div>
    </div>
  );
}
