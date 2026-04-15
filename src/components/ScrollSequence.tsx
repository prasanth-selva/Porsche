'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useScroll, useTransform, motion, useMotionValueEvent } from 'framer-motion';

const TOTAL_FRAMES = 300;
const FRAME_PREFIX = '/hero/ezgif-frame-';
const FRAME_SUFFIX = '.png';

export default function ScrollSequence() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Framer Motion scroll hook tied to the component's div
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Map scroll progress to a frame index
  const currentIndex = useTransform(scrollYProgress, [0, 1], [0, TOTAL_FRAMES - 1]);

  useEffect(() => {
    // Preload all images
    let loadedCount = 0;
    const loadedImages: HTMLImageElement[] = [];

    const loadImages = async () => {
      for (let i = 1; i <= TOTAL_FRAMES; i++) {
        const img = new Image();
        const paddedIndex = String(i).padStart(3, '0');
        img.src = `${FRAME_PREFIX}${paddedIndex}${FRAME_SUFFIX}`;
        
        await new Promise((resolve) => {
          img.onload = () => {
            loadedCount++;
            setLoadingProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
            loadedImages.push(img);
            resolve(null);
          };
          img.onerror = () => {
             // To prevent infinite hang on error, we resolve anyway
             loadedCount++;
             loadedImages.push(img);
             resolve(null);
          }
        });
      }
      setImages(loadedImages);
      setIsLoaded(true);
    };

    loadImages();
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
    if (isLoaded && images.length > 0) {
      drawToCanvas(images[0]);
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

    // Calculate scaling mechanism to guarantee aspect ratio "contain", with increased zoom
    const ZOOM_FACTOR = 1.35;
    const hRatio = canvas.width / image.width;
    const vRatio = canvas.height / image.height;
    const ratio = Math.min(hRatio, vRatio) * ZOOM_FACTOR;

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
    <div ref={containerRef} className="relative h-[1000vh] bg-black">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        
        {/* Loading Spinner */}
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50 text-white">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-white/60 tracking-widest text-sm uppercase">Engine Starting... {loadingProgress}%</p>
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
               className="w-full text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
               style={{
                 opacity: useTransform(scrollYProgress, [0, 0.1, 0.15], [1, 1, 0])
               }}
             >
               <h1 className="text-white/90 text-4xl md:text-6xl font-semibold tracking-tight">The Art of Engineering</h1>
             </motion.div>

             {/* 30% Scroll: Feature / Message #1 (Left aligned) */}
             <motion.div 
               className="w-full absolute left-10 md:left-24 max-w-sm"
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
               className="w-full absolute right-10 md:right-24 max-w-sm text-right flex flex-col items-end"
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
               className="w-full text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
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
