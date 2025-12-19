import { supabase } from "@/integrations/supabase/client";

interface DocumentAuditEvent {
  action: string;
  tenantId?: string | null;
  userId?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown>;
}

const resolveUserId = async (providedUserId?: string | null) => {
  if (providedUserId) return providedUserId;

  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch (error) {
    console.warn("auditLogger: unable to resolve user ID", error);
    return null;
  }
};

export const logDocumentAuditEvent = async (event: DocumentAuditEvent) => {
  const tenantId = event.tenantId ?? null;

  if (!tenantId) {
    console.warn("auditLogger: missing tenantId for document audit event", event);
    return;
  }

  const userId = await resolveUserId(event.userId);
  const payload = {
    action: event.action,
    entity: "document",
    entity_id: event.entityId ?? null,
    tenant_id: tenantId,
    user_id: userId,
    changes: (event.details ?? {}) as unknown as Record<string, never>,
    user_agent: typeof window !== "undefined" ? window.navigator.userAgent : null,
    ip_address: null,
  };

  const { error } = await supabase.from("audit_logs").insert([payload as any]);

  if (error) {
    console.error("Failed to write document audit event", { error, payload });
  }
};
