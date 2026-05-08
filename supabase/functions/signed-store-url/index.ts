// supabase/functions/signed-store-url/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  product_id: string;
  kind: "preview" | "full" | "text";
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // 1) Auth user JWT from client
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing Bearer token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.product_id || !body?.kind) {
      return new Response(JSON.stringify({ error: "Missing product_id/kind" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2) Admin client (service role) to sign URLs, but we still enforce user access via RPC.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 3) Call RPC as the user (RLS context) to check allowed + get path
    const asUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data: access, error: accessErr } = await asUser.rpc(
      "get_store_storage_path",
      { p_product_id: body.product_id, p_kind: body.kind }
    );

    if (accessErr) {
      return new Response(JSON.stringify({ error: accessErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!access?.allowed || !access?.bucket || !access?.path) {
      return new Response(JSON.stringify({ allowed: false }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4) Sign URL (short TTL)
    const expiresIn = body.kind === "preview" ? 60 : 300; // preview 1 min, full/text 5 min

    const { data: signed, error: signErr } = await admin.storage
      .from(access.bucket)
      .createSignedUrl(access.path, expiresIn);

    if (signErr || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: signErr?.message || "Sign failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        signed_url: signed.signedUrl,
        expires_in: expiresIn,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
