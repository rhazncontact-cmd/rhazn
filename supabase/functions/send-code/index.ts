import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/* ================= CONFIG ================= */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const FROM_EMAIL = "RHAZN <no-reply@rhazn.org>";
const APP_NAME = "RHAZN";
const OTP_EXPIRATION_MINUTES = 1;

const LOGO_URL =
  "https://mxxlchaygarszkygmylo.supabase.co/storage/v1/object/public/rhazn-logo/logo-rhazn.png";

/* ================= CORS ================= */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ================= CLIENT ================= */

const supabase = createClient(
  SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!
);

/* ================= FUNCTION ================= */

serve(async (req) => {
  try {
    /* -------- CORS PRE-FLIGHT -------- */
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Méthode non autorisée" }),
        { status: 405, headers: corsHeaders }
      );
    }

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Variables d’environnement manquantes" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Email invalide" }),
        { status: 400, headers: corsHeaders }
      );
    }

    /* -------- OTP -------- */
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(
      Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000
    ).toISOString();

    const { error: insertError } = await supabase
      .from("email_verification_codes")
      .insert({
        email,
        code,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("DB INSERT ERROR:", insertError);
      return new Response(
        JSON.stringify({ error: "Erreur base de données" }),
        { status: 500, headers: corsHeaders }
      );
    }

    /* -------- EMAIL HTML -------- */
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
</head>
<body style="margin:0;padding:0;background:#000;font-family:Arial">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:22px;overflow:hidden">
    <div style="background:#000;padding:36px;text-align:center">
      <img src="${LOGO_URL}" style="width:120px" />
    </div>

    <div style="padding:36px;text-align:center">
      <h2>Vérification de sécurité</h2>
      <p>Compte : <strong style="color:#8B0000">${email}</strong></p>
      <div style="font-size:42px;letter-spacing:12px;color:#8B0000;margin:28px 0">
        ${code}
      </div>
      <p>⏳ Expire dans ${OTP_EXPIRATION_MINUTES} minute</p>
    </div>

    <div style="background:#f4f4f4;padding:18px;text-align:center;font-size:12px">
      © ${new Date().getFullYear()} ${APP_NAME}
    </div>
  </div>
</body>
</html>
`;

    /* -------- SEND EMAIL -------- */
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `Code de vérification sécurisé ${APP_NAME}`,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("RESEND ERROR:", data);
      return new Response(
        JSON.stringify({ error: "Échec envoi email" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("SEND-CODE ERROR:", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur interne" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
