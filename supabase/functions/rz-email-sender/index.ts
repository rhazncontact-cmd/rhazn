// ══════════════════════════════════════════════════════════════
// RHAZN — Edge Function : rz-email-sender
// Chemin : supabase/functions/rz-email-sender/index.ts
//
// DÉPLOIEMENT :
//   supabase functions deploy rz-email-sender
//
// SECRETS À CONFIGURER :
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
//   supabase secrets set RESEND_FROM=RHAZN <noreply@votredomaine.com>
//
// CRON (envoyer toutes les 2 minutes) :
//   Dans Supabase → Database → Extensions → pg_cron
//   SELECT cron.schedule('send-emails', '*/2 * * * *',
//     $$SELECT net.http_post(
//       url := 'https://mxxlchaygarszkygmylo.supabase.co/functions/v1/rz-email-sender',
//       headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}',
//       body := '{}'
//     )$$
//   );
// ══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL     = Deno.env.get("RESEND_FROM") ?? "RHAZN <noreply@rhazn.com>";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Format nombre ──────────────────────────────────────────────
const fmt = (n: number) => Number(n).toLocaleString("fr-FR");

// ══════════════════════════════════════════════════════════════
// TEMPLATES HTML PREMIUM
// ══════════════════════════════════════════════════════════════

