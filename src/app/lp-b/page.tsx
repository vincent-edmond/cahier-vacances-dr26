import type { Metadata } from "next";
import { LandingB } from "@/components/LandingB";
import { AbView } from "@/components/AbView";

// Variante B servie sur `/` par le proxy A/B (l'URL réelle reste `/`, UTM intacts).
// Non indexée pour éviter tout contenu dupliqué avec `/`.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LpBPage() {
  return (
    <>
      <AbView variant="B" />
      <LandingB />
    </>
  );
}
