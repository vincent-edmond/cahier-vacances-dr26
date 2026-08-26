import type { Metadata } from "next";
import ReviewClientV2 from "./ReviewClientV2";

// Outil interne — jamais indexé, jamais lié depuis le SaaS.
export const metadata: Metadata = {
  title: "Questions du Diagnostic — V2",
  robots: { index: false, follow: false },
};

export default function AuditQuestionsV2Page() {
  return <ReviewClientV2 />;
}
