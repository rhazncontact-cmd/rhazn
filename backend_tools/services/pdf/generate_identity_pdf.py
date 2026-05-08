from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
import qrcode
import tempfile
import os

# ===================== CONFIG =====================
GOLD = HexColor("#D4AF37")
DARK = HexColor("#0B0B0B")
GRAY = HexColor("#6B7280")
PAGE_BG = HexColor("#F5F5F7")

# ===================== PDF FUNCTION =====================
def generate_rhazn_identity_pdf(profile):
    """
    profile = {
      "full_name": "Badimy Accilien",
      "user_code": "RZ-432D9",
      "cadna_status": "pending" | "approved",
      "avatar_path": "/path/avatar.jpg" (optionnel)
    }
    """

    file_path = f"RHAZN_ID_{profile['user_code']}.pdf"
    doc = SimpleDocTemplate(
        file_path,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    elements = []

    # ===================== STYLES =====================
    title = ParagraphStyle(
        "title",
        fontSize=20,
        textColor=DARK,
        alignment=TA_CENTER,
        spaceAfter=12,
        leading=24,
        fontName="Helvetica-Bold",
    )

    subtitle = ParagraphStyle(
        "subtitle",
        fontSize=11,
        textColor=GRAY,
        alignment=TA_CENTER,
        spaceAfter=20,
    )

    label = ParagraphStyle(
        "label",
        fontSize=10,
        textColor=GRAY,
        alignment=TA_CENTER,
    )

    value = ParagraphStyle(
        "value",
        fontSize=14,
        textColor=DARK,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
        spaceAfter=12,
    )

    # ===================== HEADER =====================
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("RHAZN", title))
    elements.append(Paragraph("Carte d’identité numérique officielle", subtitle))
    elements.append(Spacer(1, 30))

    # ===================== AVATAR =====================
    if profile.get("avatar_path") and os.path.exists(profile["avatar_path"]):
        avatar = Image(profile["avatar_path"], width=90, height=90)
        avatar.hAlign = "CENTER"
        elements.append(avatar)
        elements.append(Spacer(1, 14))

    # ===================== NAME =====================
    elements.append(Paragraph(profile["full_name"], value))
    elements.append(Paragraph(profile["user_code"], label))
    elements.append(Spacer(1, 18))

    # ===================== CADNA =====================
    cadna_text = (
        "Identité vérifiée CADNA"
        if profile["cadna_status"] == "approved"
        else "Validation CADNA en cours"
    )

    cadna_color = HexColor("#16A34A") if profile["cadna_status"] == "approved" else GOLD

    cadna_table = Table(
        [[cadna_text]],
        colWidths=90 * mm,
        rowHeights=12 * mm,
        hAlign="CENTER",
    )

    cadna_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PAGE_BG),
                ("BOX", (0, 0), (-1, -1), 1.5, cadna_color),
                ("TEXTCOLOR", (0, 0), (-1, -1), cadna_color),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
            ]
        )
    )

    elements.append(cadna_table)
    elements.append(Spacer(1, 26))

    # ===================== QR =====================
    qr_data = f"https://rhazn.com/u/{profile['user_code']}"
    qr_img = qrcode.make(qr_data)

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
    qr_img.save(tmp.name)

    qr = Image(tmp.name, width=120, height=120)
    qr.hAlign = "CENTER"
    elements.append(qr)
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("Scanner pour vérifier l’identité", label))

    # ===================== BUILD =====================
    doc.build(elements)
    os.unlink(tmp.name)

    return file_path
