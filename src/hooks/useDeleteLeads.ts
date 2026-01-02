import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteLeads } from "@/data/leads";
import { toast } from "sonner";

export const useDeleteLeads = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leadIds: string[]) => deleteLeads(leadIds),
    onSuccess: (_, leadIds) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`Successfully deleted ${leadIds.length} lead${leadIds.length > 1 ? 's' : ''}`);
    },
    onError: (error: Error, leadIds) => {
      console.error("Failed to delete leads", {
        leadIds,
        error: error.message,
        count: leadIds.length,
      });

      // Provide user-friendly error messages
      let errorMessage = "Failed to delete leads";

      if (error.message.includes("foreign key") || error.message.includes("constraint")) {
        errorMessage = "Cannot delete leads with active applications. Please remove applications first.";
      } else if (error.message.includes("permission") || error.message.includes("denied")) {
        errorMessage = "You don't have permission to delete these leads.";
      } else if (error.message.includes("not found")) {
        errorMessage = "Some leads were not found. They may have already been deleted.";
      } else if (error.message.includes("network") || error.message.includes("timeout")) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message) {
        errorMessage = `Failed to delete leads: ${error.message}`;
      }

      toast.error(errorMessage);
    },
  });
};
