"use client";

import { useEffect, useRef } from "react";

/**
 * Relecture/validation des questions du diagnostic — outil interne ISOLÉ.
 *
 * Affiche le RENDU de l'audit tel qu'il sera livré (champs, choix en chips,
 * curseurs 1–10), classé par CATÉGORIE (les 9 leviers), et permet à Max de
 * réécrire un libellé, de le marquer « Validée »/« À revoir » et de commenter.
 *
 * Persistance : seules les modifications (libellé, statut, commentaire), indexées
 * par question, via /api/audit-review (table dédiée cdv.audit_review).
 * Autonome : aucun import du SaaS, styles scindés sous « .arvroot ».
 */

type QType = "text" | "area" | "num" | "choice" | "scale" | "rates";
type Q = { l: string; t: QType; o?: string[]; ex?: string; g?: string; u?: string };
type Section = { tag: string; title: string; desc: string; qs: Q[] };
type Edit = { l?: string; s?: string; c?: string };
type Edits = Record<string, Edit>;

const CA = ["Pas encore d'entreprise", "0 – 30K", "30 – 100K", "100 – 300K", "300K – 1M", "1 – 10M", "+ 10M"];
const SECT = ["Saas", "Coach / Consultant", "BTP", "Immo", "Dentiste", "Avocat", "Chirurgien", "Business en ligne", "Opticien", "CGP", "Expert-comptable", "Autre"];
const LEVIERS = ["Ciblage", "Acquisition", "Conversion", "Closing", "Offre", "Profit", "Systems", "Leadership", "Croissance"];

