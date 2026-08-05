import { SessionPing } from "@/components/SessionPing";
import { OptinGate } from "@/components/OptinGate";

/** Layout de l'espace : trace la visite (entrée SaaS) et impose l'opt-in à l'entrée
 *  (front gate) sur le hub comme sur les capsules. */
export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionPing />
      <OptinGate />
      {children}
    </>
  );
}
