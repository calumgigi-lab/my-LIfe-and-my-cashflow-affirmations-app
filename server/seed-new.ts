import * as dotenv from "dotenv";
import * as pathLib from "path";
import * as fs from "fs";
import path from "path";
import { getRandomAffirmationImage } from "@/lib/affirmation-images";

// Load environment variables from .env.local BEFORE any other modules
const envLocalPath = pathLib.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const result = dotenv.config({ path: envLocalPath });
  if (result.error) {
    console.warn("⚠ Warning loading .env.local:", result.error.message);
  } else {
    console.log("✓ Loaded .env.local");
  }
}

import { db } from "./db";
import { booklets, affirmations, affirmationCompletions, monthlyPurchases } from "@shared/schema";
import { count } from "drizzle-orm";

interface AffirmationData {
  dayNumber: number;
  title: string;
  content: string;
}

interface BookletData {
  title: string;
  month: number;
  year: number;
  description: string;
  affirmations: AffirmationData[];
}

async function loadAffirmationsFromJSON(): Promise<BookletData[]> {
  try {
    const templatePath = path.join(process.cwd(), "affirmations_template.json");
    if (fs.existsSync(templatePath)) {
      const data = fs.readFileSync(templatePath, "utf-8");
      const booklets: BookletData[] = JSON.parse(data);
      
      // Filter out booklets with placeholder content for now
      return booklets.filter(b => 
        b.affirmations.some(a => 
          !a.content.includes("[ADD AFFIRMATION CONTENT HERE]") ||
          a.content.trim().length > 30
        )
      );
    }
  } catch (error) {
    console.log("Could not load affirmations_template.json, using sample data instead");
  }
  
  return [];
}

// Sample affirmations as fallback
const sampleAffirmations: BookletData[] = [
  {
    title: "Affirmations - January 2025",
    month: 1,
    year: 2025,
    description: "Daily affirmations for January 2025",
    affirmations: [
      {
        dayNumber: 1,
        title: "New Beginnings",
        content:
          "I am stepping into a new year filled with limitless possibilities. Every breath I take fills me with the energy of fresh starts and renewed purpose. I release the weight of the past and embrace the promise of what is to come.\n\nMy mind is clear, my heart is open, and my spirit is ready to receive all the abundance the universe has prepared for me. I am worthy of every blessing that flows into my life.\n\nToday I choose to believe in myself, in my dreams, and in my ability to create the life I desire. I am the architect of my destiny and I build it with intention and faith.",
      },
      {
        dayNumber: 2,
        title: "Abundance Mindset",
        content:
          "I am a magnet for wealth and prosperity. Money flows to me easily and effortlessly from multiple streams of income. I am open to receiving abundance in all its forms.\n\nI release all limiting beliefs about money and replace them with thoughts of prosperity and financial freedom. I deserve to be wealthy and I accept wealth with gratitude.\n\nEvery dollar I spend returns to me multiplied. I am financially wise and I make decisions that grow my wealth consistently and sustainably.",
      },
      {
        dayNumber: 3,
        title: "Self Worth",
        content:
          "I am valuable beyond measure. My worth is not determined by my bank account, my title, or anyone's opinion of me. I am inherently worthy of love, success, and abundance.\n\nI walk in confidence knowing that I bring unique gifts to this world. There is no one like me and my presence makes a difference in the lives of those around me.\n\nI honor myself by setting boundaries, speaking my truth, and investing in my personal growth. I am committed to becoming the best version of myself every single day.",
      },
    ],
  },
];

const monthNames = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const coverColors = [
  "",
  "#1976D2",
  "#42A5F5",
  "#1565C0",
  "#FFD700",
  "#FBC02D",
  "#1976D2",
  "#DC143C",
  "#FF6B6B",
  "#42A5F5",
  "#1976D2",
  "#FFD700",
  "#FBC02D",
];

async function seed() {
  console.log("🌟 Starting database seed...");

  // Clear existing data (respecting foreign key constraints)
  console.log("🗑️  Clearing existing data...");
  await db.delete(monthlyPurchases);
  await db.delete(affirmationCompletions);
  await db.delete(affirmations);
  await db.delete(booklets);
  console.log("✓ Cleared existing booklets, affirmations, and completions");

  // Try to load affirmations from JSON template
  let bookletData = await loadAffirmationsFromJSON();

  // Fall back to sample data if template is empty or unavailable
  if (bookletData.length === 0) {
    console.log(
      "📋 Using sample affirmations (fill affirmations_template.json to use your own)"
    );
    bookletData = sampleAffirmations;
  } else {
    console.log(
      `📋 Loaded ${bookletData.length} booklets from affirmations_template.json`
    );
  }

  // Seed all booklets
  let successCount = 0;
  let affirmationCount = 0;
  
  for (const bookletInfo of bookletData) {
    try {
      const [createdBooklet] = await db
        .insert(booklets)
        .values({
          title: bookletInfo.title,
          month: bookletInfo.month,
          year: bookletInfo.year,
          description: bookletInfo.description,
          coverColor:
            coverColors[bookletInfo.month] || coverColors[1],
        })
        .returning();

      console.log(`✅ Created booklet: ${createdBooklet.title}`);

      // Add affirmations for this booklet
      for (const aff of bookletInfo.affirmations) {
        const imageUrl = getRandomAffirmationImage(createdBooklet.id, aff.dayNumber);
        
        await db.insert(affirmations).values({
          bookletId: createdBooklet.id,
          dayNumber: aff.dayNumber,
          title: aff.title,
          content: aff.content,
          imageUrl,
        });
      }

      console.log(
        `   ✨ Added ${bookletInfo.affirmations.length} affirmations`
      );
      
      successCount++;
      affirmationCount += bookletInfo.affirmations.length;
    } catch (err) {
      console.error(`❌ Error seeding booklet "${bookletInfo.title}":`, err instanceof Error ? err.message : err);
      console.log(`   Continuing with next booklet...`);
    }
  }

  console.log("\n🎉 Seeding complete!");
  console.log("\n📚 Summary:");
  console.log(`   Successfully seeded: ${successCount}/${bookletData.length} booklets`);
  console.log(`   Total affirmations: ${affirmationCount}`);
}

seed()
  .then(() => {
    console.log("\n✅ Database sealed with affirmations!\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Seed error:", err);
    process.exit(1);
  });
