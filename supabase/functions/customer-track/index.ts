import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Ask the supplier function to refresh tracking for one order (internal call).
async function syncViaSupplier(orderId: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/supplier`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": SERVICE_ROLE,
      },
      body: JSON.stringify({ action: "sync-order", order_id: orderId }),
    });
  } catch (_e) {
    // Non-blocking: a failed sync just means tracking is not available yet.
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Non autorisé" }, 401);

    const { data: userData } = await admin.auth.getUser(token);
    const user = userData.user;
    if (!user) return json({ error: "Non autorisé" }, 401);

    const email = (user.email ?? "").toLowerCase();

    // Orders that belong to this customer and are awaiting tracking.
    const { data: orders } = await admin
      .from("orders")
      .select("id, user_id, email, supplier_order_id, tracking_number, status")
      .or(`user_id.eq.${user.id},email.ilike.${email}`)
      .not("supplier_order_id", "is", null)
      .is("tracking_number", null)
      .limit(25);

    const pending = (orders ?? []).filter(
      (o) => o.status !== "cancelled" && o.status !== "delivered",
    );

    for (const o of pending) {
      await syncViaSupplier(o.id);
    }

    return json({ ok: true, checked: pending.length });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Erreur serveur" }, 500);
  }
});
