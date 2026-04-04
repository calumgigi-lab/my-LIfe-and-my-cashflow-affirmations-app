import { db } from "./db";
import { booklets, affirmations, affirmationCompletions } from "@shared/schema";
import { eq, count } from "drizzle-orm";
import template from "../affirmations_template.json";

const sampleAffirmations: Record<number, { title: string; paragraphs: string[] }[]> = {
  1: [
    { title: "New Beginnings", paragraphs: [
      "I am stepping into a new year filled with limitless possibilities. Every breath I take fills me with the energy of fresh starts and renewed purpose. I release the weight of the past and embrace the promise of what is to come.",
      "My mind is clear, my heart is open, and my spirit is ready to receive all the abundance the universe has prepared for me. I am worthy of every blessing that flows into my life.",
      "Today I choose to believe in myself, in my dreams, and in my ability to create the life I desire. I am the architect of my destiny and I build it with intention and faith."
    ]},
    { title: "Abundance Mindset", paragraphs: [
      "I am a magnet for wealth and prosperity. Money flows to me easily and effortlessly from multiple streams of income. I am open to receiving abundance in all its forms.",
      "I release all limiting beliefs about money and replace them with thoughts of prosperity and financial freedom. I deserve to be wealthy and I accept wealth with gratitude.",
      "Every dollar I spend returns to me multiplied. I am financially wise and I make decisions that grow my wealth consistently and sustainably."
    ]},
    { title: "Self Worth", paragraphs: [
      "I am valuable beyond measure. My worth is not determined by my bank account, my title, or anyone's opinion of me. I am inherently worthy of love, success, and abundance.",
      "I walk in confidence knowing that I bring unique gifts to this world. There is no one like me and my presence makes a difference in the lives of those around me.",
      "I honor myself by setting boundaries, speaking my truth, and investing in my personal growth. I am committed to becoming the best version of myself every single day."
    ]},
    { title: "Gratitude Flow", paragraphs: [
      "I am deeply grateful for everything in my life right now. From the air I breathe to the ground beneath my feet, I recognize the blessings that surround me at every moment.",
      "Gratitude opens the door to more abundance. The more thankful I am, the more reasons I find to be thankful. I live in a constant state of appreciation and wonder.",
      "I give thanks for the challenges too, for they have shaped me into who I am today. Every obstacle was a stepping stone and every setback was a setup for a greater comeback."
    ]},
    { title: "Vision and Purpose", paragraphs: [
      "I have a clear vision for my life and I pursue it with unwavering determination. My purpose is written in my heart and I follow it with passion and persistence.",
      "I see myself living the life of my dreams. I visualize my success daily and I feel it in every fiber of my being. What I see in my mind, I will hold in my hands.",
      "I am not distracted by temporary setbacks or the opinions of others. My focus is sharp, my intention is pure, and my commitment to my vision is absolute."
    ]},
    { title: "Health and Vitality", paragraphs: [
      "My body is a temple of health and vitality. I nourish it with wholesome food, refreshing water, and consistent movement. I am grateful for the strength that carries me through each day.",
      "Every cell in my body vibrates with energy and wellness. I release all stress and tension, replacing them with peace and harmony. My mind and body work together in perfect balance.",
      "I prioritize my well-being because I know that a healthy body supports a wealthy mind. I am committed to habits that energize and revitalize me from the inside out."
    ]},
    { title: "Financial Freedom", paragraphs: [
      "I am on the path to complete financial freedom. Every action I take brings me closer to a life where money is a tool, not a worry. I am building generational wealth.",
      "I make smart financial decisions. I save, I invest, and I multiply my resources with wisdom and patience. My financial intelligence grows stronger every day.",
      "Debt does not define me. I am breaking free from every financial chain and stepping into a future of unlimited prosperity. My cash flow is positive and growing."
    ]},
    { title: "Resilience", paragraphs: [
      "I am resilient. No matter what life throws at me, I rise again stronger, wiser, and more determined than before. Challenges are fuel for my growth.",
      "I do not break under pressure. I bend, I adapt, and I overcome. My strength comes not from avoiding difficulty but from facing it head-on with courage and grace.",
      "I am built for this journey. Every scar tells a story of survival and every struggle reveals the depth of my character. I am unstoppable."
    ]},
    { title: "Relationships", paragraphs: [
      "I attract healthy, loving, and supportive relationships into my life. I am surrounded by people who inspire me, challenge me, and celebrate my growth.",
      "I give love freely and receive it openly. My relationships are built on trust, respect, and genuine connection. I am a source of positivity in the lives of others.",
      "I release toxic ties and forgive those who have hurt me. Letting go is not weakness, it is the ultimate act of self-love and liberation."
    ]},
    { title: "Creative Power", paragraphs: [
      "I am endlessly creative. Ideas flow to me with ease and I have the courage to bring them to life. My creativity is a gift that I share with the world.",
      "I trust my creative instincts and I act on my inspirations without hesitation. Every project I start carries the seed of greatness and I nurture it to fruition.",
      "The universe supports my creative endeavors. Resources, connections, and opportunities appear at the perfect time to help me manifest my ideas into reality."
    ]},
    { title: "Leadership", paragraphs: [
      "I am a leader. I lead by example, with integrity, and with a heart of service. People are drawn to my vision and inspired by my actions.",
      "I make decisions with confidence and clarity. I do not need permission to step into my power. I am the CEO of my life and I run it with excellence.",
      "My leadership creates impact beyond myself. I lift others as I rise and I create opportunities for those who follow in my footsteps."
    ]},
    { title: "Manifestation", paragraphs: [
      "I am a powerful manifestor. What I speak into existence comes to pass. My words carry weight, my intentions are clear, and my faith is unshakable.",
      "I align my thoughts, feelings, and actions with my highest goals. The universe conspires in my favor and delivers exactly what I need at exactly the right time.",
      "I am living proof that manifestation works. I celebrate every sign, every synchronicity, and every breakthrough as confirmation that I am on the right path."
    ]},
    { title: "Legacy", paragraphs: [
      "I am building a legacy that will outlive me. Everything I do today plants seeds for future generations. I am creating something meaningful and lasting.",
      "My life is a testament to what is possible when you believe in yourself and refuse to give up. I am writing a story that will inspire others long after I am gone.",
      "I close this month with gratitude in my heart and fire in my spirit. I am ready for what comes next because I know that the best is yet to come."
    ]},
    { title: "Persistence", paragraphs: [
      "I am persistent in the pursuit of my dreams. I do not give up when things get hard. I push through resistance because I know that breakthroughs follow breakdowns.",
      "Every day I show up, I prove my commitment to my goals. Consistency is my superpower and discipline is my greatest ally on this journey to success.",
      "I celebrate small wins along the way because they are proof that progress is happening. I trust the process and I keep moving forward no matter what."
    ]},
    { title: "Inner Peace", paragraphs: [
      "I am at peace with who I am and where I am on my journey. I do not compare myself to others because my path is uniquely mine and perfectly timed.",
      "I find stillness in the midst of chaos. My inner world is calm, centered, and grounded. I carry this peace with me wherever I go.",
      "I choose peace over perfection, progress over pressure, and faith over fear. My life unfolds in divine order and I trust every step of the way."
    ]},
  ],
};

