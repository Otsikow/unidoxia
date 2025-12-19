import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  documentId: string;
  storagePath?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("[get-document-url] Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("[get-document-url] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-document-url] User authenticated:", user.id);

    // Parse request body
    const body: RequestBody = await req.json();
    const { documentId, storagePath } = body;

    if (!documentId && !storagePath) {
      return new Response(
        JSON.stringify({ error: "documentId or storagePath is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for database queries and storage
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's role and tenant
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[get-document-url] Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-document-url] User role:", profile.role, "tenant:", profile.tenant_id);

    let finalStoragePath = storagePath;
    let studentId: string | null = null;
    let universityAccessApproved = false;

    // If documentId provided, fetch document details
    if (documentId) {
      const { data: doc, error: docError } = await adminClient
        .from("student_documents")
        .select("storage_path, student_id, university_access_approved")
        .eq("id", documentId)
        .single();

      if (docError || !doc) {
        console.error("[get-document-url] Document not found:", docError);
        return new Response(
          JSON.stringify({ error: "Document not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      finalStoragePath = doc.storage_path;
      studentId = doc.student_id;
      universityAccessApproved = !!doc.university_access_approved;
    } else if (storagePath) {
      const { data: doc, error: docError } = await adminClient
        .from("student_documents")
        .select("storage_path, student_id, university_access_approved")
        .eq("storage_path", storagePath)
        .single();

      if (docError || !doc) {
        console.error("[get-document-url] Document not found by path:", docError);
        return new Response(
          JSON.stringify({ error: "Document not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      finalStoragePath = doc.storage_path;
      studentId = doc.student_id;
      universityAccessApproved = !!doc.university_access_approved;
    }

    if (!finalStoragePath) {
      return new Response(
        JSON.stringify({ error: "Storage path not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-document-url] Storage path:", finalStoragePath, "Student ID:", studentId);

    // Check access permissions
    let hasAccess = false;

    // Admins have full access
    if (profile.role === "admin") {
      hasAccess = true;
      console.log("[get-document-url] Access granted: admin role");
    }
    // Partners and school reps can access documents of students who applied to their universities
    // only after an admin approval flag is set on the document
    else if (["partner", "school_rep"].includes(profile.role) && studentId) {
      if (!universityAccessApproved) {
        console.warn("[get-document-url] Partner access denied: no admin approval");
      } else {
      const { data: applications } = await adminClient
        .from("applications")
        .select(`
          id,
          programs!inner (
            university_id,
            universities!inner (
              tenant_id
            )
          )
        `)
        .eq("student_id", studentId);

      if (applications && applications.length > 0) {
        hasAccess = applications.some((app: any) =>
          app.programs?.universities?.tenant_id === profile.tenant_id
        );
      }
      console.log("[get-document-url] Partner access check:", hasAccess);
      }
    }
    // Students can access their own documents
    else if (profile.role === "student" && studentId) {
      const { data: student } = await adminClient
        .from("students")
        .select("id")
        .eq("id", studentId)
        .eq("profile_id", user.id)
        .single();

      hasAccess = !!student;
      console.log("[get-document-url] Student access check:", hasAccess);
    }

    if (!hasAccess) {
      console.warn("[get-document-url] Access denied for user:", user.id);
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL using admin client
    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from("student-documents")
      .createSignedUrl(finalStoragePath, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("[get-document-url] Signed URL error:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate document URL", details: signedUrlError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-document-url] Signed URL generated successfully");

    return new Response(
      JSON.stringify({ signedUrl: signedUrlData.signedUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[get-document-url] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
