import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConversationSummary {
  conversation_id: string;
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  last_body: string | null;
  last_at: string;
  unread: number;
}

export async function listMyConversations(supabase: SupabaseClient): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) throw error;
  return (data ?? []) as ConversationSummary[];
}
