import type { CSSProperties } from "react";
import Link from "next/link";
import { getCapsules, formatDateFr } from "@/lib/capsules";

// Corps partagé de la LP variante B. Utilisé par /lp-b (servi par le proxy A/B) et
// par /preview (revue interne, avec bandeau). `preview` n'affiche que le bandeau d'aperçu.

// ─── Icônes SVG (remplacent les emojis, pour sortir du look « template IA ») ───
const ICONS: Record<string, React.ReactNode> = {
  check: <path d="M20 6 9 17l-5-5" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2 20 3M17 6l2 2M14 9l2 2" /></>,
  chat: <path d="M21 11.5a8.5 8.5 0 0 1-11.9 7.8L3 21l1.7-6.1A8.5 8.5 0 1 1 21 11.5Z" />,
  map: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.6" /></>,
  bulb: <path d="M9 18h6M10 21.5h4M15 14.5c.2-1 .7-1.8 1.4-2.5A4.7 4.7 0 1 0 7.6 12c.7.7 1.2 1.5 1.4 2.5" />,
  pen: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />,
  spark: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  chart: <path d="M4 20V4M4 20h16M8 20v-6M13 20v-10M18 20v-4" />,
};
function Ic({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

// Logos presse (repris de Destination Réussite) — marquee défilant.
const PRESS_LOGOS = [
  "DS_Mxp_Og_2_L1_DS-14.png", "DS_Mxp_Og_2_L2_DS-10.png", "DS_Mxp_Og_2_L3_DS-12.png",
  "DS_Mxp_Og_2_L4_DS-11.png", "DS_Mxp_Og_2_L5_DS-10.png", "DS_Mxp_Og_2_L6_DS-12.png",
  "DS_Mxp_Og_2_L7_DS-11.png", "DS_Mxp_Og_2_L8_DS-11.png", "DS_Mxp_Og_2_L9_DS-11.png",
  "DS_Mxp_Og_2_L10_DS-14.png", "DS_Mxp_Og_2_L11_DS-14-e1752230142257.png",
  "DS_Mxp_Og_2_L12_DS-13-e1752230195267.png", "DS_Mxp_Og_2_L13_DS-13.png",
  "DS_Mxp_Og_2_L14_DS-14-e1752230118108.png", "DS_Mxp_Og_2_L15_DS-12-e1752230240949.png",
  "DS_Mxp_Og_2_L16_DS-10.png",
];

export function LandingB({ preview = false }: { preview?: boolean }) {
  const capsules = getCapsules();

  return (
    <div className="lp">
      <style>{`
        .lp { font-family: var(--font-inter), sans-serif; color:#0A0A0F; background:#fff; line-height:1.6; }
        .lp .container { max-width:1120px; margin:0 auto; padding:0 24px; }
        .lp .display { font-family: var(--font-poppins), sans-serif; }
        .lp .grad { background-image:linear-gradient(90deg,#6B9FFF 0%,#2563FF 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; }

        .lp-nav { position:sticky; top:0; z-index:50; background:#000D2B; border-bottom:1px solid rgba(255,255,255,.08); padding:14px 0; }
        .lp-nav-inner { display:flex; align-items:center; justify-content:space-between; }
        .lp-logo { font-family:var(--font-poppins); font-weight:800; color:#fff; font-size:16px; letter-spacing:.04em; text-decoration:none; }
        .lp-logo span { color:#6B9FFF; }
        .lp-nav-cta { color:rgba(255,255,255,.9); font-size:14px; font-weight:700; text-decoration:none; background:linear-gradient(135deg,#0046FF,#2563FF); border-radius:100px; padding:9px 20px; transition:all .2s; box-shadow:0 4px 16px rgba(0,70,255,.4); }
        .lp-nav-cta:hover { transform:translateY(-1px); box-shadow:0 8px 22px rgba(0,70,255,.55); }

        /* ── HERO v2 : split, Max présent, aperçu du carnet ── */
        .lp-hero { position:relative; overflow:hidden; background:linear-gradient(180deg,#000D2B 0%,#001233 100%); padding:60px 0 68px; }
        .lp-hero::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 60% 50% at 20% 0%,rgba(0,70,255,.32),transparent 70%),radial-gradient(ellipse 50% 50% at 92% 90%,rgba(37,99,255,.18),transparent 62%); pointer-events:none; }
        .lp-hero-inner { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; text-align:center; }
        /* Wrapper « carte » (sous-titre + bullets + CTA) : transparent en desktop, carte en mobile */
        .lp-hero-card { display:contents; }
        .lp-kicker { display:inline-flex; align-items:center; gap:9px; background:rgba(0,70,255,.16); border:1px solid rgba(0,70,255,.4); color:#9FC0FF; border-radius:100px; padding:8px 16px; font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
        .lp-kicker b { color:#fff; font-weight:800; }
        .lp-h1 { font-family:var(--font-poppins); font-weight:800; color:#fff; font-size:clamp(34px,4.8vw,56px); line-height:1.04; letter-spacing:-.02em; margin:18px auto 0; max-width:860px; text-wrap:balance; }
        .lp-hero .sub { color:rgba(255,255,255,.72); font-size:clamp(15px,1.35vw,17.5px); line-height:1.6; margin:16px auto 0; max-width:620px; }
        .lp-hero .sub b { color:#fff; }
        .lp-bullets { list-style:none; margin:20px auto 0; padding:0; display:flex; flex-wrap:wrap; justify-content:center; gap:6px 46px; max-width:790px; }
        .lp-bullets li { display:inline-flex; align-items:center; gap:9px; color:rgba(255,255,255,.8); font-size:15px; }
        .lp-bullets .brk { flex-basis:100%; height:0; margin:0; gap:0; }
        .lp-bullets .bic { flex-shrink:0; color:#34D399; display:flex; }
        .lp-bullets .bic svg { width:16px; height:16px; }
        .lp-bullets b { color:#fff; font-weight:700; }
        .lp-hero-actions { display:flex; flex-direction:column; align-items:center; gap:9px; margin-top:30px; }
        .lp-cta { position:relative; display:inline-flex; align-items:center; gap:11px; background:linear-gradient(135deg,#0046FF,#2563FF); color:#fff; padding:19px 46px; border-radius:100px; font-size:17.5px; font-weight:700; text-decoration:none; box-shadow:0 8px 32px rgba(0,70,255,.5); transition:transform .22s cubic-bezier(.22,.61,.36,1),box-shadow .25s ease; animation:lpCtaPulse 2.8s ease-in-out infinite; }
        .lp-cta:hover { transform:translateY(-3px) scale(1.035); box-shadow:0 16px 52px rgba(0,70,255,.75); animation:none; }
        .lp-cta .arrow { transition:transform .22s; }
        .lp-cta:hover .arrow { transform:translateX(5px); }
        @keyframes lpCtaPulse { 0%,100%{ box-shadow:0 8px 32px rgba(0,70,255,.5);} 50%{ box-shadow:0 10px 42px rgba(0,70,255,.78);} }
        @media (prefers-reduced-motion:reduce){ .lp-cta{ animation:none; } }
        .lp-hero-actions .free { color:rgba(255,255,255,.5); font-size:12.5px; }
        .lp-hero-cred { display:inline-flex; align-items:center; gap:12px; margin-top:34px; text-align:left; }
        .lp-hero-cred img { width:46px; height:46px; border-radius:50%; object-fit:cover; object-position:top center; border:2px solid rgba(107,159,255,.6); }
        .lp-hero-cred .t { color:#fff; font-weight:700; font-size:14px; }
        .lp-hero-cred .s { color:rgba(255,255,255,.55); font-size:12.5px; }

        /* Aperçu du carnet (GIF de l'app, centré) */
        .lp-mock { position:relative; width:100%; max-width:860px; margin:40px auto 0; }
        .lp-mock::before { content:''; position:absolute; inset:-5% -4% 0; background:radial-gradient(circle at 50% 25%,rgba(0,70,255,.42),transparent 64%); filter:blur(12px); }
        .lp-mock-win { position:relative; background:#fff; border-radius:16px; box-shadow:0 40px 100px rgba(0,10,40,.62); overflow:hidden; border:1px solid rgba(255,255,255,.14); }
        .lp-mock-gif { display:block; width:100%; height:auto; }

        /* Mobile : titre plus imposant, CTA sur UNE ligne, hero resserré en haut */
        @media (max-width:560px){
          .lp-hero { padding:30px 0 40px; }
          .lp-h1 { font-size:clamp(36px,9.6vw,52px); line-height:1.06; letter-spacing:-.02em; margin-top:16px; }
          .lp-hero .sub { font-size:15px; margin-top:14px; }
          .lp-cta { padding:16px 26px; font-size:16px; gap:9px; }
          .lp-kicker { font-size:10.5px; letter-spacing:.04em; padding:7px 12px; }
          /* Bullets : colonne de puces de même largeur, centrées en bloc (coches alignées) */
          .lp-bullets { flex-direction:column; align-items:center; gap:11px; max-width:100%; margin:18px auto 0; }
          .lp-bullets li { width:295px; max-width:100%; }
          .lp-bullets .brk { display:none; }
          /* Carte : regroupe sous-titre + bullets + CTA sur un fond légèrement plus clair */
          .lp-hero-card { display:block; width:100%; margin-top:22px; padding:20px 14px 22px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.09); border-radius:22px; box-shadow:0 10px 34px rgba(0,0,0,.22); }
          .lp-hero-card .sub { margin-top:0; }
          .lp-hero-card .lp-bullets { margin-top:16px; }
          .lp-hero-card .lp-hero-actions { margin-top:20px; }
        }
        .lp-mock-bar { display:flex; align-items:center; gap:7px; padding:11px 14px; background:#F4F6FA; border-bottom:1px solid #E6E9F0; }
        .lp-mock-bar i { width:10px; height:10px; border-radius:50%; background:#DfE3EA; }
        .lp-mock-bar span { margin-left:8px; font-size:11px; color:#9096A5; font-weight:600; }
        .lp-mock-body { padding:18px; }
        .lp-mock-eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#0046FF; }
        .lp-mock-h { font-family:var(--font-poppins); font-weight:800; color:#00194C; font-size:18px; margin:3px 0 12px; }
        .lp-mock-card { border:1px solid rgba(0,70,255,.18); background:rgba(0,70,255,.04); border-radius:12px; padding:13px; }
        .lp-mock-card .lab { display:flex; align-items:center; gap:7px; font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; margin-bottom:5px; }
        .lp-mock-card .lab svg { width:13px; height:13px; }
        .lp-mock-card p { font-size:13px; color:#2A2D35; line-height:1.5; }
        .lp-mock-card + .lp-mock-card { margin-top:9px; }
        .lp-mock-cost { border-color:#FECACA; background:linear-gradient(135deg,#FFF7ED,#FEF2F2); }
        .lp-mock-tag { margin-top:12px; font-size:11px; color:#9096A5; text-align:right; }

        /* ── Bandeau médias (remonté sous la hero) ── */
        .lp-band { background:#F4F6FA; padding:36px 0 32px; border-bottom:1px solid #E6E9F0; overflow:hidden; contain:paint; }
        .lp-band .lbl { display:block; text-align:center; color:#9096A5; font-size:12.5px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; margin-bottom:22px; }
        .lp-marquee { overflow:hidden; -webkit-mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent); mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent); }
        .lp-marquee-track { display:flex; gap:56px; align-items:center; width:max-content; animation:lpMarquee 45s linear infinite; }
        .lp-marquee:hover .lp-marquee-track { animation-play-state:paused; }
        .lp-marquee-track img { height:30px; width:auto; opacity:.55; filter:grayscale(1); transition:opacity .2s,filter .2s; }
        .lp-marquee-track img:hover { opacity:1; filter:grayscale(0); }
        @keyframes lpMarquee { from{ transform:translateX(0); } to{ transform:translateX(-50%); } }

        /* ── Strip de chiffres ── */
        .lp-nums { background:#001233; padding:28px 0 38px; }
        .lp-nums-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; text-align:center; }
        @media (max-width:720px){ .lp-nums-grid{ grid-template-columns:repeat(2,1fr); gap:26px; } }
        .lp-num .n { font-family:var(--font-poppins); font-weight:800; color:#6B9FFF; font-size:clamp(26px,3.4vw,36px); line-height:1; }
        .lp-num .l { color:rgba(255,255,255,.55); font-size:13px; margin-top:6px; }

        .lp-section-label { font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#0046FF; text-align:center; margin-bottom:10px; }
        .lp-section-title { font-family:var(--font-poppins); font-weight:800; color:#00194C; text-align:center; font-size:clamp(24px,4vw,38px); line-height:1.2; margin-bottom:14px; }
        .lp-section-sub { text-align:center; color:#555B6E; font-size:17px; max-width:640px; margin:0 auto 44px; line-height:1.65; }

        .lp-why { background:#fff; padding:82px 0; }
        .lp-why h2 { font-family:var(--font-poppins); font-weight:800; color:#00194C; text-align:center; font-size:clamp(24px,4vw,38px); line-height:1.2; max-width:760px; margin:0 auto 28px; }
        .lp-why-body { max-width:660px; margin:0 auto; display:flex; flex-direction:column; gap:18px; }
        .lp-why-body p { color:#555B6E; font-size:17px; line-height:1.7; text-align:center; }
        .lp-why-body strong { color:#00194C; }

        .lp-results { background:#EDF1F8; padding:78px 0; }
        .lp-results-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:18px; max-width:900px; margin:0 auto; }
        @media (max-width:720px){ .lp-results-grid{ grid-template-columns:1fr; } }
        .lp-result { display:flex; gap:16px; align-items:flex-start; background:#fff; border:1px solid #E6E9F0; border-radius:18px; padding:24px; box-shadow:0 2px 6px rgba(0,25,76,.05),0 14px 30px rgba(0,25,76,.08); transition:transform .2s,box-shadow .25s,border-color .2s; }
        .lp-result:hover { transform:translateY(-4px); border-color:color-mix(in srgb,var(--accent,#0046FF) 55%,#fff); box-shadow:0 18px 44px color-mix(in srgb,var(--accent,#0046FF) 24%,transparent); }
        .lp-result .ic { flex-shrink:0; width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:var(--accent,#0046FF); background:color-mix(in srgb,var(--accent,#0046FF) 12%,#fff); border:1px solid color-mix(in srgb,var(--accent,#0046FF) 24%,transparent); }
        .lp-result .ic svg { width:22px; height:22px; }
        .lp-result h4 { font-weight:700; color:#00194C; font-size:16px; margin-bottom:5px; }
        .lp-result p { color:#555B6E; font-size:14.5px; line-height:1.55; }

        .lp-how { background:#fff; padding:70px 0; }
        .lp-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; max-width:900px; margin:0 auto; }
        @media (max-width:720px){ .lp-steps{ grid-template-columns:1fr; } }
        .lp-step { background:#fff; border:1px solid #E6E9F0; border-radius:18px; padding:26px 22px; text-align:center; box-shadow:0 2px 6px rgba(0,25,76,.05),0 12px 26px rgba(0,25,76,.06); transition:transform .2s,box-shadow .25s,border-color .2s; }
        .lp-step:hover { transform:translateY(-4px); border-color:color-mix(in srgb,var(--accent,#0046FF) 50%,#fff); box-shadow:0 16px 38px rgba(0,70,255,.14); }
        .lp-step .ic { margin:0 auto 12px; width:54px; height:54px; border-radius:14px; display:flex; align-items:center; justify-content:center; color:var(--accent,#0046FF); background:color-mix(in srgb,var(--accent,#0046FF) 12%,#fff); border:1px solid color-mix(in srgb,var(--accent,#0046FF) 18%,transparent); }
        .lp-step .ic svg { width:26px; height:26px; }
        .lp-step h3 { font-weight:700; color:#00194C; font-size:15px; margin-bottom:6px; }
        .lp-step p { color:#555B6E; font-size:13.5px; line-height:1.5; }

        .lp-modules { background:#EDF1F8; padding:78px 0; }
        .lp-mods-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        @media (max-width:820px){ .lp-mods-grid{ grid-template-columns:1fr 1fr; } }
        @media (max-width:480px){ .lp-mods-grid{ grid-template-columns:1fr; } }
        .lp-mod { background:#fff; border:1px solid #E6E9F0; border-radius:16px; padding:18px; box-shadow:0 2px 6px rgba(0,25,76,.05); transition:transform .2s,box-shadow .25s,border-color .2s; }
        .lp-mod:hover { border-color:#0046FF; transform:translateY(-3px); box-shadow:0 14px 32px rgba(0,70,255,.13); }
        .lp-mod-num { font-family:var(--font-poppins); font-weight:800; color:#0046FF; font-size:13px; }
        .lp-mod h4 { font-weight:700; color:#00194C; font-size:15px; margin:4px 0 6px; line-height:1.3; }
        .lp-mod .date { font-size:12px; color:#9096A5; }

        .lp-about { background:#fff; padding:84px 0; }
        .lp-about-grid { display:grid; grid-template-columns:.82fr 1.18fr; gap:48px; align-items:center; max-width:980px; margin:0 auto; }
        @media (max-width:860px){ .lp-about-grid{ grid-template-columns:1fr; gap:30px; text-align:center; } }
        .lp-about-photo { position:relative; }
        .lp-about-photo::before { content:''; position:absolute; inset:-12%; border-radius:30px; background:radial-gradient(circle at 32% 28%,rgba(0,70,255,.22),transparent 62%),radial-gradient(circle at 78% 82%,rgba(255,176,32,.2),transparent 60%); filter:blur(6px); z-index:0; }
        .lp-about-photo img { position:relative; z-index:1; width:100%; aspect-ratio:4/5; object-fit:cover; object-position:top center; border-radius:22px; display:block; box-shadow:0 22px 54px rgba(0,25,76,.22); }
        .lp-about-eyebrow { font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#0046FF; margin-bottom:6px; }
        .lp-about h2 { font-family:var(--font-poppins); font-weight:800; color:#00194C; font-size:clamp(26px,3.4vw,38px); line-height:1.15; margin:0 0 14px; }
        .lp-about h2 .hl { color:#0046FF; }
        .lp-about .bio { color:#555B6E; font-size:16.5px; line-height:1.7; margin-bottom:24px; }
        .lp-about .bio strong { color:#00194C; }
        .lp-about-stats { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
        .lp-about-stat { background:#F7F9FC; border:1px solid #E6E9F0; border-radius:14px; padding:16px 18px; text-align:left; }
        .lp-about-stat .num { font-family:var(--font-poppins); font-weight:800; color:#00194C; font-size:22px; }
        .lp-about-stat .label { color:#555B6E; font-size:12.5px; margin-top:2px; line-height:1.35; }

        .lp-final { position:relative; overflow:hidden; background:#000D2B; padding:88px 0; text-align:center; }
        .lp-final::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 70% 50% at 50% 100%,rgba(0,70,255,.25),transparent 70%); }
        .lp-final-inner { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:20px; }
        .lp-final h2 { font-family:var(--font-poppins); font-weight:800; color:#fff; font-size:clamp(26px,4vw,42px); max-width:680px; line-height:1.2; }
        .lp-final p { color:rgba(255,255,255,.7); font-size:17px; max-width:560px; line-height:1.65; }
        .lp-final .bridge { color:rgba(255,255,255,.5); font-size:14px; }
        .lp-footer { background:#000D2B; border-top:1px solid rgba(255,255,255,.06); padding:28px 0; }
        .lp-footer-inner { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .lp-footer .copy { color:rgba(255,255,255,.35); font-size:13px; }
        .lp-flag { text-align:center; font-size:12px; color:#fff; background:#B45309; padding:6px; font-weight:700; letter-spacing:.04em; }
      `}</style>

      {preview && <div className="lp-flag">APERÇU v2 — page de validation (non publique). La LP en ligne n&apos;est pas modifiée.</div>}

      <nav className="lp-nav">
        <div className="container lp-nav-inner">
          <span className="lp-logo">SUMMER <span>BUSINESS</span></span>
          <Link href="/espace" className="lp-nav-cta">Je commence →</Link>
        </div>
      </nav>

      {/* HERO v2 */}
      <header className="lp-hero">
        <div className="container lp-hero-inner">
            <span className="lp-kicker">
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: "#FFB020", boxShadow: "0 0 10px rgba(255,176,32,.85)" }} />
              Summer Business · <b>avec Max Piccinini</b>
            </span>
            <h1 className="lp-h1">
              Cet été, identifiez vos plus grandes <span className="grad">opportunités de croissance</span>.
            </h1>
            <div className="lp-hero-card">
            <p className="sub">
              Un audit de votre entreprise <b>sur vos vrais chiffres</b>, guidé par Max IA, et un
              plan d&apos;action clair pour finir l&apos;année en force.
            </p>
            <ul className="lp-bullets">
              <li><span className="bic"><Ic name="check" /></span><span>Retour <b>sans complaisance</b> de Max IA</span></li>
              <li><span className="bic"><Ic name="check" /></span><span><b>9 piliers</b> passés au crible</span></li>
              <li className="brk" aria-hidden />
              <li><span className="bic"><Ic name="check" /></span><span><b>~15 min</b> par semaine</span></li>
              <li><span className="bic"><Ic name="check" /></span><span>Un <b>plan d&apos;action daté</b></span></li>
            </ul>
            <div className="lp-hero-actions">
              <Link href="/espace" className="lp-cta">Je commence gratuitement <span className="arrow">→</span></Link>
              <span className="free">100% gratuit · sans carte</span>
            </div>
            </div>{/* /lp-hero-card */}

            <div className="lp-mock">
              <div className="lp-mock-win">
                <div className="lp-mock-bar"><i /><i /><i /><span>summer-business · votre espace</span></div>
                <video
                  className="lp-mock-gif"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/app-summer-business-poster.jpg"
                  aria-label="Aperçu de l'espace Summer Business : le menu des 9 piliers puis le contenu d'une capsule"
                >
                  <source src="/app-summer-business.mp4" type="video/mp4" />
                </video>
              </div>
            </div>

            <div className="lp-hero-cred">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/max-p.png" alt="Max Piccinini" />
              <div>
                <div className="t">Conçu par Max Piccinini</div>
                <div className="s">Élu meilleur coach business · 170 000+ entrepreneurs accompagnés</div>
              </div>
            </div>
        </div>
      </header>

      {/* STRIP DE CHIFFRES (sombre, prolonge la hero) */}
      <section className="lp-nums">
        <div className="container lp-nums-grid">
          {[
            { n: "9", l: "piliers de croissance" },
            { n: "~15 min", l: "par semaine" },
            { n: "170 000+", l: "entrepreneurs accompagnés" },
            { n: "100%", l: "gratuit" },
          ].map((s) => (
            <div key={s.l} className="lp-num"><div className="n">{s.n}</div><div className="l">{s.l}</div></div>
          ))}
        </div>
      </section>

      {/* BANDEAU MÉDIAS — marquee défilant (repris de Destination Réussite) */}
      <section className="lp-band">
        <span className="lbl">Vu &amp; reconnu dans les médias</span>
        <div className="lp-marquee" aria-hidden>
          <div className="lp-marquee-track">
            {[...PRESS_LOGOS, ...PRESS_LOGOS].map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={`/press/${f}`} alt="Média" loading="lazy" />
            ))}
          </div>
        </div>
      </section>

      {/* POURQUOI */}
      <section className="lp-why">
        <div className="container">
          <p className="lp-section-label">Pourquoi maintenant</p>
          <h2 className="display">L&apos;été n&apos;est pas une parenthèse. C&apos;est le moment de prendre de l&apos;avance.</h2>
          <div className="lp-why-body">
            <p>La plupart des chefs d&apos;entreprise traversent l&apos;été en pilote automatique, puis découvrent en décembre qu&apos;il est trop tard pour rattraper l&apos;année. Ce n&apos;est pas un problème de travail : c&apos;est un manque de recul, au moment où il compte le plus.</p>
            <p>On a créé Summer Business pour une raison simple : <strong>vous offrir ce recul</strong>, quand il a encore le pouvoir de tout changer. Cinq mois devant vous, c&apos;est largement le temps de corriger le tir, à condition de regarder les bonnes choses, maintenant.</p>
            <p>Pas de théorie, pas de remplissage. Juste l&apos;envie sincère que vous arriviez en décembre <strong>fier de votre année</strong>, pas soulagé qu&apos;elle se termine.</p>
          </div>
        </div>
      </section>

      {/* RESULTATS */}
      <section className="lp-results">
        <div className="container">
          <p className="lp-section-label">Ce que vous en repartez avec</p>
          <h2 className="lp-section-title display">À la fin, vous repartez avec :</h2>
          <div className="lp-results-grid">
            {[
              { ic: "target", t: "Un bilan sans complaisance", d: "Où vous en êtes vraiment face à vos objectifs. Les chiffres en main, pas les impressions.", accent: "#0046FF" },
              { ic: "key", t: "Vos vrais axes de croissance", d: "On isole les 1 ou 2 leviers qui changent la donne pour vous. Le reste, c'est du bruit.", accent: "#0D9488" },
              { ic: "chat", t: "Vos angles morts, mis à plat", d: "Le retour franc de Max IA sur vos décisions, pour avancer sans point aveugle.", accent: "#8B5CF6" },
              { ic: "map", t: "Votre plan pour les prochains mois", d: "Concret, priorisé, daté. En septembre, vous savez exactement quoi faire.", accent: "#F59E0B" },
            ].map((r) => (
              <div key={r.t} className="lp-result" style={{ "--accent": r.accent } as CSSProperties}>
                <span className="ic"><Ic name={r.ic} /></span>
                <div><h4>{r.t}</h4><p>{r.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT */}
      <section className="lp-how">
        <div className="container">
          <p className="lp-section-label">Comment ça se passe</p>
          <h2 className="lp-section-title display">~15 minutes par semaine. Rien de plus.</h2>
          <p className="lp-section-sub">Neuf rendez-vous courts, un par semaine. On a fait simple exprès : c&apos;est l&apos;été, et la clarté vaut mieux que la quantité.</p>
          <div className="lp-steps">
            {[
              { ic: "bulb", t: "Une idée qui remet les choses en perspective", d: "Le levier de la semaine, expliqué droit au but par Max.", accent: "#0046FF" },
              { ic: "pen", t: "Un exercice sur VOS chiffres", d: "Vous appliquez à votre situation réelle. C'est là que ça compte.", accent: "#8B5CF6" },
              { ic: "spark", t: "Un retour personnalisé de Max IA", d: "Max IA analyse ce que vous avez écrit et vous répond, pour décider juste.", accent: "#0D9488" },
            ].map((s) => (
              <div key={s.t} className="lp-step" style={{ "--accent": s.accent } as CSSProperties}>
                <div className="ic"><Ic name={s.ic} /></div>
                <h3>{s.t}</h3><p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9 LEVIERS */}
      <section className="lp-modules">
        <div className="container">
          <p className="lp-section-label">Le parcours de l&apos;été</p>
          <h2 className="lp-section-title display">9 piliers, du bilan au plan d&apos;action</h2>
          <p className="lp-section-sub">Chaque semaine, un pilier de votre entreprise passé au crible. À la fin, tout se relie en un plan personnalisé pour vos derniers mois.</p>
          <div className="lp-mods-grid">
            {capsules.map((c) => (
              <div key={c.num} className="lp-mod">
                <div className="lp-mod-num">Pilier {c.num}</div>
                <h4>{c.titre}</h4>
                <div className="date">À partir du {formatDateFr(c.dateUnlock)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* À PROPOS DE MAX */}
      <section className="lp-about">
        <div className="container">
          <div className="lp-about-grid">
            <div className="lp-about-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/max-p.png" alt="Max Piccinini" loading="lazy" />
            </div>
            <div>
              <p className="lp-about-eyebrow">À propos de</p>
              <h2 className="display"><span className="hl">Max</span> Piccinini</h2>
              <p className="bio">Nommé « Meilleur Coach Français » par le magazine Entreprendre, Max accompagne les chefs d&apos;entreprise francophones depuis plus de 15 ans à passer au niveau supérieur : faire le bon diagnostic, activer les bons leviers et faire grandir leur entreprise, chiffres à l&apos;appui.</p>
              <p className="bio">Max ne peut pas analyser chaque entreprise une par une. Alors il a entraîné une IA sur ses méthodes et sa façon de penser : <strong>Max IA</strong> étudie vos réponses et vous répond dans son style, à chaque étape.</p>
              <div className="lp-about-stats">
                {[
                  { num: "170 000+", label: "Entrepreneurs accompagnés" },
                  { num: "25+ pays", label: "Dans le monde" },
                  { num: "200M€+", label: "de CA généré pour ses clients" },
                  { num: "23M+", label: "Personnes touchées / mois" },
                ].map((s) => (
                  <div key={s.label} className="lp-about-stat"><div className="num">{s.num}</div><div className="label">{s.label}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL */}
      <section className="lp-final">
        <div className="container lp-final-inner">
          <h2 className="display">Votre année n&apos;est pas jouée. Elle se décide cet été.</h2>
          <p>Quelques minutes pour savoir où vous en êtes vraiment. Et tout ce qu&apos;il faut pour faire de vos derniers mois les meilleurs de l&apos;année.</p>
          <Link href="/espace" className="lp-cta">Je commence gratuitement <span className="arrow">→</span></Link>
          <p className="bridge">Accès libre · à votre rythme · pour chefs d&apos;entreprise établis</p>
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
