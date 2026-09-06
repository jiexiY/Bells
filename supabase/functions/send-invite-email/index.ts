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

    const { invitation_id } = await req.json().catch(() => ({}));
    if (!invitation_id || typeof invitation_id !== "string") {
      return json({ error: "invitation_id is required" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: invitation, error: invitationError } = await admin
      .from("invitations")
      .select("id, company_id, email, role, invited_by, status, companies(name)")
      .eq("id", invitation_id)
      .single();

    if (invitationError || !invitation || invitation.status !== "pending") {
      return json({ error: "Pending invitation not found" }, 404);
    }
    if (invitation.invited_by !== user.id) {
      return json({ error: "Only the inviter can send this email" }, 403);
    }

    const { data: membership } = await admin
      .from("company_memberships")
      .select("role, is_active")
      .eq("company_id", invitation.company_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership?.is_active || !["project_lead", "team_lead"].includes(membership.role)) {
      return json({ error: "Lead access is required" }, 403);
    }

    return json({ success: true, email_sent: false, warning: "Email delivery is disabled; the invitation is available in Bells" });
  } catch (_error) {
    return json({ error: "Internal server error" }, 500);
  }
});
