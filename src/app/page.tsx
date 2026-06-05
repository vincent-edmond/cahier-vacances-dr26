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

        .lp-hero { position: relative; overflow: hidden; background: linear-gradient(180deg, #000D2B 0%, #001233 100%); padding: 64px 0 74px; text-align: center; }
        .lp-hero::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,70,255,0.34) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 85% 88%, rgba(37,99,255,0.16) 0%, transparent 60%), radial-gradient(ellipse 36% 32% at 10% 94%, rgba(255,176,32,0.13) 0%, transparent 60%); pointer-events:none; }
        .lp-hero::after { content:''; position:absolute; inset:0; background-image: repeating-linear-gradient(0deg, transparent 0 39px, rgba(255,255,255,0.022) 39px 40px), repeating-linear-gradient(90deg, transparent 0 39px, rgba(255,255,255,0.022) 39px 40px); -webkit-mask-image: radial-gradient(ellipse 75% 65% at 50% 35%, #000 0%, transparent 78%); mask-image: radial-gradient(ellipse 75% 65% at 50% 35%, #000 0%, transparent 78%); pointer-events:none; }
        .lp-hero-inner { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 22px; }
        .lp-kicker { display:inline-flex; align-items:center; gap:8px; background: rgba(0,70,255,0.16); border:1px solid rgba(0,70,255,0.4); color:#6B9FFF; border-radius:100px; padding:8px 18px; font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; }
        .lp-hero h1 { font-family: var(--font-poppins); font-weight: 800; color:#fff; font-size: clamp(34px, 4.9vw, 56px); line-height: 1.04; letter-spacing: -0.02em; max-width: 840px; text-wrap: balance; }
        .lp-hero h1 .accent { display:block; font-size: 0.46em; font-weight: 700; letter-spacing: -0.01em; margin-top: 16px; text-wrap: balance; background-image: linear-gradient(90deg, #6B9FFF 0%, #2563FF 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; }
        .lp-hero p.sub { color: rgba(255,255,255,0.66); font-size: clamp(15px,1.4vw,16.5px); max-width: 520px; line-height: 1.6; margin-top: 2px; }
        .lp-cta { position:relative; display:inline-flex; align-items:center; gap:10px; background:linear-gradient(135deg, #0046FF 0%, #2563FF 100%); color:#fff; padding:18px 40px; border-radius:100px; font-size:17px; font-weight:700; text-decoration:none; box-shadow:0 6px 28px rgba(0,70,255,0.45); transition: transform .22s cubic-bezier(.22,.61,.36,1), box-shadow .25s ease, filter .2s ease; animation: ctaPulse 2.8s ease-in-out infinite; }
        .lp-cta:hover { transform: translateY(-3px) scale(1.035); box-shadow:0 14px 48px rgba(0,70,255,0.7); filter: brightness(1.08) saturate(1.05); animation: none; }
        .lp-cta:active { transform: translateY(-1px) scale(0.99); }
        .lp-cta .arrow { display:inline-block; transition: transform .22s cubic-bezier(.22,.61,.36,1); }
        .lp-cta:hover .arrow { transform: translateX(5px); }
        @keyframes ctaPulse { 0%,100%{ box-shadow:0 6px 28px rgba(0,70,255,0.45);} 50%{ box-shadow:0 8px 38px rgba(0,70,255,0.72);} }
        @media (prefers-reduced-motion: reduce) { .lp-cta { animation: none; } }
        .lp-hero .reassure { color: rgba(255,255,255,0.45); font-size: 13px; }

        .lp-section-label { font-size:12px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#0046FF; text-align:center; margin-bottom:10px; }
        .lp-section-title { font-family: var(--font-poppins); font-weight:800; color:#00194C; text-align:center; font-size: clamp(24px,4vw,38px); line-height:1.2; margin-bottom: 14px; }
        .lp-section-sub { text-align:center; color:#555B6E; font-size:17px; max-width:620px; margin:0 auto 44px; line-height:1.65; }

        /* POURQUOI (clair, pour casser le bloc sombre du hero) */
        .lp-why { position:relative; background:#FFFFFF; padding: 84px 0; }
        .lp-why h2 { font-family: var(--font-poppins); font-weight:800; color:#00194C; text-align:center; font-size: clamp(24px,4vw,38px); line-height:1.2; max-width:760px; margin:0 auto 28px; }
        .lp-why-body { max-width: 660px; margin: 0 auto; display:flex; flex-direction:column; gap:18px; }
        .lp-why-body p { color:#555B6E; font-size:17px; line-height:1.7; text-align:center; }
        .lp-why-body strong { color:#00194C; }

        /* RESULTATS */
        .lp-results { background:#EDF1F8; padding: 78px 0; }
        .lp-results-grid { display:grid; grid-template-columns: repeat(2,1fr); gap:18px; max-width:880px; margin:0 auto; }
        @media (max-width:720px){ .lp-results-grid{ grid-template-columns:1fr; } }
        .lp-result { position:relative; display:flex; gap:16px; align-items:flex-start; background:#fff; border:1px solid #E6E9F0; border-radius:18px; padding:24px; box-shadow: 0 2px 6px rgba(0,25,76,0.05), 0 14px 30px rgba(0,25,76,0.08); transition: transform .2s ease, box-shadow .25s ease, border-color .2s ease; }
        .lp-result::before { content:''; position:absolute; inset:0 0 auto 0; height:3px; border-radius:18px 18px 0 0; background:linear-gradient(90deg,#0046FF,#2563FF); opacity:0; transition:opacity .25s ease; }
        .lp-result:hover { transform: translateY(-4px); box-shadow: 0 18px 44px rgba(0,70,255,0.18); border-color: rgba(0,70,255,0.45); }
        .lp-result:hover::before { opacity:1; }
        .lp-result .ic { flex-shrink:0; width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px; background: linear-gradient(135deg, rgba(0,70,255,0.14) 0%, rgba(37,99,255,0.06) 100%); border:1px solid rgba(0,70,255,0.12); }
        .lp-result h4 { font-weight:700; color:#00194C; font-size:16px; margin-bottom:5px; }
        .lp-result p { color:#555B6E; font-size:14.5px; line-height:1.55; }

        /* COMMENT (slim) */
        .lp-how { background:#FFFFFF; padding: 70px 0; }
        .lp-steps { display:grid; grid-template-columns: repeat(3,1fr); gap:18px; max-width: 880px; margin:0 auto; }
        @media (max-width:720px){ .lp-steps{ grid-template-columns:1fr; } }
        .lp-step { background:#fff; border:1px solid #E6E9F0; border-radius:18px; padding:24px 22px; text-align:center; box-shadow: 0 2px 6px rgba(0,25,76,0.05), 0 12px 26px rgba(0,25,76,0.06); transition: transform .2s ease, box-shadow .25s ease, border-color .2s ease; }
        .lp-step:hover { transform: translateY(-4px); box-shadow: 0 16px 38px rgba(0,70,255,0.14); border-color: rgba(0,70,255,0.4); }
        .lp-step .ic { font-size:26px; margin: 0 auto 12px; width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; background: linear-gradient(135deg, rgba(0,70,255,0.12) 0%, rgba(37,99,255,0.05) 100%); border:1px solid rgba(0,70,255,0.1); }
        .lp-step h3 { font-weight:700; color:#00194C; font-size:15px; margin-bottom:6px; }
        .lp-step p { color:#555B6E; font-size:13.5px; line-height:1.5; }

        /* LEVIERS */
        .lp-modules { background:#EDF1F8; padding: 78px 0; }
        .lp-mods-grid { display:grid; grid-template-columns: repeat(3,1fr); gap:14px; }
        @media (max-width:820px){ .lp-mods-grid{ grid-template-columns:1fr 1fr; } }
        @media (max-width:480px){ .lp-mods-grid{ grid-template-columns:1fr; } }
        .lp-mod { background:#fff; border:1px solid #E6E9F0; border-radius:16px; padding:18px; box-shadow: 0 2px 6px rgba(0,25,76,0.05); transition: transform .2s ease, box-shadow .25s ease, border-color .2s ease; }
        .lp-mod:hover { border-color:#0046FF; transform: translateY(-3px); box-shadow: 0 14px 32px rgba(0,70,255,0.13); }
        .lp-mod-num { font-family: var(--font-poppins); font-weight:800; color:#0046FF; font-size:13px; }
        .lp-mod h4 { font-weight:700; color:#00194C; font-size:15px; margin:4px 0 6px; line-height:1.3; }
        .lp-mod .date { font-size:12px; color:#9096A5; }

        /* POUR QUI */
        .lp-who { background:#FFFFFF; padding: 70px 0; }
        .lp-who-card { max-width: 720px; margin:0 auto; background:#fff; border:1px solid #E2E4EA; border-radius:20px; padding:32px 28px; text-align:center; }
        .lp-who-card p { color:#555B6E; font-size:16px; line-height:1.7; }
        .lp-who-card strong { color:#00194C; }

        /* FINAL */
        .lp-final { position:relative; overflow:hidden; background:#000D2B; padding:88px 0; text-align:center; }
        .lp-final::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 70% 50% at 50% 100%, rgba(0,70,255,0.25) 0%, transparent 70%), radial-gradient(ellipse 28% 30% at 88% 14%, rgba(255,176,32,0.12) 0%, transparent 60%); }
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
          <span className="lp-kicker reveal">
            <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: "#FFB020", boxShadow: "0 0 10px rgba(255,176,32,0.85)", flexShrink: 0 }} />
            Summer Business · Édition 2026 · avec Max Piccinini
          </span>
          <h1 className="display reveal reveal-delay-1">
            Cet été, reprenez le contrôle de votre entreprise pour finir 2026 en force !
            <span className="accent">Pendant que vos concurrents lèvent le pied.</span>
          </h1>
          <p className="sub reveal reveal-delay-2">
            9 étapes guidées par Max Piccinini pour faire le point, corriger vos vrais leviers
            et repartir avec un plan d&apos;action clair pour vos six derniers mois.
          </p>
          <Link href="/espace" className="lp-cta reveal reveal-delay-2">Je commence gratuitement <span className="arrow">→</span></Link>
          <p className="reassure reveal reveal-delay-3">Accès libre · à votre rythme · pour chefs d&apos;entreprise établis</p>
        </div>
      </header>

      {/* POURQUOI — la raison, bienveillante */}
      <section className="lp-why">
        <div className="container">
          <p className="lp-section-label">Pourquoi maintenant</p>
          <h2 className="display reveal">L&apos;été n&apos;est pas une parenthèse. C&apos;est le moment de prendre de l&apos;avance.</h2>
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
          <h2 className="lp-section-title display reveal">À la fin de l&apos;été, vous repartez avec :</h2>
          <div className="lp-results-grid">
            {[
              { ic: "🎯", t: "Un bilan sans complaisance", d: "Où vous en êtes vraiment face à vos objectifs. Les chiffres en main, pas les impressions." },
              { ic: "🔑", t: "Vos 1 ou 2 vrais leviers", d: "On isole ce qui change la donne pour vous. Le reste, c'est du bruit." },
              { ic: "💬", t: "Un regard direct sur vos décisions", d: "Un retour franc sur chacun de vos choix, pour avancer sans angle mort." },
              { ic: "🗺️", t: "Un plan que vous n'avez plus qu'à exécuter", d: "Concret, priorisé, daté. En septembre, vous savez exactement quoi faire." },
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
            Chaque semaine, un levier de votre entreprise passé au crible. À la fin, tout se relie en
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
          <h2 className="display">Votre année n&apos;est pas jouée. Elle se décide cet été.</h2>
          <p>
            Cinq minutes pour savoir où vous en êtes vraiment. Et tout ce qu&apos;il faut pour faire de
            vos six derniers mois les meilleurs de l&apos;année.
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
