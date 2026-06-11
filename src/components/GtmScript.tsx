"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/track";

/**
 * Conteneur GTM (web). Sans `NEXT_PUBLIC_GTM_ID`, ne rend rien (dev / pas encore
 * branché). `NEXT_PUBLIC_GTM_URL` (optionnel) = domaine first-party servi par le
 * conteneur server-side (meilleure résilience ad-blockers).
 * Pousse aussi un `page_view` sur changement de route (App Router = SPA).
 */
// NEXT_PUBLIC_* est inliné au BUILD : toute modif de l'env GTM nécessite un vrai
// rebuild de ce fichier (un commit « vide » garde le chunk en cache → non inliné).
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GTM_BASE = process.env.NEXT_PUBLIC_GTM_URL || "https://www.googletagmanager.com";

export function GtmScript() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!GTM_ID) return;
    // Le 1er page_view est couvert par le trigger natif GTM au chargement.
    if (first.current) {
      first.current = false;
      return;
    }
    trackPageView(pathname);
  }, [pathname]);

  if (!GTM_ID) return null;

  return (
    <Script id="gtm-loader" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='${GTM_BASE}/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
    </Script>
  );
}
