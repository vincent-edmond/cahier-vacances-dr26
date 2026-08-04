import type { Metadata } from "next";
import { LandingB } from "@/components/LandingB";

// Revue interne de la variante B (avec bandeau d'aperçu). Non indexée.
export const metadata: Metadata = {
  title: "Summer Business — Aperçu LP (v2)",
  robots: { index: false, follow: false },
};

export default function PreviewPage() {
  return <LandingB preview />;
}
