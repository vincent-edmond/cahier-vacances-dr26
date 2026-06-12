import { SessionPing } from "@/components/SessionPing";

/** Layout de l'espace : trace la visite (entrée SaaS) sur le hub et les capsules. */
export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionPing />
      {children}
    </>
  );
}