const BASE = (content: string) => `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RHAZN</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#111111;border-radius:20px;overflow:hidden;border:1px solid rgba(212,175,55,0.20);">
      
      <!-- HEADER -->
      <tr><td style="background:linear-gradient(135deg,#0D0D0D 0%,#1A1500 100%);padding:32px 32px 24px;text-align:center;border-bottom:1px solid rgba(212,175,55,0.15);">
        <div style="display:inline-block;background:rgba(212,175,55,0.10);border:1.5px solid rgba(212,175,55,0.30);border-radius:14px;padding:10px 20px;">
          <span style="color:#D4AF37;font-size:18px;font-weight:900;letter-spacing:4px;">RHAZN</span>
        </div>
      </td></tr>

      <!-- CONTENT -->
      <tr><td style="padding:32px;">
        ${content}
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="padding:20px 32px 28px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
        <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;line-height:18px;">
          RHAZN · L'Écosystème du Talent et du Mérite<br>
          Vous recevez cet email car vous êtes membre RHAZN.<br>
          <span style="color:rgba(212,175,55,0.50);">rhazn.com</span>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

// ── Templates individuels ──────────────────────────────────────

const TEMPLATES: Record<string, (p: Record<string, any>) => string> = {

  // 0. BIENVENUE
  welcome: (p) => BASE(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:16px;">🎉</div>
      <h1 style="color:#D4AF37;font-size:26px;font-weight:900;margin:0 0 8px;">Bienvenue sur RHAZN !</h1>
      <p style="color:rgba(255,255,255,0.60);font-size:14px;margin:0;">L'Écosystème du Talent et du Mérite</p>
    </div>
    <div style="background:rgba(212,175,55,0.07);border:1px solid rgba(212,175,55,0.20);border-radius:14px;padding:20px;margin-bottom:24px;">
      <p style="color:#FFFFFF;font-size:15px;line-height:24px;margin:0;">
        Bonjour <strong style="color:#D4AF37;">${p.name}</strong>,<br><br>
        Votre compte RHAZN est officiellement activé. Vous faites maintenant partie d'une communauté d'exception fondée sur les <strong>valeurs morales, la discipline et le mérite</strong>.
      </p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${["Explorez le Channel RHAZN", "Complétez votre profil", "Activez votre Wallet TAN"].map(t => `
      <tr><td style="padding:8px 0;">
        <div style="background:#1A1A1A;border-radius:10px;padding:12px 16px;display:flex;align-items:center;">
          <span style="color:#D4AF37;margin-right:10px;">✦</span>
          <span style="color:rgba(255,255,255,0.80);font-size:13px;font-weight:600;">${t}</span>
        </div>
      </td></tr>`).join("")}
    </table>
    <div style="text-align:center;">
      <p style="color:rgba(255,255,255,0.35);font-size:12px;font-style:italic;margin:0;">
        « Le talent sans discipline reste du potentiel. »
      </p>
    </div>`),

  // 1. MILESTONE WALLET
  wallet_milestone: (p) => BASE(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:52px;margin-bottom:16px;">🏆</div>
      <h1 style="color:#D4AF37;font-size:24px;font-weight:900;margin:0 0 8px;">Milestone atteint !</h1>
      <p style="color:rgba(255,255,255,0.55);font-size:13px;margin:0;">Félicitations ${p.name}</p>
    </div>
    <div style="background:linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.05));border:1px solid rgba(212,175,55,0.35);border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.50);font-size:12px;font-weight:700;letter-spacing:2px;margin:0 0 8px;">MILESTONE ATTEINT</p>
      <p style="color:#D4AF37;font-size:40px;font-weight:900;margin:0 0 4px;">${fmt(p.milestone)} TAN</p>
      <p style="color:rgba(255,255,255,0.40);font-size:12px;margin:0;">Solde actuel : ${fmt(p.balance)} TAN</p>
    </div>
    <p style="color:rgba(255,255,255,0.70);font-size:14px;line-height:22px;text-align:center;">
      Votre wallet RHAZN vient de franchir le cap des <strong style="color:#D4AF37;">${fmt(p.milestone)} TAN</strong>.<br>
      C'est le résultat de votre engagement et de votre discipline.
    </p>`),

  // 2. PIN MODIFIÉ
  pin_changed: (p) => BASE(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:44px;margin-bottom:16px;">🔐</div>
      <h1 style="color:#FFFFFF;font-size:22px;font-weight:900;margin:0 0 8px;">PIN modifié</h1>
    </div>
    <div style="background:rgba(255,59,48,0.08);border:1px solid rgba(255,59,48,0.25);border-radius:14px;padding:20px;margin-bottom:20px;">
      <p style="color:#FF3B30;font-size:13px;font-weight:700;margin:0 0 8px;">⚠ Action de sécurité</p>
      <p style="color:rgba(255,255,255,0.75);font-size:14px;line-height:22px;margin:0;">
        Bonjour <strong>${p.name}</strong>, votre PIN RHAZN a été modifié avec succès.<br><br>
        Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement le support RHAZN.
      </p>
    </div>
    <div style="background:#1A1A1A;border-radius:12px;padding:16px;text-align:center;">
      <p style="color:rgba(255,255,255,0.40);font-size:12px;margin:0;">
        Date de modification : <strong style="color:rgba(255,255,255,0.70);">${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>
      </p>
    </div>`),

  // 3. PROFIL MIS À JOUR
  profile_updated: (p) => BASE(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:44px;margin-bottom:16px;">✅</div>
      <h1 style="color:#34C759;font-size:22px;font-weight:900;margin:0 0 8px;">Profil mis à jour</h1>
    </div>
    <div style="background:rgba(52,199,89,0.08);border:1px solid rgba(52,199,89,0.25);border-radius:14px;padding:20px;margin-bottom:20px;">
      <p style="color:rgba(255,255,255,0.75);font-size:14px;line-height:22px;margin:0;">
        Bonjour <strong style="color:#D4AF37;">${p.name}</strong>,<br><br>
        Votre profil RHAZN a été mis à jour avec succès. Vos informations sont maintenant à jour dans l'écosystème.
      </p>
    </div>
    <p style="color:rgba(255,255,255,0.35);font-size:12px;text-align:center;">
      Si vous n'avez pas effectué cette modification, contactez le support.
    </p>`),

  // 4. NOMINATION AGENT
  agent_nominated: (p) => BASE(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:52px;margin-bottom:16px;">⭐</div>
      <h1 style="color:#D4AF37;font-size:24px;font-weight:900;margin:0 0 8px;">Félicitations !</h1>
      <p style="color:rgba(255,255,255,0.55);font-size:13px;margin:0;">Vous êtes nommé Agent RHAZN</p>
    </div>
    <div style="background:linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.04));border:1px solid rgba(212,175,55,0.30);border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
      <p style="color:rgba(255,255,255,0.50);font-size:11px;font-weight:800;letter-spacing:2px;margin:0 0 10px;">NOUVEAU STATUT</p>
      <div style="display:inline-block;background:rgba(0,122,255,0.15);border:1px solid rgba(0,122,255,0.40);border-radius:8px;padding:6px 16px;">
        <span style="color:#007AFF;font-size:14px;font-weight:900;letter-spacing:1px;">AGENT RHAZN</span>
      </div>
    </div>
    <p style="color:rgba(255,255,255,0.70);font-size:14px;line-height:22px;text-align:center;">
      Bonjour <strong style="color:#D4AF37;">${p.name}</strong>,<br><br>
      Vous avez été officiellement nommé <strong>Agent RHAZN</strong>. Ce statut vous confère des responsabilités et des privilèges au sein de l'écosystème.<br><br>
      Bienvenue dans l'équipe opérationnelle RHAZN.
    </p>`),

  // 5. NOMINATION CADNA
  cadna_nominated: (p) => BASE(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:52px;margin-bottom:16px;">🏅</div>
      <h1 style="color:#D4AF37;font-size:24px;font-weight:900;margin:0 0 8px;">Nomination officielle</h1>
      <p style="color:rgba(255,255,255,0.55);font-size:13px;margin:0;">Membre de la Commission CADNA</p>
    </div>
    <div style="background:linear-gradient(135deg,rgba(175,82,222,0.12),rgba(175,82,222,0.04));border:1px solid rgba(175,82,222,0.30);border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
      <p style="color:rgba(255,255,255,0.50);font-size:11px;font-weight:800;letter-spacing:2px;margin:0 0 10px;">NOUVEAU STATUT</p>
      <div style="display:inline-block;background:rgba(175,82,222,0.15);border:1px solid rgba(175,82,222,0.40);border-radius:8px;padding:6px 16px;">
        <span style="color:#AF52DE;font-size:14px;font-weight:900;letter-spacing:1px;">MEMBRE CADNA</span>
      </div>
    </div>
    <p style="color:rgba(255,255,255,0.70);font-size:14px;line-height:22px;text-align:center;">
      Bonjour <strong style="color:#D4AF37;">${p.name}</strong>,<br><br>
      Vous avez été nommé <strong>Membre de la Commission CADNA</strong> — la plus haute instance de régulation de l'écosystème RHAZN. Cette nomination reconnaît votre excellence et votre engagement.
    </p>`),

  // 6. DÉBIT WALLET
  wallet_debit: (p) => BASE(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:12px;">💸</div>
      <h1 style="color:#FFFFFF;font-size:22px;font-weight:900;margin:0 0 6px;">Débit Wallet</h1>
    </div>
    <div style="background:#1A1A1A;border-radius:16px;padding:24px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
        <span style="color:rgba(255,255,255,0.45);font-size:12px;font-weight:700;">MONTANT DÉBITÉ</span>
        <span style="color:#FF3B30;font-size:18px;font-weight:900;">-${fmt(p.amount)} TAN</span>
      </div>
      <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:12px;"></div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:rgba(255,255,255,0.45);font-size:12px;font-weight:700;">NOUVEAU SOLDE</span>
        <span style="color:#D4AF37;font-size:16px;font-weight:900;">${fmt(p.balance)} TAN</span>
      </div>
    </div>
    <p style="color:rgba(255,255,255,0.50);font-size:13px;text-align:center;line-height:20px;">
      Bonjour <strong>${p.name}</strong>, une opération de débit a été effectuée sur votre Wallet RHAZN.
    </p>`),

  // 7. CRÉDIT WALLET
  wallet_credit: (p) => BASE(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:12px;">💰</div>
      <h1 style="color:#FFFFFF;font-size:22px;font-weight:900;margin:0 0 6px;">Crédit Wallet</h1>
    </div>
    <div style="background:#1A1A1A;border-radius:16px;padding:24px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
        <span style="color:rgba(255,255,255,0.45);font-size:12px;font-weight:700;">MONTANT CRÉDITÉ</span>
        <span style="color:#34C759;font-size:18px;font-weight:900;">+${fmt(p.amount)} TAN</span>
      </div>
      <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:12px;"></div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:rgba(255,255,255,0.45);font-size:12px;font-weight:700;">NOUVEAU SOLDE</span>
        <span style="color:#D4AF37;font-size:16px;font-weight:900;">${fmt(p.balance)} TAN</span>
      </div>
    </div>
    <p style="color:rgba(255,255,255,0.50);font-size:13px;text-align:center;line-height:20px;">
      Bonjour <strong>${p.name}</strong>, votre Wallet RHAZN vient d'être crédité.
    </p>`),

  // 8. KEYNOTE
  keynote: (p) => BASE(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:52px;margin-bottom:16px;">📣</div>
      <h1 style="color:#D4AF37;font-size:26px;font-weight:900;margin:0 0 8px;">Keynote RHAZN</h1>
      <p style="color:rgba(255,255,255,0.55);font-size:13px;margin:0;">Un événement à ne pas manquer</p>
    </div>
    <div style="background:linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.03));border:1px solid rgba(212,175,55,0.25);border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
      ${p.date ? `<p style="color:#D4AF37;font-size:20px;font-weight:900;margin:0 0 6px;">📅 ${p.date}</p>` : ""}
      ${p.lieu ? `<p style="color:rgba(255,255,255,0.60);font-size:14px;margin:0;">📍 ${p.lieu}</p>` : ""}
    </div>
    <p style="color:rgba(255,255,255,0.70);font-size:14px;line-height:22px;text-align:center;">
      Bonjour <strong style="color:#D4AF37;">${p.name}</strong>,<br><br>
      RHAZN organise un Keynote exceptionnel. Préparez-vous pour des annonces majeures sur l'avenir de l'écosystème.
      ${p.details ? `<br><br>${p.details}` : ""}
    </p>`),

  // 9. REMERCIEMENT
  thank_you: (p) => BASE(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:52px;margin-bottom:16px;">🙏</div>
      <h1 style="color:#D4AF37;font-size:24px;font-weight:900;margin:0 0 8px;">Merci</h1>
      <p style="color:rgba(255,255,255,0.55);font-size:13px;margin:0;">De la part de toute l'équipe RHAZN</p>
    </div>
    <div style="background:rgba(212,175,55,0.07);border:1px solid rgba(212,175,55,0.18);border-radius:14px;padding:24px;margin-bottom:24px;text-align:center;">
      <p style="color:rgba(255,255,255,0.80);font-size:15px;line-height:24px;margin:0;font-style:italic;">
        « ${p.message || "Merci de faire partie de l'aventure RHAZN. Votre présence et votre confiance sont notre plus grande force."} »
      </p>
    </div>
    <p style="color:rgba(255,255,255,0.60);font-size:14px;text-align:center;">
      Bonjour <strong style="color:#D4AF37;">${p.name}</strong>, merci pour votre fidélité et votre engagement au sein de l'écosystème RHAZN.
    </p>`),

  // 10. MISE À JOUR APP
  app_update: (p) => BASE(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:52px;margin-bottom:16px;">🚀</div>
      <h1 style="color:#FFFFFF;font-size:24px;font-weight:900;margin:0 0 8px;">Nouvelle version disponible</h1>
      ${p.version ? `<div style="display:inline-block;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.30);border-radius:20px;padding:4px 14px;"><span style="color:#D4AF37;font-size:12px;font-weight:900;">v${p.version}</span></div>` : ""}
    </div>
    <div style="background:#1A1A1A;border-radius:14px;padding:20px;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.50);font-size:11px;font-weight:800;letter-spacing:1.5px;margin:0 0 12px;">NOUVEAUTÉS</p>
      <p style="color:rgba(255,255,255,0.80);font-size:14px;line-height:22px;margin:0;">
        ${p.nouveautes || "Cette mise à jour apporte de nouvelles fonctionnalités et des améliorations de performance."}
      </p>
    </div>
    <p style="color:rgba(255,255,255,0.60);font-size:13px;text-align:center;">
      Bonjour <strong>${p.name}</strong>, mettez à jour votre application RHAZN pour profiter des dernières améliorations.
    </p>`),
};

// ══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ══════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  try {
    // Récupérer les emails en attente (max 20 par run)
    const { data: queue, error } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) throw error;
    if (!queue || queue.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    let sent = 0;
    let failed = 0;

    for (const email of queue) {
      // Marquer comme en cours
      await supabase
        .from("email_queue")
        .update({ attempts: email.attempts + 1 })
        .eq("id", email.id);

      // Générer le HTML
      const templateFn = TEMPLATES[email.template];
      if (!templateFn) {
        await supabase.from("email_queue").update({
          status: "failed",
          error: `Template inconnu: ${email.template}`,
        }).eq("id", email.id);
        failed++;
        continue;
      }

      const html = templateFn(email.payload ?? {});

      // Envoyer via Resend
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:    FROM_EMAIL,
          to:      [email.to_email],
          subject: email.subject,
          html,
        }),
      });

      if (res.ok) {
        await supabase.from("email_queue").update({
          status:  "sent",
          sent_at: new Date().toISOString(),
        }).eq("id", email.id);
        sent++;
      } else {
        const errBody = await res.text();
        await supabase.from("email_queue").update({
          status: email.attempts >= 2 ? "failed" : "pending",
          error:  errBody,
        }).eq("id", email.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, total: queue.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500 }
    );
  }
});