import ScrollSequence from '@/components/ScrollSequence';

export default function Home() {
  return (
    <main className="flex-grow w-full bg-black text-white selection:bg-white/20">
      <ScrollSequence />
      
      {/* Footer / Outro to allow a smooth finish after scroll */}
      <footer className="h-screen w-full flex items-center justify-center border-t border-white/10">
        <div className="text-center">
          <p className="text-white/60 mb-4 tracking-[0.2em] text-sm uppercase">End of sequence</p>
          <h2 className="text-2xl font-light tracking-wide text-white/90">PORSCHE DESTRUCTIVE DESIGN</h2>
        </div>
      </footer>
    </main>
  );
}
