// supabase/functions/send-agent-documents/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type EmailFile = {
  name: string;
  mime: string;
  base64: string;
};

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const {
      email,
      full_name,
      first_name,
      cv,
      company_doc,
    }: {
      email: string;
      full_name: string;
      first_name: string;
      cv: EmailFile;
      company_doc: EmailFile;
    } = await req.json();

    if (!email || !cv || !company_doc) {
      return new Response(
        JSON.stringify({ error: "Données manquantes" }),
        { status: 400 }
      );
    }

    // ================= EMAIL CONTENT =================

    const subject = "📄 Nouvelle demande Agent — RHAZN";
    const html = `
      <div style="font-family:Arial,sans-serif;padding:20px">
        <h2 style="color:#D4AF37">Nouvelle demande d’accréditation Agent</h2>
        <p><b>Nom :</b> ${full_name}</p>
        <p><b>Prénom :</b> ${first_name}</p>
        <p><b>Email :</b> ${email}</p>
        <hr/>
        <p>Les documents sont joints à ce message.</p>
        <p style="color:#777;font-size:12px">RHAZN — Accréditation officielle</p>
      </div>
    `;

    // ================= ATTACHMENTS =================

    const attachments = [
      {
        filename: cv.name,
        content: cv.base64,
        type: cv.mime,
        disposition: "attachment",
      },
      {
        filename: company_doc.name,
        content: company_doc.base64,
        type: company_doc.mime,
        disposition: "attachment",
      },
    ];

    // ================= SEND VIA RESEND =================
    // (recommandé / fiable / production-ready)

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RHAZN Accréditation <no-reply@rhazn.org>",
        to: [Deno.env.get("ADMIN_EMAIL")],
        subject,
        html,
        attachments,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("EMAIL ERROR:", err);
      throw new Error("Échec envoi email");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (e) {
    console.error("FUNCTION ERROR:", e);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500 }
    );
  }
});
