"use client";

import { useState } from "react";
import { optinSignup, optinQualify, optinLogin } from "@/lib/session";
import { CA_OPTIONS, SECTEUR_OPTIONS, caLeadQuality } from "@/lib/optin";
import { trackLead, newEventId } from "@/lib/track";

/**
 * Opt-in déclenché à la 1ʳᵉ demande de retour Max IA (une seule fois).
 * Deux portes : « créer mon espace » (prénom + email → CA + secteur) ou
 * « j'ai déjà un espace » (reconnexion par email). À la fin → onComplete()
 * qui reprend l'action IA en attente.
 */
export function OptInModal({
  open,
  onClose,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [view, setView] = useState<"signup" | "login">("signup");
  const [step, setStep] = useState<1 | 2>(1);
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [ca, setCa] = useState("");
  const [secteur, setSecteur] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneOk = phone.replace(/\D/g, "").length >= 8;

  function finish(switched: boolean) {
    if (switched) {
      window.location.reload(); // session canonique adoptée → recharge la progression
      return;
    }
    onComplete();
  }

  async function handleSignupStep1() {
    if (!prenom.trim() || !emailOk || loading) return;
    setLoading(true);
    setError(null);
    const r = await optinSignup(prenom, email);
    setLoading(false);
    if (!r.ok) {
      setError("Un souci est survenu. Réessayez dans un instant.");
      return;
    }
    // Email déjà inscrit → déjà qualifié, on reprend directement.
    if (r.existing) {
      finish(r.switched);
      return;
    }
    setStep(2);
  }

  async function handleSignupStep2() {
    if (!ca || !secteur || !phoneOk || loading) return;
    setLoading(true);
    setError(null);
    const ok = await optinQualify(ca, secteur, phone);
    setLoading(false);
    if (!ok) {
      setError("Un souci est survenu. Réessayez dans un instant.");
      return;
    }
    trackLead({
      eventId: newEventId(),
      leadQuality: caLeadQuality(ca),
      email: email.trim().toLowerCase(),
      prenom: prenom.trim(),
      phone: phone.trim() || undefined,
      ca,
      secteur,
    });
    finish(false);
  }

  async function handleLogin() {
    if (!emailOk || loading) return;
    setLoading(true);
    setError(null);
    const r = await optinLogin(email);
    setLoading(false);
    if (!r.ok) {
      setError("Un souci est survenu. Réessayez dans un instant.");
      return;
    }
    if (!r.found) {
      setError("Aucun espace trouvé pour cet email. Créez le vôtre, c'est gratuit.");
      return;
    }
    finish(r.switched);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#000D2B]/70 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
        {/* Bandeau */}
        <div className="bg-gradient-to-br from-[#00194C] to-[#000D2B] px-6 pt-6 pb-5 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B9FFF]">
              {view === "login" ? "Reconnexion" : step === 1 ? "Votre espace Summer Business" : "Personnalisez votre retour"}
            </span>
            {!loading && (
              <button onClick={onClose} aria-label="Fermer" className="text-white/50 hover:text-white text-lg leading-none">
                ×
              </button>
            )}
          </div>
          <h3 className="font-display font-extrabold text-xl mt-2 leading-tight">
            {view === "login"
              ? "Retrouvez votre espace"
              : step === 1
                ? "Recevez le retour de Max IA"
                : "Pour calibrer le retour à votre échelle"}
          </h3>
          <p className="text-sm text-white/65 mt-1.5 leading-snug">
            {view === "login"
              ? "Entrez l'email utilisé pour créer votre espace."
              : step === 1
                ? "Créez votre espace pour recevoir l'analyse de Max IA et garder votre progression tout l'été."
                : "Max IA adapte son analyse à votre niveau de chiffre d'affaires et à votre secteur."}
          </p>
        </div>

        {/* Corps */}
        <div className="px-6 py-5 space-y-3.5">
          {view === "signup" && step === 1 && (
            <>
              <FieldInput label="Prénom" value={prenom} onChange={setPrenom} placeholder="Votre prénom" autoFocus />
              <FieldInput label="Email" type="email" value={email} onChange={setEmail} placeholder="vous@entreprise.com" />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <PrimaryBtn disabled={!prenom.trim() || !emailOk || loading} onClick={handleSignupStep1}>
                {loading ? "Un instant…" : "Continuer"}
              </PrimaryBtn>
              <button
                onClick={() => { setView("login"); setError(null); }}
                className="block w-full text-center text-sm font-semibold text-[#0046FF] hover:text-[#0033CC]"
              >
                J&apos;ai déjà un espace →
              </button>
            </>
          )}

          {view === "signup" && step === 2 && (
            <>
              <FieldSelect label="Votre chiffre d'affaires annuel" value={ca} onChange={setCa} options={CA_OPTIONS} placeholder="Choisir…" />
              <FieldSelect label="Votre secteur" value={secteur} onChange={setSecteur} options={SECTEUR_OPTIONS} placeholder="Choisir…" />
              <FieldInput label="Téléphone" type="tel" value={phone} onChange={setPhone} placeholder="06 12 34 56 78" />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <PrimaryBtn disabled={!ca || !secteur || !phoneOk || loading} onClick={handleSignupStep2}>
                {loading ? "Un instant…" : "Recevoir mon retour de Max IA →"}
              </PrimaryBtn>
              <p className="text-[11px] text-[#9096A5] text-center leading-snug">
                Gratuit. Vos réponses restent privées et servent à personnaliser vos retours.
              </p>
            </>
          )}

          {view === "login" && (
            <>
              <FieldInput label="Email" type="email" value={email} onChange={setEmail} placeholder="vous@entreprise.com" autoFocus />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <PrimaryBtn disabled={!emailOk || loading} onClick={handleLogin}>
                {loading ? "Recherche…" : "Retrouver mon espace"}
              </PrimaryBtn>
              <button
                onClick={() => { setView("signup"); setError(null); }}
                className="block w-full text-center text-sm font-semibold text-[#0046FF] hover:text-[#0033CC]"
              >
                ← Créer un nouvel espace
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  label, value, onChange, type = "text", placeholder, autoFocus,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-[#00194C] mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-xl border border-[#E2E4EA] bg-white px-4 py-3 text-[#2A2D35] focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20"
      />
    </label>
  );
}

function FieldSelect({
  label, value, onChange, options, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly string[]; placeholder: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-[#00194C] mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[#E2E4EA] bg-white px-4 py-3 text-[#2A2D35] focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20"
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function PrimaryBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0046FF] hover:bg-[#0033CC] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-3.5 transition-all ${!disabled ? "cta-glow" : ""}`}
    >
      {children}
    </button>
  );
}
