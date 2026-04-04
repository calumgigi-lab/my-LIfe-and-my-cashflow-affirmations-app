import pdfplumber
import os

pdf_dir = r"C:\Users\MY COMPUTER\Downloads\Affirmations"
pdf_files = [f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')]

# Extract and preview first PDF
if pdf_files:
    pdf_path = os.path.join(pdf_dir, pdf_files[0])
    print(f"Analyzing: {pdf_files[0]}\n")
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Number of pages: {len(pdf.pages)}\n")
        
        # Show first 1000 characters of page 1
        text = pdf.pages[0].extract_text()
        print("First page content:")
        print(text[:2000])
        print("\n" + "="*80 + "\n")
        
        # Show second page if exists
        if len(pdf.pages) > 1:
            text = pdf.pages[1].extract_text()
            print("Second page content:")
            print(text[:2000])