const SECTIONS: Section[] = [
  { tag: "A", title: "Qualification", desc: "À l'entrée — crée l'espace et qualifie le lead.", qs: [
    { l: "Prénom", t: "text", ex: "Julie" },
    { l: "Email", t: "text", ex: "julie@monentreprise.fr" },
    { l: "Votre chiffre d'affaires annuel", t: "choice", o: CA },
    { l: "Votre secteur", t: "choice", o: SECT },
    { l: "Téléphone", t: "text", ex: "🇫🇷 +33   ·   6 12 34 56 78" },
  ] },
  { tag: "B", title: "Diagnostic express", desc: "~5 min — donne le score, le radar et le coût de l'inaction.", qs: [
    { l: "Décrivez votre activité en une phrase : que vendez-vous, et à qui ?", t: "area", ex: "Je pose des cuisines sur-mesure pour des particuliers haut de gamme autour de Lyon." },
    { l: "Objectif de CA sur les 12 prochains mois", t: "num", u: "€", ex: "800 000" },
    { l: "CA réalisé sur les 12 derniers mois", t: "num", u: "€", ex: "520 000" },
    { l: "Sur 100 € vendus, combien vous reste-t-il une fois toutes les charges payées ?", t: "choice", o: ["+ de 15 €", "8 – 15 €", "– de 8 €", "Je ne sais pas"] },
    { l: "Si vos ventes s'arrêtaient demain, combien de temps votre trésorerie tiendrait ?", t: "choice", o: ["+ de 3 mois", "1 – 3 mois", "– d'un mois", "Je ne sais pas"], g: "le cash reste un indicateur de santé, mesuré ici (ce n'est pas un des 9 leviers)." },
    { l: "Notez vos 9 leviers de 1 à 10", t: "rates", o: LEVIERS, g: "1 = point faible · 10 = parfaitement maîtrisé." },
    { l: "Où voulez-vous emmener votre entreprise dans les 3 prochaines années ?", t: "area", ex: "Passer de 500 K à 2 M€, avec une équipe qui gère sans moi.", g: "un chiffre ET une situation." },
    { l: "Qu'est-ce qui vous empêche le plus d'y arriver aujourd'hui ?", t: "area", ex: "Tout repose sur moi, je n'ai pas de flux régulier de clients." },
  ] },

  { tag: "1", title: "Ciblage", desc: "Le client idéal : celui qui achète plus, plus vite et plus souvent (la règle des 80/20).", qs: [
    { l: "Qui est votre client idéal — celui qui achète plus, plus vite et plus souvent ?", t: "area", ex: "Les restaurants de 2 à 3 établissements, déjà rentables, qui veulent se digitaliser." },
    { l: "Quelle part de votre chiffre d'affaires vient de vos meilleurs clients ?", t: "choice", o: ["< 20 %", "20 – 50 %", "50 – 80 %", "> 80 %"], g: "la règle des 80/20 : 20 % des clients font souvent 80 % de la valeur." },
    { l: "Quels clients, peu rentables ou chronophages, arrêteriez-vous de servir ?", t: "area", ex: "Les petits chantiers ponctuels qui prennent autant de temps qu'un gros." },
    { l: "Si vous ne deviez cibler qu'UN segment pour les 12 prochains mois, lequel ?", t: "text", ex: "Les PME du bâtiment de 10 à 50 salariés." },
  ] },
  { tag: "2", title: "Acquisition", desc: "Un flux d'opportunités constant plutôt que des à-coups, canal par canal.", qs: [
    { l: "Comment vos nouveaux clients vous trouvent-ils aujourd'hui ?", t: "choice", o: ["Bouche-à-oreille", "Clients qui reviennent", "Prescripteurs / partenaires", "Référencement", "Publicité", "Prospection active", "Appels d'offres", "Emplacement / passage", "Autre"] },
    { l: "Votre flux de nouveaux clients est-il régulier, ou en dents de scie ?", t: "choice", o: ["Régulier et prévisible", "Correct mais irrégulier", "Imprévisible, en dents de scie"] },
    { l: "Quelle part de vos nouveaux clients vient de votre source principale ?", t: "choice", o: ["< 25 %", "25 – 50 %", "50 – 75 %", "> 75 %"], g: "mesure la dépendance à un seul canal." },
    { l: "Savez-vous ce que vous coûte l'obtention d'un nouveau client (argent ou temps) ?", t: "choice", o: ["Oui, précisément", "Approximativement", "Non"] },
  ] },
  { tag: "3", title: "Conversion", desc: "Transformer l'intérêt en intention d'achat : colmater la fuite entre le premier contact et la décision.", qs: [
    { l: "Entre un premier contact et l'achat, quelle part d'opportunités se perd en route ?", t: "choice", o: ["Peu (< 25 %)", "Environ la moitié", "Beaucoup (> 50 %)", "Je ne sais pas"], g: "le plus souvent par manque de relance ou de rapidité." },
    { l: "Relancez-vous les prospects intéressés qui n'ont pas encore acheté ?", t: "choice", o: ["Systématiquement", "Parfois", "Rarement ou jamais"] },
    { l: "Quel est votre délai de réponse à une demande entrante ?", t: "choice", o: ["Moins d'une heure", "Dans la journée", "Plusieurs jours"] },
    { l: "Avez-vous un parcours clair entre l'intérêt et la décision d'achat ?", t: "choice", o: ["Oui, structuré", "Informel", "Aucun"] },
  ] },
  { tag: "4", title: "Closing", desc: "Transformer une opportunité en vente — quelle que soit sa forme (devis signé, panier validé, vente au comptoir, RDV conclu).", qs: [
    { l: "Sur 10 clients potentiels arrivés au moment de décider, combien achètent ?", t: "num", u: "/10", ex: "4" },
    { l: "Qui conclut la vente aujourd'hui : vous seul, une équipe, un process ?", t: "choice", o: ["Surtout moi", "Une équipe", "Un process / automatisé"] },
    { l: "Quelle objection revient le plus, et comment y répondez-vous ?", t: "area", ex: "« C'est trop cher » — je justifie par la qualité, mais sans vraiment convaincre." },
    { l: "Votre proposition rend-elle la décision simple (prix clair, étapes, garantie) ?", t: "choice", o: ["Oui", "À améliorer", "Non"] },
  ] },
  { tag: "5", title: "Offre", desc: "L'offre irrésistible : rendre le « oui » évident, par la promesse, la gamme et la différenciation.", qs: [
    { l: "Votre offre principale en une phrase, et qui est votre client idéal", t: "area", ex: "J'accompagne les restaurateurs indépendants à digitaliser leurs réservations." },
    { l: "De 1 à 10, à quel point un prospect se dit « je serais fou de refuser » ?", t: "scale" },
    { l: "Vos différenciateurs, sans les mots creux", t: "area", ex: "Intervention sous 24 h garantie · SAV internalisé · 15 ans de références.", g: "ce que vous êtes seul à faire, pas « qualité » ni « sérieux »." },
    { l: "Si un concurrent vous copie et casse le prix de 20 %, qu'est-ce qui vous reste ?", t: "area", ex: "Ma réputation locale et mes références vérifiables." },
    { l: "Quel changement (garantie, bonus, structure de gamme) rendrait votre offre irrésistible ?", t: "area", ex: "Ajouter une garantie résultat sous 90 jours." },
  ] },
  { tag: "6", title: "Profit", desc: "La mine d'or cachée dans vos clients actuels : panier moyen, fréquence, marge — transformer le volume en résultat net.", qs: [
    { l: "Votre nombre de clients actifs (12 derniers mois)", t: "num", u: "#", ex: "120" },
    { l: "Votre panier moyen (CA moyen par commande)", t: "num", u: "€", ex: "2 500" },
    { l: "Votre fréquence d'achat (nb d'achats/an d'un client)", t: "num", u: "#", ex: "2" },
    { l: "Entre panier moyen et fréquence, lequel est le plus sous-exploité ?", t: "choice", o: ["Panier moyen", "Fréquence d'achat"] },
    { l: "Où est votre plus grosse fuite de marge ?", t: "choice", o: ["Prix", "Coûts directs", "Masse salariale", "Remises", "Créances / impayés", "Stock"] },
  ] },
  { tag: "7", title: "Systems", desc: "La machine qui tourne sans vous : process documentés, indicateurs pilotés, organisation claire.", qs: [
    { l: "Listez les tâches que vous seul faites encore", t: "area", ex: "Devis · SAV · planning · relances · compta.", g: "une par ligne." },
    { l: "Documentez la plus chronophage en 5 étapes (le mode opératoire)", t: "area", ex: "1. Recevoir la demande · 2. Métrer · 3. Chiffrer · 4. Rédiger · 5. Envoyer et relancer." },
    { l: "À qui la déléguez-vous, et pour quelle échéance ?", t: "text", ex: "À Léa, d'ici 30 jours." },
    { l: "Suivez-vous vos indicateurs clés de près (marges, trésorerie, pipeline) ?", t: "choice", o: ["Chaque semaine", "De temps en temps", "Non"] },
    { l: "Votre créneau de pilotage hebdomadaire bloqué (jour + heure)", t: "text", ex: "Vendredi 9 h – 11 h." },
  ] },
  { tag: "8", title: "Leadership", desc: "Le chef d'entreprise qui inspire, priorise et délègue : les bonnes personnes, des résultats plutôt que des tâches.", qs: [
    { l: "Quel recrutement vous ferait passer un cap aujourd'hui ?", t: "text", ex: "Un responsable de production.", g: "un rôle, pas une tâche." },
    { l: "Le résultat attendu de ce poste, en une phrase", t: "area", ex: "Ce poste réussit s'il génère 20 rendez-vous qualifiés par mois.", g: "le résultat, pas la liste des tâches." },
    { l: "Vos 2 valeurs non négociables", t: "text", ex: "Exigence, fiabilité." },
    { l: "Votre priorité n°1 des prochains mois — et ce que vous allez ARRÊTER pour la protéger", t: "area", ex: "Priorité : structurer l'acquisition. J'arrête de faire moi-même les devis.", g: "le « one thing » + ce que vous arrêtez." },
  ] },
  { tag: "9", title: "Croissance", desc: "L'effet multiplicateur final : des clients ambassadeurs, une réputation qui précède l'entreprise, chaque levier qui renforce les huit autres.", qs: [
    { l: "Quelle part de vos nouveaux clients vient de recommandations ?", t: "choice", o: ["Beaucoup (> 50 %)", "Un peu (20 – 50 %)", "Peu (< 20 %)"] },
    { l: "Avez-vous un système pour générer avis, recommandations et ambassadeurs ?", t: "choice", o: ["Oui, actif", "Informel", "Aucun"] },
    { l: "Sur votre marché, votre réputation vous précède-t-elle ?", t: "scale", g: "1 = inconnu · 10 = référence de mon marché." },
    { l: "Quel levier, renforcé, aurait le plus d'effet d'entraînement sur les autres ?", t: "text", ex: "Le closing : mieux vendre rend rentable tout le reste." },
  ] },

  { tag: "★", title: "Bonus — Vous, le chef d'entreprise", desc: "Transversal, précieux pour le conseil et pour préparer l'appel.", qs: [
    { l: "Combien d'heures par semaine consacrez-vous à votre entreprise ?", t: "num", u: "#", ex: "60" },
    { l: "Où part l'essentiel de votre temps aujourd'hui ?", t: "area", ex: "70 % dans l'opérationnel et les urgences, presque rien sur la stratégie." },
    { l: "Sur 1 à 10, à quel point vous sentez-vous débordé ou seul dans vos décisions ?", t: "scale", g: "1 = serein et bien entouré · 10 = débordé et seul." },
  ] },
];

