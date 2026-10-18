'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useScroll, useTransform, motion, useMotionValueEvent } from 'framer-motion';
import Lenis from 'lenis';

const TOTAL_FRAMES = 300;
const FRAME_CONCURRENCY = 6;
const FRAME_PREFIX = '/hero/ezgif-frame-';
const FRAME_SUFFIX = '.webp';
type LoadState = 'loading' | 'error' | 'ready';

export default function ScrollSequence() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameImagesRef = useRef<(HTMLImageElement | null)[]>(Array.from({ length: TOTAL_FRAMES }, () => null));
  const frameRequestsRef = useRef(new Map<number, Promise<HTMLImageElement>>());
  const failedFramesRef = useRef<number[]>([]);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loadedFrameCount, setLoadedFrameCount] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const isLoaded = loadState === 'ready';
  const loadingProgress = Math.floor((loadedFrameCount / TOTAL_FRAMES) * 100);

  // Framer Motion tracks the page's native scroll position; Lenis is initialized only after every frame is ready.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const currentIndex = useTransform(scrollYProgress, [0, 1], [0, TOTAL_FRAMES - 1]);

  // Block every user scroll input while loading or retrying, and restore the exact previous styles on release.
  useLayoutEffect(() => {
    if (isLoaded) return;

    const root = document.documentElement;
    const body = document.body;
    const lockedScrollY = window.scrollY;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousRootOverscroll = root.style.overscrollBehavior;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousRootTouchAction = root.style.touchAction;
    const previousBodyTouchAction = body.style.touchAction;

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    root.style.touchAction = 'none';
    body.style.touchAction = 'none';

    const preventScrollInput = (event: Event) => event.preventDefault();
    const preventScrollKeys = (event: KeyboardEvent) => {
      if ([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
      }
    };
    const keepScrollPosition = () => {
      if (window.scrollY !== lockedScrollY) window.scrollTo(0, lockedScrollY);
    };

    document.addEventListener('wheel', preventScrollInput, { capture: true, passive: false });
    document.addEventListener('touchmove', preventScrollInput, { capture: true, passive: false });
    document.addEventListener('keydown', preventScrollKeys, true);
    window.addEventListener('scroll', keepScrollPosition, { passive: true });

    return () => {
      document.removeEventListener('wheel', preventScrollInput, true);
      document.removeEventListener('touchmove', preventScrollInput, true);
      document.removeEventListener('keydown', preventScrollKeys, true);
      window.removeEventListener('scroll', keepScrollPosition);
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      root.style.overscrollBehavior = previousRootOverscroll;
      body.style.overscrollBehavior = previousBodyOverscroll;
      root.style.touchAction = previousRootTouchAction;
      body.style.touchAction = previousBodyTouchAction;
    };
  }, [isLoaded]);

  // Load every frame with a six-request ceiling. Successful frames are retained across retries;
  // failed URLs are retried only after the current queue settles, so requests are never duplicated.
  useEffect(() => {
    let cancelled = false;
    const framesToLoad = failedFramesRef.current.length > 0
      ? [...failedFramesRef.current]
      : Array.from({ length: TOTAL_FRAMES }, (_, index) => index + 1)
          .filter((frameNumber) => !frameImagesRef.current[frameNumber - 1]);
    const failedThisAttempt: number[] = [];
    let nextFrameIndex = 0;

    failedFramesRef.current = [];
    setLoadState('loading');

    const loadFrame = (frameNumber: number): Promise<HTMLImageElement> => {
      const loadedImage = frameImagesRef.current[frameNumber - 1];
      if (loadedImage) return Promise.resolve(loadedImage);

      const existingRequest = frameRequestsRef.current.get(frameNumber);
      if (existingRequest) return existingRequest;

      const image = new Image();
      image.decoding = 'async';
      const request = new Promise<HTMLImageElement>((resolve, reject) => {
        image.onload = () => {
          void image.decode().then(() => {
            frameImagesRef.current[frameNumber - 1] = image;
            resolve(image);
          }).catch(reject);
        };
        image.onerror = () => reject(new Error(`Failed to load frame ${frameNumber}`));
        image.src = `${FRAME_PREFIX}${String(frameNumber).padStart(3, '0')}${FRAME_SUFFIX}`;
      }).finally(() => {
        frameRequestsRef.current.delete(frameNumber);
      });

      frameRequestsRef.current.set(frameNumber, request);
      return request;
    };

    const worker = async () => {
      while (!cancelled) {
        const frameNumber = framesToLoad[nextFrameIndex++];
        if (frameNumber === undefined) return;
        const succeeded = await loadFrame(frameNumber).then(() => true, () => false);
        if (cancelled) return;
        if (succeeded) {
          setLoadedFrameCount(frameImagesRef.current.filter(Boolean).length);
        } else {
          failedThisAttempt.push(frameNumber);
        }
      }
    };

    const runQueue = async () => {
      await Promise.all(
        Array.from({ length: Math.min(FRAME_CONCURRENCY, framesToLoad.length) }, () => worker())
      );
      if (cancelled) return;
      if (failedThisAttempt.length > 0) {
        failedFramesRef.current = failedThisAttempt;
        setLoadState('error');
        return;
      }

      setImages(frameImagesRef.current as HTMLImageElement[]);
      setLoadedFrameCount(TOTAL_FRAMES);
      setLoadState('ready');
    };

    void runQueue();
    return () => {
      cancelled = true;
    };
  }, [retryAttempt]);

  // Lenis shares a requestAnimationFrame loop with the scroll sequence and is fully torn down on unmount.
  useEffect(() => {
    if (!isLoaded) return;

    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      respectReducedMotion: true,
    });
    let animationFrameId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      animationFrameId = window.requestAnimationFrame(raf);
    };

    animationFrameId = window.requestAnimationFrame(raf);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, [isLoaded]);

  // Use motion value event to trigger the canvas render draw on scroll update
  useMotionValueEvent(currentIndex, "change", (latestRef) => {
      if (!isLoaded || !canvasRef.current || images.length === 0) return;
      
      const index = Math.min(Math.max(Math.floor(latestRef), 0), TOTAL_FRAMES - 1);
      const image = images[index];
      
      if (image && image.complete && image.naturalWidth !== 0) {
        drawToCanvas(image);
      }
  });

  // Draw the frame corresponding to the current scroll position as soon as the full sequence is ready.
  useEffect(() => {
    if (!isLoaded || images.length !== TOTAL_FRAMES) return;
    const index = Math.min(Math.max(Math.floor(currentIndex.get()), 0), TOTAL_FRAMES - 1);
    const image = images[index];
    if (image) drawToCanvas(image);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, images]);

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
    <div ref={containerRef} aria-busy={!isLoaded} className="relative h-[800vh] md:h-[1000vh] bg-black">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        
        {!isLoaded && loadState === 'loading' && (
          <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black px-6 text-white"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="mb-6 h-16 w-16 animate-spin motion-reduce:animate-none rounded-full border-4 border-white/20 border-t-white" aria-hidden="true" />
            <p className="text-sm uppercase tracking-widest text-white/80">Preparing the drive</p>
            <p className="mt-2 text-sm text-white/60" aria-hidden="true">
              {loadedFrameCount} of {TOTAL_FRAMES} frames loaded · {loadingProgress}%
            </p>
            <progress
              className="sr-only"
              max={TOTAL_FRAMES}
              value={loadedFrameCount}
              aria-label="Loading Porsche frame sequence"
              aria-valuetext={`${loadedFrameCount} of ${TOTAL_FRAMES} frames loaded (${loadingProgress}%)`}
            />
          </div>
        )}
        {!isLoaded && loadState === 'error' && (
          <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black px-6 text-center text-white"
            role="alert"
            aria-live="assertive"
          >
            <h2 className="text-lg font-medium">The Porsche animation could not be fully loaded</h2>
            <p className="mt-3 max-w-md text-sm text-white/70">
              {failedFramesRef.current.length} {failedFramesRef.current.length === 1 ? 'frame failed' : 'frames failed'} to load.
              The experience remains locked until all {TOTAL_FRAMES} frames are ready.
            </p>
            <p className="mt-2 text-sm text-white/60">{loadedFrameCount} of {TOTAL_FRAMES} frames loaded · {loadingProgress}%</p>
            <button
              type="button"
              className="mt-6 rounded-sm border border-white/50 px-6 py-3 text-sm uppercase tracking-widest transition-colors hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              onClick={() => setRetryAttempt((attempt) => attempt + 1)}
            >
              Retry loading frames
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          aria-hidden="true"
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
