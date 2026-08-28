"""Generate 1200x630 Open Graph preview image for zionhouse.org."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
OUT = ASSETS / "og-image.jpg"
LOGO = ASSETS / "zionhouse-logo.png"

W, H = 1200, 630


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path(r"C:\Windows\Fonts\georgiab.ttf") if bold else Path(r"C:\Windows\Fonts\georgia.ttf"),
        Path(r"C:\Windows\Fonts\arialbd.ttf") if bold else Path(r"C:\Windows\Fonts\arial.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def main() -> None:
    img = Image.new("RGB", (W, H), "#050814")
    draw = ImageDraw.Draw(img)

    for y in range(H):
        t = y / H
        r = int(5 + (12 - 5) * t)
        g = int(8 + (18 - 8) * t)
        b = int(20 + (36 - 20) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    draw.ellipse((820, -120, 1180, 240), fill=(212, 168, 67, 18))
    draw.ellipse((-80, 380, 260, 720), fill=(59, 130, 246, 14))

    logo = Image.open(LOGO).convert("RGBA")
    logo_size = 220
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    lx = (W - logo_size) // 2
    ly = 96
    img.paste(logo, (lx, ly), logo)

    title = "Zion House INT'L"
    tagline = "Networking the world with the Spirit Life"
    sub = "Four Services Every Sunday · Watch Live · Daily Affirmations"

    title_font = load_font(54, bold=True)
    tag_font = load_font(30)
    sub_font = load_font(24)

    title_w = draw.textlength(title, font=title_font)
    draw.text(((W - title_w) / 2, 340), title, fill="#f8f6f1", font=title_font)

    tag_w = draw.textlength(tagline, font=tag_font)
    draw.text(((W - tag_w) / 2, 410), tagline, fill="#f0d78c", font=tag_font)

    sub_w = draw.textlength(sub, font=sub_font)
    draw.text(((W - sub_w) / 2, 470), sub, fill="#b8c0d4", font=sub_font)

    draw.rectangle((0, H - 6, W, H), fill="#d4a843")

    img.save(OUT, "JPEG", quality=92, optimize=True)
    print(f"Saved {OUT} ({W}x{H})")


if __name__ == "__main__":
    main()
