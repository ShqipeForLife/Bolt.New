import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return json({ error: "Email requis" }, 400);
    }

    // Uses the service role so customers can look up ONLY their own orders by email,
    // without exposing the whole orders table to the public anon key.
    const { data, error } = await admin
      .from("orders")
      .select(
        "id, contact_name, items, total, status, payment_status, fulfillment_status, tracking_number, tracking_url, carrier, created_at",
      )
      .ilike("email", email.trim())
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return json({ error: "Recherche impossible" }, 500);
    return json({ orders: data ?? [] });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Erreur serveur" }, 500);
  }
});
