"""สร้างไอคอนแอป: ลูกบอลสีครีมบนพื้นอิฐนุ่ม (สีเดียวกับปุ่มหลักในแอป)
ใช้: python3 android/make_icons.py   → เขียน android/res/mipmap-*/ic_launcher*.png"""
import math
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
BG = (0xB4, 0x62, 0x4F, 255)
BALL = (0xF6, 0xF3, 0xEE, 255)
INK = (0x5E, 0x33, 0x2A, 255)
DENS = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
SS = 4  # วาดใหญ่แล้วย่อ ให้ขอบเนียน


def pent(cx, cy, r, rot=-90):
    return [(cx + r * math.cos(math.radians(rot + i * 72)), cy + r * math.sin(math.radians(rot + i * 72)))
            for i in range(5)]


def ball(d, cx, cy, R):
    """ห้าเหลี่ยมกลาง + ตะเข็บห้าเส้น + ห้าเหลี่ยมที่ขอบลูก (ลายลูกฟุตบอลแบบเรียบ)"""
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=BALL)
    core = pent(cx, cy, R * 0.34)
    w = max(2, int(R * 0.07))
    for i, (x, y) in enumerate(core):
        a = math.radians(-90 + i * 72)
        px, py = cx + R * 1.06 * math.cos(a), cy + R * 1.06 * math.sin(a)
        rim = pent(px, py, R * 0.36, rot=math.degrees(a) + 180)
        d.line([(x, y), rim[0]], fill=INK, width=w)
        d.polygon(rim, fill=INK)
    d.polygon(core, fill=INK)


def render(px, legacy):
    S = px * SS
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if legacy:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=BG)
        R = S * 0.33
    else:
        R = S * 0.24                          # อยู่ในเขตปลอดภัย 66/108 ของไอคอนแบบปรับรูปได้
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ball(ImageDraw.Draw(layer), S / 2, S / 2, R)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).ellipse([S / 2 - R, S / 2 - R, S / 2 + R, S / 2 + R], fill=255)
    im.paste(layer, (0, 0), mask)
    return im.resize((px, px), Image.LANCZOS)


for name, k in DENS.items():
    out = os.path.join(HERE, "res", f"mipmap-{name}")
    os.makedirs(out, exist_ok=True)
    render(int(48 * k), True).save(os.path.join(out, "ic_launcher.png"))
    render(int(108 * k), False).save(os.path.join(out, "ic_launcher_fg.png"))
print("ไอคอนครบ", len(DENS), "ขนาด")