const CSS = `
.arvroot{--bg:#f4f7fd;--card:#fff;--tint:#eef3ff;--line:#e2e8f5;--line-soft:#eef1f8;--blue:#0046ff;--blue-soft:#2f6bff;--ink:#0b1b3f;--muted:#5b6488;--muted-2:#8b93ad;--teal:#0b8f80;--amber:#c98200;--red:#e5533c;--shadow:0 2px 10px rgba(12,32,84,.06);--radius:16px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg);min-height:100vh;line-height:1.5;-webkit-font-smoothing:antialiased;padding-bottom:70px;display:block}
.arvroot *{box-sizing:border-box}
.arvroot .wrap{max-width:760px;margin:0 auto;padding:0 18px}
.arvroot header{padding:30px 0 8px}
.arvroot .badge{display:inline-flex;align-items:center;gap:7px;background:var(--tint);border:1px solid #dbe4fb;border-radius:99px;padding:6px 12px;font-size:11.5px;color:var(--blue);font-weight:700;letter-spacing:.03em;margin-bottom:14px;text-transform:uppercase}
.arvroot h1{font-size:27px;line-height:1.15;letter-spacing:-.02em;margin:0 0 10px;font-weight:850}
.arvroot .sub{color:var(--muted);font-size:14.5px;max-width:60ch;margin:0}
.arvroot .howto{margin-top:14px;background:#fff;border:1px solid var(--line);border-left:3px solid var(--blue);border-radius:12px;padding:13px 15px;font-size:13px;color:var(--muted);box-shadow:var(--shadow)}
.arvroot .howto b{color:var(--ink)}
.arvroot .counts{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.arvroot .pill{font-size:12px;font-weight:700;border-radius:99px;padding:5px 11px;border:1px solid var(--line)}
.arvroot .pill.ok{background:#e6f6f3;color:var(--teal);border-color:#c4e9e3}
.arvroot .pill.rev{background:#fdecea;color:var(--red);border-color:#f6cfc7}
.arvroot .pill.wait{background:#f7f9ff;color:var(--muted)}
.arvroot section.grp{margin-top:26px}
.arvroot .grp-h{display:flex;align-items:baseline;gap:10px;margin:0 0 4px}
.arvroot .grp-h .idx{font-size:12px;font-weight:800;color:var(--blue);background:var(--tint);border:1px solid #dbe4fb;border-radius:8px;padding:3px 9px}
.arvroot .grp-h h2{font-size:19px;font-weight:850;letter-spacing:-.01em;margin:0}
.arvroot .grp-desc{color:var(--muted-2);font-size:12.5px;margin:2px 0 14px}
.arvroot .card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:4px 18px}
.arvroot .q{padding:17px 0;border-bottom:1px solid var(--line-soft)}
.arvroot .q:last-child{border-bottom:0}
.arvroot .qtop{display:flex;align-items:flex-start;gap:10px}
.arvroot .num{font-size:11px;font-weight:800;color:var(--blue-soft);padding-top:5px;min-width:20px}
.arvroot .lab{flex:1;font-size:15px;font-weight:650;color:#17224a;border-radius:8px;padding:5px 8px;margin:-5px -8px;outline:none;transition:background .12s,box-shadow .12s}
.arvroot .lab:hover{background:#f5f8ff}
.arvroot .lab:focus{background:#eef4ff;box-shadow:0 0 0 2px #0046ff44}
.arvroot .ctrl{margin:11px 0 0 30px}
.arvroot .fp{border:1px solid var(--line);background:#f7f9ff;border-radius:10px;padding:10px 12px;font-size:13.5px;color:#9aa3c2;display:flex;align-items:center;gap:8px}
.arvroot .fp.area{min-height:44px;align-items:flex-start}
.arvroot .fp .ic{color:var(--muted-2);font-size:12px;font-weight:700}
.arvroot .opts{display:flex;flex-wrap:wrap;gap:7px}
.arvroot .opt{border:1px solid var(--line);background:#f7f9ff;color:#3a4570;border-radius:99px;padding:6px 12px;font-size:12.5px}
.arvroot .scale{display:flex;align-items:center;gap:10px}
.arvroot .scale .track{flex:1;height:6px;border-radius:99px;background:linear-gradient(90deg,#f0c4bb,#dbe3f4 55%,#bfe3dc)}
.arvroot .scale .lm{font-size:11px;color:var(--muted-2);font-weight:600}
.arvroot .rates{display:flex;flex-direction:column;gap:10px}
.arvroot .rline{display:flex;align-items:center;gap:12px}
.arvroot .rline .rn{font-size:13px;font-weight:600;width:150px;flex:none}
.arvroot .rline .rt{flex:1;height:6px;border-radius:99px;background:linear-gradient(90deg,#f0c4bb,#dbe3f4 55%,#bfe3dc)}
.arvroot .rline .rr{font-size:11px;color:var(--muted-2);font-weight:600;flex:none}
.arvroot .guide{font-size:12px;color:var(--muted-2);margin:8px 0 0 30px;font-style:italic}
.arvroot .guide b{color:var(--blue-soft);font-style:normal}
.arvroot .row2{display:flex;align-items:center;gap:8px;margin:12px 0 0 30px;flex-wrap:wrap}
.arvroot .stbtn{border:1px solid var(--line);background:#f7f9ff;color:#5b6488;border-radius:99px;padding:5px 12px;font-size:12px;font-weight:650;cursor:pointer;transition:.12s}
.arvroot .stbtn:hover{border-color:#c7d2f0}
.arvroot .stbtn.ok.on{background:var(--teal);border-color:var(--teal);color:#fff}
.arvroot .stbtn.rev.on{background:var(--red);border-color:var(--red);color:#fff}
.arvroot .cmt{width:calc(100% - 30px);margin:10px 0 0 30px;background:#fffdf6;border:1px solid #f0e6cf;border-radius:10px;color:var(--ink);font:inherit;font-size:13px;padding:9px 11px;min-height:36px;resize:vertical;outline:none}
.arvroot .cmt:focus{border-color:var(--amber);background:#fff}
.arvroot .cmt::placeholder{color:#b9a97f}
.arvroot .bar{position:fixed;left:0;right:0;bottom:0;z-index:30;background:rgba(255,255,255,.94);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-top:1px solid var(--line);display:flex;align-items:center;gap:10px;justify-content:center;padding:11px 18px;font-size:13px;font-weight:600}
.arvroot .bar .dot{width:8px;height:8px;border-radius:50%;background:var(--muted-2)}
.arvroot .bar.saving .dot{background:var(--amber)}
.arvroot .bar.saved .dot{background:var(--teal)}
.arvroot .bar.error .dot{background:var(--red)}
.arvroot .bar .t{color:var(--muted)}
.arvroot .bar.saved .t{color:var(--teal)}
.arvroot .bar.error .t{color:var(--red)}
.arvroot footer{margin:28px 0 10px;color:var(--muted-2);font-size:12px;line-height:1.6;text-align:center}
`;

