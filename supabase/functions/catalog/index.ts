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

// Retail = supplier cost x this factor. Wholesale (bulk) = cost x the second.
// The owner can freely adjust each product's price afterwards in the dashboard.
const RETAIL_MARKUP = 2.2;
const WHOLESALE_MARKUP = 1.6;
const DEFAULT_STOCK = 50;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Reuse all the CJ logic that already lives in the `supplier` function via an
// internal server-to-server call (never exposes the service role to the client).
async function callSupplier(payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/supplier`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": SERVICE_ROLE,
    },
    body: JSON.stringify(payload),
  });
  return res.json().catch(() => null);
}

const PRODUCT_COLUMNS =
  "id, name, description, price, wholesale_price, wholesale_min_qty, image_url, category, stock, featured";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const { action, keyword, page, pid } = await req.json();

    if (action === "search") {
      const kw = String(keyword ?? "").trim();
      if (!kw) return json({ ok: true, products: [] });
      const result = await callSupplier({
        action: "search-products",
        keyword: kw,
        page: Number(page) || 1,
      });
      if (!result?.ok) {
        return json({ error: result?.error ?? "Recherche fournisseur indisponible" }, 502);
      }
      const products = (result.products ?? []).map((p: Record<string, unknown>) => ({
        pid: p.pid,
        name: p.name,
        image: p.image,
        category: p.category,
        // Show the customer-facing retail price, never the raw supplier cost.
        price: round2(Number(p.price ?? 0) * RETAIL_MARKUP),
      }));
      return json({ ok: true, products });
    }

    if (action === "import") {
      const id = String(pid ?? "");
      if (!id) return json({ error: "Produit invalide" }, 400);

      const result = await callSupplier({ action: "import-product", pid: id });
      if (!result?.ok) {
        return json({ error: result?.error ?? "Import du produit impossible" }, 502);
      }

      const { data: product } = await admin
        .from("products")
        .select(`${PRODUCT_COLUMNS}, cost`)
        .eq("supplier_pid", id)
        .maybeSingle();

      if (!product) return json({ error: "Produit introuvable après import" }, 500);

      // Freshly imported products come in at cost with no stock. Apply a retail
      // markup and make them orderable so the customer can buy immediately.
      const needsPricing = !result.already && Number(product.price) <= Number(product.cost);
      if (needsPricing) {
        const cost = Number(product.cost) || 0;
        const price = round2(cost * RETAIL_MARKUP);
        const wholesale_price = round2(cost * WHOLESALE_MARKUP);
        const { data: updated } = await admin
          .from("products")
          .update({
            price,
            wholesale_price,
            stock: DEFAULT_STOCK,
          })
          .eq("id", product.id)
          .select(PRODUCT_COLUMNS)
          .maybeSingle();
        return json({ ok: true, product: updated ?? product });
      }

      // Existing product: return as-is (owner-managed pricing/stock).
      const { cost: _cost, ...rest } = product as Record<string, unknown>;
      return json({ ok: true, product: rest });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message ?? "Erreur serveur" }, 500);
  }
});
