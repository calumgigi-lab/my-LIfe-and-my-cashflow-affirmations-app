#!/usr/bin/env python3
"""
Generate Google Play Store graphics for MY LIFE & MY CASHFLOW AFFIRMATIONS app
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Create graphics directory
os.makedirs("google_play_graphics", exist_ok=True)

# Colors from app theme
BG_DARK = "#0F2C4F"
SURFACE = "#1A436F"
TEXT_LIGHT = "#F7FBFF"
TINT = "#9EC9FF"
ACCENT_GOLD = "#D4A853"

def hex_to_rgb(hex_color):
    """Convert hex to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_feature_graphic():
    """Create 1024x500 feature graphic"""
    img = Image.new('RGB', (1024, 500), hex_to_rgb(BG_DARK))
    draw = ImageDraw.Draw(img)
    
    # Gradient effect with surface color accent
    draw.rectangle([(0, 0), (1024, 500)], fill=hex_to_rgb(SURFACE))
    
    # Add some visual elements
    draw.rectangle([(30, 30), (400, 470)], outline=hex_to_rgb(TINT), width=3)
    draw.rectangle([(600, 30), (994, 470)], outline=hex_to_rgb(ACCENT_GOLD), width=3)
    
    try:
        title_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 52)
        subtitle_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 28)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
    
    # Title text
    draw.text((50, 80), "MY LIFE & MY CASHFLOW", fill=hex_to_rgb(TEXT_LIGHT), font=title_font)
    draw.text((100, 200), "AFFIRMATIONS", fill=hex_to_rgb(TINT), font=title_font)
    
    # Subtitle
    draw.text((100, 340), "Daily Guidance for Prosperity", fill=hex_to_rgb(ACCENT_GOLD), font=subtitle_font)
    
    img.save("google_play_graphics/feature_graphic_1024x500.png")
    print("✅ Feature graphic 1024x500 created")

def create_phone_screenshot(title, day_num, idx):
    """Create 1080x1920 phone screenshot"""
    img = Image.new('RGB', (1080, 1920), hex_to_rgb(BG_DARK))
    draw = ImageDraw.Draw(img)
    
    # Header background
    draw.rectangle([(0, 0), (1080, 250)], fill=hex_to_rgb(SURFACE))
    
    try:
        title_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 44)
        day_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 36)
        body_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 38)
        button_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 28)
    except:
        title_font = ImageFont.load_default()
        day_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        button_font = ImageFont.load_default()
    
    # Title
    draw.text((50, 50), title, fill=hex_to_rgb(TEXT_LIGHT), font=title_font)
    draw.text((50, 150), f"Day {day_num}", fill=hex_to_rgb(TINT), font=day_font)
    
    # Content box
    draw.rectangle([(40, 300), (1040, 1200)], outline=hex_to_rgb(TINT), width=4, fill=hex_to_rgb(BG_DARK))
    
    # Affirmation text - different per screenshot
    affirmations = [
        ["I am worthy of", "financial abundance", "and life success."],
        ["Every day brings", "new opportunities", "for growth."],
        ["I manifest prosperity", "with confidence", "and gratitude."],
    ]
    
    lines = affirmations[idx - 1]
    y_pos = 400
    for line in lines:
        draw.text((100, y_pos), line, fill=hex_to_rgb(TEXT_LIGHT), font=body_font)
        y_pos += 150
    
    # Gold separator
    draw.rectangle([(50, 1250), (1030, 1260)], fill=hex_to_rgb(ACCENT_GOLD))
    
    # Unlock button
    draw.rectangle([(150, 1350), (930, 1480)], outline=hex_to_rgb(TINT), width=4)
    button_text = "Unlock Affirmation"
    bbox = draw.textbbox((0, 0), button_text, font=button_font)
    btn_width = bbox[2] - bbox[0]
    btn_x = (1080 - btn_width) // 2
    draw.text((btn_x, 1380), button_text, fill=hex_to_rgb(TINT), font=button_font)
    
    # Footer description
    try:
        footer_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 22)
    except:
        footer_font = ImageFont.load_default()
    
    draw.text((50, 1600), "Unlock premium booklets and gain access to", fill=hex_to_rgb(TEXT_LIGHT), font=footer_font)
    draw.text((50, 1660), "daily affirmations designed for prosperity.", fill=hex_to_rgb(TEXT_LIGHT), font=footer_font)
    
    img.save(f"google_play_graphics/phone_screenshot_{idx}_1080x1920.png")
    print(f"✅ Phone screenshot {idx} (1080x1920) created")

def create_tablet_screenshot(width, height, name, size_label):
    """Create tablet screenshot"""
    img = Image.new('RGB', (width, height), hex_to_rgb(BG_DARK))
    draw = ImageDraw.Draw(img)
    
    # Header
    draw.rectangle([(0, 0), (width, 120)], fill=hex_to_rgb(SURFACE))
    
    try:
        title_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 36)
        body_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 32)
    except:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
    
    draw.text((40, 30), "MY LIFE & MY CASHFLOW AFFIRMATIONS", fill=hex_to_rgb(TEXT_LIGHT), font=title_font)
    
    # Content box
    draw.rectangle([(40, 160), (width - 40, height - 40)], outline=hex_to_rgb(TINT), width=3)
    
    # Content
    content_lines = [
        "✓ 12 Monthly Affirmation Booklets",
        "✓ 366 Daily Affirmations",
        "✓ Unlock Premium Content",
        "✓ Admin Payment System",
        "✓ Track Your Progress",
        "",
        "Start your journey to prosperity today!",
    ]
    
    y_pos = 240
    for line in content_lines:
        if line:
            draw.text((80, y_pos), line, fill=hex_to_rgb(TEXT_LIGHT), font=body_font)
        y_pos += 80
    
    img.save(f"google_play_graphics/{name}")
    print(f"✅ {size_label} ({name}) created")

def main():
    print("🎨 Generating Google Play Store Graphics...\n")
    
    # Feature graphic
    create_feature_graphic()
    print()
    
    # Phone screenshots
    create_phone_screenshot("APRIL 2026", 1, 1)
    create_phone_screenshot("DAILY AFFIRMATIONS", 7, 2)
    create_phone_screenshot("UNLOCK PREMIUM", 15, 3)
    print()
    
    # Tablet screenshots
    create_tablet_screenshot(1080, 1920, "tablet_7inch_1080x1920.png", "Tablet 7-inch")
    create_tablet_screenshot(1440, 2560, "tablet_10inch_1440x2560.png", "Tablet 10-inch")
    create_tablet_screenshot(1280, 720, "chromebook_1280x720.png", "Chromebook")
    create_tablet_screenshot(1280, 720, "android_xr_1280x720.png", "Android XR")
    
    print("\n" + "="*60)
    print("✅ ALL GRAPHICS CREATED SUCCESSFULLY!")
    print("="*60)
    print("\n📁 Location: google_play_graphics/")
    print("\nFiles created:")
    
    for file in sorted(os.listdir("google_play_graphics")):
        filepath = os.path.join("google_play_graphics", file)
        size = os.path.getsize(filepath) / 1024
        print(f"  ✓ {file} ({size:.1f} KB)")
    
    print("\n📤 Upload these to Google Play Console in the Graphics section!")

if __name__ == "__main__":
    main()
