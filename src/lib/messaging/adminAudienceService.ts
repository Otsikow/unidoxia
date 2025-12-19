import { supabase } from "@/integrations/supabase/client";
import type { DirectoryProfile } from "./directory";
import { DEFAULT_TENANT_ID } from "./data";

export type AudienceType = "universities" | "students" | "agents" | "all";

const AUDIENCE_ROLES: Record<Exclude<AudienceType, "all">, DirectoryProfile["role"][]> = {
  universities: ["partner", "school_rep"],
  students: ["student"],
  agents: ["agent"],
};

export const audienceLabel: Record<AudienceType, string> = {
  universities: "University partners",
  students: "Students",
  agents: "Agents",
  all: "All users",
};

export interface AudienceConversationOptions {
  participantIds: string[];
  createdBy: string;
  tenantId?: string | null;
  audience: AudienceType;
  scope: "all" | "specific";
  subject?: string;
}

export async function fetchAudienceContacts(
  audience: AudienceType,
  tenantId?: string | null,
  search?: string
): Promise<DirectoryProfile[]> {
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, tenant_id")
    .eq("active", true)
    .order("full_name", { ascending: true })
    .limit(100);

  const effectiveTenant = tenantId ?? DEFAULT_TENANT_ID;
  query = query.eq("tenant_id", effectiveTenant);

  if (audience !== "all") {
    query = query.in("role", AUDIENCE_ROLES[audience]);
  }

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((record) => ({
    id: record.id,
    full_name: record.full_name ?? record.email ?? "User",
    email: record.email ?? "",
    avatar_url: record.avatar_url,
    role: record.role as DirectoryProfile["role"],
    tenant_id: record.tenant_id ?? effectiveTenant,
  }));
}

export async function createAudienceConversation({
  participantIds,
  createdBy,
  tenantId,
  audience,
  scope,
  subject,
}: AudienceConversationOptions): Promise<string> {
  const uniqueParticipantIds = Array.from(new Set([...participantIds, createdBy]));

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      tenant_id: tenantId ?? DEFAULT_TENANT_ID,
      created_by: createdBy,
      is_group: true,
      type: "broadcast",
      name: subject || `${audienceLabel[audience]} broadcast`,
      metadata: {
        audience,
        scope,
        subject,
      },
    })
    .select("id")
    .single();

  if (conversationError || !conversation?.id) {
    throw conversationError ?? new Error("Failed to create conversation");
  }

  const participantRows = uniqueParticipantIds.map((userId) => ({
    conversation_id: conversation.id as string,
    user_id: userId,
  }));

  const { error: participantError } = await supabase
    .from("conversation_participants")
    .upsert(participantRows, { onConflict: "conversation_id,user_id" });

  if (participantError) {
    throw participantError;
  }

  return conversation.id as string;
}

export async function sendAudienceMessage(
  conversationId: string,
  senderId: string,
  content: string
) {
  const { error } = await supabase.from("conversation_messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    message_type: "text",
    attachments: [],
  });

  if (error) {
    throw error;
  }
}
