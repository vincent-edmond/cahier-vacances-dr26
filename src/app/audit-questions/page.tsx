import type { Metadata } from "next";
import ReviewClient from "./ReviewClient";

// Outil interne — jamais indexé, jamais lié depuis le SaaS.
export const metadata: Metadata = {
  title: "Questions du Diagnostic — relecture",
  robots: { index: false, follow: false },
};

export default function AuditQuestionsPage() {
  return <ReviewClient />;
}
