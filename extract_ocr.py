import fitz  # pymupdf
import easyocr
import json
import os
from pathlib import Path
import re

def get_month_year_from_filename(filename):
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
    
    # Extract year
    for i in range(2020, 2030):
        if str(i) in name:
            year = i
            break
    
    # Extract month
    for month_name, month_num in months.items():
        if month_name in name:
            month = month_num
            break
    
    return month, year

def extract_affirmations_with_ocr(pdf_path):
    """Extract affirmations from PDF using OCR"""
    print(f"  Initializing OCR reader...")
    reader = easyocr.Reader(['en'], gpu=False)
    
    affirmations = []
    doc = fitz.open(pdf_path)
    
    print(f"  Processing {len(doc)} pages...")
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Convert page to image
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better OCR
        img_data = pix.tobytes("png")
        
        # Save temp image
        temp_img = f"temp_page_{page_num}.png"
        with open(temp_img, "wb") as f:
            f.write(img_data)
        
        # Extract text using OCR
        try:
            results = reader.readtext(temp_img)
            text = "\n".join([line[1] for line in results])
            
            # Parse affirmations from text
            lines = text.split('\n')
            for line in lines:
                clean_line = line.strip()
                if clean_line:
                    # Check for day markers
                    match = re.match(r'^day\s+(\d+)[:\s]+(.*)', clean_line, re.IGNORECASE)
                    if match:
                        day_num = int(match.group(1))
                        title = match.group(2).strip() if len(match.group(2).strip()) > 0 else f"Day {day_num}"
                        
                        # Collect content for this affirmation
                        content = []
                        idx = lines.index(line) + 1
                        while idx < len(lines):
                            next_line = lines[idx].strip()
                            if re.match(r'^day\s+\d+', next_line, re.IGNORECASE):
                                break
                            if next_line:
                                content.append(next_line)
                            idx += 1
                        
                        if day_num <= 31:  # Sanity check
                            affirmations.append({
                                "dayNumber": day_num,
                                "title": title,
                                "content": " ".join(content)
                            })
            
            print(f"    Page {page_num + 1}: Extracted {len([a for a in affirmations if a['dayNumber'] <= page_num + 1])} affirmations so far")
        
        except Exception as e:
            print(f"    Page {page_num + 1}: Error - {e}")
        
        finally:
            # Clean up temp image
            if os.path.exists(temp_img):
                os.remove(temp_img)
    
    doc.close()
    
    # Remove duplicates and sort by day
    seen_days = set()
    unique_affirmations = []
    for aff in sorted(affirmations, key=lambda x: x['dayNumber']):
        if aff['dayNumber'] not in seen_days:
            unique_affirmations.append(aff)
            seen_days.add(aff['dayNumber'])
    
    return unique_affirmations[:31]  # Max 31 days

def main():
    pdf_dir = r"C:\Users\MY COMPUTER\Downloads\Affirmations"
    output_file = "affirmations_data.json"
    
    booklets_data = []
    
    # Get all PDF files
    pdf_files = sorted([f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')])
    
    for pdf_file in pdf_files:
        pdf_path = os.path.join(pdf_dir, pdf_file)
        print(f"\nProcessing: {pdf_file}")
        
        # Extract month and year
        month, year = get_month_year_from_filename(pdf_file)
        
        if month and year:
            affirmations = extract_affirmations_with_ocr(pdf_path)
            
            if affirmations:
                month_names = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                             'July', 'August', 'September', 'October', 'November', 'December']
                booklet = {
                    "title": f"Affirmations - {month_names[month]} {year}",
                    "month": month,
                    "year": year,
                    "description": f"Daily affirmations for {month_names[month]} {year}",
                    "affirmations": affirmations
                }
                booklets_data.append(booklet)
                print(f"  ✓ Found {len(affirmations)} affirmations")
            else:
                print(f"  ✗ No affirmations found")
        else:
            print(f"  ✗ Could not extract month/year from filename")
    
    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(booklets_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"Extraction complete!")
    print(f"Saved to: {output_file}")
    print(f"Total booklets: {len(booklets_data)}")
    total_affirmations = sum(len(b['affirmations']) for b in booklets_data)
    print(f"Total affirmations: {total_affirmations}")

if __name__ == "__main__":
    main()
