export default function Footer() {
  return (
    <footer className="bg-black text-white/60 py-12 px-8 border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex flex-col gap-2">
           <h3 className="text-white/90 tracking-widest uppercase font-semibold mb-2">PORSCHE</h3>
           <p className="text-sm font-light">© {new Date().getFullYear()} Porsche Cars. All rights reserved.</p>
        </div>

        <div className="flex gap-12 text-sm tracking-wide font-light">
          <ul className="flex flex-col gap-3">
             <li className="hover:text-white transition-colors cursor-pointer">Build Your Porsche</li>
             <li className="hover:text-white transition-colors cursor-pointer">Compare Models</li>
             <li className="hover:text-white transition-colors cursor-pointer">Find a Dealer</li>
          </ul>
          <ul className="flex flex-col gap-3">
             <li className="hover:text-white transition-colors cursor-pointer">Privacy Policy</li>
             <li className="hover:text-white transition-colors cursor-pointer">Terms of Use</li>
             <li className="hover:text-white transition-colors cursor-pointer">Contact Us</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
