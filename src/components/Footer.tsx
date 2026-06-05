import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#000D2B] border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/" className="font-display font-extrabold text-white text-sm tracking-wide">
          SUMMER <span className="text-[#6B9FFF]">BUSINESS</span>
        </Link>
        <nav className="flex items-center gap-5">
          <a
            href="https://www.maxpiccinini.com/destination-reussite/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/55 hover:text-white text-[13px] transition-colors"
          >
            Destination Réussite
          </a>
          <a
            href="https://www.maxpiccinini.com/politique-de-vie-privee/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/55 hover:text-white text-[13px] transition-colors"
          >
            Vie privée
          </a>
          <a
            href="https://www.maxpiccinini.com/mentionslegales-impressum/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/55 hover:text-white text-[13px] transition-colors"
          >
            Mentions légales
          </a>
        </nav>
        <p className="text-white/35 text-[13px]">© 2026 Max Piccinini</p>
      </div>
    </footer>
  );
}
