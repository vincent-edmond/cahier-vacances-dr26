// Footer minimal de l'app (SaaS) : sur le même fond clair que la page,
// pour éviter la bande sombre qui formerait un « L » avec la sidebar.
export function Footer() {
  return (
    <footer className="border-t border-[#E6E9F0]">
      <div className="max-w-5xl mx-auto px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <nav className="flex items-center gap-5">
          <a
            href="https://www.maxpiccinini.com/destination-reussite/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#9096A5] hover:text-[#00194C] text-[13px] transition-colors"
          >
            Destination Réussite
          </a>
          <a
            href="https://www.maxpiccinini.com/politique-de-vie-privee/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#9096A5] hover:text-[#00194C] text-[13px] transition-colors"
          >
            Vie privée
          </a>
          <a
            href="https://www.maxpiccinini.com/mentionslegales-impressum/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#9096A5] hover:text-[#00194C] text-[13px] transition-colors"
          >
            Mentions légales
          </a>
        </nav>
        <p className="text-[#9096A5] text-[13px]">© 2026 Max Piccinini</p>
      </div>
    </footer>
  );
}
