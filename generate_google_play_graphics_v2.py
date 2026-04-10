#!/usr/bin/env python3
"""
Generate Google Play Store graphics for MY LIFE & MY CASHFLOW AFFIRMATIONS app
Using the actual app logo and proper branding
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Create graphics directory
os.makedirs("google_play_graphics", exist_ok=True)

# App colors
NAVY_BG = "#1A3A5C"
DARK_BG = "#0F2C4F"
TEXT_WHITE = "#FFFFFF"
GOLD = "#D4A853"
LIGHT_BLUE = "#9EC9FF"

def hex_to_rgb(hex_color):
    """Convert hex to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def load_logo():
    """Load the app logo"""
    try:
        return Image.open("assets/images/icon.png").convert("RGBA")
    except:
        return None

def create_feature_graphic_with_logo():
    """Create 1024x500 feature graphic with logo"""
    img = Image.new('RGB', (1024, 500), hex_to_rgb(NAVY_BG))
    draw = ImageDraw.Draw(img)
    
    # Add gold accent stripe on left
    draw.rectangle([(0, 0), (60, 500)], fill=hex_to_rgb(GOLD))
    
    # Load and paste logo
    logo = load_logo()
    if logo:
        logo_size = 180
        logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
        # Paste logo centered vertically, offset to the left
        logo_y = (500 - logo_size) // 2
        img.paste(logo, (120, logo_y), logo)
    
    # Add text on the right
    try:
        big_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 42)
        medium_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 28)
        small_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
    except:
        big_font = ImageFont.load_default()
        medium_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # Main text
    draw.text((420, 80), "MY LIFE &", fill=hex_to_rgb(TEXT_WHITE), font=big_font)
    draw.text((420, 160), "MY CASHFLOW", fill=hex_to_rgb(TEXT_WHITE), font=big_font)
    draw.text((420, 240), "AFFIRMATIONS", fill=hex_to_rgb(GOLD), font=big_font)
    
    # Tagline
    draw.text((420, 370), "Daily Guidance for Prosperity", fill=hex_to_rgb(LIGHT_BLUE), font=small_font)
    
    img.save("google_play_graphics/feature_graphic_1024x500.png")
    print("✅ Feature graphic 1024x500 created")

def create_phone_screenshot(title, affirmation_text, idx):
    """Create 1080x1920 phone screenshot with app logo"""
    img = Image.new('RGB', (1080, 1920), hex_to_rgb(DARK_BG))
    draw = ImageDraw.Draw(img)
    
    # Header with navy background
    draw.rectangle([(0, 0), (1080, 280)], fill=hex_to_rgb(NAVY_BG))
    
    # Gold top stripe
    draw.rectangle([(0, 0), (1080, 8)], fill=hex_to_rgb(GOLD))
    
    try:
        title_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 44)
        subtitle_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 32)
        body_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 40)
        button_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 32)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        button_font = ImageFont.load_default()
    
    # Load logo for header
    logo = load_logo()
    if logo:
        logo_size = 120
        logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
        img.paste(logo, (40, 50), logo)
    
    # Title and day
    draw.text((180, 60), title, fill=hex_to_rgb(TEXT_WHITE), font=title_font)
    draw.text((180, 150), f"Day {idx * 10}", fill=hex_to_rgb(LIGHT_BLUE), font=subtitle_font)
    
    # Content box with gold border
    draw.rectangle([(40, 340), (1040, 1400)], outline=hex_to_rgb(GOLD), width=4, fill=hex_to_rgb(NAVY_BG))
    
    # Affirmation text
    draw.text((80, 440), "Today's Affirmation:", fill=hex_to_rgb(GOLD), font=subtitle_font)
    
    # Word wrap the affirmation text
    lines = affirmation_text.split('\n')
    y_pos = 560
    for line in lines:
        draw.text((100, y_pos), line, fill=hex_to_rgb(TEXT_WHITE), font=body_font)
        y_pos += 120
    
    # Button section
    draw.rectangle([(80, 1480), (1000, 1620)], outline=hex_to_rgb(GOLD), width=3, fill=hex_to_rgb(NAVY_BG))
    button_text = "Unlock Affirmation"
    bbox = draw.textbbox((0, 0), button_text, font=button_font)
    btn_width = bbox[2] - bbox[0]
    btn_x = (1080 - btn_width) // 2
    draw.text((btn_x, 1510), button_text, fill=hex_to_rgb(GOLD), font=button_font)
    
    # Gold line
    draw.rectangle([(40, 1680), (1040, 1690)], fill=hex_to_rgb(GOLD))
    
    # Footer
    try:
        footer_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 24)
    except:
        footer_font = ImageFont.load_default()
    
    draw.text((80, 1750), "✓ 366 Daily Affirmations", fill=hex_to_rgb(TEXT_WHITE), font=footer_font)
    draw.text((80, 1810), "✓ 12 Monthly Booklets", fill=hex_to_rgb(TEXT_WHITE), font=footer_font)
    
    img.save(f"google_play_graphics/phone_screenshot_{idx}_1080x1920.png")
    print(f"✅ Phone screenshot {idx} (1080x1920) created")

