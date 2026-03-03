// ============================================================
// RHAZN — UNIVERSAL TRANSACTION EMAIL ENGINE
// One function • all events • fintech grade
// ============================================================

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const FROM = Deno.env.get("EMAIL_FROM") || "RHAZN <contact@rhazn.org>";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await req.json();

    const {
      type,       // 🔥 IMPORTANT (event type)
      email,
      data
    } = body;

    if (!email || !type) {
      return new Response("Missing fields", { status: 400 });
    }

    const date = new Date().toLocaleString();

    // ======================================================
    // 🎯 TEMPLATE SWITCH (Apple-style)
    // ======================================================

    let subject = "";
    let content = "";

    switch (type) {

      case "WITHDRAW_APPROVED":
        subject = `RHAZN • Reçu retrait (${data.receipt_code})`;
        content = `
          <p><b>Montant cash :</b> ${data.amount} TAN</p>
          <p><b>Total débité :</b> ${data.total_debited} TAN</p>
          <p><b>Agent :</b> ${data.agent_code}</p>
        `;
        break;

      case "TAN_PURCHASE":
        subject = `RHAZN • Achat TAN confirmé`;
        content = `
          <p><b>TAN achetés :</b> ${data.amount}</p>
          <p><b>Référence :</b> ${data.reference}</p>
        `;
        break;

      case "TRANSFER":
        subject = `RHAZN • Transfert TAN`;
        content = `
          <p><b>Montant :</b> ${data.amount} TAN</p>
          <p><b>Destinataire :</b> ${data.to}</p>
        `;
        break;

      case "SUPREME_ADJUST":
        subject = `RHAZN • Ajustement compte`;
        content = `
          <p><b>Variation :</b> ${data.amount} TAN</p>
          <p><b>Motif :</b> ${data.reason}</p>
        `;
        break;

      case "ACCOUNT_STATUS":
        subject = `RHAZN • Statut du compte modifié`;
        content = `<p>${data.message}</p>`;
        break;

      case "NOMINATION":
        subject = `RHAZN • Nouvelle nomination`;
        content = `<p>${data.role} • ${data.status}</p>`;
        break;

      default:
        subject = `RHAZN Notification`;
        content = `<p>Nouvelle activité sur votre compte.</p>`;
    }

    // ======================================================
    // 🎨 PREMIUM HTML (Apple minimal)
    // ======================================================

    const html = `
      <div style="font-family:-apple-system,Segoe UI;background:#000;color:#fff;padding:40px;max-width:560px;margin:auto">
        <h2 style="color:#D4AF37">RHAZN</h2>
        <div style="background:#111;padding:18px;border-radius:14px;margin-top:20px">
          ${content}
          <p style="margin-top:12px;opacity:.7"><b>Date :</b> ${date}</p>
        </div>
        <p style="opacity:.5;font-size:12px;margin-top:24px">
          © RHAZN — Credit Online Balance (COB)
        </p>
      </div>
    `;

    await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
});
