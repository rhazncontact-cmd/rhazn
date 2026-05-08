from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
import qrcode
import os

# ===================== PAGE =====================
W, H = A4

BLACK = HexColor("#000000")
DARK = HexColor("#0B0B0B")
GOLD = HexColor("#D4AF37")
GRAY = HexColor("#9CA3AF")
GREEN = HexColor("#00C853")
ORANGE = HexColor("#F9A825")

OUTPUT = "rhazn_identity_card_premium.pdf"

profile = {
    "full_name": "Badimy ACCILIEN",
    "user_code": "RZ-1309-BA",
    "cadna_status": "approved",
    "is_creator": True,
    "avatar": None,
}

PUBLIC_URL = f"https://rhazn.com/u/{profile['user_code']}"

c = canvas.Canvas(OUTPUT, pagesize=A4)

# ===================== BACKGROUND =====================
c.setFillColor(BLACK)
c.rect(0, 0, W, H, stroke=0, fill=1)

# ===================== HEADER =====================
c.setFillColor(GOLD)
c.setFont("Helvetica-Bold", 28)
c.drawCentredString(W / 2, H - 42 * mm, "RHAZN")

c.setFont("Helvetica", 14)
c.drawCentredString(W / 2, H - 55 * mm, "CARTE D’IDENTITÉ NUMÉRIQUE OFFICIELLE")

# ===================== CARD =====================
card_w = W - 40 * mm
card_h = 150 * mm
card_x = 20 * mm
card_y = H / 2 - card_h / 2 - 10 * mm

c.setFillColor(DARK)
c.roundRect(card_x, card_y, card_w, card_h, 24, stroke=0, fill=1)

# ===================== AVATAR =====================
avatar_size = 70 * mm
avatar_x = W / 2 - avatar_size / 2
avatar_y = card_y + card_h - avatar_size - 22 * mm

if profile["avatar"] and os.path.exists(profile["avatar"]):
    img = ImageReader(profile["avatar"])
    c.drawImage(img, avatar_x, avatar_y, avatar_size, avatar_size, mask="auto")
else:
    c.setFillColor(GOLD)
    c.circle(
        avatar_x + avatar_size / 2,
        avatar_y + avatar_size / 2,
        avatar_size / 2,
        stroke=0,
        fill=1,
    )
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 36)
    initials = "".join([n[0] for n in profile["full_name"].split()[:2]]).upper()
    c.drawCentredString(
        avatar_x + avatar_size / 2,
        avatar_y + avatar_size / 2 - 12,
        initials,
    )

# ===================== TEXT =====================
c.setFillColor(white)
c.setFont("Helvetica-Bold", 24)
c.drawCentredString(W / 2, avatar_y - 16 * mm, profile["full_name"])

c.setFont("Helvetica", 14)
c.setFillColor(GRAY)
c.drawCentredString(W / 2, avatar_y - 28 * mm, f"ID : {profile['user_code']}")

# ===================== STATUS =====================
status_color = GREEN if profile["cadna_status"] == "approved" else ORANGE
status_text = "IDENTITÉ VÉRIFIÉE • CADNA" if profile["cadna_status"] == "approved" else "VALIDATION CADNA EN COURS"

c.setFillColor(status_color)
c.roundRect(W / 2 - 50 * mm, avatar_y - 48 * mm, 100 * mm, 14 * mm, 7, stroke=0, fill=1)

c.setFillColor(BLACK)
c.setFont("Helvetica-Bold", 11)
c.drawCentredString(W / 2, avatar_y - 38 * mm, status_text)

# ===================== CREATOR =====================
if profile["is_creator"]:
    c.setFillColor(GOLD)
    c.roundRect(W / 2 - 35 * mm, avatar_y - 68 * mm, 70 * mm, 12 * mm, 6, stroke=0, fill=1)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(W / 2, avatar_y - 60 * mm, "CRÉATEUR OFFICIEL RHAZN")

# ===================== QR =====================
qr = qrcode.make(PUBLIC_URL)
qr_path = "qr_temp.png"
qr.save(qr_path)

qr_size = 55 * mm
c.drawImage(qr_path, W / 2 - qr_size / 2, card_y + 22 * mm, qr_size, qr_size)

os.remove(qr_path)

c.setFillColor(GRAY)
c.setFont("Helvetica", 11)
c.drawCentredString(W / 2, card_y + 16 * mm, "Scanner pour vérifier l’identité")

# ===================== FOOTER =====================
c.setFont("Helvetica", 10)
c.drawCentredString(W / 2, 18 * mm, "RHAZN — Identité Numérique Sécurisée")

c.showPage()
c.save()

print("✅ Carte RHAZN PREMIUM générée :", OUTPUT)