export default function ReviewClient() {
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

    const esc = (s: string) =>
      String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const key = (si: number, qi: number) => si + "_" + qi;
    const ensure = (k: string): Edit => (edits[k] = edits[k] || {});

    const counts = () => {
      let ok = 0, rev = 0, total = 0;
      SECTIONS.forEach((sec, si) => sec.qs.forEach((_, qi) => {
        total++; const s = edits[key(si, qi)]?.s; if (s === "ok") ok++; else if (s === "rev") rev++;
      }));
      return { ok, rev, wait: total - ok - rev };
    };

    const setBar = (cls: string, txt: string) => {
      const bar = root.querySelector<HTMLElement>(".bar");
      if (bar) { bar.className = "bar " + cls; const t = bar.querySelector(".t"); if (t) t.textContent = txt; }
    };
    const doSave = async () => {
      inflight = true; setBar("saving", "Enregistrement…");
      try {
        const r = await fetch("/api/audit-review", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "questions", data: { edits } }),
        });
        if (!r.ok) throw new Error("save");
        inflight = false; setBar("saved", "Enregistré ✓");
      } catch {
        inflight = false; setBar("error", "Échec — nouvelle tentative…");
        saveTimer = setTimeout(doSave, 3000);
      }
    };
    const scheduleSave = () => {
      setBar("saving", "Modification en attente…");
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(doSave, 900);
    };

    const updateCounts = () => {
      const c = counts(); const el = root.querySelector("#counts");
      if (el) el.innerHTML =
        '<span class="pill ok">✓ ' + c.ok + " validées</span>" +
        '<span class="pill rev">✎ ' + c.rev + " à revoir</span>" +
        '<span class="pill wait">' + c.wait + " en attente</span>";
    };

    const control = (q: Q): string => {
      if (q.t === "choice" && q.o) return '<div class="opts">' + q.o.map((o) => '<span class="opt">' + esc(o) + "</span>").join("") + "</div>";
      if (q.t === "scale") return '<div class="scale"><span class="lm">1</span><span class="track"></span><span class="lm">10</span></div>';
      if (q.t === "rates" && q.o) return '<div class="rates">' + q.o.map((o) => '<div class="rline"><span class="rn">' + esc(o) + '</span><span class="rt"></span><span class="rr">1–10</span></div>').join("") + "</div>";
      if (q.t === "num") return '<div class="fp"><span class="ic">' + esc(q.u || "#") + '</span><span>' + esc(q.ex || "") + "</span></div>";
      return '<div class="fp area"><span>' + esc(q.ex || "Réponse du chef d’entreprise…") + "</span></div>";
    };

    const render = () => {
      let html = '<div class="wrap"><header>' +
        '<span class="badge">Aperçu de l’audit · à valider</span>' +
        "<h1>Le Diagnostic Business — le rendu, à valider</h1>" +
        '<p class="sub">L’audit tel qu’il sera livré, classé par levier : chaque question avec sa réponse (champs, choix, curseurs). Vous pouvez tout ajuster directement.</p>' +
        '<div class="howto"><b>Pour Max :</b> cliquez dans le texte d’une question pour la <b>réécrire</b>, marquez-la <b>✓ Validée</b> / <b>✎ À revoir</b>, et laissez un <b>commentaire</b> (ex. pour changer des options de réponse). Enregistrement <b>automatique</b>. <br>Structure : opt-in, express (score/radar), puis les <b>9 leviers</b> (~4 questions chacun, optionnels) + bonus.</div>' +
        '<div class="counts" id="counts"></div></header>';
      SECTIONS.forEach((sec, si) => {
        html += '<section class="grp"><div class="grp-h"><span class="idx">' + esc(sec.tag) + "</span><h2>" + esc(sec.title) + "</h2></div>";
        if (sec.desc) html += '<p class="grp-desc">' + esc(sec.desc) + "</p>";
        html += '<div class="card">';
        sec.qs.forEach((q, qi) => {
          const k = key(si, qi); const e = edits[k] || {};
          const label = e.l != null ? e.l : q.l;
          html += '<div class="q" data-si="' + si + '" data-qi="' + qi + '">' +
            '<div class="qtop"><span class="num">' + (qi + 1) + "</span>" +
            '<div class="lab" contenteditable="true" data-role="label" spellcheck="false">' + esc(label) + "</div></div>" +
            '<div class="ctrl">' + control(q) + "</div>";
          if (q.g) html += '<div class="guide"><b>→ aide :</b> ' + esc(q.g) + "</div>";
          html += '<div class="row2">' +
            '<button type="button" class="stbtn ok' + (e.s === "ok" ? " on" : "") + '" data-role="st" data-val="ok">✓ Validée</button>' +
            '<button type="button" class="stbtn rev' + (e.s === "rev" ? " on" : "") + '" data-role="st" data-val="rev">✎ À revoir</button>' +
            "</div>" +
            '<textarea class="cmt" data-role="cmt" placeholder="Commentaire ou reformulation (facultatif)…">' + esc(e.c || "") + "</textarea>" +
            "</div>";
        });
        html += "</div></section>";
      });
      html += '<footer>9 leviers · ~55 questions au total (le prospect n’en remplit qu’une quinzaine pour l’express, le reste est optionnel). Rendu d’aperçu — les réponses affichées sont des exemples. Modifs enregistrées automatiquement.</footer></div>' +
        '<div class="bar saved"><span class="dot"></span><span class="t">Enregistré ✓</span></div>';
      root.innerHTML = html;
      updateCounts();
      wire();
    };

    const kof = (el: Element): string | null => {
      const card = el.closest<HTMLElement>(".q"); if (!card) return null;
      return key(Number(card.getAttribute("data-si")), Number(card.getAttribute("data-qi")));
    };
    const wire = () => {
      root.querySelectorAll<HTMLElement>("[data-role=label]").forEach((el) => {
        el.addEventListener("input", () => { const k = kof(el); if (k) { ensure(k).l = el.textContent || ""; scheduleSave(); } });
      });
      root.querySelectorAll<HTMLTextAreaElement>("[data-role=cmt]").forEach((el) => {
        el.addEventListener("input", () => { const k = kof(el); if (k) { ensure(k).c = el.value; scheduleSave(); } });
      });
      root.querySelectorAll<HTMLElement>("[data-role=st]").forEach((el) => {
        el.addEventListener("click", () => {
          const k = kof(el); if (!k) return;
          const v = el.getAttribute("data-val") || ""; const e = ensure(k);
          e.s = e.s === v ? "" : v;
          el.closest(".q")?.querySelectorAll<HTMLElement>("[data-role=st]").forEach((b) => {
            b.classList.toggle("on", b.getAttribute("data-val") === e.s);
          });
          updateCounts(); scheduleSave();
        });
      });
    };

    (async () => {
      try {
        const r = await fetch("/api/audit-review?id=questions");
        if (r.ok) { const j = await r.json(); if (j && j.data && j.data.edits) edits = j.data.edits as Edits; }
      } catch { /* hors-ligne : rendu par défaut */ }
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
