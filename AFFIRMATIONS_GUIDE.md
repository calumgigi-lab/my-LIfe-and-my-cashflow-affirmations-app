# Adding Affirmations to Your App

## Quick Start Guide

You have two options to add affirmations:

### **Option A: Manual Entry via Template (Recommended for small datasets)**

1. **Generate the template** (already done):
   - File: `affirmations_template.json`
   - Contains 730 placeholder slots for 24 months (2025-2026)

2. **Fill in the affirmations**:
   - Open `affirmations_template.json`
   - For each day, replace:
     - `"[ADD TITLE HERE]"` with affirmation title
     - `"[ADD AFFIRMATION CONTENT HERE]"` with the affirmation text
   
3. **Seed the database**:
   ```bash
   npm run db:push
   tsx server/seed-new.ts
   ```

### **Option B: Admin Panel (Coming Soon)**

We can create an admin interface in the app for easier data entry.

---

## File Locations

- **Template**: `affirmations_template.json` - Pre-structured template with all days
- **PDF Source**: `C:\Users\MY COMPUTER\Downloads\Affirmations\` - Your original PDFs
- **Seed Script**: `server/seed-new.ts` - Loads affirmations into the database

---

## How to Fill the Template

### Example Format:
```json
{
  "title": "Affirmations - January 2025",
  "month": 1,
  "year": 2025,
  "description": "Daily affirmations for January 2025",
  "affirmations": [
    {
      "dayNumber": 1,
      "title": "New Beginnings",
      "content": "I am stepping into a new year with unlimited potential. Every moment is a fresh start and I embrace the journey ahead."
    },
    {
      "dayNumber": 2,
      "title": "Abundance Flow",
      "content": "Money flows to me effortlessly. I attract prosperity and wealth from every direction. I am grateful for all that comes my way."
    }
  ]
}
```

---

## Database Population Steps

1. **Extract from PDFs** (manual or via OCR):
   - Read your PDF affirmations
   - Copy the title and content into the template

2. **Update the template JSON**:
   - Edit `affirmations_template.json`
   - Fill placeholders with actual content

3. **Push database schema**:
   ```bash
   npm run db:push
   ```

4. **Run seed script**:
   ```bash
   tsx server/seed-new.ts
   ```

5. **Verify in app**:
   - Navigate to individual booklets
   - Check that affirmations display correctly

---

## Color Integration

Your new colors are already integrated:

- **Primary Blue**: `#1976D2` - Main booklet cover color
- **Gold**: `#FFD700` - Accents and highlights
- **Red**: `#DC143C` - Error states and important actions
- **White**: `#FFFFFF` - Light mode background

These are used in:
- `constants/colors.ts` - Color definitions
- Booklet cover colors (default)
- UI components throughout

---

## Next Steps

1. ✅ Colors updated to blue, gold, red, and white
2. 📋 Template created with 730 affirmation slots
3. 📝 **TODO**: Fill template with your PDF affirmations
4. 🌱 **TODO**: Run seed script to populate database
5. 🚀 **TODO**: Test in the app

---

## Questions?

- Template file not working? Check the JSON syntax at `jsonlint.com`
- Database connection issues? Verify `.env` file with database credentials
- Seed script errors? Make sure PostgreSQL is running and database exists
