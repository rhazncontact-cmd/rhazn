import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { email, title, message, amount, type } = await req.json()

    // ⚡️ VERSION SIMPLE SMTP/RESEND
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY")

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RHAZN <no-reply@rhazn.com>",
        to: email,
        subject: title,
        html: `
          <h2>${title}</h2>
          <p>${message}</p>
          ${amount ? `<b>Montant: ${amount} TAN</b>` : ""}
          <br/><br/>
          — RHAZN System
        `
      }),
    })

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
