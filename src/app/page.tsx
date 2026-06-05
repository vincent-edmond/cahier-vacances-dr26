import Link from "next/link";
import { getCapsules, formatDateFr } from "@/lib/capsules";

export default function LandingPage() {
  const capsules = getCapsules();

  return (
    <div className="lp">
      <style>{`
        .lp { font-family: var(--font-inter), sans-serif; color: #0A0A0F; background: #fff; line-height: 1.6; }
        .lp .container { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
        .lp .display { font-family: var(--font-poppins), sans-serif; }

        .lp-nav { position: sticky; top: 0; z-index: 50; background: #000D2B; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 14px 0; }
        .lp-nav-inner { display: flex; align-items: center; justify-content: space-between; }
        .lp-logo { font-family: var(--font-poppins); font-weight: 800; color: #fff; font-size: 16px; letter-spacing: 0.02em; text-decoration: none; }
        .lp-logo span { color: #6B9FFF; }
        .lp-nav-cta { color: rgba(255,255,255,0.85); font-size: 14px; font-weight: 600; text-decoration: none; border: 1px solid rgba(255,255,255,0.25); border-radius: 100px; padding: 8px 18px; transition: all .2s; }
        .lp-nav-cta:hover { background: rgba(255,255,255,0.08); color: #fff; }

        .lp-hero { position: relative; overflow: hidden; background: #000D2B; padding: 80px 0 88px; text-align: center; }
        .lp-hero::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,70,255,0.32) 0%, transparent 70%); pointer-events:none; }
        .lp-hero-inner { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 22px; }
        .lp-badge { display:inline-flex; align-items:center; gap:8px; background: rgba(0,70,255,0.16); border:1px solid rgba(0,70,255,0.4); color:#6B9FFF; border-radius:100px; padding:8px 18px; font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; }
        .lp-hero h1 { font-family: var(--font-poppins); font-weight: 800; color:#fff; font-size: clamp(30px, 5vw, 52px); line-height: 1.12; max-width: 820px; }
        .lp-hero h1 .accent { color:#6B9FFF; display:block; }
        .lp-hero p.sub { color: rgba(255,255,255,0.72); font-size: clamp(16px,1.7vw,18px); max-width: 620px; line-height: 1.6; }
        .lp-cta { display:inline-flex; align-items:center; gap:8px; background:#0046FF; color:#fff; padding:18px 40px; border-radius:100px; font-size:17px; font-weight:700; text-decoration:none; box-shadow:0 6px 28px rgba(0,70,255,0.45); transition: all .2s; }
        .lp-cta:hover { background:#0033CC; transform: translateY(-2px); }
        .lp-hero .reassure { color: rgba(255,255,255,0.45); font-size: 13px; }

        .lp-how { background:#F7F8FA; padding: 72px 0; }
        .lp-section-label { font-size:12px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#0046FF; text-align:center; margin-bottom:10px; }
        .lp-section-title { font-family: var(--font-poppins); font-weight:800; color:#00194C; text-align:center; font-size: clamp(24px,4vw,36px); margin-bottom: 44px; }
        .lp-steps { display:grid; grid-template-columns: repeat(4,1fr); gap:18px; }
        @media (max-width:820px){ .lp-steps{ grid-template-columns:1fr 1fr; } }
        @media (max-width:480px){ .lp-steps{ grid-template-columns:1fr; } }
        .lp-step { background:#fff; border:1px solid #E2E4EA; border-radius:18px; padding:24px 20px; text-align:center; }
        .lp-step .ic { font-size:30px; margin-bottom:12px; }
        .lp-step h3 { font-weight:700; color:#00194C; font-size:15px; margin-bottom:6px; }
        .lp-step p { color:#555B6E; font-size:13.5px; line-height:1.5; }

        .lp-modules { background:#fff; padding: 72px 0; }
        .lp-mods-grid { display:grid; grid-template-columns: repeat(3,1fr); gap:14px; }
        @media (max-width:820px){ .lp-mods-grid{ grid-template-columns:1fr 1fr; } }
        @media (max-width:480px){ .lp-mods-grid{ grid-template-columns:1fr; } }
        .lp-mod { border:1px solid #E2E4EA; border-radius:16px; padding:18px; transition: all .2s; }
        .lp-mod:hover { border-color:#0046FF; transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,70,255,0.08); }
        .lp-mod-num { font-family: var(--font-poppins); font-weight:800; color:#0046FF; font-size:13px; }
        .lp-mod h4 { font-weight:700; color:#00194C; font-size:15px; margin:4px 0 6px; line-height:1.3; }
        .lp-mod .date { font-size:12px; color:#9096A5; }

        .lp-final { position:relative; overflow:hidden; background:#000D2B; padding:84px 0; text-align:center; }
        .lp-final::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 70% 50% at 50% 100%, rgba(0,70,255,0.25) 0%, transparent 70%); }
        .lp-final-inner { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:22px; }
        .lp-final h2 { font-family: var(--font-poppins); font-weight:800; color:#fff; font-size: clamp(26px,4vw,42px); max-width:640px; line-height:1.2; }
        .lp-final p { color: rgba(255,255,255,0.65); font-size:17px; max-width:520px; }

        .lp-footer { background:#000D2B; border-top:1px solid rgba(255,255,255,0.06); padding: 28px 0; }
        .lp-footer-inner { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .lp-footer .copy { color: rgba(255,255,255,0.35); font-size:13px; }
      `}</style>

      <nav className="lp-nav">
        <div className="container lp-nav-inner">
          <span className="lp-logo">LE CAHIER DE <span>VACANCES</span></span>
          <Link href="/espace" className="lp-nav-cta">Entrer →</Link>
        </div>
      </nav>

      <header className="lp-hero">
        <div className="container lp-hero-inner">
          <span className="lp-badge reveal">9 leviers · tout l&apos;été · chaque mardi</span>
          <h1 className="display reveal reveal-delay-1">
            Le Cahier de Vacances du Chef d&apos;Entreprise
            <span className="accent">Le contre-pied de l&apos;été.</span>
          </h1>
          <p className="sub reveal reveal-delay-2">
            Pendant que vos concurrents lèvent le pied, vous reprenez la main. Neuf modules pour
            faire le bilan de mi-année, corriger vos leviers les plus faibles et attaquer le second
            semestre avec un plan clair. Une vidéo, un exercice, un retour personnalisé. À votre rythme.
          </p>
          <Link href="/espace" className="lp-cta reveal reveal-delay-2">Ouvrir mon cahier →</Link>
          <p className="reassure reveal reveal-delay-3">Accès libre · sans inscription · vos réponses restent privées</p>
        </div>
      </header>

      <section className="lp-how">
        <div className="container">
          <p className="lp-section-label">Comment ça marche</p>
          <h2 className="lp-section-title display">Une capsule, quatre temps</h2>
          <div className="lp-steps">
            {[
              { ic: "🎬", t: "Regardez", d: "La capsule du levier de la semaine, ~10 min, droit au but." },
              { ic: "✍️", t: "Faites l'exercice", d: "Le défi de la semaine, posé noir sur blanc dans votre cahier." },
              { ic: "💬", t: "Recevez un retour", d: "Une analyse personnalisée de Max sur ce que vous avez écrit." },
              { ic: "🎯", t: "Passez à l'action", d: "Une action concrète à lancer cette semaine. On avance." },
            ].map((s) => (
              <div key={s.t} className="lp-step">
                <div className="ic">{s.ic}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-modules">
        <div className="container">
          <p className="lp-section-label">Le programme de l&apos;été</p>
          <h2 className="lp-section-title display">9 leviers, du bilan au plan d&apos;action</h2>
          <div className="lp-mods-grid">
            {capsules.map((c) => (
              <div key={c.num} className="lp-mod">
                <div className="lp-mod-num">Module {c.num}</div>
                <h4>{c.titre}</h4>
                <div className="date">À partir du {formatDateFr(c.dateUnlock)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-final">
        <div className="container lp-final-inner">
          <h2 className="display">Prêt à reprendre la main sur votre second semestre ?</h2>
          <p>Le bilan de mi-année vous attend. Cinq minutes pour savoir où vous en êtes vraiment.</p>
          <Link href="/espace" className="lp-cta">Ouvrir mon cahier →</Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="container lp-footer-inner">
          <span className="lp-logo">LE CAHIER DE <span>VACANCES</span></span>
          <span className="copy">© 2026 Max Piccinini — Tous droits réservés</span>
        </div>
      </footer>
    </div>
  );
}
