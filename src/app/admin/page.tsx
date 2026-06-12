"use client";

import { useCallback, useEffect, useState } from "react";
import { getCapsule } from "@/lib/capsules";

// ─── Détail d'un prospect ────────────────────────────────────────────────────
interface Detail {
  profile: { prenom: string | null; email: string; phone: string | null; ca: string | null; secteur: string | null; lead_quality: string | null; source: string; created_at: string; ex_done: number; plan_done: boolean; score: number; tier: string };
  progress: { capsule: number; vu: boolean; reponses: Record<string, string | number> | null; feedback: string | null; done_at: string | null }[];
}

// ─── Types (miroir de cdv.admin_overview) ───────────────────────────────────
interface Overview {
  totals: { leads: number; quali: number; classique: number; with_phone: number; qualified: number; today: number; last7: number; last30: number };
  by_source: { label: string; count: number }[];
  by_secteur: { label: string; count: number }[];
  by_ca: { label: string; count: number }[];
  by_day: { day: string; count: number }[];
  funnel: { capsule: number; vu: number; done: number }[];
  engagement: { sessions: number; did_exercise: number; plan_done: number };
  recent: { prenom: string | null; email: string; ca: string | null; lead_quality: string | null; secteur: string | null; source: string; created_at: string; capsules_done: number; score: number; tier: string }[];
  top_leads: { prenom: string | null; email: string; phone: string | null; ca: string | null; secteur: string | null; source: string; capsules_done: number; plan_done: boolean; score: number; tier: string }[];
}

