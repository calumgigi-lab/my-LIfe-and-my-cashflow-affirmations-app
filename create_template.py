import json
from datetime import datetime

def create_affirmations_template():
    """Create a template JSON file for affirmations"""
    months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    booklets = []
    current_year = datetime.now().year
    
    # Create template for 2025 and 2026
    for year in [2025, 2026]:
        for month_num, month_name in enumerate(months, 1):
            booklet = {
                "title": f"Affirmations - {month_name} {year}",
                "month": month_num,
                "year": year,
                "description": f"Daily affirmations for {month_name} {year}",
                "affirmations": []
            }
            
            # Create 28-31 days depending on month
            if month_num in [1, 3, 5, 7, 8, 10, 12]:
                num_days = 31
            elif month_num in [4, 6, 9, 11]:
                num_days = 30
            elif month_num == 2:
                num_days = 29 if year % 4 == 0 else 28
            
            for day in range(1, num_days + 1):
                affirmation = {
                    "dayNumber": day,
                    "title": f"Day {day} - [ADD TITLE HERE]",
                    "content": "[ADD AFFIRMATION CONTENT HERE]"
                }
                booklet["affirmations"].append(affirmation)
            
            booklets.append(booklet)
    
    return booklets

if __name__ == "__main__":
    booklets = create_affirmations_template()
    
    with open("affirmations_template.json", "w", encoding="utf-8") as f:
        json.dump(booklets, f, indent=2, ensure_ascii=False)
    
    print(f"Template created: affirmations_template.json")
    print(f"Total booklets: {len(booklets)}")
    total_affirmations = sum(len(b['affirmations']) for b in booklets)
    print(f"Total affirmations slots: {total_affirmations}")
    print("\nNext steps:")
    print("1. Open affirmations_template.json")
    print("2. Fill in the titles and content for each affirmation from your PDFs")
    print("3. Run: npm run db:push")
    print("4. Run seed script to populate database")
