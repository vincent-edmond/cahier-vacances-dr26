"use client";

import { useEffect, useState } from "react";
import type { Comment } from "@/lib/types";
import { getPrenom, setPrenom as persistPrenom } from "@/lib/session";

const localKey = (num: number) => `cdv_comments_${num}`;

function loadLocal(num: number): Comment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(localKey(num));
    return raw ? (JSON.parse(raw) as Comment[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(num: number, comments: Comment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(localKey(num), JSON.stringify(comments));
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

interface CommentsSectionProps {
  capsuleNum: number;
  sessionId: string;
}

export function CommentsSection({ capsuleNum, sessionId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [configured, setConfigured] = useState<boolean>(true);
  const [prenom, setPrenomState] = useState("");
  const [texte, setTexte] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setPrenomState(getPrenom());
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/comments?capsuleNum=${capsuleNum}`);
        const data = (await res.json()) as { comments?: Comment[]; configured?: boolean };
        if (cancelled) return;
        if (data.configured) {
          setConfigured(true);
          setComments(data.comments ?? []);
        } else {
          setConfigured(false);
          setComments(loadLocal(capsuleNum));
        }
      } catch {
        if (cancelled) return;
        setConfigured(false);
        setComments(loadLocal(capsuleNum));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [capsuleNum]);

  async function handleSubmit() {
    const t = texte.trim();
    const p = prenom.trim() || "Anonyme";
    if (!t || sending) return;
    setSending(true);
    persistPrenom(p);

    if (configured) {
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ capsuleNum, sessionId, prenom: p, texte: t }),
        });
        const data = (await res.json()) as { ok?: boolean; comment?: Comment };
        if (data.ok && data.comment) {
          setComments((prev) => [data.comment as Comment, ...prev]);
          setTexte("");
          setSending(false);
          return;
        }
      } catch {
        /* bascule sur le local ci-dessous */
      }
    }

    // Fallback local
    const local: Comment = {
      id: `local_${Date.now()}`,
      capsuleNum,
      sessionId,
      prenom: p,
      texte: t,
      createdAt: new Date().toISOString(),
      status: "approved",
    };
    const next = [local, ...comments];
    setComments(next);
    saveLocal(capsuleNum, next);
    setTexte("");
    setSending(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display font-bold text-lg text-[#00194C]">
          La communauté ({comments.length})
        </h3>
      </div>

      {/* Formulaire */}
      <div className="rounded-2xl border border-[#E2E4EA] bg-white p-5 space-y-3">
        <input
          value={prenom}
          onChange={(e) => setPrenomState(e.target.value)}
          placeholder="Votre prénom"
          className="w-full rounded-xl border border-[#E2E4EA] px-4 py-2.5 text-sm focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20"
        />
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Partagez votre prise de conscience, votre défi de la semaine…"
          rows={3}
          className="w-full rounded-xl border border-[#E2E4EA] px-4 py-2.5 text-sm focus:border-[#0046FF] focus:outline-none focus:ring-2 focus:ring-[#0046FF]/20 resize-y"
        />
        <button
          onClick={handleSubmit}
          disabled={!texte.trim() || sending}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0046FF] hover:bg-[#0033CC] disabled:opacity-40 text-white font-bold text-sm px-5 py-2.5 transition-all"
        >
          {sending ? "Envoi…" : "Publier"}
        </button>
      </div>

      {/* Liste */}
      {comments.length === 0 ? (
        <p className="text-sm text-[#9096A5] text-center py-4">
          Soyez le premier à partager. Votre commentaire encourage les autres dirigeants.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-2xl border border-[#E2E4EA] bg-white p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-[#0046FF]/10 text-[#0046FF] flex items-center justify-center text-xs font-bold">
                  {c.prenom.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-sm text-[#00194C]">{c.prenom}</span>
                <span className="text-xs text-[#9096A5]">· {timeAgo(c.createdAt)}</span>
              </div>
              <p className="text-sm text-[#2A2D35] leading-relaxed pl-9 whitespace-pre-line">{c.texte}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
