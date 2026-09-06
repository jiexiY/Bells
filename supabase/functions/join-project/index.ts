import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return reply({ error: "Not authenticated" }, 401);
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return reply({ error: "Invalid session" }, 401);
  try {
    const body = await req.json();
    if (typeof body.invite_code !== "string") return reply({ error: "Workplace code is required" }, 400);
    const { data, error } = await client.rpc("join_workplace", { _invite_code: body.invite_code });
    if (error) return reply({ error: error.message }, 400);
    return reply({ success: true, ...(data || {}) });
  } catch { return reply({ error: "Invalid request" }, 400); }
});
