'use client';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio element with looping
    audioRef.current = new Audio('/music.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;

    return () => {
      // Cleanup on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((error) => {
        console.error("Audio playback failed:", error);
      });
      setIsPlaying(true);
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] px-8 py-6 flex justify-between items-center mix-blend-difference pointer-events-none">
       {/* Brand Logo / Name */}
       <div className="text-white text-xl font-bold tracking-[0.3em] pointer-events-auto cursor-pointer">
         PORSCHE
       </div>

       {/* Sub-menu / Audio Toggle */}
       <div className="flex items-center gap-6 pointer-events-auto">
         <button 
           onClick={toggleMusic}
           className="text-white/80 hover:text-white text-xs tracking-widest uppercase transition-colors flex items-center gap-2"
         >
           <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
           {isPlaying ? 'SOUND ON' : 'SOUND OFF'}
         </button>
       </div>
    </nav>
  );
}