function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    chaud: { label: "🔥 Chaud", cls: "bg-[#DC2626]/10 text-[#DC2626]" },
    tiede: { label: "Tiède", cls: "bg-[#F59E0B]/15 text-[#B45309]" },
    froid: { label: "Froid", cls: "bg-[#F0F1F5] text-[#9096A5]" },
  };
  const t = map[tier] ?? map.froid;
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${t.cls}`}>{t.label}</span>;
}

const PWD_KEY = "cdv_admin_pwd";
const CAPSULE_TITLES: Record<number, string> = {
  1: "Bilan", 2: "Cap", 3: "Fondations", 4: "Avantage", 5: "Opérationnel",
  6: "Croissance", 7: "Rentabilité", 8: "Équipe", 9: "Plan",
};

export default function AdminPage() {
  const [pwd, setPwd] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = useCallback(async (email: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch("/api/admin/participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sessionStorage.getItem(PWD_KEY) || "", email }),
      });
      if (res.ok) setDetail(((await res.json()) as { data: Detail }).data);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const fetchData = useCallback(async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 401) {
        setError("Mot de passe incorrect.");
        sessionStorage.removeItem(PWD_KEY);
        setData(null);
        return;
      }
      if (!res.ok) {
        setError("Erreur serveur. Réessayez.");
        return;
      }
      const json = (await res.json()) as { data: Overview };
      setData(json.data);
      sessionStorage.setItem(PWD_KEY, password);
    } catch {
      setError("Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(PWD_KEY);
    if (saved) {
      setPwd(saved);
      void fetchData(saved);
    }
  }, [fetchData]);

  function logout() {
    sessionStorage.removeItem(PWD_KEY);
    setData(null);
    setPwd("");
  }

  // ─── Écran de connexion ───────────────────────────────────────────────────
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] px-4">
        <form
          onSubmit={(e) => { e.preventDefault(); if (pwd) void fetchData(pwd); }}
          className="w-full max-w-sm rounded-2xl bg-white border border-[#E2E4EA] p-7 shadow-sm"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B9FFF] mb-1">Summer Business</p>
          <h1 className="font-display font-extrabold text-[#00194C] text-xl mb-1">Back-office</h1>
          <p className="text-sm text-[#555B6E] mb-5">Accès réservé. Entrez le mot de passe admin.</p>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Mot de passe"
            autoFocus
            className="w-full rounded-xl border border-[#E2E4EA] bg-white px-4 py-3 text-[#2A2D35] focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20"
          />
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <button
            type="submit"
            disabled={!pwd || loading}
            className="mt-4 w-full rounded-xl bg-[#0046FF] hover:bg-[#0033CC] disabled:opacity-40 text-white font-bold px-6 py-3 transition-all"
          >
            {loading ? "Connexion…" : "Entrer"}
          </button>
        </form>
      </div>
    );
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────
  const t = data.totals;
  const pctQuali = t.quali + t.classique > 0 ? Math.round((t.quali / (t.quali + t.classique)) * 100) : 0;
  const e = data.engagement;
  const actRate = t.leads > 0 ? Math.round((e.did_exercise / t.leads) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-gradient-to-b from-[#000D2B] to-[#00112e] text-white">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-display font-extrabold tracking-wide">SUMMER <span className="text-[#6B9FFF]">BUSINESS</span></span>
            <span className="text-xs text-white/45 uppercase tracking-wider">Back-office</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchData(sessionStorage.getItem(PWD_KEY) || "")} className="text-xs text-white/70 hover:text-white">↻ Rafraîchir</button>
            <button onClick={logout} className="text-xs text-white/70 hover:text-white">Déconnexion</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        {/* KPIs acquisition */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Leads (total)" value={t.leads} />
          <Kpi label="Leads quali (≥100K)" value={t.quali} sub={`${pctQuali}% des qualifiés`} accent="#0D9488" />
          <Kpi label="Leads classique (<100K)" value={t.classique} accent="#9096A5" />
          <Kpi label="Aujourd'hui" value={t.today} sub={`${t.last7} sur 7j · ${t.last30} sur 30j`} />
        </section>

        {/* Top leads à contacter (lead scoring) */}
        <Card title="🔥 Leads à contacter — les plus engagés (score d'engagement)">
          <TopLeads rows={data.top_leads} onOpen={openDetail} />
          <p className="text-[11px] text-[#9096A5] mt-3 leading-relaxed">
            Score /100 = CA (quali +40 · classique +15) · téléphone fourni (+10) · exercices faits (+5 chacun, max 45) · plan H2 atteint (+10).
            <span className="text-[#DC2626] font-semibold"> 🔥 Chaud ≥ 70</span> · Tiède 40-69 · Froid &lt; 40.
          </p>
        </Card>

        {/* Opt-ins par jour */}
        <Card title="Opt-ins par jour (30 derniers jours)">
          <DayChart days={data.by_day} />
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Par source (utm_source)">
            <BarList items={data.by_source} accent="#0046FF" />
          </Card>
          <Card title="Qualité du lead">
            <BarList
              items={[
                { label: "Quali (≥100K)", count: t.quali },
                { label: "Classique (<100K)", count: t.classique },
                { label: "Non qualifié (signup seul)", count: Math.max(0, t.leads - t.qualified) },
              ]}
              accent="#0D9488"
            />
          </Card>
          <Card title="Par secteur">
            <BarList items={data.by_secteur} accent="#8B5CF6" />
          </Card>
          <Card title="Par tranche de CA">
            <BarList items={data.by_ca} accent="#F59E0B" />
          </Card>
        </div>

        {/* Engagement */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Sessions actives" value={e.sessions} sub="ont au moins ouvert une étape" />
          <Kpi label="Ont fait ≥1 exercice" value={e.did_exercise} accent="#0046FF" />
          <Kpi label="Taux d'activation" value={`${actRate}%`} sub="leads → ≥1 exercice" accent="#10B981" />
          <Kpi label="Plan H2 généré (C9)" value={e.plan_done} accent="#EC4899" />
        </section>

        {/* Funnel par capsule */}
        <Card title="Entonnoir par étape (vidéos vues vs exercices faits)">
          <FunnelChart funnel={data.funnel} />
        </Card>

        {/* Derniers inscrits */}
        <Card title={`Derniers inscrits (${data.recent.length})`}>
          <RecentTable rows={data.recent} onOpen={openDetail} />
        </Card>
        <p className="text-[11px] text-[#9096A5] text-center">Cliquez sur un prospect pour voir sa fiche complète (réponses + retours Max IA).</p>
      </main>

      {(detail || detailLoading) && (
        <ParticipantDetail detail={detail} loading={detailLoading} onClose={() => { setDetail(null); setDetailLoading(false); }} />
      )}
    </div>
  );
}

// ─── Composants ─────────────────────────────────────────────────────────────

function Kpi({ label, value, sub, accent = "#00194C" }: { label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E2E4EA] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9096A5]">{label}</p>
      <p className="font-display font-extrabold text-2xl mt-1" style={{ color: accent }}>{value}</p>
      {sub && <p className="text-[11px] text-[#9096A5] mt-0.5">{sub}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E2E4EA] p-5">
      <h2 className="font-display font-bold text-[#00194C] text-sm mb-4">{title}</h2>
      {children}
    </div>
  );
}

function BarList({ items, accent }: { items: { label: string; count: number }[]; accent: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) return <p className="text-sm text-[#9096A5]">Aucune donnée.</p>;
  return (
    <div className="space-y-2.5">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#2A2D35] truncate pr-2">{i.label}</span>
            <span className="font-semibold text-[#00194C]">{i.count}</span>
          </div>
          <div className="h-2 rounded-full bg-[#F0F1F5] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(i.count / max) * 100}%`, background: accent }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DayChart({ days }: { days: { day: string; count: number }[] }) {
  if (days.length === 0) return <p className="text-sm text-[#9096A5]">Aucun opt-in sur la période.</p>;
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="flex items-end gap-1 h-32">
      {days.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center justify-end group" title={`${d.day} : ${d.count}`}>
          <div className="w-full rounded-t bg-[#0046FF]/80 group-hover:bg-[#0046FF] transition-colors" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 3 : 0 }} />
          <span className="text-[8px] text-[#9096A5] mt-1 rotate-0">{d.day.slice(8)}</span>
        </div>
      ))}
    </div>
  );
}

