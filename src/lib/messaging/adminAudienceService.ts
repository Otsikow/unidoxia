import { supabase } from "@/integrations/supabase/client";
import type { DirectoryProfile } from "./directory";
import { DEFAULT_TENANT_ID } from "./data";
import type { Json } from "@/integrations/supabase/types";

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
  targetCount?: number;
}

export interface BroadcastDeliverySnapshot {
  status: "pending" | "sent" | "delivered" | "read";
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  targetCount?: number;
  deliveredCount?: number;
  readCount?: number;
}

export interface BroadcastSendOptions {
  audience: AudienceType;
  scope: "all" | "specific";
  tenantId?: string | null;
  targetCount: number;
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
  targetCount,
}: AudienceConversationOptions): Promise<string> {
  const uniqueParticipantIds = Array.from(new Set([...participantIds, createdBy]));
  const createdAt = new Date().toISOString();
  const baseMetadata: Json = {
    audience,
    scope,
    subject: subject ?? null,
    delivery: {
      targetCount: targetCount ?? 0,
      deliveredCount: 0,
      readCount: 0,
      status: "pending",
      sentAt: createdAt,
    },
    auditTrail: [
      {
        action: "conversation_created",
        by: createdBy,
        at: createdAt,
        scope,
        audience,
        targetCount: targetCount ?? 0,
      },
    ],
  };

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      tenant_id: tenantId ?? DEFAULT_TENANT_ID,
      created_by: createdBy,
      is_group: true,
      type: "broadcast",
      title: subject || `${audienceLabel[audience]} broadcast`,
      metadata: baseMetadata,
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
  content: string,
  options: BroadcastSendOptions
) {
  const sentAt = new Date().toISOString();
  const deliverySnapshot = {
    status: "delivered",
    sentAt,
    deliveredAt: sentAt,
    targetCount: options.targetCount,
    deliveredCount: options.targetCount,
    readCount: 0,
  };

  const messageMetadata: Json = {
    audience: options.audience,
    scope: options.scope,
    delivery: deliverySnapshot,
  };

  const { error: messageError } = await supabase.from("conversation_messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    message_type: "text",
    attachments: [],
    metadata: messageMetadata,
  });

  if (messageError) {
    throw messageError;
  }

  const { data: existing, error: metadataError } = await supabase
    .from("conversations")
    .select("metadata")
    .eq("id", conversationId)
    .single();

  if (metadataError) {
    throw metadataError;
  }

  const metadata = (existing?.metadata as Record<string, unknown> | null) ?? {};
  const existingAuditTrail = metadata.auditTrail;
  const auditTrail: Json[] = Array.isArray(existingAuditTrail) 
    ? (existingAuditTrail as Json[])
    : [];

  const existingDelivery = metadata.delivery as Record<string, unknown> | undefined;

  const updatedMetadata: Json = {
    audience: options.audience,
    scope: options.scope,
    subject: options.subject ?? (metadata.subject as string | undefined) ?? null,
    delivery: {
      ...(existingDelivery ?? {}),
      ...deliverySnapshot,
      lastUpdated: sentAt,
    },
    auditTrail: [
      ...auditTrail,
      {
        action: "broadcast_sent",
        by: senderId,
        at: sentAt,
        targetCount: options.targetCount,
        audience: options.audience,
        scope: options.scope,
      },
    ],
  };

  const { error: updateError } = await supabase
    .from("conversations")
    .update({ metadata: updatedMetadata })
    .eq("id", conversationId);

  if (updateError) {
    throw updateError;
  }

  await supabase.from("audit_logs").insert({
    action: "broadcast_message",
    entity: "conversation",
    entity_id: conversationId,
    tenant_id: options.tenantId ?? DEFAULT_TENANT_ID,
    user_id: senderId,
    changes: {
      audience: options.audience,
      scope: options.scope,
      targetCount: options.targetCount,
      subject: options.subject ?? null,
      sentAt,
    },
  });
}
