import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function triggerFulfillment(orderId: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/supplier`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": SERVICE_ROLE,
      },
      body: JSON.stringify({ action: "fulfill", order_id: orderId }),
    });
  } catch (_e) {
    // Fulfillment can be retried from the admin dashboard if this fails.
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Signature manquante", { status: 400, headers: corsHeaders });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (e) {
    return new Response(`Signature invalide: ${(e as Error).message}`, {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id ?? session.client_reference_id;
    if (orderId && session.payment_status === "paid") {
      const method = session.payment_method_types?.[0] === "twint" ? "twint" : "card";
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "confirmed",
          payment_method: method,
        })
        .eq("id", orderId);

      // Automatically forward the paid order to the dropshipping supplier.
      await triggerFulfillment(orderId);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
