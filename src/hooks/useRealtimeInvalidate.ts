import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Optional live refresh must not own or interrupt another component's channel. */
export function useRealtimeInvalidate(
  filterValue: string | undefined,
  queryKey: QueryKey,
  table: string,
  filterColumn = "tenant_id",
) {
  const queryClient = useQueryClient();
  // Staff query-key factories return serialisable primitive arrays. Their value,
  // not a new array identity on every render, determines this subscription.
  const keySignature = JSON.stringify(queryKey);

  useEffect(() => {
    if (!filterValue) return;
    const invalidationKey = JSON.parse(keySignature) as QueryKey;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const removeOwnedChannel = () => {
      if (channel) {
        const owned = channel;
        channel = undefined;
        void supabase.removeChannel(owned).catch((error: unknown) => {
          console.warn("Live refresh cleanup failed.", error);
        });
      }
    };
    try {
      // Supabase reuses a channel by topic. A fresh topic per effect lifetime
      // also avoids reusing an asynchronously closing channel in StrictMode.
      channel = supabase.channel(`staff-${table}-${crypto.randomUUID()}`);
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            ...(filterColumn
              ? { filter: `${filterColumn}=eq.${filterValue}` }
              : {}),
          },
          () => {
            if (active)
              void queryClient.invalidateQueries({ queryKey: invalidationKey });
          },
        )
        .subscribe();
    } catch (error) {
      active = false;
      removeOwnedChannel();
      // The normal authorised query and manual refresh remain usable when
      // realtime setup is unavailable; a live-update failure is not a page crash.
      console.warn(
        "Live refresh unavailable; normal queries remain active.",
        error,
      );
    }
    return () => {
      active = false;
      removeOwnedChannel();
    };
  }, [filterValue, keySignature, queryClient, table, filterColumn]);
}
