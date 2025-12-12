import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type DashboardNavPrefRow = {
  user_id: string;
  menu_key: string;
  item_order: string[];
};

const prefQueryKey = (userId: string | null | undefined, menuKey: string) => [
  "dashboard_nav_preferences",
  userId ?? "anonymous",
  menuKey,
];

export function useDashboardNavPreferences(menuKey: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: prefQueryKey(userId, menuKey),
    enabled: Boolean(userId && menuKey),
    queryFn: async (): Promise<string[] | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("dashboard_nav_preferences")
        .select("item_order")
        .eq("user_id", userId)
        .eq("menu_key", menuKey)
        .maybeSingle();

      if (error) throw error;
      return (data?.item_order as string[] | null) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (itemOrder: string[]) => {
      if (!userId) throw new Error("Not authenticated");

      const payload: DashboardNavPrefRow = {
        user_id: userId,
        menu_key: menuKey,
        item_order: itemOrder,
      };

      const { error } = await supabase
        .from("dashboard_nav_preferences")
        .upsert(payload, { onConflict: "user_id,menu_key" });

      if (error) throw error;
      return itemOrder;
    },
    onMutate: async (nextOrder) => {
      await queryClient.cancelQueries({ queryKey: prefQueryKey(userId, menuKey) });
      const previous = queryClient.getQueryData<string[] | null>(prefQueryKey(userId, menuKey));
      queryClient.setQueryData(prefQueryKey(userId, menuKey), nextOrder);
      return { previous };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(prefQueryKey(userId, menuKey), ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: prefQueryKey(userId, menuKey) });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("dashboard_nav_preferences")
        .delete()
        .eq("user_id", userId)
        .eq("menu_key", menuKey);

      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: prefQueryKey(userId, menuKey) });
      const previous = queryClient.getQueryData<string[] | null>(prefQueryKey(userId, menuKey));
      queryClient.setQueryData(prefQueryKey(userId, menuKey), null);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(prefQueryKey(userId, menuKey), ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: prefQueryKey(userId, menuKey) });
    },
  });

  return {
    savedOrder: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    saveOrder: (order: string[]) => saveMutation.mutate(order),
    resetToDefault: () => resetMutation.mutate(),
    isSaving: saveMutation.isPending || resetMutation.isPending,
  };
}
