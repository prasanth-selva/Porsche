import ScrollSequence from '@/components/ScrollSequence';
import PerformanceSection from '@/components/PerformanceSection';
import GallerySection from '@/components/GallerySection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="flex-grow w-full bg-black text-white selection:bg-white/20">
      <ScrollSequence />
      <PerformanceSection />
      <GallerySection />
      <Footer />
    </main>
  );
}
