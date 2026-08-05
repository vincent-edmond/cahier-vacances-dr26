"use client";

import { useEffect, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import { optinSignup, optinQualify, optinLogin, getAttribution, getParticipant } from "@/lib/session";
import { CA_OPTIONS, SECTEUR_OPTIONS, PHONE_COUNTRIES, caLeadQuality } from "@/lib/optin";
import { validateEmailFormat, validatePhone } from "@/lib/validation";
import { trackLead, newEventId } from "@/lib/track";

// Lead sans entreprise : exclu de Camille (WhatsApp) → on ne lui promet pas ce suivi.
// Doit correspondre à la 1ʳᵉ option de CA_OPTIONS et à SANS_ENTREPRISE côté Setteo.
const SANS_ENTREPRISE = "Je n'ai pas encore d'entreprise";

/**
 * Opt-in déclenché à la 1ʳᵉ demande de retour Max IA (une seule fois).
 * Deux portes : « créer mon espace » (prénom + email → CA + secteur) ou
 * « j'ai déjà un espace » (reconnexion par email). Étape 3 (leads avec entreprise) :
 * notification « Camille vous suit sur WhatsApp ». À la fin → onComplete() qui reprend
 * l'action IA en attente.
 */
export function OptInModal({
  open,
  onClose,
  onComplete,
  mandatory = false,
  resume = false,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  /** Gate d'entrée : l'opt-in débloque l'accès → pas de croix, Échap et clic-fond
   *  neutralisés aux étapes 1/2 (impossible de contourner). La reconnexion reste dispo. */
  mandatory?: boolean;
  /** Reprise : compte déjà créé (étape 1 faite) mais pas qualifié → on ouvre directement
   *  à l'étape 2, prénom/email pré-remplis depuis le participant local. */
  resume?: boolean;
}) {
  const [view, setView] = useState<"signup" | "login">("signup");
  const [step, setStep] = useState<1 | 2 | 3>(resume ? 2 : 1);
  const [prenom, setPrenom] = useState(() => (resume ? getParticipant()?.prenom ?? "" : ""));
  const [email, setEmail] = useState(() => (resume ? getParticipant()?.email ?? "" : ""));
  const [ca, setCa] = useState("");
  const [secteur, setSecteur] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<CountryCode>("FR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function finish(switched: boolean) {
    if (switched) {
      window.location.reload(); // session canonique adoptée → recharge la progression
      return;
    }
    onComplete();
  }

  // Fermeture : à l'étape 3 (Camille), l'opt-in est DÉJÀ validé → fermer = poursuivre
  // la génération (jamais annuler). Aux étapes 1/2, fermer = annuler l'opt-in.
  function handleDismiss() {
    if (loading) return;
    if (step === 3) { finish(false); return; }
    if (mandatory) return; // gate d'entrée : on ne peut pas fermer sans opt-in
    onClose();
  }

  // Échap pour fermer (sauf pendant un envoi) + blocage du scroll de la page derrière.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleDismiss(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading, step, onClose]);

  if (!open) return null;

  const emailCheck = validateEmailFormat(email);
  const emailOk = emailCheck.ok;
  const phoneOk = validatePhone(phone, country).ok;
  // Messages inline (uniquement quand le champ est non vide et invalide).
  const emailInline = email.trim() && !emailOk ? ("reason" in emailCheck ? emailCheck.reason : "Email invalide.") : null;
  const phoneInline = phone.trim() && !phoneOk ? "Ce numéro ne semble pas valide." : null;

  async function handleSignupStep1() {
    if (!prenom.trim() || !emailOk || loading) return;
    setLoading(true);
    setError(null);
    const r = await optinSignup(prenom, email);
    setLoading(false);
    if (!r.ok) {
      setError(r.error || "Un souci est survenu. Réessayez dans un instant.");
      return;
    }
    // Revenant DÉJÀ qualifié → accès direct (pas de re-qualif = pas de double conversion).
    if (r.qualified) { finish(r.switched); return; }
    // Session canonique adoptée mais pas encore qualifié → reload → reprise à l'étape 2.
    if (r.switched) { window.location.reload(); return; }
    // Nouveau, ou compte existant non qualifié → on complète la qualif (étape 2).
    setStep(2);
  }

  async function handleSignupStep2() {
    if (!ca || !secteur || !phoneOk || loading) return;
    setLoading(true);
    setError(null);
    const r = await optinQualify(ca, secteur, phone, country);
    setLoading(false);
    if (!r.ok) {
      setError(r.error || "Un souci est survenu. Réessayez dans un instant.");
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
      attribution: getAttribution(),
    });
    // Leads AVEC entreprise → étape 3 (Camille les contactera sur WhatsApp).
    // Leads sans entreprise → pas de Camille, on enchaîne directement.
    if (ca === SANS_ENTREPRISE) { finish(false); return; }
    setStep(3);
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
    // Compte trouvé mais qualif jamais terminée → on la complète (étape 2) au lieu
    // de donner l'accès à un lead incomplet.
    if (!r.qualified) {
      const p = getParticipant();
      setPrenom(p?.prenom ?? "");
      setEmail(p?.email ?? email.trim().toLowerCase());
      setView("signup");
      setStep(2);
      return;
    }
    finish(r.switched);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#000D2B]/70 backdrop-blur-sm" onClick={loading ? undefined : handleDismiss} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
        {/* Bandeau */}
        <div className="bg-gradient-to-br from-[#00194C] to-[#000D2B] px-6 pt-6 pb-5 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B9FFF]">
              {view === "login" ? "Reconnexion" : step === 1 ? "Summer Business · Accès gratuit" : step === 2 ? "Dernière étape" : "Votre espace est prêt ✓"}
            </span>
            {!loading && step !== 3 && !mandatory && (
              <button onClick={handleDismiss} aria-label="Fermer" className="text-white/50 hover:text-white text-lg leading-none">
                ×
              </button>
            )}
          </div>
          <h3 className="font-display font-extrabold text-xl mt-2 leading-tight">
            {view === "login"
              ? "Retrouvez votre espace"
              : step === 1
                ? "Plus qu'une étape pour accéder à votre espace"
                : step === 2
                  ? "Parlez-nous de votre entreprise"
                  : "Encore une chose"}
          </h3>
          <p className="text-sm text-white/65 mt-1.5 leading-snug">
            {view === "login"
              ? "Entrez l'email utilisé pour créer votre espace."
              : step === 1
                ? "Découvrez vos plus grandes opportunités de croissance ainsi qu'un plan d'action pour dépasser vos objectifs."
                : step === 2
                  ? "Pour que Max IA vous réponde juste : en fonction de vos chiffres et de votre secteur. Pas du conseil générique."
                  : "Votre accompagnement ne s'arrête pas à la plateforme."}
          </p>
        </div>

        {/* Corps */}
        <div className="px-6 py-5 space-y-3.5">
          {view === "signup" && step === 1 && (
            <>
              <FieldInput label="Prénom" value={prenom} onChange={setPrenom} placeholder="Votre prénom" autoFocus />
              <FieldInput label="Email" type="email" value={email} onChange={setEmail} placeholder="vous@entreprise.com" />
              {emailInline && <p className="text-xs text-red-600 -mt-1">{emailInline}</p>}
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
              <FieldSelect label="Votre chiffre d'affaires annuel" value={ca} onChange={setCa} options={CA_OPTIONS} placeholder="Choisir…" required />
              <FieldSelect label="Votre secteur" value={secteur} onChange={setSecteur} options={SECTEUR_OPTIONS} placeholder="Choisir…" required />
              <PhoneField country={country} onCountry={setCountry} value={phone} onChange={setPhone} />
              {ca !== SANS_ENTREPRISE && (
                <p className="text-[11px] text-[#9096A5] -mt-2 leading-snug">
                  Camille, votre conseillère, vous accompagne sur WhatsApp.
                </p>
              )}
              {phoneInline && <p className="text-xs text-red-600 -mt-1">{phoneInline}</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <PrimaryBtn disabled={!ca || !secteur || !phoneOk || loading} onClick={handleSignupStep2}>
                {loading ? "Un instant…" : "Accéder à mon espace →"}
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

          {step === 3 && <CamilleStep onDone={() => finish(false)} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Étape post-opt-in : prévient le prospect (avec entreprise) que Camille le
 * contactera sur WhatsApp. Objectif = faire enregistrer le numéro (taux d'ouverture)
 * et poser que répondre fait partie de l'accompagnement.
 */
function CamilleStep({ onDone }: { onDone: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-[#E2E4EA] bg-[#F8F9FB] p-3">
        <CamilleAvatar />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-[#00194C]">Camille</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B9FFF]">Votre conseillère</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16A34A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" aria-hidden />
            en ligne
          </span>
        </div>
      </div>

      <div className="space-y-2.5 text-sm text-[#2A2D35] leading-relaxed">
        <p>
          Votre accès ne s&apos;arrête pas là. <strong className="text-[#00194C]">Camille</strong>, votre conseillère
          dédiée, va vous écrire sur <strong className="text-[#00194C]">WhatsApp</strong>{" "}
          pour vous accompagner tout l&apos;été : vos questions, les bonnes ressources, un coup de pouce pour avancer plus vite.
        </p>
        <div className="rounded-xl border border-[#0046FF]/15 bg-[#0046FF]/[0.04] px-4 py-3 text-[13px] text-[#00194C]">
          👉 <strong>Enregistrez son numéro</strong> dès son premier message, et <strong>répondez-lui</strong> : ses
          messages font partie de votre accompagnement.
        </div>
      </div>

      <PrimaryBtn onClick={onDone}>C&apos;est noté, place à Max IA →</PrimaryBtn>
    </div>
  );
}

/** Avatar de Camille (photo dans /public, repli sur un rond de marque si absente). */
function CamilleAvatar() {
  return (
    <div className="relative shrink-0">
      <div
        className="w-14 h-14 rounded-full bg-cover bg-center bg-[#00194C] ring-2 ring-[#DDE6FF]"
        style={{ backgroundImage: "url(/Camille.png)" }}
        role="img"
        aria-label="Camille"
      />
      <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#22C55E] ring-2 ring-white" aria-hidden />
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
  label, value, onChange, options, placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly (string | { value: string; label: string })[]; placeholder: string; required?: boolean;
}) {
  const norm = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-[#00194C] mb-1.5">{label}{required && <span className="text-[#0046FF]"> *</span>}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[#E2E4EA] bg-white px-4 py-3 text-[#2A2D35] focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20"
      >
        <option value="" disabled>{placeholder}</option>
        {norm.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** Téléphone avec sélecteur d'indicatif pays (France par défaut). */
function PhoneField({
  country, onCountry, value, onChange,
}: {
  country: CountryCode; onCountry: (c: CountryCode) => void; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#00194C] mb-1.5">Téléphone<span className="text-[#0046FF]"> *</span></label>
      <div className="flex gap-2">
        <select
          value={country}
          onChange={(e) => onCountry(e.target.value as CountryCode)}
          aria-label="Indicatif pays"
          className="shrink-0 rounded-xl border border-[#E2E4EA] bg-white px-2 py-3 text-[#2A2D35] focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>{c.flag} {c.dial}</option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="06 12 34 56 78"
          className="flex-1 min-w-0 rounded-xl border border-[#E2E4EA] bg-white px-4 py-3 text-[#2A2D35] focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20"
        />
      </div>
    </div>
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
