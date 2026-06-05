import { createClient } from "@supabase/supabase-js";

/**
 * Construit le client Supabase serveur, ou `null` si les variables d'env
 * ne sont pas configurées (l'app bascule alors sur localStorage côté client).
 * Le Cahier vit dans un schéma dédié `cdv` (isolé des autres tables du projet hôte).
 */
function build() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "cdv" },
  });
}

let cached: ReturnType<typeof build> | undefined;

export function getSupabase() {
  if (cached === undefined) cached = build();
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}
