import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(
  SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
        status: 405,
      });
    }

    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants" }),
        { status: 400 }
      );
    }

    // 1️⃣ Vérifier le code OTP (même logique que le client)
    const { data: otp } = await supabase
      .from("email_verification_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!otp) {
      return new Response(
        JSON.stringify({ error: "Code invalide ou expiré" }),
        { status: 401 }
      );
    }

    // 2️⃣ Trouver l'utilisateur Auth par email
    const { data: users, error: listErr } =
      await supabase.auth.admin.listUsers();

    if (listErr) throw listErr;

    const user = users.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Utilisateur introuvable" }),
        { status: 404 }
      );
    }

    // 3️⃣ Confirmer l’email dans Supabase Auth
    const { error: confirmErr } =
      await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });

    if (confirmErr) throw confirmErr;

    // 4️⃣ Créer le profil si absent (sécurité minimale)
    await supabase
      .from("profiles")
      .upsert({ id: user.id }, { onConflict: "id" });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("ACTIVATE ACCOUNT ERROR:", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur interne" }),
      { status: 500 }
    );
  }
});
