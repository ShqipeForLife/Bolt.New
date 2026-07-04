import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Internal-Secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CJ_EMAIL = Deno.env.get("CJ_EMAIL") ?? Deno.env.get("Email") ?? "";
const CJ_API_KEY = Deno.env.get("CJ_API_KEY") ?? Deno.env.get("API") ?? "";
const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const cjConfigured = () => Boolean(CJ_EMAIL && CJ_API_KEY);

// --- CJ authentication with DB-cached token (CJ rate-limits token endpoint) ---
async function getCjToken(): Promise<string> {
  const { data: cached } = await admin
    .from("supplier_auth")
    .select("access_token, expires_at")
    .eq("provider", "cj")
    .maybeSingle();

  if (
    cached?.access_token &&
    cached.expires_at &&
    new Date(cached.expires_at).getTime() - Date.now() > 60_000
  ) {
    return cached.access_token;
  }

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CJ_EMAIL, apiKey: CJ_API_KEY }),
  });
  const body = await res.json().catch(() => null);
  const token = body?.data?.accessToken as string | undefined;
  if (!token) {
    throw new Error(body?.message ?? "Authentification fournisseur (CJ) échouée");
  }
  const expiry = body?.data?.accessTokenExpiryDate
    ? new Date(body.data.accessTokenExpiryDate).toISOString()
    : new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

  await admin.from("supplier_auth").upsert({
    provider: "cj",
    access_token: token,
    expires_at: expiry,
    updated_at: new Date().toISOString(),
  });
  return token;
}

async function cjFetch(path: string, init: RequestInit = {}) {
  const token = await getCjToken();
  const res = await fetch(`${CJ_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
      ...(init.headers ?? {}),
    },
  });
  return res.json().catch(() => null);
}

type OrderItem = { product_id: string; name: string; qty: number; unit_price: number };

// --- Place an order at CJ for a paid order in our DB ---
async function fulfillOrder(orderId: string) {
  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return json({ error: "Commande introuvable" }, 404);
  if (order.payment_status !== "paid") {
    return json({ error: "Commande non payée" }, 400);
  }
  if (order.supplier_order_id) {
    return json({ ok: true, already: true, supplier_order_id: order.supplier_order_id });
  }

  const items = (order.items as OrderItem[]) ?? [];
  const productIds = items.map((i) => i.product_id).filter(Boolean);
  const { data: products } = await admin
    .from("products")
    .select("id, supplier_vid")
    .in("id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"]);

  const vidMap = new Map((products ?? []).map((p) => [p.id, p.supplier_vid]));
  const cjProducts = items
    .map((i) => ({ vid: vidMap.get(i.product_id) as string | undefined, quantity: i.qty }))
    .filter((p) => Boolean(p.vid));

  // If CJ is not configured OR no products are mapped, flag for manual handling.
  if (!cjConfigured() || cjProducts.length === 0) {
    await admin
      .from("orders")
      .update({
        fulfillment_status: "manual",
        supplier_error: !cjConfigured()
          ? "Fournisseur CJ non configuré (clé API manquante)"
          : "Aucun produit mappé au fournisseur",
      })
      .eq("id", orderId);
    return json({ ok: true, manual: true });
  }

  try {
    const payload = {
      orderNumber: order.id,
      shippingCountryCode: order.ship_country || "CH",
      shippingProvince: order.ship_province || "",
      shippingCity: order.ship_city || "",
      shippingAddress: order.ship_address || order.address || "",
      shippingCustomerName: order.contact_name,
      shippingZip: order.ship_zip || "",
      shippingPhone: order.phone,
      remark: order.notes || "",
      email: order.email,
      products: cjProducts,
    };
    const result = await cjFetch("/shopping/order/createOrderV2", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const supplierOrderId =
      result?.data?.orderId ?? result?.data?.orderNum ?? result?.data?.id;
    if (!supplierOrderId) {
      throw new Error(result?.message ?? "Création de commande fournisseur refusée");
    }

    await admin
      .from("orders")
      .update({
        supplier_order_id: String(supplierOrderId),
        fulfillment_status: "processing",
        supplier_error: null,
        fulfilled_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return json({ ok: true, supplier_order_id: String(supplierOrderId) });
  } catch (e) {
    await admin
      .from("orders")
      .update({ fulfillment_status: "failed", supplier_error: (e as Error).message })
      .eq("id", orderId);
    return json({ error: (e as Error).message }, 502);
  }
}

// --- Pull latest tracking info from CJ for one order ---
async function syncOrderTracking(orderId: string) {
  const { data: order } = await admin
    .from("orders")
    .select("id, supplier_order_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.supplier_order_id) {
    return json({ error: "Aucune commande fournisseur associée" }, 400);
  }
  if (!cjConfigured()) return json({ error: "Fournisseur CJ non configuré" }, 400);

  try {
    const detail = await cjFetch(
      `/shopping/order/getOrderDetail?orderId=${encodeURIComponent(order.supplier_order_id)}`,
    );
    const d = detail?.data ?? {};
    const trackNumber = d.trackNumber ?? d.trackingNumber ?? null;
    const carrier = d.logisticName ?? d.carrier ?? null;
    const shipped = Boolean(trackNumber);

    await admin
      .from("orders")
      .update({
        tracking_number: trackNumber,
        carrier,
        tracking_url: trackNumber
          ? `https://t.17track.net/en#nums=${encodeURIComponent(trackNumber)}`
          : null,
        fulfillment_status: shipped ? "fulfilled" : "processing",
        status: shipped ? "shipped" : undefined,
      })
      .eq("id", orderId);

    return json({ ok: true, tracking_number: trackNumber, carrier });
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}

