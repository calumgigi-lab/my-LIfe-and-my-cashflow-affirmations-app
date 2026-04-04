import fitz  # pymupdf
import os
import json

pdf_dir = r"C:\Users\MY COMPUTER\Downloads\Affirmations"
pdf_files = [f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')]

# Extract and preview first PDF
if pdf_files:
    pdf_path = os.path.join(pdf_dir, pdf_files[0])
    print(f"Analyzing with PyMuPDF: {pdf_files[0]}\n")
    
    doc = fitz.open(pdf_path)
    print(f"Number of pages: {len(doc)}\n")
    
    # Check if pages are text-based or image-based
    for i in range(min(3, len(doc))):
        page = doc[i]
        text = page.get_text()
        print(f"Page {i+1} text length: {len(text)}")
        print(f"First 1500 chars:\n{text[:1500]}")
        print("\n" + "="*80 + "\n")
        
        # Check for images
        images = page.get_images()
        print(f"Page {i+1} has {len(images)} images")
        print("="*80 + "\n")
    
    doc.close()
