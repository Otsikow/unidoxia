import { supabase } from "@/integrations/supabase/client";

export const getOrCreateConversation = async (studentId: string): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching user profile:", profileError);
    throw profileError;
  }

  if (!profile?.tenant_id) {
    throw new Error("Profile tenant not found");
  }

  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_user_id: user.id,
    p_other_user_id: studentId,
    p_tenant_id: profile.tenant_id,
  });

  if (error) {
    console.error("Error getting or creating conversation:", error);
    throw error;
  }

  return data;
};

export const getMessages = async (conversationId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }

  return data;
};

export const sendMessage = async (
  conversationId: string,
  content: string
): Promise<any> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  
  const { data: rows, error } = await supabase
    .from("conversation_messages")
    .insert([
      {
        conversation_id: conversationId,
        sender_id: user.id,
        content: content,
      },
    ])
    .select();

  const data = Array.isArray(rows) ? rows[0] : rows;

  if (error) {
    console.error("Error sending message:", error);
    throw error;
  }

  return data;
};
