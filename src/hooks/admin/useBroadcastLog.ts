import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TENANT_ID } from "@/lib/messaging/data";
import type { AudienceType } from "@/lib/messaging/adminAudienceService";

export type BroadcastStatus = "sent" | "delivered" | "read";

export interface BroadcastLogEntry {
  id: string;
  title?: string | null;
  createdAt: string;
  audience?: AudienceType;
  scope?: "all" | "specific";
  subject?: string;
  targetCount: number;
  deliveredCount: number;
  readCount: number;
  status: BroadcastStatus;
  lastUpdated?: string;
  sentAt?: string;
}

const parseNumber = (value: unknown) => (typeof value === "number" ? value : 0);

const getStatus = (deliveredCount: number, targetCount: number, readCount: number): BroadcastStatus => {
  if (readCount > 0) return "read";
  if (targetCount > 0 && deliveredCount >= targetCount) return "delivered";
  return "sent";
};

const parseLogEntry = (row: { id: string; title?: string | null; created_at: string; metadata?: unknown }) => {
  const metadata = (row.metadata as Record<string, unknown> | null) ?? {};
  const delivery = (metadata as { delivery?: Record<string, unknown> }).delivery ?? {};
  const audience = (metadata as { audience?: AudienceType }).audience;
  const scope = (metadata as { scope?: "all" | "specific" }).scope;
  const subject = (metadata as { subject?: string }).subject;
  const sentAt = (delivery as { sentAt?: string }).sentAt;
  const targetCount = parseNumber((delivery as { targetCount?: number }).targetCount);
  const deliveredCount = parseNumber((delivery as { deliveredCount?: number }).deliveredCount ?? targetCount);
  const readCount = parseNumber((delivery as { readCount?: number }).readCount);
  const status = getStatus(deliveredCount, targetCount, readCount);

  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    audience,
    scope,
    subject,
    targetCount,
    deliveredCount,
    readCount,
    status,
    lastUpdated: (delivery as { lastUpdated?: string }).lastUpdated,
    sentAt,
  } satisfies BroadcastLogEntry;
};

export function useBroadcastLog(tenantId?: string | null) {
  const [entries, setEntries] = useState<BroadcastLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, metadata")
      .eq("tenant_id", tenantId ?? DEFAULT_TENANT_ID)
      .eq("type", "broadcast")
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) {
      console.error("Failed to fetch broadcast log", error);
      setLoading(false);
      return;
    }

    setEntries((data ?? []).map(parseLogEntry));
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  return { entries, loading, refresh: fetchEntries };
}
