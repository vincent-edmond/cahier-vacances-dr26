"use client";

import { useEffect, useRef } from "react";

/**
 * Relecture/validation des questions du diagnostic — outil interne ISOLÉ.
 *
 * Affiche le RENDU de l'audit tel qu'il sera livré (champs, choix en chips,
 * curseurs 1–10), et permet à Max de réécrire le libellé d'une question,
 * de la marquer « Validée »/« À revoir » et de commenter — directement dessus.
 *
 * Persistance : seules les modifications (libellé réécrit, statut, commentaire)
 * sont sauvegardées, indexées par question, via /api/audit-review (table dédiée
 * cdv.audit_review). Le rendu (options, curseurs) vient du modèle par défaut.
 *
 * Autonome : aucun import du SaaS, styles scindés sous « .arvroot ».
 */

type QType = "text" | "area" | "num" | "choice" | "scale" | "rates";
type Q = { l: string; t: QType; o?: string[]; ex?: string; g?: string; u?: string };
type Section = { tag: string; title: string; desc: string; qs: Q[] };
type Edit = { l?: string; s?: string; c?: string };
type Edits = Record<string, Edit>;

const CA = ["Pas encore d'entreprise", "0 – 30K", "30 – 100K", "100 – 300K", "300K – 1M", "1 – 10M", "+ 10M"];
const SECT = ["Saas", "Coach / Consultant", "BTP", "Immo", "Dentiste", "Avocat", "Chirurgien", "Business en ligne", "Opticien", "CGP", "Expert-comptable", "Autre"];
const LEVIERS = ["Santé financière", "Clarté stratégique", "Force de l'offre", "Différenciation", "Acquisition", "Autonomie opérationnelle", "Croissance & monétisation", "Marges & cash", "Solidité de l'équipe", "Pilotage & exécution"];

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
    { l: "Si vos ventes s'arrêtaient demain, combien de temps votre trésorerie tiendrait ?", t: "choice", o: ["+ de 3 mois", "1 – 3 mois", "– d'un mois", "Je ne sais pas"] },
    { l: "Notez vos 10 leviers de 1 à 10", t: "rates", o: LEVIERS, g: "1 = point faible · 10 = parfaitement maîtrisé." },
    { l: "Où voulez-vous emmener votre entreprise dans les 3 prochaines années ?", t: "area", ex: "Passer de 500 K à 2 M€, avec une équipe qui gère sans moi.", g: "un chiffre ET une situation." },
    { l: "Qu'est-ce qui vous empêche le plus d'y arriver aujourd'hui ?", t: "area", ex: "Tout repose sur moi, je n'ai pas de flux régulier de clients." },
  ] },
  { tag: "1", title: "Santé financière & performance", desc: "", qs: [
    { l: "Votre CA sur les 3 dernières années : en croissance, stable, ou en baisse ?", t: "choice", o: ["Forte croissance", "Légère croissance", "Stable", "En baisse"], g: "précisez si possible : 2022 : 300K · 2023 : 380K · 2024 : 520K." },
    { l: "Le levier où ça coince le plus", t: "choice", o: ["Stratégie", "Offre", "Différenciation", "Acquisition", "Vente", "Opérationnel", "Rentabilité", "Équipe"] },
    { l: "Ce que vous devez absolument corriger dans les prochains mois", t: "area", ex: "Arrêter de brader mes prix pour signer." },
    { l: "Le chiffre qui vous inquiète le plus aujourd'hui, et pourquoi", t: "area", ex: "Ma trésorerie : je n'ai qu'un mois d'avance." },
  ] },
  { tag: "2", title: "Focus stratégique", desc: "", qs: [
    { l: "Listez toutes vos priorités actuelles, sans filtre", t: "area", ex: "Recruter un commercial · refondre l'offre · structurer la production.", g: "une par ligne." },
    { l: "Si vous ne pouviez en garder qu'UNE, laquelle change le plus la donne ?", t: "area", ex: "Mettre en place un système d'acquisition régulier." },
    { l: "Votre priorité n°1 des prochains mois, en une phrase", t: "text", ex: "Je me concentre sur la structuration de mon équipe commerciale." },
    { l: "Quelles 2 à 3 choses allez-vous ARRÊTER pour protéger ce cap ?", t: "area", ex: "J'arrête de faire moi-même les devis et le SAV." },
  ] },
  { tag: "3", title: "Offre & positionnement", desc: "", qs: [
    { l: "Votre offre principale en une phrase, et qui est votre client idéal", t: "area", ex: "J'accompagne les restaurateurs indépendants à digitaliser leurs réservations. Client idéal : 1 à 3 établissements." },
    { l: "De 1 à 10, à quel point un prospect se dit « je serais fou de refuser » ?", t: "scale" },
    { l: "Pourquoi ce chiffre ?", t: "area", ex: "Mon offre ressemble à celle des concurrents, rien ne la rend évidente." },
    { l: "Quel UN changement la rendrait nettement plus irrésistible ?", t: "area", ex: "Ajouter une garantie résultat sous 90 jours.", g: "une garantie, un bonus, une reformulation de la promesse." },
  ] },
  { tag: "4", title: "Différenciation & avantage concurrentiel", desc: "", qs: [
    { l: "Quelle est LA douleur n°1 mal résolue de votre marché ?", t: "area", ex: "Les clients subissent des délais à rallonge et zéro suivi." },
    { l: "Vos 3 différenciateurs, sans les mots creux", t: "area", ex: "Intervention sous 24 h garantie · SAV internalisé · 15 ans de références.", g: "ce que vous êtes seul à faire, pas « qualité » ni « sérieux »." },
    { l: "Si un concurrent vous copie et casse le prix de 20 %, qu'est-ce qui vous reste ?", t: "area", ex: "Ma réputation locale et mes références vérifiables." },
    { l: "Complétez : « On gagne parce que nous sommes les seuls à… »", t: "area", ex: "…combiner pose et SAV internalisés, sans sous-traitance." },
  ] },
  { tag: "5", title: "Acquisition & développement commercial", desc: "", qs: [
    { l: "Comment vos nouveaux clients vous trouvent-ils aujourd'hui ?", t: "choice", o: ["Bouche-à-oreille", "Clients qui reviennent", "Prescripteurs / partenaires", "Référencement", "Publicité", "Prospection active", "Appels d'offres", "Emplacement / passage", "Autre"] },
    { l: "Votre flux de nouveaux clients est-il régulier, ou en dents de scie ?", t: "choice", o: ["Régulier et prévisible", "Correct mais irrégulier", "Imprévisible, en dents de scie"] },
    { l: "Quelle part de vos nouveaux clients vient de votre source principale ?", t: "choice", o: ["< 25 %", "25 – 50 %", "50 – 75 %", "> 75 %"], g: "mesure la dépendance à un seul canal." },
    { l: "Votre acquisition dépend-elle surtout de vous, ou d'un système qui tourne sans vous ?", t: "choice", o: ["Surtout moi", "Un mix", "Un système qui tourne"] },
    { l: "Savez-vous ce que vous coûte l'obtention d'un nouveau client (argent ou temps) ?", t: "choice", o: ["Oui, précisément", "Approximativement", "Non"] },
    { l: "Si vous vouliez doubler vos nouveaux clients, sauriez-vous comment faire ?", t: "area", ex: "Non, je ne saurais pas par où commencer." },
  ] },
  { tag: "6", title: "Autonomie opérationnelle", desc: "", qs: [
    { l: "Listez les tâches que vous seul faites encore", t: "area", ex: "Devis · SAV · planning · relances · compta.", g: "une par ligne." },
    { l: "Celle qui vous coûte le plus de temps", t: "text", ex: "La production des devis, 8 h par semaine." },
    { l: "Documentez-la en 5 étapes (le mode opératoire)", t: "area", ex: "1. Recevoir la demande · 2. Métrer · 3. Chiffrer · 4. Rédiger · 5. Envoyer et relancer." },
    { l: "À qui la déléguez-vous, et pour quelle échéance ?", t: "text", ex: "À Léa, d'ici 30 jours." },
  ] },
  { tag: "7", title: "Croissance & monétisation", desc: "", qs: [
    { l: "Votre nombre de clients actifs (12 derniers mois)", t: "num", u: "#", ex: "120" },
    { l: "Votre panier moyen (CA moyen par commande)", t: "num", u: "€", ex: "2 500" },
    { l: "Votre fréquence d'achat (nb d'achats/an d'un client)", t: "num", u: "#", ex: "2" },
    { l: "Entre panier moyen et fréquence, lequel est le plus sous-exploité ?", t: "choice", o: ["Panier moyen", "Fréquence d'achat"] },
    { l: "Une action concrète pour l'augmenter", t: "area", ex: "Proposer un contrat d'entretien annuel après chaque installation." },
    { l: "Projetez : +10 % sur ce levier, ça fait combien de CA en plus ?", t: "num", u: "€", ex: "30 000" },
  ] },
  { tag: "8", title: "Rentabilité & cash", desc: "", qs: [
    { l: "Suivez-vous vos marges et votre trésorerie de près ?", t: "choice", o: ["Chaque semaine", "De temps en temps", "Non"] },
    { l: "Où est votre plus grosse fuite ?", t: "choice", o: ["Prix", "Volume", "Coûts directs", "Masse salariale", "Créances clients", "Dettes fournisseurs", "Stock"] },
    { l: "Une action immédiate", t: "area", ex: "Augmenter mes tarifs de 10 % dès le prochain devis.", g: "concrète, applicable cette semaine." },
    { l: "Combien de cash cette action pourrait vous libérer sur 12 mois ?", t: "num", u: "€", ex: "25 000" },
  ] },
  { tag: "9", title: "Équipe & structuration", desc: "", qs: [
    { l: "Quel recrutement vous ferait passer un cap aujourd'hui ?", t: "text", ex: "Un responsable de production.", g: "un rôle, pas une tâche." },
    { l: "Le résultat attendu de ce poste, en une phrase", t: "area", ex: "Ce poste réussit s'il génère 20 rendez-vous qualifiés par mois.", g: "le résultat, pas la liste des tâches." },
    { l: "Quels 3 accomplissements passés un bon candidat doit-il pouvoir prouver ?", t: "area", ex: "A managé une équipe de 5 · a structuré un service SAV · a tenu un objectif commercial." },
    { l: "Vos 2 valeurs non négociables", t: "text", ex: "Exigence, fiabilité." },
    { l: "À défaut de recruter, quel partenariat ou prestataire externe pourrait couvrir ce besoin ?", t: "area", ex: "Externaliser la compta à un cabinet, la prospection à une agence." },
  ] },
  { tag: "10", title: "Pilotage & exécution", desc: "", qs: [
    { l: "En repensant à vos réponses, quels problèmes reviennent le plus souvent ?", t: "area", ex: "Tout dépend de moi, et je n'ai pas de suivi de mes chiffres." },
    { l: "Vos chantiers prioritaires (n°1, n°2, n°3)", t: "area", ex: "1. Structurer l'acquisition · 2. Reprendre la main sur les marges · 3. Déléguer les devis." },
    { l: "Pour chaque chantier : l'action n°1, le responsable, l'échéance", t: "area", ex: "Chantier 1 : lancer une campagne / moi / avant le 30.", g: "action / qui / quand." },
    { l: "Votre créneau de pilotage hebdomadaire bloqué (jour + heure)", t: "text", ex: "Vendredi 9 h – 11 h." },
  ] },
  { tag: "★", title: "Bonus — Vous, le chef d'entreprise", desc: "Hors radar, mais précieux pour le conseil et pour préparer l'appel.", qs: [
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
.arvroot .rline .rn{font-size:13px;font-weight:600;width:170px;flex:none}
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
        '<p class="sub">Voici l’audit tel qu’il sera livré : chaque question avec sa réponse (champs, choix, curseurs). Vous pouvez tout ajuster directement.</p>' +
        '<div class="howto"><b>Pour Max :</b> cliquez dans le texte d’une question pour la <b>réécrire</b>, marquez-la <b>✓ Validée</b> / <b>✎ À revoir</b>, et laissez un <b>commentaire</b> (ex. pour changer des options de réponse). Enregistrement <b>automatique</b>.</div>' +
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
          if (q.g) html += '<div class="guide"><b>→ ' + (q.t === "rates" || q.l.indexOf("1 à 10") >= 0 ? "guide" : "aide") + " :</b> " + esc(q.g) + "</div>";
          html += '<div class="row2">' +
            '<button type="button" class="stbtn ok' + (e.s === "ok" ? " on" : "") + '" data-role="st" data-val="ok">✓ Validée</button>' +
            '<button type="button" class="stbtn rev' + (e.s === "rev" ? " on" : "") + '" data-role="st" data-val="rev">✎ À revoir</button>' +
            "</div>" +
            '<textarea class="cmt" data-role="cmt" placeholder="Commentaire ou reformulation (facultatif)…">' + esc(e.c || "") + "</textarea>" +
            "</div>";
        });
        html += "</div></section>";
      });
      html += '<footer>10 dimensions · ~60 questions. Rendu d’aperçu — les réponses affichées sont des exemples. Modifs enregistrées automatiquement et partagées par ce lien.</footer></div>' +
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
