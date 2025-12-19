import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  documentId?: string;
  storagePath?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const { documentId, storagePath } = body;

    if (!documentId && !storagePath) {
      return new Response(
        JSON.stringify({ error: "documentId or storagePath is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: document } = await adminClient
      .from("student_documents")
      .select(
        "storage_path, student_id, status, university_access_approved"
      )
      .or(
        documentId
          ? `id.eq.${documentId}`
          : `storage_path.eq.${storagePath}`
      )
      .single();

    if (!document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      storage_path,
      student_id,
      status,
      university_access_approved,
    } = document;

    const restrictedStatuses = [
      "awaiting_admin_review",
      "admin_rejected",
    ];

    if (
      restrictedStatuses.includes(status) &&
      profile.role !== "admin"
    ) {
      return new Response(
        JSON.stringify({ error: "Document not available" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let hasAccess = false;

    // Admin
    if (profile.role === "admin") {
      hasAccess = true;
    }

    // Student (owner)
    else if (profile.role === "student") {
      const { data: student } = await adminClient
        .from("students")
        .select("id")
        .eq("id", student_id)
        .eq("profile_id", user.id)
        .single();

      hasAccess = !!student;
    }

    // University partner / school rep
    else if (
      ["partner", "school_rep"].includes(profile.role) &&
      university_access_approved
    ) {
      const { data: apps } = await adminClient
        .from("applications")
        .select(
          `
          programs!inner (
            universities!inner ( tenant_id )
          )
        `
        )
        .eq("student_id", student_id);

      hasAccess =
        apps?.some(
          (a: any) =>
            a.programs?.universities?.tenant_id ===
            profile.tenant_id
        ) ?? false;
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: signed } = await adminClient.storage
      .from("student-documents")
      .createSignedUrl(storage_path, 3600);

    if (!signed?.signedUrl) {
      return new Response(
        JSON.stringify({ error: "Failed to generate URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: signed.signedUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
