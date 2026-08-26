import type { Metadata } from "next";
import ReviewClientV3 from "./ReviewClientV3";

// Outil interne — jamais indexé, jamais lié depuis le SaaS.
export const metadata: Metadata = {
  title: "Questions du Diagnostic — V3",
  robots: { index: false, follow: false },
};

export default function AuditQuestionsV3Page() {
  return <ReviewClientV3 />;
}
