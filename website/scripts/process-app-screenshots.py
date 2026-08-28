"""Remove Play Store mockup backgrounds and export transparent PNG phone screenshots."""
from collections import deque
from pathlib import Path

from PIL import Image

APP_DIR = Path(__file__).resolve().parent.parent / "public" / "assets" / "app"

SCREENS = [
    ("screenshot-library.webp", "screenshot-library.png"),
    ("screenshot-today.webp", "screenshot-today.png"),
    ("screenshot-profile.webp", "screenshot-profile.png"),
    ("screenshot-leaderboard.webp", "screenshot-leaderboard.png"),
]


def is_background_pixel(r: int, g: int, b: int) -> bool:
    if r >= 238 and g >= 238 and b >= 238:
        return True
    avg = (r + g + b) / 3
    spread = max(r, g, b) - min(r, g, b)
    if avg >= 188 and spread < 40:
        return True
    return False


def remove_background(img: Image.Image) -> Image.Image:
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
        if not is_background_pixel(r, g, b):
            continue
        remove[y][x] = True
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    for y in range(h):
        for x in range(w):
            if remove[y][x]:
                pixels[x, y] = (0, 0, 0, 0)

    return rgba


def trim_transparent(img: Image.Image, pad: int = 6) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.width, right + pad)
    bottom = min(img.height, bottom + pad)
    return img.crop((left, top, right, bottom))


def upscale_for_web(img: Image.Image, min_height: int = 900) -> Image.Image:
    if img.height >= min_height:
        return img
    scale = min_height / img.height
    new_size = (int(img.width * scale), int(img.height * scale))
    return img.resize(new_size, Image.Resampling.LANCZOS)


def main() -> None:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    processed = 0

    for src_name, dest_name in SCREENS:
        src = APP_DIR / src_name
        if not src.exists():
            alt = APP_DIR / dest_name.replace(".png", ".webp")
            if alt.exists():
                src = alt
            else:
                print(f"Skip missing source: {src_name}")
                continue

        img = Image.open(src)
        transparent = trim_transparent(remove_background(img))
        transparent = upscale_for_web(transparent)
        out = APP_DIR / dest_name
        transparent.save(out, optimize=True)
        processed += 1
        print(f"Saved {out.name} ({transparent.size[0]}x{transparent.size[1]})")

    if not processed:
        raise SystemExit("No app screenshots processed")


if __name__ == "__main__":
    main()
