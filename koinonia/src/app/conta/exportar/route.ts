import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";

/** Exportação dos dados do próprio usuário (portabilidade LGPD/GDPR). Leitura com RLS do usuário. */
export async function GET() {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const uid = user.id;
  const q = async (table: string, column: string) => (await supabase.from(table).select("*").eq(column, uid)).data ?? [];
  const [profile, privateData, skills, portfolio, memberships, applications, requests, reviews, notifications, reports, blocks] = await Promise.all([
    q("profiles", "id"), q("profile_private", "user_id"), q("profile_skills", "profile_id"), q("portfolio_items", "profile_id"),
    q("community_members", "user_id"), q("applications", "applicant_id"), q("resource_requests", "requester_id"),
    q("reviews", "reviewer_id"), q("notifications", "user_id"), q("reports", "reporter_id"), q("blocks", "blocker_id"),
  ]);
  const messages = (await supabase.from("messages").select("conversation_id, body, created_at").eq("sender_id", uid)).data ?? [];
  const body = {
    exported_at: new Date().toISOString(),
    account: { id: uid, email: user.email, created_at: user.created_at },
    profile: profile[0] ?? null, private: privateData[0] ?? null, skills, portfolio, memberships, applications,
    resource_requests: requests, reviews_written: reviews, messages_sent: messages, notifications, reports, blocks,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="koinonia-dados-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