for (let m = 2; m <= 12; m++) {
  sampleAffirmations[m] = [];
  const monthThemes = [
    [], // placeholder for month 0
    [], // january already defined
    ["Love Yourself", "Heart of Gold", "Inner Wealth", "Compassion Cash", "Self-Investment"],
    ["Spring Forward", "Growth Season", "Planting Seeds", "Renewal Energy", "Blooming Wealth"],
    ["Power Moves", "Bold Action", "Fearless Faith", "Unstoppable Force", "Conquer Today"],
    ["Momentum Builder", "Rising Tide", "Elevate Daily", "Victory Mindset", "Champion Spirit"],
    ["Midyear Reset", "Recharge Power", "Double Down", "Focus Fire", "Clarity Vision"],
    ["Freedom Walk", "Independence Day", "Liberty Mind", "Sovereign Spirit", "Unchained Soul"],
    ["Lion Energy", "Royal Mindset", "Crown Mentality", "King Moves", "Throne Ready"],
    ["Harvest Season", "Reaping Time", "Collect Blessings", "Fruition Flow", "Reward Cycle"],
    ["Transformation", "Phoenix Rising", "Level Up", "Evolve Now", "Next Chapter"],
    ["Thankful Heart", "Gratitude Gold", "Bless Up", "Overflow Living", "Rich Spirit"],
    ["Finish Strong", "Year End Power", "Close Champion", "Victory Lap", "New Dawn"],
  ];

  const themes = monthThemes[m] || ["Daily Power", "Inner Strength", "Cash Flow", "Wealth Mind", "Success Path"];
  const daysInMonth = new Date(2025, m, 0).getDate();

  for (let d = 1; d <= Math.min(daysInMonth, 15); d++) {
    const themeIndex = (d - 1) % themes.length;
    sampleAffirmations[m].push({
      title: themes[themeIndex],
      paragraphs: [
        `I wake up today on day ${d} with renewed energy and purpose. The month of ${getMonthName(m)} brings fresh opportunities and I am ready to seize every single one of them. My mind is set on abundance.`,
        `I speak wealth into my life. My cash flow increases daily and I am attracting financial opportunities that align with my purpose. I am grateful for the money that flows to me now.`,
        `I am powerful beyond measure. Today I affirm my worth, my value, and my capacity to achieve greatness. Nothing and no one can stop what is destined for me. I move in confidence and faith.`,
      ],
    });
  }
}

function getMonthName(month: number): string {
  const names = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return names[month] || "";
}

const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const coverColors = [
  "", "#C8973E", "#D4573B", "#5B8C5A", "#4A90D9", "#8B5CF6",
  "#E8973E", "#FF6B6B", "#3B82F6", "#F59E0B", "#10B981",
  "#EC4899", "#6366F1",
];

async function seed() {
  console.log("Seeding database...");

  // Delete all related data using TRUNCATE CASCADE for clean slate
  try {
    await db.execute(`TRUNCATE TABLE "booklets" CASCADE`);
  } catch {
    // Fallback to individual deletes if cascade fails
    try {
      await db.execute(`DELETE FROM "affirmation_completions"`);
      await db.execute(`DELETE FROM "affirmations"`);
      await db.execute(`DELETE FROM "booklets"`);
    } catch {
      await db.delete(affirmationCompletions);
      await db.delete(affirmations);
      await db.delete(booklets);
    }
  }
  console.log("Cleared existing data...");

  // Load affirmations from template file
  const affirmationsData = require('../affirmations_template.json');
  
  for (const bookletData of affirmationsData) {
    const [booklet] = await db
      .insert(booklets)
      .values({
        title: bookletData.title,
        month: bookletData.month,
        year: bookletData.year,
        description: bookletData.description,
        coverColor: "#8B5CF6",
      })
      .returning();

    console.log(`Created booklet: ${booklet.title}`);

    for (const aff of bookletData.affirmations) {
      await db.insert(affirmations).values({
        bookletId: booklet.id,
        dayNumber: aff.dayNumber,
        title: aff.title,
        content: aff.content,
      });
    }

    console.log(`  Added ${bookletData.affirmations.length} affirmations`);
  }

  console.log("Seeding complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
