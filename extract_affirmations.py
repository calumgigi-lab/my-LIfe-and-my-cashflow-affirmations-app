import pdfplumber
import json
import os
from pathlib import Path
from datetime import datetime

def extract_affirmations_from_pdf(pdf_path):
    """Extract affirmations from a PDF file"""
    affirmations = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() + "\n"
            
            # Split by day markers (e.g., "Day 1", "DAY 1", etc.)
            lines = text.split('\n')
            current_day = None
            current_title = None
            current_content = []
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Check if line contains day marker
                if any(line.lower().startswith(f"day {i}") for i in range(1, 32)):
                    # Save previous affirmation
                    if current_day and current_title and current_content:
                        affirmations.append({
                            "dayNumber": current_day,
                            "title": current_title,
                            "content": " ".join(current_content)
                        })
                    
                    # Parse day number
                    parts = line.split()
                    if len(parts) >= 2:
                        try:
                            current_day = int(parts[1])
                            current_title = " ".join(parts[2:]) if len(parts) > 2 else f"Day {current_day}"
                            current_content = []
                        except ValueError:
                            pass
                elif current_day is not None:
                    # Add content to current affirmation
                    current_content.append(line)
            
            # Don't forget the last affirmation
            if current_day and current_title and current_content:
                affirmations.append({
                    "dayNumber": current_day,
                    "title": current_title,
                    "content": " ".join(current_content)
                })
        
        return affirmations
    except Exception as e:
        print(f"Error processing {pdf_path}: {e}")
        return []

def get_month_year_from_filename(filename):
    """Extract month and year from filename"""
    # Remove extension
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

def main():
    pdf_dir = r"C:\Users\MY COMPUTER\Downloads\Affirmations"
    output_file = "affirmations_data.json"
    
    booklets_data = []
    
    # Get all PDF files
    pdf_files = [f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')]
    
    for pdf_file in sorted(pdf_files):
        pdf_path = os.path.join(pdf_dir, pdf_file)
        print(f"Processing: {pdf_file}")
        
        # Extract month and year
        month, year = get_month_year_from_filename(pdf_file)
        
        if month and year:
            affirmations = extract_affirmations_from_pdf(pdf_path)
            
            if affirmations:
                booklet = {
                    "title": f"Affirmations - {['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month]} {year}",
                    "month": month,
                    "year": year,
                    "description": f"Daily affirmations for {['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month]} {year}",
                    "affirmations": affirmations[:31]  # Max 31 days
                }
                booklets_data.append(booklet)
                print(f"  Found {len(affirmations)} affirmations")
            else:
                print(f"  No affirmations found in {pdf_file}")
        else:
            print(f"  Could not extract month/year from {pdf_file}")
    
    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(booklets_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nExtracted data saved to {output_file}")
    print(f"Total booklets: {len(booklets_data)}")

if __name__ == "__main__":
    main()
