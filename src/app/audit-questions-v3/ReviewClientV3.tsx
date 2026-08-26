"use client";

import { useEffect, useRef } from "react";

/**
 * V3 du questionnaire — intègre les retours de Max sur la V2 (annotations + message).
 * Page SÉPARÉE (V1 et V2 conservées). Données isolées : store "questions_v3".
 * Structure resserrée (~24 questions de diagnostic) alignée sur le rapport visé.
 */

type QType = "text" | "area" | "num" | "num2" | "choice" | "scale";
type Q = { l: string; t: QType; o?: string[]; ex?: string; ex2?: string; g?: string; u?: string; dk?: boolean };
type Section = { tag: string; title: string; desc: string; qs: Q[] };
type Edit = { l?: string; s?: string; c?: string };
type Edits = Record<string, Edit>;

const STORE_ID = "questions_v3";

const SECT = ["Saas", "Coach / Consultant", "Commerce", "Informatique", "BTP", "Immo", "Dentiste", "Avocat", "Chirurgien", "Business en ligne", "Opticien", "CGP", "Expert-comptable", "Autre"];

const SECTIONS: Section[] = [
  { tag: "A", title: "Profil", desc: "Pour créer votre espace et vous recontacter.", qs: [
    { l: "Prénom", t: "text", ex: "Julie" },
    { l: "Nom", t: "text", ex: "Martin" },
    { l: "Votre meilleur email", t: "text", ex: "julie@monentreprise.fr" },
    { l: "N° de téléphone portable", t: "text", ex: "🇫🇷 +33   ·   6 12 34 56 78" },
    { l: "Votre secteur d'activité", t: "choice", o: SECT },
  ] },
  { tag: "B", title: "Votre entreprise", desc: "", qs: [
    { l: "En quelques mots, que vendez-vous et à quel type de clients ?", t: "area", ex: "Je pose des cuisines sur-mesure pour des particuliers aisés autour de Lyon." },
    { l: "Votre chiffre d'affaires annuel actuel (en €)", t: "num", u: "€", ex: "1 200 000" },
    { l: "Quel CA voulez-vous atteindre ?", t: "num2", ex: "2 000 000", ex2: "5 000 000", g: "un objectif à 12 mois, puis à 3 ans." },
  ] },
  { tag: "C", title: "Croissance & finances", desc: "Un chiffre précis si vous l'avez — sinon « je ne sais pas », c'est déjà une information.", qs: [
    { l: "Votre % de croissance de CA sur les 2 dernières années", t: "num", u: "%", ex: "12", dk: true },
    { l: "Votre EBE (excédent brut d'exploitation)", t: "num", u: "€", ex: "180 000", dk: true },
    { l: "Votre marge brute", t: "num", u: "%", ex: "45", dk: true },
    { l: "Si vos ventes s'arrêtaient demain, combien de temps votre trésorerie tiendrait ?", t: "choice", o: ["+ de 3 mois", "1 – 3 mois", "– d'un mois", "Je ne sais pas"] },
  ] },
  { tag: "D", title: "Acquisition & ventes", desc: "", qs: [
    { l: "Quelle est votre source d'acquisition n°1 ?", t: "choice", o: ["Bouche-à-oreille", "Partenariats", "Publicité", "Affiliation", "Réseaux sociaux", "Référencement", "Prospection", "Autre"], g: "celle qui génère la majorité de vos clients." },
    { l: "Combien dépensez-vous en marketing chaque mois ?", t: "num", u: "€", ex: "8 000", dk: true },
    { l: "Nombre de nouveaux prospects générés chaque mois", t: "num", u: "#", ex: "80", dk: true },
    { l: "Nombre de nouveaux clients générés chaque mois", t: "num", u: "#", ex: "12", dk: true },
    { l: "Votre taux de conversion (prospects → clients)", t: "num", u: "%", ex: "18", dk: true },
  ] },
  { tag: "E", title: "Offre & clients", desc: "", qs: [
    { l: "Décrivez votre offre principale et sa promesse (le résultat concret que le client obtient)", t: "area", ex: "Des cuisines posées sous 24 h, SAV internalisé, sans sous-traitance." },
    { l: "Si un concurrent vous copie et casse le prix de 20 %, qu'est-ce qui vous reste ?", t: "area", ex: "Ma réputation locale et mes références vérifiables." },
    { l: "Quelle part de votre CA vient de clients existants ?", t: "choice", o: ["< 10 %", "10 – 25 %", "25 – 50 %", "> 50 %", "Je ne sais pas"], g: "révèle le potentiel de monétisation de votre base clients." },
    { l: "Votre panier moyen (CA moyen par commande)", t: "num", u: "€", ex: "2 500", dk: true },
    { l: "Votre fréquence d'achat (nb d'achats par an et par client)", t: "num", u: "#", ex: "2", dk: true },
  ] },
  { tag: "F", title: "Organisation", desc: "", qs: [
    { l: "Si vous disparaissiez pendant 90 jours, que se passerait-il ?", t: "choice", o: ["L'entreprise continuerait normalement", "Elle ralentirait", "Des décisions importantes seraient bloquées", "Elle serait sérieusement en difficulté"] },
    { l: "Votre équipe de direction peut-elle prendre les décisions importantes sans vous ?", t: "choice", o: ["Oui", "Partiellement", "Non", "Je n'ai pas d'équipe de direction"] },
    { l: "Disposez-vous d'un tableau de bord de vos indicateurs clés (commercial, marketing, financier) ?", t: "choice", o: ["Oui, mis à jour chaque semaine", "Oui mais irrégulièrement", "Non"] },
  ] },
  { tag: "G", title: "Le chef d’entreprise", desc: "", qs: [
    { l: "Combien d'heures par semaine consacrez-vous à votre entreprise ?", t: "num", u: "#", ex: "58" },
    { l: "Quel % de votre temps passez-vous dans l'opérationnel ?", t: "num", u: "%", ex: "72" },
  ] },
  { tag: "H", title: "Ambition & freins", desc: "", qs: [
    { l: "Que voulez-vous accomplir, au niveau personnel ET pour votre entreprise, dans les 3 à 5 prochaines années ?", t: "area", ex: "Passer de 1,2 M€ à 5 M€, avec une équipe qui gère sans moi, et 3 jours/semaine." },
    { l: "Quelles sont vos 1 à 3 problématiques majeures ?", t: "area", ex: "Tout repose sur moi ; pas de flux régulier de clients." },
    { l: "Quel est aujourd'hui le principal facteur qui limite votre croissance ?", t: "choice", o: ["Pas assez de prospects", "Pas assez de ventes", "Offre / prix", "Recrutement / équipe", "Organisation / opérations", "Rentabilité", "Trésorerie", "Je suis moi-même le goulot d'étranglement", "Je ne sais pas"] },
  ] },
];

