"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/track";

/**
 * Conteneur GTM (web) chargé en FIRST-PARTY depuis notre serveur de tagging
 * server-side (gtm.maxpiccinini.com) : meilleure résistance aux ad-blockers / ITP.
 * ⚠️ Le chemin ET le paramètre sont propres au serveur de tagging : fichier au nom
 * custom, et `awl` = l'ID de conteneur SANS le préfixe « GTM- » (≠ `gtm.js?id=`).
 * Sans `NEXT_PUBLIC_GTM_ID`, ne rend rien (dev / pas branché).
 * Pousse aussi un `page_view` sur changement de route (App Router = SPA).
 */
// NEXT_PUBLIC_* est inliné au BUILD : toute modif de l'env GTM nécessite un vrai
// rebuild de ce fichier (un commit « vide » garde le chunk en cache → non inliné).
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GTM_LOADER =
  process.env.NEXT_PUBLIC_GTM_LOADER_URL || "https://gtm.maxpiccinini.com/hmd0bcb8fku5rka.js";
const GTM_NS = process.env.NEXT_PUBLIC_GTM_NS_URL || "https://gtm.maxpiccinini.com/ns.html";

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
    <>
      <Script id="gtm-loader" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='${GTM_LOADER}?awl='+i.replace(/^GTM-/,'')+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <noscript>
        <iframe
          src={`${GTM_NS}?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
