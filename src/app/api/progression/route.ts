import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { CapsuleProgress } from "@/lib/types";

type ProgressRow = {
  capsule_num: number;
  vu: boolean | null;
  reponses: CapsuleProgress["reponses"];
  feedback_ia: string | null;
  done_at: string | null;
  updated_at: string | null;
};

function rowToProgress(row: ProgressRow): CapsuleProgress {
  return {
    capsuleNum: row.capsule_num,
    vu: row.vu ?? false,
    reponses: row.reponses ?? null,
    feedbackIA: row.feedback_ia ?? null,
    doneAt: row.done_at ?? null,
    updatedAt: row.updated_at ?? "",
  };
}

/** GET /api/progression?sessionId=... → { progress, configured } */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ progress: [], configured: false });

  const { data, error } = await supabase
    .from("progress")
    .select("capsule_num, vu, reponses, feedback_ia, done_at, updated_at")
    .eq("session_id", sessionId);

  if (error) {
    console.error("Supabase progress select error:", error.message);
    return NextResponse.json({ progress: [], configured: true });
  }

  return NextResponse.json({
    progress: (data as ProgressRow[]).map(rowToProgress),
    configured: true,
  });
}

/** POST /api/progression — marque une capsule vue. Body: { sessionId, capsuleNum, vu } */
export async function POST(req: NextRequest) {
  let body: { sessionId?: string; capsuleNum?: number; vu?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const { sessionId, capsuleNum, vu } = body;
  if (!sessionId || typeof capsuleNum !== "number") {
    return NextResponse.json({ error: "sessionId et capsuleNum requis" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, configured: false });

  const { error } = await supabase.from("progress").upsert(
    {
      session_id: sessionId,
      capsule_num: capsuleNum,
      vu: vu ?? true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,capsule_num" }
  );
  if (error) console.error("Supabase progress upsert error:", error.message);

  return NextResponse.json({ ok: !error, configured: true });
}