const CSS = `
.arvroot{--bg:#f5f7fc;--card:#ffffff;--tint:#edf1ff;--line:#E2E4EA;--line-soft:#F0F1F5;--blue:#0046FF;--blue-dark:#0033CC;--blue-soft:#2563FF;--ink:#00194C;--muted:#555B6E;--muted-2:#9096A5;--teal:#0D9488;--amber:#c98200;--red:#e5533c;--shadow:0 1px 3px rgba(0,25,76,.05);--shadow-md:0 12px 34px rgba(0,25,76,.12);font-family:var(--font-inter),system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:radial-gradient(1100px 560px at 50% -8%,#e7edff 0%,transparent 60%),var(--bg);min-height:100vh;line-height:1.5;-webkit-font-smoothing:antialiased;padding-bottom:74px;display:block}
.arvroot *{box-sizing:border-box}
.arvroot .wrap{max-width:820px;margin:0 auto;padding:0 20px}
.arvroot .stick{position:sticky;top:0;z-index:20;background:rgba(245,247,252,.82);-webkit-backdrop-filter:saturate(1.4) blur(12px);backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid var(--line)}
.arvroot .stick .in{max-width:820px;margin:0 auto;padding:11px 20px;display:flex;align-items:center;gap:12px}
.arvroot .stick .nm{font-weight:800;font-size:13px;letter-spacing:-.01em;margin-right:auto;display:flex;align-items:center;gap:8px}
.arvroot .stick .nm .d{width:8px;height:8px;border-radius:50%;background:var(--blue)}
.arvroot .stick .mini{display:flex;gap:11px;font-size:12px;font-weight:750;font-variant-numeric:tabular-nums}
.arvroot .stick .mini .ok{color:var(--teal)} .arvroot .stick .mini .rev{color:var(--red)} .arvroot .stick .mini .wait{color:var(--muted-2)}
.arvroot .stick .exp{border:1px solid var(--line);background:#fff;border-radius:99px;padding:6px 13px;font-size:12px;font-weight:700;color:var(--blue);cursor:pointer;transition:.12s}
.arvroot .stick .exp:hover{border-color:var(--blue);box-shadow:var(--shadow)}
.arvroot header{padding:32px 0 6px}
.arvroot .eyebrow{font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--blue-soft);font-weight:800;margin:0 0 12px}
.arvroot h1{font-family:var(--font-poppins),var(--font-inter),sans-serif;font-size:30px;line-height:1.12;letter-spacing:-.02em;margin:0 0 10px;font-weight:800;text-wrap:balance}
.arvroot .sub{color:var(--muted);font-size:15px;max-width:60ch;margin:0}
.arvroot .howto{margin-top:16px;background:linear-gradient(180deg,#fff,#fbfcff);border:1px solid var(--line);border-radius:14px;padding:14px 16px;font-size:12.5px;color:var(--muted);box-shadow:var(--shadow);line-height:1.6}
.arvroot .howto b{color:var(--ink)} .arvroot .howto .hl-ok{color:var(--teal)} .arvroot .howto .hl-rev{color:var(--red)}
.arvroot .nav{display:flex;flex-wrap:wrap;gap:7px;margin:18px 0 4px}
.arvroot .nav button{border:1px solid var(--line);background:#fff;border-radius:99px;padding:7px 13px;font-size:12px;font-weight:750;color:#40507e;cursor:pointer;transition:.14s;display:flex;align-items:center;gap:7px}
.arvroot .nav button:hover{border-color:#bcccf7;color:var(--blue);transform:translateY(-1px);box-shadow:var(--shadow)}
.arvroot .nav button .b{font-weight:850;color:var(--blue-soft)}
.arvroot .cat{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);margin-top:12px;overflow:hidden;scroll-margin-top:66px;transition:box-shadow .2s,border-color .2s}
.arvroot .cat.open{box-shadow:var(--shadow-md);border-color:#dbe3f6}
.arvroot .cat.done{border-color:#bfe6de;background:#f4fbf9}
.arvroot .cat.done .cat-h{background:#f4fbf9}
.arvroot .cat.done .cat-h:hover{background:#eaf7f3}
.arvroot .cat.done .cat-idx{background:var(--teal);border-color:var(--teal);color:#fff;box-shadow:0 6px 16px rgba(13,148,136,.26)}
.arvroot .cat-badge{display:none;align-items:center;gap:5px;background:var(--teal);color:#fff;border-radius:99px;padding:3px 10px;font-size:11px;font-weight:800;letter-spacing:.02em;white-space:nowrap}
.arvroot .cat.done .cat-badge{display:inline-flex}
.arvroot .cat-h{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:none;border:0;cursor:pointer;padding:17px 18px;font:inherit;color:inherit}
.arvroot .cat-h:hover{background:#fbfcff}
.arvroot .cat-idx{flex:none;width:36px;height:36px;border-radius:10px;background:var(--tint);color:var(--blue);font-weight:850;font-size:14.5px;display:flex;align-items:center;justify-content:center;border:1px solid #dbe4fb;transition:.2s}
.arvroot .cat.open .cat-idx{background:var(--blue);color:#fff;border-color:var(--blue);box-shadow:0 6px 16px rgba(0,70,255,.28)}
.arvroot .cat-main{flex:1;min-width:0}
.arvroot .cat-title{display:block;font-family:var(--font-poppins),var(--font-inter),sans-serif;font-size:15.5px;font-weight:700;color:var(--ink);letter-spacing:-.01em}
.arvroot .cat-desc{display:block;font-size:12.5px;color:var(--muted-2);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.arvroot .cat.open .cat-desc{white-space:normal}
.arvroot .cat-meta{flex:none;display:flex;align-items:center;gap:13px}
.arvroot .dots{display:flex;gap:4px}
.arvroot .dots .d{width:7px;height:7px;border-radius:50%;background:#d9e0f0;transition:background .15s}
.arvroot .dots .d.ok{background:var(--teal)} .arvroot .dots .d.rev{background:var(--red)}
.arvroot .chev{color:var(--muted-2);font-size:15px;line-height:1;transition:transform .25s ease;font-weight:900}
.arvroot .cat.open .chev{transform:rotate(90deg);color:var(--blue)}
.arvroot .cat-body{display:grid;grid-template-rows:0fr;transition:grid-template-rows .3s ease}
.arvroot .cat-body.open{grid-template-rows:1fr}
.arvroot .cat-inner{overflow:hidden}
.arvroot .cat-pad{padding:2px 18px 10px;border-top:1px solid var(--line-soft)}
.arvroot .q{padding:17px 0;border-bottom:1px solid var(--line-soft)}
.arvroot .q:last-child{border-bottom:0}
.arvroot .qtop{display:flex;align-items:flex-start;gap:12px;justify-content:space-between}
.arvroot .qmain{display:flex;align-items:flex-start;gap:10px;flex:1;min-width:0}
.arvroot .qact{flex:none;display:flex;gap:7px}
.arvroot .num{font-size:11px;font-weight:800;color:var(--blue-soft);padding-top:5px;min-width:18px}
.arvroot .lab{flex:1;font-size:15px;font-weight:650;color:#17224a;border-radius:8px;padding:5px 9px;margin:-5px -9px;outline:none;cursor:text;border:1px dashed transparent;transition:background .12s,border-color .12s,box-shadow .12s}
.arvroot .lab:hover{background:#f2f6ff;border-color:#cbd6f2}
.arvroot .lab:focus{background:#fff;border-style:solid;border-color:var(--blue);box-shadow:0 0 0 3px #0046ff22}
.arvroot .ctrl{margin:11px 0 0 28px}
.arvroot .fp{border:1px solid var(--line);background:#f7f9ff;border-radius:10px;padding:10px 12px;font-size:13.5px;color:#98a1c0;display:flex;align-items:center;gap:8px}
.arvroot .fp.area{min-height:44px;align-items:flex-start}
.arvroot .fp .ic{color:var(--muted-2);font-size:12px;font-weight:800}
.arvroot .two2{display:flex;gap:10px;flex-wrap:wrap}.arvroot .two2 .fp{flex:1;min-width:150px}
.arvroot .dk{margin-top:6px;font-size:12px;color:var(--muted-2);display:flex;align-items:center;gap:7px}
.arvroot .opts{display:flex;flex-wrap:wrap;gap:7px}
.arvroot .opt{border:1px solid #e9edf6;background:#f4f6fb;color:#8a92ab;border-radius:99px;padding:6px 12px;font-size:12.5px;cursor:default}
.arvroot .scale{display:flex;align-items:center;gap:10px}
.arvroot .scale .track{flex:1;height:6px;border-radius:99px;background:linear-gradient(90deg,#f0c4bb,#dbe3f4 55%,#bfe3dc)}
.arvroot .scale .lm{font-size:11px;color:var(--muted-2);font-weight:600}
.arvroot .guide{font-size:12px;color:var(--muted-2);margin:8px 0 0 28px;font-style:italic}
.arvroot .guide b{color:var(--blue-soft);font-style:normal}
.arvroot .stbtn{border:1px solid;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:750;cursor:pointer;transition:.12s;white-space:nowrap}
.arvroot .stbtn.ok{background:#e8f7f3;border-color:#bfe6de;color:#0a8576}
.arvroot .stbtn.ok:hover{background:#d7f0e9;border-color:#0b8f80}
.arvroot .stbtn.ok.on{background:var(--teal);border-color:var(--teal);color:#fff;box-shadow:0 3px 9px rgba(11,143,128,.28)}
.arvroot .stbtn.rev{background:#fdece8;border-color:#f5cabf;color:#cf4028}
.arvroot .stbtn.rev:hover{background:#fbdfd8;border-color:#e5533c}
.arvroot .stbtn.rev.on{background:var(--red);border-color:var(--red);color:#fff;box-shadow:0 3px 9px rgba(229,83,60,.28)}
.arvroot .cwrap{margin:12px 0 0 28px}
.arvroot .addcmt{border:1px dashed #cbd6f0;background:#f5f8ff;color:var(--blue-soft);font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;padding:6px 12px;border-radius:8px;display:inline-flex;align-items:center;gap:7px;transition:.12s}
.arvroot .addcmt:hover{border-color:var(--blue);color:var(--blue);background:#eef3ff}
.arvroot .addcmt .p{font-size:15px;line-height:1;font-weight:800}
.arvroot .cmt{display:none;width:100%;background:#fffdf6;border:1px solid #f0e6cf;border-radius:10px;color:var(--ink);font:inherit;font-size:13px;padding:9px 11px;min-height:40px;resize:vertical;outline:none}
.arvroot .cwrap.open .cmt{display:block}
.arvroot .cwrap.open .addcmt{display:none}
.arvroot .cmt:focus{border-color:var(--amber);background:#fff}
.arvroot .cmt::placeholder{color:#bcae86}
.arvroot .bar{position:fixed;left:0;right:0;bottom:0;z-index:30;background:rgba(255,255,255,.94);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-top:1px solid var(--line);display:flex;align-items:center;gap:10px;justify-content:center;padding:11px 18px;font-size:13px;font-weight:700}
.arvroot .bar .dot{width:8px;height:8px;border-radius:50%;background:var(--muted-2)}
.arvroot .bar.saving .dot{background:var(--amber)} .arvroot .bar.saved .dot{background:var(--teal)} .arvroot .bar.error .dot{background:var(--red)}
.arvroot .bar .t{color:var(--muted)} .arvroot .bar.saved .t{color:var(--teal)} .arvroot .bar.error .t{color:var(--red)}
.arvroot footer{margin:26px 0 8px;color:var(--muted-2);font-size:12px;line-height:1.6;text-align:center}
@media (prefers-reduced-motion:reduce){.arvroot .cat-body{transition:none}.arvroot .chev{transition:none}.arvroot .nav button:hover{transform:none}}
`;

