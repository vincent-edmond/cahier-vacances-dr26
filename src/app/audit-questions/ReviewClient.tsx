"use client";

import { useEffect, useRef } from "react";

/**
 * Relecture/validation des questions du diagnostic — outil interne ISOLÉ.
 * Rendu identique à la maquette visuelle. Max réécrit un libellé, marque
 * « Validée »/« À revoir », commente ; tout est auto-enregistré en base
 * (cdv.audit_review via /api/audit-review) et partagé par simple lien.
 *
 * Volontairement autonome : aucun import du SaaS (AppShell, session, opt-in),
 * styles scindés sous « .arvroot ». Ne peut pas casser l'app existante.
 */

type Q = { l: string; d: string; s: string; c: string };
type Section = { tag: string; title: string; desc: string; qs: Q[] };
type State = { v: number; sections: Section[] };

const DEFAULT: State = {
  v: 1,
  sections: [
    { tag: "A", title: "Qualification", desc: "À l'entrée — crée l'espace et qualifie le lead.", qs: [
      { l: "Prénom", d: "", s: "", c: "" },
      { l: "Email", d: "", s: "", c: "" },
      { l: "Votre chiffre d'affaires annuel", d: "Choix : Pas encore d'entreprise · 0–30K · 30–100K · 100–300K · 300K–1M · 1–10M · +10M", s: "", c: "" },
      { l: "Votre secteur", d: "Choix : Saas · Coach/Consultant · BTP · Immo · Dentiste · Avocat · Chirurgien · Business en ligne · Opticien · CGP · Expert-comptable · Autre", s: "", c: "" },
      { l: "Téléphone", d: "Indicatif pays + numéro", s: "", c: "" },
    ] },
    { tag: "B", title: "Diagnostic express", desc: "~5 min — donne le score, le radar et le coût de l'inaction.", qs: [
      { l: "Décrivez votre activité en une phrase : que vendez-vous, et à qui ?", d: "→ ex : « Je pose des cuisines sur-mesure pour des particuliers haut de gamme autour de Lyon. »", s: "", c: "" },
      { l: "Objectif de CA sur les 12 prochains mois", d: "Nombre (€) · ex : 800 000", s: "", c: "" },
      { l: "CA réalisé sur les 12 derniers mois", d: "Nombre (€) · ex : 520 000", s: "", c: "" },
      { l: "Sur 100 € vendus, combien vous reste-t-il une fois toutes les charges payées ?", d: "Choix : + de 15 € · 8–15 € · – de 8 € · Je ne sais pas", s: "", c: "" },
      { l: "Si vos ventes s'arrêtaient demain, combien de temps votre trésorerie tiendrait ?", d: "Choix : + de 3 mois · 1–3 mois · – d'un mois · Je ne sais pas", s: "", c: "" },
      { l: "Auto-évaluation des 10 leviers (chacun noté de 1 à 10)", d: "Guide : 1 = point faible · 10 = maîtrisé. Leviers : Santé financière · Clarté stratégique · Force de l'offre · Différenciation · Acquisition · Autonomie · Croissance & monétisation · Marges & cash · Solidité de l'équipe · Pilotage & exécution", s: "", c: "" },
      { l: "Où voulez-vous emmener votre entreprise dans les 3 prochaines années ?", d: "→ guide : un chiffre ET une situation. ex : « Passer de 500 K à 2 M€, avec une équipe qui gère sans moi. »", s: "", c: "" },
      { l: "Qu'est-ce qui vous empêche le plus d'y arriver aujourd'hui ?", d: "→ ex : « Tout repose sur moi, je n'ai pas de flux régulier de clients. »", s: "", c: "" },
    ] },
    { tag: "1", title: "Santé financière & performance", desc: "", qs: [
      { l: "Votre CA sur les 3 dernières années : en croissance, stable, ou en baisse ?", d: "Choix + précision · ex : 2022 : 300K · 2023 : 380K · 2024 : 520K", s: "", c: "" },
      { l: "Le levier où ça coince le plus", d: "Choix : Stratégie · Offre · Différenciation · Acquisition · Vente · Opérationnel · Rentabilité · Équipe", s: "", c: "" },
      { l: "Ce que vous devez absolument corriger dans les prochains mois", d: "→ ex : « Arrêter de brader mes prix pour signer. »", s: "", c: "" },
      { l: "Le chiffre qui vous inquiète le plus aujourd'hui, et pourquoi", d: "→ ex : « Ma trésorerie : je n'ai qu'un mois d'avance. »", s: "", c: "" },
    ] },
    { tag: "2", title: "Focus stratégique", desc: "", qs: [
      { l: "Listez toutes vos priorités actuelles, sans filtre", d: "→ guide : une par ligne.", s: "", c: "" },
      { l: "Si vous ne pouviez en garder qu'UNE, laquelle change le plus la donne ?", d: "", s: "", c: "" },
      { l: "Votre priorité n°1 des prochains mois, en une phrase", d: "", s: "", c: "" },
      { l: "Quelles 2 à 3 choses allez-vous ARRÊTER pour protéger ce cap ?", d: "→ ex : « J'arrête de faire moi-même les devis et le SAV. »", s: "", c: "" },
    ] },
    { tag: "3", title: "Offre & positionnement", desc: "", qs: [
      { l: "Votre offre principale en une phrase, et qui est votre client idéal", d: "", s: "", c: "" },
      { l: "De 1 à 10, à quel point un prospect se dit « je serais fou de refuser » ?", d: "Note /10", s: "", c: "" },
      { l: "Pourquoi ce chiffre ?", d: "", s: "", c: "" },
      { l: "Quel UN changement la rendrait nettement plus irrésistible ?", d: "→ guide : une garantie, un bonus, une reformulation de la promesse.", s: "", c: "" },
    ] },
    { tag: "4", title: "Différenciation & avantage concurrentiel", desc: "", qs: [
      { l: "Quelle est LA douleur n°1 mal résolue de votre marché ?", d: "", s: "", c: "" },
      { l: "Vos 3 différenciateurs, sans les mots creux", d: "→ guide : ce que vous êtes seul à faire, pas « qualité » ni « sérieux ».", s: "", c: "" },
      { l: "Si un concurrent vous copie et casse le prix de 20 %, qu'est-ce qui vous reste ?", d: "", s: "", c: "" },
      { l: "Complétez : « On gagne parce que nous sommes les seuls à… »", d: "", s: "", c: "" },
    ] },
    { tag: "5", title: "Acquisition & développement commercial", desc: "", qs: [
      { l: "Comment vos nouveaux clients vous trouvent-ils aujourd'hui ?", d: "Choix + précision : Bouche-à-oreille · Clients qui reviennent · Prescripteurs · Référencement · Publicité · Prospection · Appels d'offres · Emplacement · Autre", s: "", c: "" },
      { l: "Votre flux de nouveaux clients est-il régulier, ou en dents de scie ?", d: "Choix : régulier et prévisible · correct mais irrégulier · imprévisible", s: "", c: "" },
      { l: "Quelle part de vos nouveaux clients vient de votre source principale ?", d: "Choix : <25 % · 25–50 % · 50–75 % · >75 % (mesure la dépendance)", s: "", c: "" },
      { l: "Votre acquisition dépend-elle surtout de vous, ou d'un système qui tourne sans vous ?", d: "Choix : surtout moi · un mix · un système qui tourne", s: "", c: "" },
      { l: "Savez-vous ce que vous coûte l'obtention d'un nouveau client (argent ou temps) ?", d: "Choix : oui précisément · approximativement · non", s: "", c: "" },
      { l: "Si vous vouliez doubler vos nouveaux clients, sauriez-vous comment faire ?", d: "", s: "", c: "" },
    ] },
    { tag: "6", title: "Autonomie opérationnelle", desc: "", qs: [
      { l: "Listez les tâches que vous seul faites encore", d: "→ guide : une par ligne.", s: "", c: "" },
      { l: "Celle qui vous coûte le plus de temps", d: "", s: "", c: "" },
      { l: "Documentez-la en 5 étapes (le mode opératoire)", d: "", s: "", c: "" },
      { l: "À qui la déléguez-vous, et pour quelle échéance ?", d: "", s: "", c: "" },
    ] },
    { tag: "7", title: "Croissance & monétisation", desc: "", qs: [
      { l: "Votre nombre de clients actifs (12 derniers mois)", d: "Nombre · ex : 120", s: "", c: "" },
      { l: "Votre panier moyen (CA moyen par commande)", d: "Nombre (€) · ex : 2 500", s: "", c: "" },
      { l: "Votre fréquence d'achat (nb d'achats/an d'un client)", d: "Nombre · ex : 2", s: "", c: "" },
      { l: "Entre panier moyen et fréquence, lequel est le plus sous-exploité ?", d: "Choix : Panier moyen · Fréquence d'achat", s: "", c: "" },
      { l: "Une action concrète pour l'augmenter", d: "", s: "", c: "" },
      { l: "Projetez : +10 % sur ce levier, ça fait combien de CA en plus ?", d: "Nombre (€)", s: "", c: "" },
    ] },
    { tag: "8", title: "Rentabilité & cash", desc: "", qs: [
      { l: "Suivez-vous vos marges et votre trésorerie de près ?", d: "Choix : chaque semaine · de temps en temps · non", s: "", c: "" },
      { l: "Où est votre plus grosse fuite ?", d: "Choix : Prix · Volume · Coûts directs · Masse salariale · Créances clients · Dettes fournisseurs · Stock", s: "", c: "" },
      { l: "Une action immédiate", d: "→ guide : concrète, applicable cette semaine.", s: "", c: "" },
      { l: "Combien de cash cette action pourrait vous libérer sur 12 mois ?", d: "Nombre (€)", s: "", c: "" },
    ] },
    { tag: "9", title: "Équipe & structuration", desc: "", qs: [
      { l: "Quel recrutement vous ferait passer un cap aujourd'hui ?", d: "→ guide : un rôle, pas une tâche.", s: "", c: "" },
      { l: "Le résultat attendu de ce poste, en une phrase", d: "→ guide : le résultat, pas la liste des tâches.", s: "", c: "" },
      { l: "Quels 3 accomplissements passés un bon candidat doit-il pouvoir prouver ?", d: "", s: "", c: "" },
      { l: "Vos 2 valeurs non négociables", d: "", s: "", c: "" },
      { l: "À défaut de recruter, quel partenariat ou prestataire externe pourrait couvrir ce besoin ?", d: "", s: "", c: "" },
    ] },
    { tag: "10", title: "Pilotage & exécution", desc: "", qs: [
      { l: "En repensant à vos réponses, quels problèmes reviennent le plus souvent ?", d: "", s: "", c: "" },
      { l: "Vos chantiers prioritaires (n°1, n°2, n°3)", d: "", s: "", c: "" },
      { l: "Pour chaque chantier : l'action n°1, le responsable, l'échéance", d: "→ guide : action / qui / quand.", s: "", c: "" },
      { l: "Votre créneau de pilotage hebdomadaire bloqué (jour + heure)", d: "", s: "", c: "" },
    ] },
    { tag: "★", title: "Bonus — Vous, le chef d'entreprise", desc: "Hors radar, mais précieux pour le conseil et pour préparer l'appel.", qs: [
      { l: "Combien d'heures par semaine consacrez-vous à votre entreprise ?", d: "Nombre", s: "", c: "" },
      { l: "Où part l'essentiel de votre temps aujourd'hui ?", d: "", s: "", c: "" },
      { l: "Sur 1 à 10, à quel point vous sentez-vous débordé ou seul dans vos décisions ?", d: "Note /10 · 1 = serein et bien entouré · 10 = débordé et seul", s: "", c: "" },
    ] },
  ],
};

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
.arvroot .q{padding:16px 0;border-bottom:1px solid var(--line-soft)}
.arvroot .q:last-child{border-bottom:0}
.arvroot .qtop{display:flex;align-items:flex-start;gap:10px}
.arvroot .num{font-size:11px;font-weight:800;color:var(--blue-soft);padding-top:5px;min-width:20px}
.arvroot .lab{flex:1;font-size:15px;font-weight:600;color:#17224a;border-radius:8px;padding:5px 8px;margin:-5px -8px;outline:none;transition:background .12s,box-shadow .12s}
.arvroot .lab:hover{background:#f5f8ff}
.arvroot .lab:focus{background:#eef4ff;box-shadow:0 0 0 2px #0046ff44}
.arvroot .detail{font-size:12px;color:var(--muted-2);margin:7px 0 0 30px;line-height:1.45}
.arvroot .detail.g{font-style:italic}
.arvroot .row2{display:flex;align-items:center;gap:8px;margin:11px 0 0 30px;flex-wrap:wrap}
.arvroot .stbtn{border:1px solid var(--line);background:#f7f9ff;color:#5b6488;border-radius:99px;padding:5px 12px;font-size:12px;font-weight:650;cursor:pointer;transition:.12s}
.arvroot .stbtn:hover{border-color:#c7d2f0}
.arvroot .stbtn.ok.on{background:var(--teal);border-color:var(--teal);color:#fff}
.arvroot .stbtn.rev.on{background:var(--red);border-color:var(--red);color:#fff}
.arvroot .cmt{width:calc(100% - 30px);margin:10px 0 0 30px;background:#fffdf6;border:1px solid #f0e6cf;border-radius:10px;color:var(--ink);font:inherit;font-size:13px;padding:9px 11px;min-height:38px;resize:vertical;outline:none}
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

    let state: State = JSON.parse(JSON.stringify(DEFAULT));
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let inflight = false;

    const esc = (s: string) =>
      String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const counts = () => {
      let ok = 0, rev = 0, wait = 0;
      state.sections.forEach((sec) => sec.qs.forEach((q) => { if (q.s === "ok") ok++; else if (q.s === "rev") rev++; else wait++; }));
      return { ok, rev, wait };
    };

    const setBar = (cls: string, txt: string) => {
      const bar = root.querySelector<HTMLElement>(".bar");
      if (bar) { bar.className = "bar " + cls; const t = bar.querySelector(".t"); if (t) t.textContent = txt; }
    };

    const doSave = async () => {
      inflight = true;
      setBar("saving", "Enregistrement…");
      try {
        const r = await fetch("/api/audit-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "questions", data: state }),
        });
        if (!r.ok) throw new Error("save");
        inflight = false;
        setBar("saved", "Enregistré ✓");
      } catch {
        inflight = false;
        setBar("error", "Échec — nouvelle tentative…");
        saveTimer = setTimeout(doSave, 3000);
      }
    };
    const scheduleSave = () => {
      setBar("saving", "Modification en attente…");
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(doSave, 900);
    };

    const updateCounts = () => {
      const c = counts();
      const el = root.querySelector("#counts");
      if (el) el.innerHTML =
        '<span class="pill ok">✓ ' + c.ok + " validées</span>" +
        '<span class="pill rev">✎ ' + c.rev + " à revoir</span>" +
        '<span class="pill wait">' + c.wait + " en attente</span>";
    };

    const qof = (el: Element): Q | null => {
      const card = el.closest<HTMLElement>(".q");
      if (!card) return null;
      const si = Number(card.getAttribute("data-si"));
      const qi = Number(card.getAttribute("data-qi"));
      return state.sections[si]?.qs[qi] ?? null;
    };

    const render = () => {
      let html = '<div class="wrap"><header>' +
        '<span class="badge">Validation des questions</span>' +
        "<h1>Le Diagnostic Business — vos questions à valider</h1>" +
        '<p class="sub">Modifiez le texte d’une question directement, marquez-la « Validée » ou « À revoir », et ajoutez un commentaire. Tout est enregistré automatiquement.</p>' +
        '<div class="howto"><b>Pour Max :</b> cliquez dans une question pour la <b>réécrire</b>, utilisez <b>✓ Validée</b> / <b>✎ À revoir</b>, et laissez un <b>commentaire</b> si besoin. Aucune action à faire pour enregistrer — c’est automatique.</div>' +
        '<div class="counts" id="counts"></div></header>';
      state.sections.forEach((sec, si) => {
        html += '<section class="grp"><div class="grp-h"><span class="idx">' + esc(sec.tag) + "</span><h2>" + esc(sec.title) + "</h2></div>";
        if (sec.desc) html += '<p class="grp-desc">' + esc(sec.desc) + "</p>";
        html += '<div class="card">';
        sec.qs.forEach((q, qi) => {
          const g = /^\s*→\s*guide/i.test(q.d) ? " g" : "";
          html += '<div class="q" data-si="' + si + '" data-qi="' + qi + '">' +
            '<div class="qtop"><span class="num">' + (qi + 1) + "</span>" +
            '<div class="lab" contenteditable="true" data-role="label" spellcheck="false">' + esc(q.l) + "</div></div>";
          if (q.d) html += '<div class="detail' + g + '">' + esc(q.d) + "</div>";
          html += '<div class="row2">' +
            '<button type="button" class="stbtn ok' + (q.s === "ok" ? " on" : "") + '" data-role="st" data-val="ok">✓ Validée</button>' +
            '<button type="button" class="stbtn rev' + (q.s === "rev" ? " on" : "") + '" data-role="st" data-val="rev">✎ À revoir</button>' +
            "</div>" +
            '<textarea class="cmt" data-role="cmt" placeholder="Commentaire ou reformulation (facultatif)…">' + esc(q.c) + "</textarea>" +
            "</div>";
        });
        html += "</div></section>";
      });
      html += '<footer>10 dimensions · ~60 questions. Modifs enregistrées automatiquement et partagées par ce lien.</footer></div>' +
        '<div class="bar saved"><span class="dot"></span><span class="t">Enregistré ✓</span></div>';
      root.innerHTML = html;
      updateCounts();
      wire();
    };

    const wire = () => {
      root.querySelectorAll<HTMLElement>("[data-role=label]").forEach((el) => {
        el.addEventListener("input", () => { const q = qof(el); if (q) { q.l = el.textContent || ""; scheduleSave(); } });
      });
      root.querySelectorAll<HTMLTextAreaElement>("[data-role=cmt]").forEach((el) => {
        el.addEventListener("input", () => { const q = qof(el); if (q) { q.c = el.value; scheduleSave(); } });
      });
      root.querySelectorAll<HTMLElement>("[data-role=st]").forEach((el) => {
        el.addEventListener("click", () => {
          const q = qof(el); if (!q) return;
          const v = el.getAttribute("data-val") || "";
          q.s = q.s === v ? "" : v;
          const card = el.closest(".q");
          card?.querySelectorAll<HTMLElement>("[data-role=st]").forEach((b) => {
            b.classList.toggle("on", b.getAttribute("data-val") === q.s);
          });
          updateCounts();
          scheduleSave();
        });
      });
    };

    (async () => {
      let loaded: State | null = null;
      try {
        const r = await fetch("/api/audit-review?id=questions");
        if (r.ok) { const j = await r.json(); if (j && j.data && Array.isArray(j.data.sections)) loaded = j.data as State; }
      } catch { /* hors-ligne : on part du modèle par défaut */ }
      state = loaded ?? JSON.parse(JSON.stringify(DEFAULT));
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
