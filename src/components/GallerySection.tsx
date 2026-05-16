'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function GallerySection() {
  const images = [
    { src: '/porsche_exterior_action.webp', alt: 'Dynamic Porsche Exterior' },
    { src: '/porsche_interior_dark.webp', alt: 'Porsche Interior Dashboard' },
    { src: '/porsche_detail_wheel.webp', alt: 'Porsche Detail Wheel' },
  ];

  return (
    <section className="bg-[#050505] text-white py-16 md:py-24 px-4 md:px-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
         <div className="text-center mb-12 md:mb-16">
           <h2 className="text-2xl md:text-3xl tracking-[0.1em] text-white/90 font-light uppercase">Visuals</h2>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {images.map((img, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: idx * 0.2 }}
                className="relative aspect-[4/5] w-full overflow-hidden group rounded-sm"
              >
                {/* Fallback box if image is missing during loading/generation */}
                <div className="absolute inset-0 bg-white/5 flex items-center justify-center -z-10 text-white/20 text-xs">
                  Loading Image...
                </div>
                
                <Image 
                  src={img.src} 
                  alt={img.alt} 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                />
              </motion.div>
            ))}
         </div>
      </div>
    </section>
  );
}
