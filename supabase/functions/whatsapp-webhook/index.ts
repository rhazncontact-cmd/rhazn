import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // ⚠️ service role
);

serve(async (req) => {
  try {
    const payload = await req.json();

    /**
     * ⚠️ Adapte ce parsing selon ton provider WhatsApp
     * Ici on suppose que le message texte contient le Code ED
     */
    const text =
      payload?.messages?.[0]?.text?.body ||
      payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body ||
      "";

    // 🔎 Extraction du Code ED (ex: RZ-ED-ABC123)
    const match = text.match(/RZ-ED-[A-Z0-9]{6}/);
    if (!match) {
      return new Response(
        JSON.stringify({ ok: false, reason: "CODE_NOT_FOUND" }),
        { status: 200 }
      );
    }

    const edCode = match[0];

    // 1️⃣ Récupérer la demande
    const { data: app, error: appErr } = await supabase
      .from("agent_applications")
      .select("id,user_uid,status")
      .eq("ed_code", edCode)
      .single();

    if (appErr || !app) {
      return new Response(
        JSON.stringify({ ok: false, reason: "APPLICATION_NOT_FOUND" }),
        { status: 200 }
      );
    }

    // Évite les doublons
    if (app.status !== "AWAITING_PAYMENT_PROOF") {
      return new Response(
        JSON.stringify({ ok: true, info: "ALREADY_PROCESSED" }),
        { status: 200 }
      );
    }

    // 2️⃣ Mettre à jour le statut
    await supabase
      .from("agent_applications")
      .update({
        status: "PAYMENT_RECEIVED",
        payment_received_at: new Date().toISOString(),
        payment_channel: "WHATSAPP",
      })
      .eq("id", app.id);

    // 3️⃣ Notification utilisateur (intelligente)
    await supabase.from("notifications").insert({
      user_uid: app.user_uid,
      title: "Paiement reçu",
      body:
        "Nous avons bien reçu votre preuve de paiement. Votre dossier est transmis à CADNA pour analyse.",
      type: "SYSTEM",
    });

    // 4️⃣ Notification CADNA
    await supabase.from("admin_notifications").insert({
      target_role: "CADNA",
      title: "Preuve de paiement reçue",
      message: `Paiement reçu pour la demande ${edCode}. Dossier prêt pour analyse.`,
      reference_id: app.id,
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500 }
    );
  }
});
