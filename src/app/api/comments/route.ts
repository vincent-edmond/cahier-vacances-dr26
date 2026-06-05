import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { Comment } from "@/lib/types";

type CommentRow = {
  id: string;
  capsule_num: number;
  session_id: string | null;
  prenom: string | null;
  texte: string;
  created_at: string;
  status: string | null;
};

function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    capsuleNum: row.capsule_num,
    sessionId: row.session_id ?? "",
    prenom: row.prenom ?? "Anonyme",
    texte: row.texte,
    createdAt: row.created_at,
    status: (row.status as Comment["status"]) ?? "approved",
  };
}

/** GET /api/comments?capsuleNum=1 → { comments, configured } */
export async function GET(req: NextRequest) {
  const capsuleNum = Number(req.nextUrl.searchParams.get("capsuleNum"));
  if (!capsuleNum) {
    return NextResponse.json({ error: "capsuleNum requis" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ comments: [], configured: false });

  const { data, error } = await supabase
    .from("comments")
    .select("id, capsule_num, session_id, prenom, texte, created_at, status")
    .eq("capsule_num", capsuleNum)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Supabase comments select error:", error.message);
    return NextResponse.json({ comments: [], configured: true });
  }

  return NextResponse.json({
    comments: (data as CommentRow[]).map(rowToComment),
    configured: true,
  });
}

/** POST /api/comments — ajoute un commentaire. Body: { capsuleNum, sessionId, prenom, texte } */
export async function POST(req: NextRequest) {
  let body: { capsuleNum?: number; sessionId?: string; prenom?: string; texte?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const { capsuleNum, sessionId, prenom, texte } = body;
  if (typeof capsuleNum !== "number" || !texte?.trim()) {
    return NextResponse.json({ error: "capsuleNum et texte requis" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: false, configured: false });

  const { data, error } = await supabase
    .from("comments")
    .insert({
      capsule_num: capsuleNum,
      session_id: sessionId ?? null,
      prenom: (prenom ?? "Anonyme").slice(0, 60),
      texte: texte.trim().slice(0, 2000),
      status: "approved",
    })
    .select("id, capsule_num, session_id, prenom, texte, created_at, status")
    .single();

  if (error) {
    console.error("Supabase comments insert error:", error.message);
    return NextResponse.json({ ok: false, configured: true }, { status: 500 });
  }

  return NextResponse.json({ ok: true, configured: true, comment: rowToComment(data as CommentRow) });
}