def create_tablet_screenshot(width, height, name, size_label):
    """Create tablet screenshot with logo"""
    img = Image.new('RGB', (width, height), hex_to_rgb(DARK_BG))
    draw = ImageDraw.Draw(img)
    
    # Header
    draw.rectangle([(0, 0), (width, 150)], fill=hex_to_rgb(NAVY_BG))
    draw.rectangle([(0, 0), (width, 8)], fill=hex_to_rgb(GOLD))
    
    try:
        title_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 48)
        body_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 40)
    except:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
    
    # Logo and title
    logo = load_logo()
    if logo:
        logo_size = 100
        logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
        img.paste(logo, (40, 25), logo)
    
    draw.text((160, 40), "MY LIFE & MY CASHFLOW", fill=hex_to_rgb(TEXT_WHITE), font=title_font)
    draw.text((160, 95), "AFFIRMATIONS", fill=hex_to_rgb(GOLD), font=title_font)
    
    # Content
    draw.rectangle([(40, 180), (width - 40, height - 40)], outline=hex_to_rgb(GOLD), width=4, fill=hex_to_rgb(DARK_BG))
    
    content = [
        "✓ 12 Monthly Affirmation Booklets",
        "✓ 366 Daily Affirmations",
        "✓ Exclusive Premium Content",
        "✓ Secure Admin Payment System",
        "✓ Track Your Personal Progress",
        "",
        "Start Your Journey to Prosperity Today!",
    ]
    
    y_pos = 280
    for line in content:
        if line:
            draw.text((100, y_pos), line, fill=hex_to_rgb(TEXT_WHITE), font=body_font)
        y_pos += 100
    
    img.save(f"google_play_graphics/{name}")
    print(f"✅ {size_label} ({name}) created")

def main():
    print("🎨 Generating Professional Google Play Graphics...\n")
    
    # Feature graphic with logo
    create_feature_graphic_with_logo()
    print()
    
    # Phone screenshots with affirmations
    create_phone_screenshot("APRIL 2026", "I am worthy of\nfinancial abundance\nand life success.", 1)
    create_phone_screenshot("DAILY GUIDANCE", "Every day brings new\nopportunities for\ngrowth and prosperity.", 2)
    create_phone_screenshot("UNLOCK PREMIUM", "I manifest wealth\nwith confidence and\ngratitude.", 3)
    print()
    
    # Tablets with logo
    create_tablet_screenshot(1080, 1920, "tablet_7inch_1080x1920.png", "Tablet 7-inch")
    create_tablet_screenshot(1440, 2560, "tablet_10inch_1440x2560.png", "Tablet 10-inch")
    create_tablet_screenshot(1280, 720, "chromebook_1280x720.png", "Chromebook")
    create_tablet_screenshot(1280, 720, "android_xr_1280x720.png", "Android XR")
    
    print("\n" + "="*60)
    print("✅ PROFESSIONAL GRAPHICS CREATED!")
    print("="*60)
    print("\n📁 Location: google_play_graphics/")
    print("\nFiles created:")
    
    for file in sorted(os.listdir("google_play_graphics")):
        filepath = os.path.join("google_play_graphics", file)
        size = os.path.getsize(filepath) / 1024
        print(f"  ✓ {file} ({size:.1f} KB)")
    
    print("\n✨ Graphics match your app branding with logo & colors!")
    print("📤 Ready to upload to Google Play Console!")

if __name__ == "__main__":
    main()
