import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Invalid token" }, 401);

    const { company_id } = await req.json().catch(() => ({}));
    if (!company_id || typeof company_id !== "string") {
      return json({ error: "company_id is required" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: membership, error: membershipError } = await admin
      .from("company_memberships")
      .select("role, is_active")
      .eq("company_id", company_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) return json({ error: "Could not verify workspace access" }, 500);
    if (!membership?.is_active || membership.role !== "project_lead") {
      return json({ error: "Only an active project manager can delete this workspace" }, 403);
    }

    // Storage objects are external to Postgres, so delete them before the company row.
    while (true) {
      const { data: files, error: listError } = await admin.storage
        .from("project-files")
        .list(company_id, { limit: 100, offset: 0 });
      if (listError) return json({ error: "Could not list workspace files" }, 500);
      if (!files?.length) break;

      const paths = files.map((file) => `${company_id}/${file.name}`);
      const { error: removeError } = await admin.storage.from("project-files").remove(paths);
      if (removeError) return json({ error: "Could not remove workspace files" }, 500);
      if (files.length < 100) break;
    }

    const { error: deleteError } = await admin.from("companies").delete().eq("id", company_id);
    if (deleteError) return json({ error: "Could not delete workspace" }, 500);

    return json({ success: true });
  } catch (_error) {
    return json({ error: "Internal server error" }, 500);
  }
});
