import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

// ─── Validation email / téléphone (anti-opt-in bidon) ───────────────────────
// Utilisée côté client (UX inline) ET serveur (/api/optin, autoritaire).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Domaines jetables / temporaires les plus courants (bloqués). */
const DISPOSABLE_DOMAINS = new Set([
  "yopmail.com", "yopmail.fr", "mailinator.com", "guerrillamail.com", "guerrillamail.info",
  "sharklasers.com", "grr.la", "10minutemail.com", "10minutemail.net", "tempmail.com",
  "temp-mail.org", "tempmailo.com", "throwawaymail.com", "getnada.com", "nada.email",
  "trashmail.com", "trash-mail.com", "maildrop.cc", "mailnesia.com", "fakeinbox.com",
  "dispostable.com", "mintemail.com", "mailcatch.com", "spamgourmet.com", "mohmal.com",
  "moakt.com", "emailondeck.com", "tempr.email", "discard.email", "jetable.org",
  "33mail.com", "anonbox.net", "byom.de", "spam4.me", "tmpmail.org", "tmpmail.net",
  "luxusmail.org", "mailpoof.com", "inboxbear.com", "tempmailaddress.com",
]);

/** Adresses manifestement factices (test@test.com, a@a.com, etc.). */
const FAKE_LOCAL = /^(test|fake|asdf|qwerty|aaa+|xxx+|nnn+|none|no|noreply|abc)$/i;
const FAKE_DOMAINS = new Set(["test.com", "test.fr", "example.com", "example.fr", "exemple.com", "mail.com", "email.com", "azerty.com"]);

export type EmailCheck = { ok: true } | { ok: false; reason: string };

/** Validation email de forme (sans DNS) : syntaxe + jetable + factice. */
export function validateEmailFormat(raw: string): EmailCheck {
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, reason: "Cet email ne semble pas valide." };
  const [local, domain] = email.split("@");
  if (DISPOSABLE_DOMAINS.has(domain)) return { ok: false, reason: "Les adresses email jetables ne sont pas acceptées." };
  if (FAKE_DOMAINS.has(domain) || FAKE_LOCAL.test(local)) return { ok: false, reason: "Merci d'utiliser une adresse email réelle." };
  return { ok: true };
}

/** Domaine d'un email (pour le check MX serveur). */
export function emailDomain(raw: string): string {
  return raw.trim().toLowerCase().split("@")[1] ?? "";
}

export type PhoneCheck = { ok: true; e164: string } | { ok: false; reason: string };

/**
 * Validation téléphone via libphonenumber (défaut FR, accepte l'international avec +).
 * Renvoie le format E.164 normalisé (ex. +33622961186) pour un stockage propre.
 */
export function validatePhone(raw: string, defaultCountry: CountryCode = "FR"): PhoneCheck {
  const input = (raw || "").trim();
  if (!input) return { ok: false, reason: "Numéro de téléphone requis." };
  try {
    const phone = parsePhoneNumberFromString(input, defaultCountry);
    if (!phone || !phone.isValid()) return { ok: false, reason: "Ce numéro de téléphone ne semble pas valide." };
    return { ok: true, e164: phone.number };
  } catch {
    return { ok: false, reason: "Ce numéro de téléphone ne semble pas valide." };
  }
}
