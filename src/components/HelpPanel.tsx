"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getParticipant, getPrenom, getOrCreateSessionId } from "@/lib/session";

/**
 * « Besoin d'aide ? » : bouton flottant discret + panneau.
 *
 * Choix assumé : les réponses courantes sont ÉCRITES À L'AVANCE (pas d'IA). Elles
 * couvrent l'essentiel des blocages, répondent instantanément, ne coûtent rien et
 * ne peuvent pas se tromper. L'IA est réservée au coaching (Max IA) et
 * l'accompagnement au canal WhatsApp (Camille), on n'ajoute pas une 3ᵉ voix.
 *
 * Si ça ne suffit pas : formulaire → /api/report → Slack (canal support) + /admin,
 * avec le contexte technique attaché automatiquement.
 */
const FAQ: { q: string; a: string }[] = [
  {
    q: "Le retour de Max IA ne s'affiche pas",
    a: "Vos réponses sont enregistrées, vous ne perdez rien. Cliquez sur « Réessayer » sous le message d'erreur : la génération repart. Si ça bloque encore après deux essais, signalez-le ci-dessous, on regarde tout de suite.",
  },
  {
    q: "Je ne retrouve pas mon espace",
    a: "Votre progression est liée à votre navigateur. Si vous changez d'appareil ou videz votre cache, cliquez sur « Obtenir le retour de Max IA » puis sur « J'ai déjà un espace » et entrez l'email utilisé à l'inscription : tout revient.",
  },
  {
    q: "Je veux modifier mes réponses",
    a: "Sur l'étape concernée, cliquez sur « Modifier mes réponses » sous le retour de Max IA. Vous pouvez relancer une nouvelle analyse autant de fois que nécessaire.",
  },
  {
    q: "Quand sort la prochaine étape ?",
    a: "Les étapes s'ouvrent au fil de l'été, les mardis et vendredis. La date d'ouverture de chaque étape est indiquée directement sur votre espace, sur les cartes encore verrouillées.",
  },
  {
    q: "C'est quoi Max IA exactement ?",
    a: "C'est l'analyse personnalisée de vos réponses, dans la méthode de Max : un constat, une action concrète pour la semaine, ce que votre inaction vous coûte, et une question qui dérange. Plus vos réponses sont précises, plus le retour est utile.",
  },
];

export function HelpPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pré-remplissage pour les inscrits : moins de friction = plus de signalements.
  useEffect(() => {
    if (!open) return;
    const p = getParticipant();
    if (p?.email) setEmail((v) => v || p.email);
    const pre = getPrenom();
    if (pre) setPrenom((v) => v || pre);
  }, [open]);

  // Échap pour fermer. Fenêtre de chat (non modale) : on NE bloque PAS le scroll de
  // la page, on ne pose pas de voile — le prospect peut continuer à lire derrière.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !sending) setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, sending]);

  const capsuleNum = (() => {
    const m = pathname?.match(/\/espace\/capsule\/(\d+)/);
    return m ? Number(m[1]) : undefined;
  })();

  async function submit() {
    if (!email.trim() || message.trim().length < 5 || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getOrCreateSessionId(),
          capsuleNum,
          prenom: prenom.trim() || undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
          message: message.trim(),
          // Contexte technique attaché tout seul : l'utilisateur n'a rien à expliquer.
          context: { url: pathname, screen: `${window.innerWidth}x${window.innerHeight}` },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "L'envoi a échoué. Réessayez dans un instant.");
        setSending(false);
        return;
      }
      setSent(true);
    } catch {
      setError("L'envoi a échoué. Vérifiez votre connexion et réessayez.");
    }
    setSending(false);
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Besoin d'aide ?"
          className="fixed bottom-5 right-5 z-[90] inline-flex items-center gap-2 rounded-full bg-white border border-[#E2E4EA] shadow-lg hover:border-[#0046FF] text-[#00194C] font-semibold text-sm px-4 py-2.5 transition-all"
        >
          <span aria-hidden>💬</span> Besoin d&apos;aide ?
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Besoin d'aide"
          className="help-pop fixed bottom-5 right-5 z-[100] flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden origin-bottom-right"
          style={{ width: 380, maxWidth: "calc(100vw - 2.5rem)", maxHeight: "78vh", animation: "helpPop 0.2s ease-out" }}
        >
          <div className="shrink-0 bg-gradient-to-br from-[#00194C] to-[#000D2B] px-5 pt-4 pb-3.5 text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-extrabold text-base">Besoin d&apos;aide ?</h3>
              {!sending && (
                <button onClick={() => setOpen(false)} aria-label="Fermer" className="text-white/50 hover:text-white text-xl leading-none">
                  ×
                </button>
              )}
            </div>
            <p className="text-xs text-white/65 mt-0.5 leading-snug">
              Les blocages courants, et si besoin on prend le relais.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
              {FAQ.map((f) => (
                <details key={f.q} className="border-b border-[#E2E4EA] py-3">
                  <summary className="cursor-pointer list-none font-semibold text-[#00194C] text-sm flex items-center justify-between gap-3">
                    {f.q}
                    <span className="text-[#0046FF] text-lg leading-none">+</span>
                  </summary>
                  <p className="text-sm text-[#555B6E] leading-relaxed mt-2">{f.a}</p>
                </details>
              ))}

              {sent ? (
                <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="font-semibold text-green-800 text-sm">C&apos;est envoyé, merci.</p>
                  <p className="text-sm text-green-700 mt-1">
                    Un membre de notre équipe revient vers vous rapidement, par email ou par téléphone.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <p className="font-bold text-[#00194C] text-sm">Toujours bloqué ?</p>
                  <p className="text-xs text-[#9096A5] -mt-1.5">
                    Décrivez votre souci, on vous répond. Réponses de 7h à 22h.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      placeholder="Prénom"
                      className="rounded-xl border border-[#E2E4EA] bg-white px-3 py-2.5 text-sm text-[#2A2D35] focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Téléphone (facultatif)"
                      className="rounded-xl border border-[#E2E4EA] bg-white px-3 py-2.5 text-sm text-[#2A2D35] focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20"
                    />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre email"
                    className="w-full rounded-xl border border-[#E2E4EA] bg-white px-3 py-2.5 text-sm text-[#2A2D35] focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20"
                  />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Que se passe-t-il ?"
                    className="w-full rounded-xl border border-[#E2E4EA] bg-white px-3 py-2.5 text-sm text-[#2A2D35] focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20 resize-y"
                  />

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <button
                    onClick={submit}
                    disabled={!email.trim() || message.trim().length < 5 || sending}
                    className="w-full rounded-xl bg-[#0046FF] hover:bg-[#0033CC] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-5 py-3 text-sm transition-all"
                  >
                    {sending ? "Envoi…" : "Envoyer mon message"}
                  </button>
                </div>
              )}
            </div>
          </div>
      )}
    </>
  );
}
