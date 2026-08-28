"""Remove white background from Zion House logo and export transparent PNG."""
from collections import deque
from pathlib import Path

from PIL import Image

SRC = Path(r"C:\Users\MY COMPUTER\Downloads\WhatsApp Image 2026-05-30 at 11.52.54 AM.jpeg")
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "assets"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def is_background_pixel(r: int, g: int, b: int, min_channel: int = 210) -> bool:
    return r >= min_channel and g >= min_channel and b >= min_channel


def remove_white_background(img: Image.Image, min_channel: int = 210) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    remove = [[False] * w for _ in range(h)]
    seen = [[False] * w for _ in range(h)]
    queue: deque[tuple[int, int]] = deque()

    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))

    while queue:
        x, y = queue.popleft()
        if x < 0 or x >= w or y < 0 or y >= h or seen[y][x]:
            continue
        seen[y][x] = True
        r, g, b, _ = pixels[x, y]
        if not is_background_pixel(r, g, b, min_channel):
            continue
        remove[y][x] = True
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    for y in range(h):
        for x in range(w):
            if remove[y][x]:
                pixels[x, y] = (0, 0, 0, 0)

    return rgba


def trim_transparent(img: Image.Image, pad: int = 8) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.width, right + pad)
    bottom = min(img.height, bottom + pad)
    return img.crop((left, top, right, bottom))


def main() -> None:
    img = Image.open(SRC)
    transparent = trim_transparent(remove_white_background(img))

    logo_path = OUT_DIR / "zionhouse-logo.png"
    favicon_path = OUT_DIR / "zionhouse-favicon.png"
    transparent.save(logo_path, optimize=True)

    side = max(transparent.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ox = (side - transparent.width) // 2
    oy = (side - transparent.height) // 2
    square.paste(transparent, (ox, oy), transparent)
    favicon = square.resize((192, 192), Image.Resampling.LANCZOS)
    favicon.save(favicon_path, optimize=True)

    print(f"Saved {logo_path} ({transparent.size[0]}x{transparent.size[1]})")
    print(f"Saved {favicon_path}")


if __name__ == "__main__":
    main()
