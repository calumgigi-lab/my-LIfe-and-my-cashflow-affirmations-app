import os
import json
import re
from docx import Document

downloads = r"C:\Users\MY COMPUTER\Downloads"

def extract_day_number(filename):
    nums = re.findall(r'\d+', filename)
    return int(nums[0]) if nums else 0

files = [f for f in os.listdir(downloads) if f.endswith('.docx') and any(day in f for day in ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'])]

day_map = {}
for f in files:
    path = os.path.join(downloads, f)
    day_num = extract_day_number(f)
    if day_num < 1 or day_num > 31:
        continue
    try:
        doc = Document(path)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        if not paragraphs:
            continue
        title = paragraphs[1] if len(paragraphs) > 1 else paragraphs[0]
        content_parts = paragraphs[2:] if len(paragraphs) > 2 else []
        content = "\n\n".join(content_parts)
        day_map[day_num] = {"title": title, "content": content}
        print(f"Day {day_num}: {title[:60]}...")
    except Exception as e:
        print(f"ERROR reading {f}: {e}")

affirmations = []
for day in range(1, 32):
    if day in day_map:
        affirmations.append({
            "dayNumber": day,
            "title": day_map[day]["title"],
            "content": day_map[day]["content"]
        })
    else:
        print(f"WARNING: Day {day} not found in files!")

output = [{
    "title": "My Life & My Cashflow Affirmations - August 2026",
    "month": 8,
    "year": 2026,
    "description": "Daily affirmations by Chinedum Ilechukwu",
    "affirmations": affirmations
}]

out_path = os.path.join(os.path.dirname(__file__), "affirmations_august_2026.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"\nWritten {len(affirmations)} affirmations to {out_path}")
