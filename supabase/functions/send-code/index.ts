import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const FROM_EMAIL = "RHAZN <no-reply@rhazn.org>";
const APP_NAME = "RHAZN";

// ⏱ Expiration niveau bancaire : 1 minute
const OTP_EXPIRATION_MINUTES = 1;

const LOGO_URL =
  "https://mxxlchaygarszkygmylo.supabase.co/storage/v1/object/public/rhazn-logo/logo-rhazn.png";

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
        status: 405,
      });
    }

    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Email invalide" }), {
        status: 400,
      });
    }

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Variables d’environnement manquantes" }),
        { status: 500 }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(
      Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000
    ).toISOString();

    // ✅ Enregistrement OTP
    await supabase.from("email_otps").insert({
      email,
      code,
      expires_at: expiresAt,
    });

    // ===============================
    // ✅ HTML EMAIL — VERSION FINALE
    // ===============================
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<style>
@keyframes pulse {
  0% { transform: scale(1); opacity: .75; }
  50% { transform: scale(1.06); opacity: 1; }
  100% { transform: scale(1); opacity: .75; }
}

@keyframes countdown {
  from { width: 100%; background:#000; }
  80%  { background:#000; }
  81%  { background:#8B0000; }
  to   { width: 0%; background:#8B0000; }
}

@keyframes warn {
  0%,100% { opacity:.35; }
  50% { opacity:1; }
}

.logo-pulse {
  animation: pulse 2.2s infinite ease-in-out;
}

.bar {
  height:6px;
  border-radius:999px;
  animation: countdown 60s linear forwards;
}

.warn {
  animation: warn 1.4s infinite ease-in-out;
  color:#8B0000;
  font-weight:700;
}
</style>
</head>

<body style="margin:0;padding:0;background:#000000;
font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">

  <div style="
    max-width:600px;
    margin:auto;
    background:#ffffff;
    border-radius:26px;
    overflow:hidden;
    box-shadow:0 30px 80px rgba(0,0,0,0.45);
  ">

    <!-- HEADER NOIR + LOGO -->
    <div style="background:#000000;padding:42px;text-align:center;">
      <img src="${LOGO_URL}" class="logo-pulse"
        style="width:120px;margin-bottom:18px;" alt="RHAZN" />
      <div style="color:#ffffff;font-size:12px;
      letter-spacing:4px;opacity:0.85;">
        SÉCURITÉ • ÉLÉGANCE • PERFORMANCE
      </div>
    </div>

    <!-- CONTENU -->
    <div style="padding:48px 36px;text-align:center;">
      <div style="font-size:26px;font-weight:600;color:#000000;margin-bottom:10px;">
        Vérification de sécurité
      </div>

      <div style="font-size:14px;color:#777;margin-bottom:4px;">
        Compte associé à :
      </div>

      <!-- ✅ EMAIL EN CRIMSON FORCÉ -->
      <div style="font-size:15px;font-weight:700;margin-bottom:22px;">
        <span style="color:#8B0000 !important;">${email}</span>
      </div>

      <div style="font-size:15px;color:#555;margin-bottom:28px;">
        Utilisez ce code à usage unique pour confirmer que vous êtes bien
        le propriétaire de ce compte.
      </div>

      <!-- ✅ CODE OTP CRIMSON -->
      <div style="
        font-size:42px;
        font-weight:600;
        letter-spacing:14px;
        color:#8B0000;
        margin:30px 0;
      ">
        ${code}
      </div>

      <!-- ✅ CARTE EXPIRATION NOIRE TEXTE BLANC -->
      <div style="
        display:inline-block;
        background:#000000;
        padding:16px 30px;
        border-radius:40px;
        font-size:14px;
        color:#ffffff;
        font-weight:600;
        border:1px solid #000000;
        box-shadow:0 6px 20px rgba(0,0,0,0.25);
        margin-bottom:8px;
      ">
        ⏳ Ce code expire dans ${OTP_EXPIRATION_MINUTES} minute
      </div>

      <!-- BARRE DE DÉCOMPTE -->
      <div style="
        width:100%;
        background:#eeeeee;
        border-radius:999px;
        overflow:hidden;
        margin:18px auto 6px;
      ">
        <div class="bar"></div>
      </div>

      <!-- ✅ INSTRUCTION SANS LIEN -->
      <div style="margin-top:24px;margin-bottom:22px;
        font-size:13px;color:#333;font-weight:600;">
        👉 Ouvrez directement l’application RHAZN  
        et saisissez le code manuellement.
      </div>

      <!-- ✅ BLOC SÉCURITÉ -->
      <div style="
        text-align:left;
        margin-top:24px;
        padding:18px 16px;
        background:#f9f9f9;
        border-radius:14px;
        border:1px solid #e5e5e5;
        font-size:12px;
        color:#555;
        line-height:1.7;
      ">
        <strong style="display:block;margin-bottom:6px;">
          Conseils de sécurité RHAZN :
        </strong>
        • Ne partagez jamais ce code.<br/>
        • RHAZN ne demande jamais ce code par téléphone ou réseaux sociaux.<br/>
        • Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background:#f4f4f4;padding:24px 28px;text-align:center;">
      <div style="font-size:11px;color:#999;line-height:1.6;">
        E-mail automatique envoyé par ${APP_NAME}. Merci de ne pas y répondre.<br/>
        © ${new Date().getFullYear()} ${APP_NAME}. Tous droits réservés.
      </div>
    </div>

  </div>
</body>
</html>
`;

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
        JSON.stringify({ error: "Échec envoi email", details: data }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("SEND CODE ERROR:", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur interne" }),
      { status: 500 }
    );
  }
});
