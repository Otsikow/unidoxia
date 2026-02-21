import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { userId, reason, hardDelete = false } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSelf = user.id === userId;

    // Check admin/staff via profile role OR user_roles table
    const [{ data: callerProfile }, { data: callerRoles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("role").eq("id", user.id).single(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id),
    ]);

    const adminRoles = ["admin", "staff"];
    const isAdmin =
      adminRoles.includes(callerProfile?.role ?? "") ||
      (callerRoles ?? []).some((r: { role: string }) => adminRoles.includes(r.role));

    console.log(`Delete request: caller=${user.id}, target=${userId}, isSelf=${isSelf}, isAdmin=${isAdmin}, callerRole=${callerProfile?.role}`);

    if (!isSelf && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    const isTargetStudent = targetProfile?.role === "student";

    if (!hardDelete && isAdmin && isTargetStudent) {
      const now = new Date().toISOString();

      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ active: false, updated_at: now })
        .eq("id", userId);

      if (profileUpdateError) {
        console.error("Error soft deleting profile:", profileUpdateError.message);
        return new Response(JSON.stringify({ error: profileUpdateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: studentUpdateError } = await supabaseAdmin
        .from("students")
        .update({
          status: "deleted",
          status_reason: reason ?? "Deleted by admin",
          status_changed_at: now,
          status_changed_by: user.id,
          updated_at: now,
        })
        .eq("profile_id", userId);

      if (studentUpdateError) {
        console.error("Error soft deleting student:", studentUpdateError.message);
        return new Response(JSON.stringify({ error: studentUpdateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Successfully soft-deleted student user: ${userId}`);
      return new Response(JSON.stringify({ success: true, mode: "soft" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hard delete the auth user — cascades to profiles, students, etc. via FK ON DELETE CASCADE
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting user:", deleteError.message);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Successfully hard-deleted user: ${userId}`);
    return new Response(JSON.stringify({ success: true, mode: "hard" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Unexpected error:", err?.message ?? err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
