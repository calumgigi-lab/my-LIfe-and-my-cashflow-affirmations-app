# 🚀 Global Affirmation Hub - Setup Guide

## What's Ready
✅ App colors updated (Blue, Gold, Red, White)
✅ Library component with tabular view of all booklets
✅ 744 sample affirmations ready in template
✅ Admin panel for managing affirmations
✅ Database schema with proper migration files
✅ API endpoints for CRUD operations

## What You Need to Provide
📝 **May 2025 Affirmations** - Your extracted Google Docs text with the full month's content

## Quick Setup Steps

### 1. Set Up Database (Choose One)

#### Option A: Use Neon (Cloud PostgreSQL) - RECOMMENDED ⭐
1. Go to https://neon.tech (free tier available)
2. Sign up and create a new project
3. Copy the **connection string** (postgres://...)
4. Create `.env.local` file in project root with:
   ```
   DATABASE_URL=your_connection_string_here
   ```

#### Option B: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database: `createdb affirmations_app`
3. Create `.env.local`:
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/affirmations_app
   ```

### 2. Provide Your May 2025 Content

Paste your extracted affirmations in this format:
```
Day 1: [Title Here]
[Affirmation text - can be multiple paragraphs]

Day 2: [Title Here]
[Affirmation text]

...and so on for all 31 days of May
```

Or simply paste all the extracted text and I'll format it automatically.

### 3. Import & Run

Once you provide the content:
```bash
# 1. Set up database
npm run db:push

# 2. Import May 2025 affirmations
npm run affirmations:bulk may_2025.txt

# 3. Seed to database  
npm run affirmations:seed

# 4. Start servers
npm run server:dev      # In one terminal
npm run expo:dev        # In another terminal
```

## File Locations
- 📂 Workspace: `c:\Users\MY COMPUTER\Downloads\Global-Affirmation-Hub-1\Global-Affirmation-Hub-1`
- 📄 Library view: `app/(main)/library.tsx` ✅ Ready
- 📄 Admin panel: `app/admin-affirmations.tsx` ✅ Ready
- 📊 Color theme: `constants/colors.ts` ✅ Updated (Blue, Gold, Red, White)