export default function ReviewClientV3() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inited = useRef(false);

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const root = rootRef.current;
    if (!root) return;

    let edits: Edits = {};
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let inflight = false;

    const esc = (s: string) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const key = (si: number, qi: number) => si + "_" + qi;
    const ensure = (k: string): Edit => (edits[k] = edits[k] || {});

    const counts = () => { let ok = 0, rev = 0, total = 0; SECTIONS.forEach((sec, si) => sec.qs.forEach((_, qi) => { total++; const s = edits[key(si, qi)]?.s; if (s === "ok") ok++; else if (s === "rev") rev++; })); return { ok, rev, wait: total - ok - rev }; };
    const dotsHTML = (si: number) => SECTIONS[si].qs.map((_, qi) => { const s = edits[key(si, qi)]?.s; return '<span class="d' + (s === "ok" ? " ok" : s === "rev" ? " rev" : "") + '"></span>'; }).join("");
    const sectionDone = (si: number) => SECTIONS[si].qs.length > 0 && SECTIONS[si].qs.every((_, qi) => edits[key(si, qi)]?.s === "ok");
    const sectionComplete = (si: number) => SECTIONS[si].qs.length > 0 && SECTIONS[si].qs.every((_, qi) => { const s = edits[key(si, qi)]?.s; return s === "ok" || s === "rev"; });
    const refreshDone = (si: number) => { const c = root.querySelector('.cat[data-si="' + si + '"]'); if (c) c.classList.toggle("done", sectionDone(si)); };
    const refreshDots = (si: number) => { const d = root.querySelector('.cat[data-si="' + si + '"] .dots'); if (d) d.innerHTML = dotsHTML(si); };

    const setBar = (cls: string, txt: string) => { const bar = root.querySelector<HTMLElement>(".bar"); if (bar) { bar.className = "bar " + cls; const t = bar.querySelector(".t"); if (t) t.textContent = txt; } };
    const doSave = async () => { inflight = true; setBar("saving", "Enregistrement…"); try { const r = await fetch("/api/audit-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: STORE_ID, data: { edits } }) }); if (!r.ok) throw new Error("save"); inflight = false; setBar("saved", "Enregistré ✓"); } catch { inflight = false; setBar("error", "Échec — nouvelle tentative…"); saveTimer = setTimeout(doSave, 3000); } };
    const scheduleSave = () => { setBar("saving", "Modification en attente…"); if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(doSave, 900); };
    const updateMini = () => { const c = counts(); const el = root.querySelector("#mini"); if (el) el.innerHTML = '<span class="ok">✓ ' + c.ok + "</span><span class=\"rev\">✎ " + c.rev + "</span><span class=\"wait\">○ " + c.wait + "</span>"; };

    const control = (q: Q): string => {
      if (q.t === "choice" && q.o) return '<div class="opts">' + q.o.map((o) => '<span class="opt">' + esc(o) + "</span>").join("") + "</div>";
      if (q.t === "scale") return '<div class="scale"><span class="lm">0</span><span class="track"></span><span class="lm">10</span></div>';
      if (q.t === "num2") return '<div class="two2"><div class="fp"><span class="ic">12 mois</span><span>' + esc(q.ex || "") + " €</span></div><div class=\"fp\"><span class=\"ic\">3 ans</span><span>" + esc(q.ex2 || "") + " €</span></div></div>";
      if (q.t === "num") { let h = '<div class="fp"><span class="ic">' + esc(q.u || "#") + '</span><span>' + esc(q.ex || "") + "</span></div>"; if (q.dk) h += '<div class="dk">ou&nbsp;: <span class="opt">Je ne sais pas</span></div>'; return h; }
      return '<div class="fp area"><span>' + esc(q.ex || "Réponse du chef d’entreprise…") + "</span></div>";
    };

    const questionHTML = (q: Q, si: number, qi: number): string => {
      const k = key(si, qi); const e = edits[k] || {};
      const label = e.l != null ? e.l : q.l;
      const hasC = !!(e.c && e.c.trim());
      let h = '<div class="q" data-si="' + si + '" data-qi="' + qi + '">' +
        '<div class="qtop">' +
          '<div class="qmain"><span class="num">' + (qi + 1) + "</span>" +
          '<div class="lab" contenteditable="true" data-role="label" spellcheck="false">' + esc(label) + "</div></div>" +
          '<div class="qact">' +
            '<button type="button" class="stbtn ok' + (e.s === "ok" ? " on" : "") + '" data-role="st" data-val="ok" aria-pressed="' + (e.s === "ok") + '" title="Marquer comme validée">Validée</button>' +
            '<button type="button" class="stbtn rev' + (e.s === "rev" ? " on" : "") + '" data-role="st" data-val="rev" aria-pressed="' + (e.s === "rev") + '" title="Marquer à revoir">À revoir</button>' +
          "</div>" +
        "</div>" +
        '<div class="ctrl">' + control(q) + "</div>";
      if (q.g) h += '<div class="guide"><b>→ aide :</b> ' + esc(q.g) + "</div>";
      h += '<div class="cwrap' + (hasC ? " open" : "") + '">' +
        '<button type="button" class="addcmt" data-role="addcmt"><span class="p">+</span> Ajouter un commentaire</button>' +
        '<textarea class="cmt" data-role="cmt" placeholder="Votre commentaire ou reformulation…">' + esc(e.c || "") + "</textarea>" +
        "</div></div>";
      return h;
    };

    const render = () => {
      let html = '<div class="stick"><div class="in"><span class="nm"><span class="d"></span>Diagnostic V3 — relecture</span>' +
        '<span class="mini" id="mini"></span>' +
        '<button class="exp" data-role="expand" data-open="0">Tout déplier</button></div></div>';
      html += '<div class="wrap"><header>' +
        '<p class="eyebrow">V3 · après retours de Max · à finaliser</p>' +
        "<h1>Le Diagnostic Business — V3</h1>" +
        '<p class="sub">Version resserrée intégrant tes annotations et ton message : ~24 questions de diagnostic, structure alignée sur le rapport (croissance, rentabilité, machine commerciale, liberté du chef d’entreprise). Cible : 8-10 min.</p>' +
        '<div class="howto"><b>Pour Max :</b> dépliez un bloc, puis sur chaque question — <b>réécrivez</b> le texte, marquez <b class="hl-ok">Validée</b> / <b class="hl-rev">À revoir</b>, ou <b>ajoutez un commentaire</b>. Les réponses affichées sont un <b>aperçu non modifiable</b>. Enregistrement <b>automatique</b>, indépendant des V1/V2.</div>' +
        '<div class="nav">' +
        SECTIONS.map((s, si) => '<button data-jump="' + si + '"><span class="b">' + esc(s.tag) + "</span>" + esc(s.title) + "</button>").join("") +
        "</div></header>";
      SECTIONS.forEach((sec, si) => {
        const dn = sectionDone(si);
        html += '<section class="cat' + (dn ? " done" : "") + '" data-si="' + si + '">' +
          '<button class="cat-h" data-role="toggle" type="button">' +
          '<span class="cat-idx">' + esc(sec.tag) + "</span>" +
          '<span class="cat-main"><span class="cat-title">' + esc(sec.title) + '</span><span class="cat-desc">' + esc(sec.desc || (sec.qs.length + " questions")) + "</span></span>" +
          '<span class="cat-meta"><span class="cat-badge">✓ Validé</span><span class="dots">' + dotsHTML(si) + '</span><span class="chev">›</span></span>' +
          "</button>" +
          '<div class="cat-body"><div class="cat-inner"><div class="cat-pad">' +
          sec.qs.map((q, qi) => questionHTML(q, si, qi)).join("") +
          "</div></div></div></section>";
      });
      const total = SECTIONS.reduce((n, s) => n + s.qs.length, 0);
      html += '<footer>' + total + ' questions (dont ' + SECTIONS[0].qs.length + ' de profil) · ~' + (total - SECTIONS[0].qs.length) + ' de diagnostic. Version 3 — après relecture de Max. Rendu d’aperçu, réponses = exemples. Modifs enregistrées automatiquement.</footer></div>' +
        '<div class="bar saved"><span class="dot"></span><span class="t">Enregistré ✓</span></div>';
      root.innerHTML = html;
      updateMini();
      wire();
    };

    const kof = (el: Element): string | null => { const card = el.closest<HTMLElement>(".q"); if (!card) return null; return key(Number(card.getAttribute("data-si")), Number(card.getAttribute("data-qi"))); };
    const setOpen = (cat: Element, open: boolean) => { cat.classList.toggle("open", open); cat.querySelector(".cat-body")?.classList.toggle("open", open); };
    const wire = () => {
      root.querySelectorAll<HTMLElement>("[data-role=label]").forEach((el) => { el.addEventListener("input", () => { const k = kof(el); if (k) { ensure(k).l = el.textContent || ""; scheduleSave(); } }); });
      root.querySelectorAll<HTMLTextAreaElement>("[data-role=cmt]").forEach((el) => { el.addEventListener("input", () => { const k = kof(el); if (k) { ensure(k).c = el.value; scheduleSave(); } }); el.addEventListener("blur", () => { if (!el.value.trim()) el.closest(".cwrap")?.classList.remove("open"); }); });
      root.querySelectorAll<HTMLElement>("[data-role=addcmt]").forEach((el) => { el.addEventListener("click", () => { const w = el.closest(".cwrap"); if (!w) return; w.classList.add("open"); w.querySelector<HTMLTextAreaElement>("textarea")?.focus(); }); });
      root.querySelectorAll<HTMLElement>("[data-role=st]").forEach((el) => {
        el.addEventListener("click", () => {
          const k = kof(el); if (!k) return;
          const catEl = el.closest<HTMLElement>(".cat");
          const si = Number(catEl?.getAttribute("data-si"));
          const wasComplete = !Number.isNaN(si) && sectionComplete(si);
          const v = el.getAttribute("data-val") || ""; const e = ensure(k);
          e.s = e.s === v ? "" : v;
          el.closest(".q")?.querySelectorAll<HTMLElement>("[data-role=st]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-val") === e.s));
          if (!Number.isNaN(si)) { refreshDots(si); refreshDone(si); }
          updateMini(); scheduleSave();
          if (!Number.isNaN(si) && !wasComplete && catEl && sectionComplete(si)) setTimeout(() => setOpen(catEl, false), 280);
        });
      });
      root.querySelectorAll<HTMLElement>("[data-role=toggle]").forEach((el) => { el.addEventListener("click", () => { const cat = el.closest(".cat"); if (cat) setOpen(cat, !cat.classList.contains("open")); }); });
      root.querySelectorAll<HTMLElement>("[data-jump]").forEach((el) => { el.addEventListener("click", () => { const si = el.getAttribute("data-jump"); const cat = root.querySelector('.cat[data-si="' + si + '"]'); if (cat) { setOpen(cat, true); cat.scrollIntoView({ behavior: "smooth", block: "start" }); } }); });
      const exp = root.querySelector<HTMLElement>("[data-role=expand]");
      exp?.addEventListener("click", () => { const open = exp.getAttribute("data-open") !== "1"; root.querySelectorAll(".cat").forEach((c) => setOpen(c, open)); exp.setAttribute("data-open", open ? "1" : "0"); exp.textContent = open ? "Tout replier" : "Tout déplier"; });
    };

    (async () => {
      try { const r = await fetch("/api/audit-review?id=" + STORE_ID); if (r.ok) { const j = await r.json(); if (j && j.data && j.data.edits) edits = j.data.edits as Edits; } } catch { /* hors-ligne */ }
      render();
    })();

    const onUnload = (e: BeforeUnloadEvent) => { if (inflight || saveTimer) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", onUnload);
    return () => { window.removeEventListener("beforeunload", onUnload); };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="arvroot" ref={rootRef} />
    </>
  );
}