// --- Refresh stock for all mapped products from CJ ---
async function syncStock() {
  if (!cjConfigured()) return json({ error: "Fournisseur CJ non configuré" }, 400);

  const { data: products } = await admin
    .from("products")
    .select("id, supplier_vid")
    .not("supplier_vid", "is", null);

  let updated = 0;
  const now = new Date().toISOString();
  for (const p of products ?? []) {
    if (!p.supplier_vid) continue;
    try {
      const res = await cjFetch(
        `/product/stock/queryByVid?vid=${encodeURIComponent(p.supplier_vid)}`,
      );
      const list = res?.data;
      let qty = 0;
      if (Array.isArray(list)) {
        qty = list.reduce(
          (s: number, row: Record<string, unknown>) =>
            s + Number(row.storageNum ?? row.stockNum ?? row.quantity ?? 0),
          0,
        );
      } else if (list) {
        qty = Number(list.storageNum ?? list.stockNum ?? list.quantity ?? 0);
      }
      await admin
        .from("products")
        .update({ stock: qty, last_stock_sync: now })
        .eq("id", p.id);
      updated += 1;
    } catch (_e) {
      // Skip a single failing product; continue syncing the rest.
    }
  }
  return json({ ok: true, updated });
}

// --- Parse a CJ price which may be a number, "10.00", or a "10.00-12.00" range ---
function parseCjPrice(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const first = raw.split(/[-~]/)[0].trim();
    const n = Number(first.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

// --- Search the CJ catalogue by keyword ---
async function searchProducts(keyword: string, page: number) {
  if (!cjConfigured()) return json({ error: "Fournisseur CJ non configuré" }, 400);
  const res = await cjFetch(
    `/product/list?pageNum=${page}&pageSize=20&productNameEn=${encodeURIComponent(keyword)}`,
  );
  if (res?.result === false || (res?.code && res.code !== 200)) {
    return json({ error: res?.message ?? "Recherche CJ échouée" }, 502);
  }
  const list: Record<string, unknown>[] = res?.data?.list ?? [];
  const products = list.map((p) => ({
    pid: p.pid,
    name: p.productNameEn ?? p.productName ?? "Produit CJ",
    image: p.productImage ?? "",
    sku: p.productSku ?? "",
    price: parseCjPrice(p.sellPrice),
    category: p.categoryName ?? "",
  }));
  return json({ ok: true, products, total: res?.data?.total ?? products.length });
}

// --- Import a CJ product (with a real variant id) into our catalogue ---
async function importProduct(pid: string) {
  if (!cjConfigured()) return json({ error: "Fournisseur CJ non configuré" }, 400);
  if (!pid) return json({ error: "pid manquant" }, 400);

  const { data: existing } = await admin
    .from("products")
    .select("id")
    .eq("supplier_pid", pid)
    .maybeSingle();
  if (existing) return json({ ok: true, already: true });

  const detail = await cjFetch(`/product/query?pid=${encodeURIComponent(pid)}`);
  const d = detail?.data as Record<string, unknown> | undefined;
  if (!d) return json({ error: detail?.message ?? "Produit CJ introuvable" }, 404);

  const variants = (d.variants as Record<string, unknown>[]) ?? [];
  const v = variants[0];
  const cost = parseCjPrice(v?.variantSellPrice ?? d.sellPrice);
  const payload = {
    name: (d.productNameEn as string) ?? "Produit CJ",
    description: "",
    image_url: (d.productImage as string) ?? (v?.variantImage as string) ?? "",
    category: (d.categoryName as string) ?? "CarPlay",
    price: cost,
    cost,
    stock: 0,
    featured: false,
    supplier: "cj",
    supplier_pid: pid,
    supplier_vid: (v?.vid as string) ?? null,
    supplier_sku: (v?.variantSku as string) ?? (d.productSku as string) ?? null,
  };
  const { error } = await admin.from("products").insert([payload]);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, name: payload.name, variants: variants.length });
}

async function isAuthorized(req: Request): Promise<boolean> {
  // Internal server-to-server calls (from the Stripe webhook) use the service role key.
  const internal = req.headers.get("x-internal-secret");
  if (internal && internal === SERVICE_ROLE) return true;

  // Otherwise require a signed-in user that belongs to the staff.
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!auth) return false;
  const { data } = await admin.auth.getUser(auth);
  if (!data.user) return false;
  const { data: staff } = await admin
    .from("staff_members")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  return Boolean(staff);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const authorized = await isAuthorized(req);
    if (!authorized) return json({ error: "Non autorisé" }, 401);

    const { action, order_id, keyword, page, pid } = await req.json();

    switch (action) {
      case "status":
        return json({ configured: cjConfigured(), provider: "cj" });
      case "test-auth": {
        if (!cjConfigured()) {
          return json({ ok: false, error: "Identifiants CJ manquants (Email / API)" }, 400);
        }
        try {
          await getCjToken();
          return json({ ok: true, message: "Connexion CJ réussie" });
        } catch (e) {
          return json({ ok: false, error: (e as Error).message }, 502);
        }
      }
      case "fulfill":
        if (!order_id) return json({ error: "order_id manquant" }, 400);
        return await fulfillOrder(order_id);
      case "sync-order":
        if (!order_id) return json({ error: "order_id manquant" }, 400);
        return await syncOrderTracking(order_id);
      case "sync-stock":
        return await syncStock();
      case "search-products":
        return await searchProducts(String(keyword ?? "").trim(), Number(page) || 1);
      case "import-product":
        return await importProduct(String(pid ?? ""));
      default:
        return json({ error: "Action inconnue" }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message ?? "Erreur serveur" }, 500);
  }
});
