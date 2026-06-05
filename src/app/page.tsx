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
        .lp-logo { font-family: var(--font-poppins); font-weight: 800; color: #fff; font-size: 16px; letter-spacing: 0.04em; text-decoration: none; }
        .lp-logo span { color: #6B9FFF; }
        .lp-nav-cta { color: rgba(255,255,255,0.85); font-size: 14px; font-weight: 600; text-decoration: none; border: 1px solid rgba(255,255,255,0.25); border-radius: 100px; padding: 8px 18px; transition: all .2s; }
        .lp-nav-cta:hover { background: rgba(255,255,255,0.08); color: #fff; }

        .lp-hero { position: relative; overflow: hidden; background: #000D2B; padding: 84px 0 92px; text-align: center; }
        .lp-hero::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,70,255,0.32) 0%, transparent 70%); pointer-events:none; }
        .lp-hero-inner { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 22px; }
        .lp-kicker { display:inline-flex; align-items:center; gap:8px; background: rgba(0,70,255,0.16); border:1px solid rgba(0,70,255,0.4); color:#6B9FFF; border-radius:100px; padding:8px 18px; font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; }
        .lp-hero h1 { font-family: var(--font-poppins); font-weight: 800; color:#fff; font-size: clamp(30px, 4.4vw, 46px); line-height: 1.08; max-width: 740px; }
        .lp-hero h1 .accent { color:#6B9FFF; display:block; font-size: 0.56em; font-weight: 700; margin-top: 12px; }
        .lp-hero p.sub { color: rgba(255,255,255,0.74); font-size: clamp(16px,1.7vw,18px); max-width: 660px; line-height: 1.65; }
        .lp-cta { position:relative; display:inline-flex; align-items:center; gap:10px; background:#0046FF; color:#fff; padding:18px 40px; border-radius:100px; font-size:17px; font-weight:700; text-decoration:none; box-shadow:0 6px 28px rgba(0,70,255,0.45); transition: transform .22s cubic-bezier(.22,.61,.36,1), box-shadow .25s ease, background .25s ease; animation: ctaPulse 2.8s ease-in-out infinite; }
        .lp-cta:hover { background:#2563FF; transform: translateY(-3px) scale(1.035); box-shadow:0 12px 44px rgba(0,70,255,0.65); animation: none; }
        .lp-cta:active { transform: translateY(-1px) scale(0.99); }
        .lp-cta .arrow { display:inline-block; transition: transform .22s cubic-bezier(.22,.61,.36,1); }
        .lp-cta:hover .arrow { transform: translateX(5px); }
        @keyframes ctaPulse { 0%,100%{ box-shadow:0 6px 28px rgba(0,70,255,0.45);} 50%{ box-shadow:0 8px 38px rgba(0,70,255,0.72);} }
        @media (prefers-reduced-motion: reduce) { .lp-cta { animation: none; } }
        .lp-hero .reassure { color: rgba(255,255,255,0.45); font-size: 13px; }

        .lp-section-label { font-size:12px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#0046FF; text-align:center; margin-bottom:10px; }
        .lp-section-title { font-family: var(--font-poppins); font-weight:800; color:#00194C; text-align:center; font-size: clamp(24px,4vw,38px); line-height:1.2; margin-bottom: 14px; }
        .lp-section-sub { text-align:center; color:#555B6E; font-size:17px; max-width:620px; margin:0 auto 44px; line-height:1.65; }

        /* POURQUOI */
        .lp-why { background:#00194C; padding: 78px 0; }
        .lp-why .lp-section-label { color: rgba(255,255,255,0.5); }
        .lp-why h2 { font-family: var(--font-poppins); font-weight:800; color:#fff; text-align:center; font-size: clamp(24px,4vw,38px); line-height:1.2; max-width:760px; margin:0 auto 28px; }
        .lp-why-body { max-width: 680px; margin: 0 auto; display:flex; flex-direction:column; gap:18px; }
        .lp-why-body p { color: rgba(255,255,255,0.78); font-size:17px; line-height:1.7; text-align:center; }
        .lp-why-body strong { color:#fff; }

        /* RESULTATS */
        .lp-results { background:#fff; padding: 78px 0; }
        .lp-results-grid { display:grid; grid-template-columns: repeat(2,1fr); gap:18px; max-width:880px; margin:0 auto; }
        @media (max-width:720px){ .lp-results-grid{ grid-template-columns:1fr; } }
        .lp-result { display:flex; gap:16px; align-items:flex-start; background:#F8F9FB; border:1px solid #E2E4EA; border-radius:18px; padding:24px; }
        .lp-result .ic { font-size:24px; flex-shrink:0; }
        .lp-result h4 { font-weight:700; color:#00194C; font-size:16px; margin-bottom:5px; }
        .lp-result p { color:#555B6E; font-size:14.5px; line-height:1.55; }

        /* COMMENT (slim) */
        .lp-how { background:#F7F8FA; padding: 70px 0; }
        .lp-steps { display:grid; grid-template-columns: repeat(3,1fr); gap:18px; max-width: 880px; margin:0 auto; }
        @media (max-width:720px){ .lp-steps{ grid-template-columns:1fr; } }
        .lp-step { background:#fff; border:1px solid #E2E4EA; border-radius:18px; padding:24px 22px; text-align:center; }
        .lp-step .ic { font-size:28px; margin-bottom:12px; }
        .lp-step h3 { font-weight:700; color:#00194C; font-size:15px; margin-bottom:6px; }
        .lp-step p { color:#555B6E; font-size:13.5px; line-height:1.5; }

        /* LEVIERS */
        .lp-modules { background:#fff; padding: 78px 0; }
        .lp-mods-grid { display:grid; grid-template-columns: repeat(3,1fr); gap:14px; }
        @media (max-width:820px){ .lp-mods-grid{ grid-template-columns:1fr 1fr; } }
        @media (max-width:480px){ .lp-mods-grid{ grid-template-columns:1fr; } }
        .lp-mod { border:1px solid #E2E4EA; border-radius:16px; padding:18px; transition: all .2s; }
        .lp-mod:hover { border-color:#0046FF; transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,70,255,0.08); }
        .lp-mod-num { font-family: var(--font-poppins); font-weight:800; color:#0046FF; font-size:13px; }
        .lp-mod h4 { font-weight:700; color:#00194C; font-size:15px; margin:4px 0 6px; line-height:1.3; }
        .lp-mod .date { font-size:12px; color:#9096A5; }

        /* POUR QUI */
        .lp-who { background:#F7F8FA; padding: 70px 0; }
        .lp-who-card { max-width: 720px; margin:0 auto; background:#fff; border:1px solid #E2E4EA; border-radius:20px; padding:32px 28px; text-align:center; }
        .lp-who-card p { color:#555B6E; font-size:16px; line-height:1.7; }
        .lp-who-card strong { color:#00194C; }

        /* FINAL */
        .lp-final { position:relative; overflow:hidden; background:#000D2B; padding:88px 0; text-align:center; }
        .lp-final::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 70% 50% at 50% 100%, rgba(0,70,255,0.25) 0%, transparent 70%); }
        .lp-final-inner { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:20px; }
        .lp-final h2 { font-family: var(--font-poppins); font-weight:800; color:#fff; font-size: clamp(26px,4vw,42px); max-width:680px; line-height:1.2; }
        .lp-final p { color: rgba(255,255,255,0.7); font-size:17px; max-width:560px; line-height:1.65; }
        .lp-final .bridge { color: rgba(255,255,255,0.5); font-size:14px; max-width:540px; }

        .lp-footer { background:#000D2B; border-top:1px solid rgba(255,255,255,0.06); padding: 28px 0; }
        .lp-footer-inner { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .lp-footer .copy { color: rgba(255,255,255,0.35); font-size:13px; }
      `}</style>

      <nav className="lp-nav">
        <div className="container lp-nav-inner">
          <span className="lp-logo">SUMMER <span>BUSINESS</span></span>
          <Link href="/espace" className="lp-nav-cta">Entrer →</Link>
        </div>
      </nav>

      {/* HERO — la promesse, pas le format */}
      <header className="lp-hero">
        <div className="container lp-hero-inner">
          <span className="lp-kicker reveal">Summer Business · Édition 2026 · avec Max Piccinini</span>
          <h1 className="display reveal reveal-delay-1">
            Cet été, reprenez le contrôle de votre entreprise pour finir 2026 en force !
            <span className="accent">Pendant que vos concurrents lèvent le pied.</span>
          </h1>
          <p className="sub reveal reveal-delay-2">
            La moitié de l&apos;année est passée. En 9 étapes guidées par Max Piccinini, à votre rythme,
            vous faites le point sans complaisance, vous corrigez les 1 ou 2 leviers qui vous freinent
            vraiment, et vous repartez avec une feuille de route claire pour vos six derniers mois.
          </p>
          <Link href="/espace" className="lp-cta reveal reveal-delay-2">Je commence gratuitement <span className="arrow">→</span></Link>
          <p className="reassure reveal reveal-delay-3">Accès libre · à votre rythme · pour chefs d&apos;entreprise établis</p>
        </div>
      </header>

      {/* POURQUOI — la raison, bienveillante */}
      <section className="lp-why">
        <div className="container">
          <p className="lp-section-label">Pourquoi maintenant</p>
          <h2 className="display reveal">L&apos;été n&apos;est pas une parenthèse. C&apos;est votre meilleure fenêtre.</h2>
          <div className="lp-why-body reveal reveal-delay-1">
            <p>
              La vérité, c&apos;est que la plupart des chefs d&apos;entreprise traversent l&apos;été en pilote automatique,
              puis découvrent en décembre qu&apos;il est trop tard pour rattraper l&apos;année. Ce n&apos;est pas
              un problème de travail : c&apos;est un manque de recul, au moment où il compte le plus.
            </p>
            <p>
              On a créé Summer Business pour une raison simple : <strong>vous offrir ce recul</strong>,
              quand il a encore le pouvoir de tout changer. Six mois devant vous, c&apos;est largement le
              temps de corriger le tir, à condition de regarder les bonnes choses, maintenant.
            </p>
            <p>
              Pas de théorie, pas de remplissage. Juste l&apos;envie sincère que vous arriviez en
              décembre <strong>fier de votre année</strong>, pas soulagé qu&apos;elle se termine.
            </p>
          </div>
        </div>
      </section>

      {/* RESULTATS — ce qu'on en retire */}
      <section className="lp-results">
        <div className="container">
          <p className="lp-section-label">Ce que vous en repartez avec</p>
          <h2 className="lp-section-title display reveal">À la fin de l&apos;été, vous aurez</h2>
          <div className="lp-results-grid">
            {[
              { ic: "🎯", t: "Un bilan sans complaisance", d: "Vous saurez exactement où vous en êtes face à vos objectifs, chiffres en main." },
              { ic: "🔑", t: "Vos vrais leviers, identifiés", d: "Pas quinze chantiers. Les 1 ou 2 qui changent réellement la donne pour vous." },
              { ic: "💬", t: "Un regard extérieur sur vos décisions", d: "Un retour personnalisé sur chacun de vos choix, pour avancer sans angle mort." },
              { ic: "🗺️", t: "Un plan d'action prêt à exécuter", d: "Concret et priorisé, pour attaquer septembre avec une feuille de route claire." },
            ].map((r) => (
              <div key={r.t} className="lp-result">
                <span className="ic">{r.ic}</span>
                <div>
                  <h4>{r.t}</h4>
                  <p>{r.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT — court, orienté bénéfice */}
      <section className="lp-how">
        <div className="container">
          <p className="lp-section-label">Comment ça se passe</p>
          <h2 className="lp-section-title display reveal">Quinze minutes par semaine. Rien de plus.</h2>
          <p className="lp-section-sub reveal">
            Neuf rendez-vous courts, un par semaine. On a fait simple exprès : c&apos;est l&apos;été, et la
            clarté vaut mieux que la quantité.
          </p>
          <div className="lp-steps">
            {[
              { ic: "💡", t: "Une idée qui remet les choses en perspective", d: "Le levier de la semaine, expliqué droit au but par Max." },
              { ic: "✍️", t: "Un exercice sur VOS chiffres", d: "Vous appliquez à votre situation réelle. C'est là que ça compte." },
              { ic: "🤝", t: "Un retour personnalisé", d: "Une analyse de ce que vous avez écrit, pour décider juste." },
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

      {/* LES 9 LEVIERS */}
      <section className="lp-modules">
        <div className="container">
          <p className="lp-section-label">Le parcours de l&apos;été</p>
          <h2 className="lp-section-title display reveal">9 leviers, du bilan au plan d&apos;action</h2>
          <p className="lp-section-sub reveal">
            Chaque semaine, un levier de votre business passé au crible. À la fin, tout se relie en
            un plan personnalisé pour vos six derniers mois.
          </p>
          <div className="lp-mods-grid">
            {capsules.map((c) => (
              <div key={c.num} className="lp-mod">
                <div className="lp-mod-num">Étape {c.num}</div>
                <h4>{c.titre}</h4>
                <div className="date">À partir du {formatDateFr(c.dateUnlock)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POUR QUI */}
      <section className="lp-who">
        <div className="container">
          <p className="lp-section-label">Pour qui c&apos;est fait</p>
          <h2 className="lp-section-title display reveal">Pour les chefs d&apos;entreprise qui savent qu&apos;ils valent mieux que leur premier semestre</h2>
          <div className="lp-who-card reveal">
            <p>
              Summer Business est pensé pour les <strong>chefs d&apos;entreprise établis</strong> qui n&apos;ont pas
              besoin d&apos;un cours de plus, mais d&apos;un vrai moment de recul. Si vous êtes prêt à
              <strong> regarder vos chiffres en face</strong> et à agir sur ce qui compte vraiment,
              vous êtes exactement au bon endroit. C&apos;est gratuit, c&apos;est à votre rythme, et c&apos;est
              fait pour vous donner une longueur d&apos;avance.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL */}
      <section className="lp-final">
        <div className="container lp-final-inner">
          <h2 className="display">Votre second semestre commence maintenant.</h2>
          <p>
            Cinq minutes pour savoir où vous en êtes vraiment. Et, je l&apos;espère, l&apos;envie d&apos;en faire
            le meilleur semestre de votre année.
          </p>
          <Link href="/espace" className="lp-cta">Je commence gratuitement <span className="arrow">→</span></Link>
          <p className="bridge">
            Et à la fin de l&apos;été, on construit et on exécute votre plan ensemble, à
            Destination Réussite (25-27 septembre).
          </p>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="container lp-footer-inner">
          <span className="lp-logo">SUMMER <span>BUSINESS</span></span>
          <span className="copy">© 2026 Max Piccinini — Tous droits réservés</span>
        </div>
      </footer>
    </div>
  );
}
