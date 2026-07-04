import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

type OrderItem = { product_id?: string; name: string; qty: number; unit_price: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

// Resolve the signed-in customer (if any) from the bearer token. Anonymous
// checkouts send the anon key, which resolves to no user — that is fine.
async function resolveUserId(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data.user?.id ?? null;
}

async function loadOrCreateOrder(req: Request, body: Record<string, unknown>) {
  // Existing order (e.g. retry an unpaid order).
  if (typeof body.order_id === "string" && body.order_id) {
    const { data } = await supabase
      .from("orders")
      .select("id, items, total, email, payment_status")
      .eq("id", body.order_id)
      .maybeSingle();
    return data;
  }

  const o = (body.order ?? null) as Record<string, unknown> | null;
  if (!o) return null;

  const rawItems = Array.isArray(o.items) ? (o.items as OrderItem[]) : [];
  const items = rawItems
    .filter((it) => it && typeof it.name === "string")
    .map((it) => ({
      product_id: it.product_id ?? null,
      name: String(it.name),
      qty: Math.max(1, Math.trunc(Number(it.qty) || 0)),
      unit_price: Math.max(0, Number(it.unit_price) || 0),
    }));

  if (items.length === 0) return null;
  if (!o.contact_name || !o.email || !o.phone) return null;

  const total = round2(items.reduce((s, it) => s + it.unit_price * it.qty, 0));
  const user_id = await resolveUserId(req);

  const { data, error } = await supabase
    .from("orders")
    .insert([
      {
        company_name: (o.company_name as string) || null,
        contact_name: String(o.contact_name),
        email: String(o.email),
        phone: String(o.phone),
        address: (o.address as string) || null,
        ship_address: (o.ship_address as string) || null,
        ship_zip: (o.ship_zip as string) || null,
        ship_city: (o.ship_city as string) || null,
        ship_province: (o.ship_province as string) || null,
        ship_country: (o.ship_country as string) || "CH",
        items,
        total,
        notes: (o.notes as string) || null,
        payment_status: "unpaid",
        user_id,
      },
    ])
    .select("id, items, total, email, payment_status")
    .single();

  if (error) return null;
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { origin } = body;

    const order = await loadOrCreateOrder(req, body);
    if (!order) {
      return json({ error: "Impossible d'enregistrer la commande." }, 400);
    }
    if (order.payment_status === "paid") {
      return json({ error: "Commande déjà payée" }, 400);
    }

    const items = (order.items as OrderItem[]) ?? [];
    const line_items = items.map((it) => ({
      price_data: {
        currency: "chf",
        product_data: { name: it.name },
        unit_amount: Math.round(Number(it.unit_price) * 100),
      },
      quantity: it.qty,
    }));

    if (line_items.length === 0) {
      return json({ error: "Panier vide" }, 400);
    }

    const base = typeof origin === "string" && origin.startsWith("http")
      ? origin
      : new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "twint"],
      line_items,
      customer_email: order.email ?? undefined,
      client_reference_id: order.id,
      metadata: { order_id: order.id },
      success_url: `${base}?payment=success`,
      cancel_url: `${base}?payment=cancel`,
    });

    await supabase
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return json({ url: session.url });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Erreur serveur" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
