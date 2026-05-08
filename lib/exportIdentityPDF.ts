import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

/**
 * 📄 Export Carte Identité RHAZN — PDF Premium Apple-like
 * - Fond blanc
 * - Design épuré
 * - Partage natif (AirDrop / WhatsApp / Mail)
 */
export const exportIdentityPDF = async (profile: any) => {
  if (!profile?.user_code) return;

  const fullName =
    profile.full_name ||
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();

  const avatar =
    profile.avatar_url ??
    "https://via.placeholder.com/96x96.png?text=RHAZN";

  const cadnaLabel =
    profile.cadna_status === "approved"
      ? "✔ Identité vérifiée CADNA"
      : "⏳ Validation CADNA en cours";

  const cadnaColor =
    profile.cadna_status === "approved" ? "#00C853" : "#F9A825";

  const creatorBadge = profile.is_creator
    ? `<div style="
        margin-top:10px;
        color:#007AFF;
        font-weight:800;
        font-size:13px;
      ">
        Créateur RHAZN
      </div>`
    : "";

  const html = `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="
      margin:0;
      padding:40px;
      background:#F5F5F7;
      font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI';
    ">
      <div style="
        width:340px;
        margin:auto;
        background:#FFFFFF;
        border-radius:28px;
        padding:28px;
        box-shadow:0 20px 40px rgba(0,0,0,0.12);
        text-align:center;
      ">

        <div style="
          font-weight:900;
          letter-spacing:2px;
          font-size:14px;
          margin-bottom:18px;
        ">
          RHAZN
        </div>

        <img
          src="${avatar}"
          style="
            width:96px;
            height:96px;
            border-radius:48px;
            border:2px solid #D4AF37;
            object-fit:cover;
            margin-bottom:12px;
          "
        />

        <h2 style="margin:8px 0 4px 0; font-size:20px;">
          ${fullName}
        </h2>

        <div style="
          font-weight:700;
          letter-spacing:1px;
          color:#666;
          font-size:13px;
        ">
          ${profile.user_code}
        </div>

        <div style="
          margin-top:14px;
          font-weight:700;
          font-size:13px;
          color:${cadnaColor};
        ">
          ${cadnaLabel}
        </div>

        ${creatorBadge}

        <div style="
          margin-top:22px;
          padding-top:16px;
          border-top:1px solid #EEE;
          font-size:12px;
          color:#888;
        ">
          Profil public<br/>
          <strong>rhazn.com/u/${profile.user_code}</strong>
        </div>

      </div>
    </body>
  </html>
  `;

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  await Sharing.shareAsync(uri, {
    dialogTitle: "Carte Identité RHAZN",
    UTI: "com.adobe.pdf",
    mimeType: "application/pdf",
  });
};
