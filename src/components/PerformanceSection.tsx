'use client';
import { motion } from 'framer-motion';

export default function PerformanceSection() {
  return (
    <section className="min-h-screen bg-black text-white py-24 px-8 relative overflow-hidden flex flex-col justify-center border-t border-white/10">
      <div className="max-w-5xl mx-auto w-full">
        <motion.div
           initial={{ opacity: 0, y: 50 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true, margin: "-100px" }}
           transition={{ duration: 0.8, ease: "easeOut" }}
           className="mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-light tracking-tight mb-4">The Anatomy of Speed</h2>
          <p className="text-white/60 text-lg max-w-xl font-light tracking-wide leading-relaxed">
            Every curve and component is engineered for pure performance. The aerodynamics are not just visually striking—they dictate the rules of physics.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-white/20 pt-12">
          {/* Stat 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col"
          >
            <span className="text-5xl font-light mb-2">2.7s</span>
            <span className="text-sm tracking-widest text-white/50 uppercase">0-60 MPH</span>
          </motion.div>

          {/* Stat 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col"
          >
            <span className="text-5xl font-light mb-2">670</span>
            <span className="text-sm tracking-widest text-white/50 uppercase">Horsepower</span>
          </motion.div>

          {/* Stat 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col"
          >
            <span className="text-5xl font-light mb-2">199</span>
            <span className="text-sm tracking-widest text-white/50 uppercase">Top Track Speed (mph)</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
