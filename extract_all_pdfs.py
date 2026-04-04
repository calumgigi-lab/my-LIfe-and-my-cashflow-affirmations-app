#!/usr/bin/env python3
"""
ULTRA-FAST AFFIRMATION PDF EXTRACTOR
Extracts affirmations from image-based PDFs using Keras-OCR
Saves directly to .txt files ready for bulk import
"""

import fitz  # PyMuPDF
import keras_ocr
import os
import re
from pathlib import Path

# Initialize OCR
print("🚀 Initializing OCR engine...\n")
pipeline = keras_ocr.pipeline.Pipeline()

def extract_month_year_from_filename(filename):
    """Extract month and year from filename"""
    name = filename.replace('.pdf', '').upper()
    
    months = {
        'JANUARY': 1, 'JAN': 1,
        'FEBRUARY': 2, 'FEB': 2,
        'MARCH': 3, 'MAR': 3,
        'APRIL': 4, 'APR': 4,
        'MAY': 5,
        'JUNE': 6, 'JUN': 6,
        'JULY': 7, 'JUL': 7,
        'AUGUST': 8, 'AUG': 8,
        'SEPTEMBER': 9, 'SEP': 9,
        'OCTOBER': 10, 'OCT': 10,
        'NOVEMBER': 11, 'NOV': 11,
        'DECEMBER': 12, 'DEC': 12
    }
    
    month = None
    year = None
    
    for i in range(2020, 2030):
        if str(i) in name:
            year = i
            break
    
    for month_name, month_num in months.items():
        if month_name in name:
            month = month_num
            break
    
    return month, year

def extract_affirmations_from_pdf(pdf_path, output_file):
    """Extract affirmations and save to text file"""
    print(f"Processing: {os.path.basename(pdf_path)}")
    
    doc = fitz.open(pdf_path)
    month, year = extract_month_year_from_filename(os.path.basename(pdf_path))
    
    if not month or not year:
        print(f"  ❌ Could not parse month/year\n")
        return False
    
    month_names = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December']
    
    print(f"  📅 {month_names[month]} {year}")
    print(f"  📄 Processing {len(doc)} pages...")
    
    all_text = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom
        
        # Save temp image
        img_path = f"temp_page_{page_num}.png"
        pix.save(img_path)
        
        try:
            # Extract text using Keras-OCR
            images = [keras_ocr.tools.read(img_path)]
            prediction_groups = pipeline.recognize(images)
            
            # Combine text from all boxes
            page_text = ""
            for predictions in prediction_groups:
                for text, box in predictions:
                    page_text += text + " "
                page_text += "\n"
            
            all_text.append(page_text)
            print(f"    Page {page_num + 1}/{len(doc)} ✓")
            
        except Exception as e:
            print(f"    Page {page_num + 1} error: {e}")
        finally:
            # Clean up
            if os.path.exists(img_path):
                os.remove(img_path)
    
    doc.close()
    
    # Parse affirmations from text
    full_text = "\n".join(all_text)
    affirmations = []
    
    # Split by day markers
    day_pattern = r'(?:day\s+|^)?(\d{1,2})[.:\s]+'
    lines = full_text.split('\n')
    
    current_day = None
    current_title = None
    current_content = []
    
    for line in lines:
        line_clean = line.strip()
        if not line_clean or len(line_clean) < 2:
            continue
        
        # Check for day marker
        day_match = re.match(day_pattern, line_clean, re.IGNORECASE)
        if day_match:
            # Save previous
            if current_day and current_title:
                content = " ".join(current_content).strip()
                if content and len(content) > 20:
                    affirmations.append({
                        'day': current_day,
                        'title': current_title,
                        'content': content
                    })
            
            current_day = int(day_match.group(1))
            remaining = line_clean[day_match.end():].strip()
            current_title = remaining if remaining else f"Day {current_day}"
            current_content = []
            
        elif current_day is not None and len(line_clean) > 5:
            current_content.append(line_clean)
    
    # Last one
    if current_day and current_title:
        content = " ".join(current_content).strip()
        if content and len(content) > 20:
            affirmations.append({
                'day': current_day,
                'title': current_title,
                'content': content
            })
    
    # Save to text file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"Month: {month_names[month]}\n")
        f.write(f"Year: {year}\n\n")
        
        for aff in sorted(affirmations, key=lambda x: x['day'])[:31]:
            f.write(f"Day {aff['day']}: {aff['title']}\n")
            f.write(f"{aff['content']}\n\n")
    
    print(f"  ✅ Extracted {len(affirmations)} affirmations")
    print(f"  💾 Saved to: {output_file}\n")
    
    return len(affirmations) > 0

def main():
    pdf_dir = r"C:\Users\MY COMPUTER\Downloads\Affirmations"
    txt_dir = os.getcwd()
    
    if not os.path.exists(pdf_dir):
        print(f"❌ PDF directory not found: {pdf_dir}")
        return
    
    pdf_files = sorted([f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')])
    
    if not pdf_files:
        print(f"❌ No PDF files found in {pdf_dir}")
        return
    
    print(f"📚 Found {len(pdf_files)} PDF files\n")
    print("=" * 60 + "\n")
    
    successful = 0
    for pdf_file in pdf_files:
        pdf_path = os.path.join(pdf_dir, pdf_file)
        
        # Determine output filename
        month, year = extract_month_year_from_filename(pdf_file)
        if month and year:
            month_names = ['', 'january', 'february', 'march', 'april', 'may', 'june',
                          'july', 'august', 'september', 'october', 'november', 'december']
            output_file = f"{month_names[month]}_{year}.txt"
        else:
            output_file = pdf_file.replace('.pdf', '.txt')
        
        output_path = os.path.join(txt_dir, output_file)
        
        try:
            if extract_affirmations_from_pdf(pdf_path, output_path):
                successful += 1
        except Exception as e:
            print(f"  ❌ Error: {e}\n")
    
    print("=" * 60)
    print(f"\n✅ SUCCESS! Extracted {successful}/{len(pdf_files)} PDFs")
    print(f"\n📋 Text files created (ready for bulk import):")
    
    txt_files = [f for f in os.listdir(txt_dir) if f.endswith('.txt') and f != 'sample-affirmations.txt']
    for txt_file in sorted(txt_files):
        size = os.path.getsize(os.path.join(txt_dir, txt_file)) / 1024
        print(f"   ✓ {txt_file} ({size:.1f} KB)")
    
    print(f"\n🚀 Next step:")
    print(f"   For each file, run:")
    print(f"   npm run affirmations:bulk january_2025.txt")
    print(f"   npm run affirmations:bulk february_2025.txt")
    print(f"   ... etc\n")

if __name__ == "__main__":
    main()
