"""Extract Play Store screenshot URLs for com.mylifemycashflow."""
import json
import re
import sys
from pathlib import Path

html_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/playstore.html")
html = html_path.read_text(encoding="utf-8", errors="ignore")

all_urls = re.findall(r"https://play-lh\.googleusercontent\.com/[^\"'\s\\<>]+", html)
unique = []
seen = set()
for url in all_urls:
    base = url.split("=", 1)[0]
    if base in seen:
        continue
    seen.add(base)
    unique.append(url)

print(f"Unique play-lh URLs: {len(unique)}")

# Look for screenshot alt text nearby
for label in ["Screenshot image", "screenshot", "Screenshot"]:
    idx = 0
    hits = 0
    while True:
        pos = html.find(label, idx)
        if pos == -1:
            break
        chunk = html[max(0, pos - 500) : pos + 500]
        urls = re.findall(r"https://play-lh\.googleusercontent\.com/[^\"'\s\\<>]+", chunk)
        if urls:
            hits += 1
            print(f"\nNear '{label}':")
            for u in urls:
                print(" ", u[:120])
        idx = pos + len(label)
    if hits:
        print(f"hits for {label}: {hits}")

# Parse AF_initDataCallback blocks and collect play-lh urls inside
blocks = re.findall(r"AF_initDataCallback\(\{key: '([^']+)', hash: \d+, data:(.*?), sideChannel:", html, re.S)
print(f"\nAF blocks: {len(blocks)}")
for key, data in blocks:
    urls = re.findall(r"https://play-lh\.googleusercontent\.com/[^\"'\s\\<>]+", data)
    if len(urls) >= 3:
        print(f"\nBlock {key} -> {len(urls)} urls")
        for u in urls[:8]:
            print(" ", u[:140])
