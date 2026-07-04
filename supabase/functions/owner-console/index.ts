import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashCode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signIn(email: string, password: string) {
  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error("Ouverture de session impossible");
  }
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const { action, code } = await req.json();

    const { data: row } = await admin
      .from("owner_console")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const initialized = Boolean(row?.access_code_hash);

    if (action === "status") {
      return json({ initialized });
    }

    if (action === "setup") {
      if (initialized) {
        return json({ error: "Un code d'accès existe déjà." }, 400);
      }
      if (!code || typeof code !== "string" || code.length < 6) {
        return json({ error: "Le code doit contenir au moins 6 caractères." }, 400);
      }

      const salt = crypto.randomUUID();
      const access_code_hash = await hashCode(code, salt);
      const email = `owner-console-${crypto.randomUUID().slice(0, 8)}@carswiss.internal`;
      const password = `${crypto.randomUUID()}${crypto.randomUUID()}`;

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr || !created.user) {
        return json({ error: "Création de la console impossible" }, 500);
      }

      await admin.from("staff_members").upsert({ user_id: created.user.id });

      await admin.from("owner_console").upsert({
        id: 1,
        access_code_hash,
        code_salt: salt,
        session_email: email,
        session_password: password,
        updated_at: new Date().toISOString(),
      });

      const session = await signIn(email, password);
      return json({ ok: true, ...session });
    }

    if (action === "login") {
      if (!initialized || !row) {
        return json({ error: "Aucun code d'accès configuré." }, 400);
      }
      if (!code || typeof code !== "string") {
        return json({ error: "Code requis" }, 400);
      }
      const attempt = await hashCode(code, row.code_salt);
      if (attempt !== row.access_code_hash) {
        return json({ error: "Code d'accès incorrect." }, 401);
      }
      const session = await signIn(row.session_email, row.session_password);
      return json({ ok: true, ...session });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message ?? "Erreur serveur" }, 500);
  }
});