function FunnelChart({ funnel }: { funnel: { capsule: number; vu: number; done: number }[] }) {
  const max = Math.max(1, ...funnel.map((f) => Math.max(f.vu, f.done)));
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-[11px] text-[#9096A5]">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#9CB8FF]" /> Vidéo vue</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#0046FF]" /> Exercice fait</span>
      </div>
      {funnel.map((f) => (
        <div key={f.capsule} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-[#555B6E]">C{f.capsule} · {CAPSULE_TITLES[f.capsule]}</span>
          <div className="flex-1 space-y-1">
            <div className="h-2.5 rounded-full bg-[#9CB8FF]" style={{ width: `${(f.vu / max) * 100}%`, minWidth: f.vu > 0 ? 6 : 0 }} />
            <div className="h-2.5 rounded-full bg-[#0046FF]" style={{ width: `${(f.done / max) * 100}%`, minWidth: f.done > 0 ? 6 : 0 }} />
          </div>
          <span className="w-16 shrink-0 text-right text-xs text-[#00194C] font-semibold">{f.vu} / {f.done}</span>
        </div>
      ))}
    </div>
  );
}

function TopLeads({ rows, onOpen }: { rows: Overview["top_leads"]; onOpen: (email: string) => void }) {
  if (rows.length === 0) return <p className="text-sm text-[#9096A5]">Aucun lead pour l&apos;instant.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-[#9096A5] border-b border-[#E2E4EA]">
            <th className="py-2 pr-3 font-semibold">Score</th>
            <th className="py-2 pr-3 font-semibold">Prénom</th>
            <th className="py-2 pr-3 font-semibold">Email</th>
            <th className="py-2 pr-3 font-semibold">Téléphone</th>
            <th className="py-2 pr-3 font-semibold">CA</th>
            <th className="py-2 pr-3 font-semibold">Secteur</th>
            <th className="py-2 pr-3 font-semibold">Source</th>
            <th className="py-2 font-semibold text-center">Étapes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.email + i} onClick={() => onOpen(r.email)} className="border-b border-[#F0F1F5] cursor-pointer hover:bg-[#F7F8FA]">
              <td className="py-2 pr-3 whitespace-nowrap">
                <span className="font-display font-extrabold text-[#00194C] mr-2">{r.score}</span>
                <TierBadge tier={r.tier} />
              </td>
              <td className="py-2 pr-3 text-[#00194C] font-medium">{r.prenom || "—"}</td>
              <td className="py-2 pr-3 text-[#555B6E]">{r.email}</td>
              <td className="py-2 pr-3 text-[#555B6E] whitespace-nowrap">{r.phone || "—"}</td>
              <td className="py-2 pr-3 text-[#555B6E] whitespace-nowrap">{r.ca ? r.ca.replace(/ de C\.A annuel/, "") : "—"}</td>
              <td className="py-2 pr-3 text-[#555B6E]">{r.secteur || "—"}</td>
              <td className="py-2 pr-3 text-[#555B6E]">{r.source}</td>
              <td className="py-2 text-center text-[#00194C] font-semibold">{r.capsules_done > 0 ? `${r.capsules_done}/9` : "—"}{r.plan_done ? " ✓plan" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentTable({ rows, onOpen }: { rows: Overview["recent"]; onOpen: (email: string) => void }) {
  if (rows.length === 0) return <p className="text-sm text-[#9096A5]">Aucun inscrit pour l'instant.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-[#9096A5] border-b border-[#E2E4EA]">
            <th className="py-2 pr-3 font-semibold">Prénom</th>
            <th className="py-2 pr-3 font-semibold">Email</th>
            <th className="py-2 pr-3 font-semibold">CA</th>
            <th className="py-2 pr-3 font-semibold">Qualité</th>
            <th className="py-2 pr-3 font-semibold">Secteur</th>
            <th className="py-2 pr-3 font-semibold">Source</th>
            <th className="py-2 pr-3 font-semibold text-center">Étapes</th>
            <th className="py-2 pr-3 font-semibold">Score</th>
            <th className="py-2 font-semibold">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.email + i} onClick={() => onOpen(r.email)} className="border-b border-[#F0F1F5] cursor-pointer hover:bg-[#F7F8FA]">
              <td className="py-2 pr-3 text-[#00194C] font-medium">{r.prenom || "—"}</td>
              <td className="py-2 pr-3 text-[#555B6E]">{r.email}</td>
              <td className="py-2 pr-3 text-[#555B6E] whitespace-nowrap">{r.ca ? r.ca.replace(/ de C\.A annuel/, "") : "—"}</td>
              <td className="py-2 pr-3">
                {r.lead_quality === "quali"
                  ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488]">quali</span>
                  : r.lead_quality === "classique"
                    ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F0F1F5] text-[#555B6E]">classique</span>
                    : <span className="text-[11px] text-[#9096A5]">—</span>}
              </td>
              <td className="py-2 pr-3 text-[#555B6E]">{r.secteur || "—"}</td>
              <td className="py-2 pr-3 text-[#555B6E]">{r.source}</td>
              <td className="py-2 pr-3 text-center text-[#00194C] font-semibold">{r.capsules_done > 0 ? `${r.capsules_done}/9` : "—"}</td>
              <td className="py-2 pr-3 whitespace-nowrap"><span className="font-semibold text-[#00194C] mr-1.5">{r.score}</span><TierBadge tier={r.tier} /></td>
              <td className="py-2 text-[#9096A5] whitespace-nowrap">{r.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Fiche détaillée d'un prospect (réponses + retours Max IA) ──────────────────

function AdminTag({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/85">{children}</span>;
}

function parseFeedbackAdmin(text: string): { label: string; body: string }[] {
  const labels: Record<string, string> = { CONSTAT: "Constat", ACTION: "Action", COUT: "Taxe stupide", QUESTION: "Question" };
  const order = ["CONSTAT", "ACTION", "COUT", "QUESTION"];
  const out: Record<string, string> = {};
  const re = /##(CONSTAT|ACTION|COUT|QUESTION)##\s*([\s\S]*?)(?=##(?:CONSTAT|ACTION|COUT|QUESTION)##|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out[m[1]] = m[2].replace(/##[A-Za-zÀ-ÿ0-9 _-]+##/g, " ").replace(/\s+/g, " ").trim();
  const blocks = order.filter((k) => out[k]).map((k) => ({ label: labels[k], body: out[k] }));
  if (blocks.length) return blocks;
  // Format legacy (séparateurs ### sans libellés) : on découpe en paragraphes propres.
  const parts = text.split(/#{2,}/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (parts.length > 1) return parts.map((p) => ({ label: "", body: p }));
  // Garde-fou : jamais de balise brute affichée.
  return [{ label: "", body: text.replace(/#{2,}[A-Za-zÀ-ÿ0-9 _-]*/g, " ").replace(/\s+/g, " ").trim() }];
}

type ProgressItem = Detail["progress"][number];

/** Carte repliable (accordéon) d'une étape traitée : en-tête cliquable, détails au clic. */
function CapsuleAccordionItem({ p, defaultOpen }: { p: ProgressItem; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const cap = getCapsule(p.capsule);
  const champs = cap?.exercice.champs ?? [];
  const answers = champs
    .map((c) => ({ label: c.label, value: p.reponses?.[c.id], suffix: c.suffix }))
    .filter((a) => a.value !== undefined && a.value !== null && `${a.value}` !== "");
  const status = p.done_at ? "✅ exercice" : p.vu ? "👁 vidéo" : "—";

  return (
    <div className="rounded-xl border border-[#E2E4EA] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F6F7F9] transition-colors"
      >
        <span className={`shrink-0 text-[#9096A5] text-xs transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        <span className="shrink-0 w-7 h-7 rounded-full bg-[#00194C] text-white text-xs font-bold flex items-center justify-center">{p.capsule}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-[#00194C] text-sm truncate">{cap?.titre ?? `Étape ${p.capsule}`}</span>
          <span className="block text-[11px] text-[#9096A5]">{status}{p.done_at ? ` · ${p.done_at}` : ""}{p.feedback ? " · 💬 retour" : ""}</span>
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[#EEF0F3]">
          {answers.length > 0 ? (
            <dl className="space-y-1.5 mb-3 mt-2">
              {answers.map((a, idx) => (
                <div key={idx} className="text-sm">
                  <dt className="text-[#9096A5]">{a.label}</dt>
                  <dd className="text-[#2A2D35] font-medium">{a.value}{a.suffix ? ` ${a.suffix}` : ""}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-[#9096A5] mb-3 mt-2">Pas de réponse enregistrée (vidéo vue uniquement).</p>
          )}
          {p.feedback && (
            <div className="rounded-lg bg-[#0046FF]/[0.04] border border-[#0046FF]/15 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#0046FF] mb-1.5">💬 Retour de Max IA</p>
              <div className="space-y-2">
                {parseFeedbackAdmin(p.feedback).map((b, idx) => (
                  <p key={idx} className="text-sm text-[#2A2D35] leading-relaxed">
                    {b.label && <span className="font-semibold text-[#00194C]">{b.label} : </span>}{b.body}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ParticipantDetail({ detail, loading, onClose }: { detail: Detail | null; loading: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-[#000D2B]/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl my-8 rounded-2xl bg-white shadow-2xl overflow-hidden">
        {loading || !detail ? (
          <div className="p-12 text-center text-[#555B6E]">Chargement de la fiche…</div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-[#00194C] to-[#000D2B] text-white px-6 py-5 relative">
              <button onClick={onClose} aria-label="Fermer" className="absolute top-3 right-4 text-white/60 hover:text-white text-xl leading-none">×</button>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-display font-extrabold text-xl">{detail.profile.prenom || "—"}</h3>
                <span className="font-display font-extrabold text-[#6B9FFF]">{detail.profile.score}</span>
                <TierBadge tier={detail.profile.tier} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/75">
                <a href={`mailto:${detail.profile.email}`} className="hover:text-white underline">{detail.profile.email}</a>
                {detail.profile.phone && <a href={`tel:${detail.profile.phone}`} className="hover:text-white">{detail.profile.phone}</a>}
              </div>
              <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
                {detail.profile.ca && <AdminTag>{detail.profile.ca.replace(/ de C\.A annuel/, "")}</AdminTag>}
                {detail.profile.secteur && <AdminTag>{detail.profile.secteur}</AdminTag>}
                {detail.profile.lead_quality && <AdminTag>{detail.profile.lead_quality}</AdminTag>}
                <AdminTag>source : {detail.profile.source}</AdminTag>
                <AdminTag>{detail.profile.ex_done}/9 étapes</AdminTag>
                <AdminTag>inscrit le {detail.profile.created_at}</AdminTag>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {detail.progress.length === 0 && (
                <p className="text-sm text-[#9096A5]">Ce prospect n&apos;a pas encore commencé d&apos;étape.</p>
              )}
              {detail.progress.map((p) => (
                <CapsuleAccordionItem key={p.capsule} p={p} defaultOpen={detail.progress.length === 1} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
