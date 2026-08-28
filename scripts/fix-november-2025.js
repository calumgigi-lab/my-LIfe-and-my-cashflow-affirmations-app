require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

const NOVEMBER = [
  {
    day: 1,
    title: "THEY'RE OBEDIENT TO ME",
    content: "I affirm that this month of November is obedient to me. Every money I need comes to me, every desire, increase, supernatural promotions, happiness, house, lands, honour, strange health, fearful favors, contacts and cars are obedient to me this month. Occultic powers, might, dominions, governments, organisations, human and spirits are obedient to me. The power, the influence, the fame, the real money, the soul harvests, the nations, the impacts, the riches, the people, the flags, the roads, the seas, day and night, the galaxies; the sun, the moon and the stars and all the elements are obedient to me. My words are laws and regulations to everything and everyone I speak to this month. Folks, you watch me this season and see so much things to talk about. This is what it is and no power in creation can stand it. I don't cower neither do I bow to pressures of this life, my divine consciousness has captured my soul. GloryyyyyyyyyYYYYYYYy. Shout to yourself: OVERCOME!!!",
  },
  {
    day: 2,
    title: "NOTHING IS TOO BIG FOR ME",
    content: "My accounts are growing bigger everyday as money angels are mysteriously watching and flooding the mega cash into my coffers. Oh hallelujah, glakite zibilebishi lezee dakot!! Jagaliga titi gasia, guru garabi!! Heeeeeeeey, Everything has changed completely for me and conscious of my immortality, you don't wanna mess with me because I don't lose in life!!! I have refused to bow nor cower. I live in the realm of possibilities and eternal life works in every fibre of my being, causing me to live the Spirit life and right now; nothing is too big for me. Hallelujah!!! Zebedidi gakanusia angro cash!!!",
  },
  {
    day: 3,
    title: "I AM CHRIST INCARNATE",
    content: "Awesome eeeee!!! Living in the abounding grace of God, I have come into the big finances. Not by might nor by power but by the Spirit of God. I affirm that life has become so beautiful and so exciting for me as I overcome every challenge that comes my way. The weak bows out and succumbs, but I don't because I'm not the weak. I'm the stronger one and the Christ incarnate on this earth. Hallelujah Hallelujah!!! Blessed be God forever. Please let's pray in the Spirit!",
  },
  {
    day: 4,
    title: "EVERY MOUNTAIN IS SHIFTING",
    content: "Oh Glory to God!, Conscious of my divine life, I declare that I live in eternity today, boldly partaking in the inheritance of the saints in the light. Oh, what a life!!! Hallelujah!!! Every mountain is shifting and moving for my sake as I'm done with impossibilities. Constant and mega cashflows, peace with prosperity and unbelievable favours attend to me. Right now, I'm confidently subduing all things and joyfully occupying my place till He comes. Hallelujah! Who can stop me!!! No one!!! Please speak in other tongues!!!",
  },
  {
    day: 5,
    title: "THE GLORY IS WITH ME",
    content: "I affirm that life gets sweeter for me with each passing hour, day, weeks, months and years because the glory is with me, causing me to triumph with every step of the way and commanding every good thing to flow my way. As the seed of God, I have defeated this evil world with all its confusion, greed, fear, failure, lack, resentments, hatred, diseases and death. They die because they don't know neither do they understand but I don't die because I know I'm immortal.!! GloryyyyyYyYYYYYYYYyY. Please let's begin to speak in other tongues!",
  },
  {
    day: 6,
    title: "THE FUTURE IS WITH ME",
    content: "Hallelujah!! God's grace is in my tongue, framing my course of life. So my worlds are designed and decorated with greatest and deepest riches, happiness, honour, glory, beauty and excellence. The future is with me, and this future I see is void of corruption and defeat. So classy and so rich, with uninterrupted flow of indestructible, blameless, fearless, ageless and deathless life. Oh what a life I have in Christ Jesus!!! So unkillable, so graced and so beautiful!!! Shout Gloryyyyy!!! Please Pray in the Spirit!!!",
  },
  {
    day: 7,
    title: "I AM THE REVEALED SON OF GOD",
    content: "Hallelujah, the whole creation waited for the revealing of the Sons of God. Heeey!!! Finally, we are revealed and we are here!!! Yes, we are the glory age and the terminal generation. Coming with so much Pomp and Endless Energy. Mighty in Power. Mighty in cash. Mighty in number, mighty in fame, mighty in dominion, mighty in influence, mighty in demonstrations and diverse manifestations. Oh What a race!!! What an inheritance!!! What a possession, What a life and what a time!!! GloryyyyyyYyyyyyyYYYy!!!",
  },
  {
    day: 8,
    title: "MONIES CAN'T STOP FLOWING INTO MY LIFE",
    content: "Glory to God! Now that I'm made Christ, I'm not permitted to lose my life nor allowed to live a low life. The Message of life in my mouth is spreading like wild fire and My life and My Cashflow Affirmations is hitting nations!!! Oh Gloryyyyyyyyy! Yes, aging cells don't exist in my new life, so I don't age. Immortality runs in my entire being. And I got this control over money that monies can't stop flowing into my life and accounts. This is what it is! Hallelujah! Please Pray in the Spirit!!!",
  },
  {
    day: 9,
    title: "WE ARE THE LAST HOUSE",
    content: "HALLELUJAH!!! In my systems, sickness and infirmities got no chance at all because I live the life of the Spirit. And there's this attraction in me that can't stop good people and good things flooding to me. I affirm that I will never lose my calling and will not depart from this Heavenly Vision. No I won't, Never! We are the last House and that's who we are. I declare that I won't lose my identity to the devils, human gang-ups, lack, delay, disappointments, procrastinations, doubt & unbelief, disease and death. Oh Blessed be God Forever!! Please Pray in the Spirit...",
  },
  {
    day: 10,
    title: "I REBEL AGAINST LACK",
    content: "Glory Glory Glory Glory Glory!!! I have subdued sickness, infirmities, disease and death. Failure sees me and flees. Lack, frustration and stagnation flee as I appear. Evil men and women flee at my presence. Forces scatter at the hearing of my name. Made in the same manner as Jesus, I'm a life-giving Spirit and whatsoever and whosoever couldn't stand Jesus won't stand me. His blood runs in my veins. His dominion controls my thoughts. His riches attend to my life and cash ceaselessly flows into my life. I'm so rich in this world!! You don't get!!! Heeeey, I pluck money from trees!! Zegi baba, shinti tata!! Oh Hallelujah! Let's pray in the Spirit folks!",
  },
  {
    day: 11,
    title: "DOMINION OVER ALL THE SYSTEMS",
    content: "I affirm that the treasures of nations are turning into my accounts by fire. And I command every control dominions of darkness have over the flow of cash in all nations to crash. I take charge over nations in the Name of Jesus; the treasures, the people, territories, land, seas, air space, cyber space, territorial waters and continental shelfs as I forcefully possess my possessions. Oh blessed be God forever! There's no stopping me till every dime is in my account. Hallelujah!! Pray in the Spirit..",
  },
  {
    day: 12,
    title: "KINGING OVER MONEY",
    content: "GloryyyyyYyyyyyyyyyyy! The big money is coming and I affirm that no dime will escape me. I'm kinging over all the forces of this earth as I lay up cash as dust and US dollars as the stones of the brooks. The Almighty is my defense and I have plenty of money. I rebel against lack, small money, unfruitfulness, near success syndrome and all kinds of failure. I declare that I'm financially buoyant. Supernaturally amazing wealth for the end time Revival and greatest move of the Spirit. This is my life and my Consciousness. Shout!! Come on, please Pray in the Spirit.",
  },
  {
    day: 13,
    title: "I AM INCORRUPTIBLE",
    content: "Hellish forces are bowing out and oppositions whether human or spirits are subdued. Arguments over my possessions are cast down and every other thing against the knowledge of God concerning my finances is punished. No matter the virus or the diseases that flies in this world I don't fear, because I'm uninfectable, incorruptible and imperishable. Living above shame and reproach, I have escaped the corruption that is in this world through lust. Hallelujah!!! Pray in the Spirit!!!",
  },
  {
    day: 14,
    title: "THE MONIES ARE COMING",
    content: "I'm forever done with lack and its terrors. The currencies of nations are obedient to me as I call, the monies are coming and ceaselessly flooding into my accounts. Thank you Jesus!!! Navigating through this wicked world with fearful grace and favors, I'm immortal and invincible and absolutely unstoppable!!! Oh glory to God!!! Glory Era aaaaaaa!!! Please pray in the Spirit!!!",
  },
  {
    day: 15,
    title: "I HAVE CONQUERED DEFEATED THOUGHTS",
    content: "I affirm that every defeated thought is cast down, having rescued my mind from doubt and unbelief and my eyes from corruption. I'm armed with revelations, possessions and greatest manifestations. I affirm that nations are calling me, as they turn their treasures into my accounts. Oh what a life I've got! Hallelujah, Hallelujah! Please Let's Begin to Pray in the Spirit.",
  },
  {
    day: 16,
    title: "WE SPREAD LIKE THE AIR",
    content: "I decree and declare that all over the world; everything, everyone are responding to this heavenly Vision. As we spread like the air, we startle many nations, Kings shut their mouths at us for what they have not been told they shall see and what they have not heard they shall consider. Oh hallelujah!!! What a life! What a race! What a glory! What an era and what a time!!! We are spreading like the air and suddenly, impacting the world most incredibly and through us men are getting saved and free from the bondage of satan and his cohorts. Yes, we are the light of the world and every nation will feel this light. Hallelujah. Somebody Shout!! Please let's begin to pray in the Spirit.",
  },
  {
    day: 17,
    title: "I LIVE THE LIFE OF THE SPIRIT",
    content: "Immortality runs in my blood. I have walked away from death and its crushing tendencies. I now live the life of the Spirit, a life that is superior to sickness, infirmities, accidents, diseases and death. I have been raised not to lose, so I will never lose my blessings to any hater, plots or conspiracies. Heeeeeyaaaaaaa! GloryyyyYyyyyYYYyyyyy Please pray in the Spirit...",
  },
  {
    day: 18,
    title: "I HAVE SETTLED FOR THE BEST",
    content: "I affirm that I will never be a victim of any evil or wicked system. Amen! There's something in me this evil system can't handle. My presence repels them with their shameless boldness. Oh Hallelujah! Blessed to be in this last Move of the Spirit, I have settled for the best. I decree endless days of mega cashflow in my life with peace that transcends human understanding. I'm not bowing out and there's no stopping me. Hallelujah!!! Blessed be God Forever More!! Pray in the Spirit..",
  },
  {
    day: 19,
    title: "I AM READY FOR THE LAST MOVE",
    content: "Yes!!! I'm born and made for this time and no evil system can cheat me of my possession and manifestations. I'm a terror to the hellish forces and all the evil powers of darkness, human or spirits. Prepared for this last Move, I affirm it's my time to receive the billions for my manifestations. What a time! What a race! What a glory! What a kingdom! What a harvest! What a pomp and pageantry. Hallelujah. Glorrry!!! Please pray in the Spirit!!!",
  },
  {
    day: 20,
    title: "SANCTIFIED BY THE SPIRIT POWER",
    content: "I affirm that my divine health is permanent. So I will never be sick a day in my life. No way, not in this world. For my Lord Jesus was manifested to destroy all the works of the devil. In the realm where I live now there's no sickness there, no corruption, no disease, no infirmities or virus is found here. My blood is incorruptible and uninfectable because it's sanctified by the Power of the Holy Spirit. Hallelujah!!! Pray in other Tongues!",
  },
  {
    day: 21,
    title: "THE ELEMENT ARE RESPONDING PRECISELY.",
    content: "Glory to God!!! My life and My Cashflow Affirmations in my mouth is prevailing and producing mighty growth and wealth in me. The earth does not judge the seed. It doesn't differentiate between the good seed and the bad seed. So as I just sow the seeds, the universe responds with precision. As I affirm now, I seed my greatness, my finances, my honour, my health and the elements are responding precisely. Folks, this is my realities and my consciousness! Please begin to pray in the spirit.",
  },
  {
    day: 22,
    title: "THE FLOW IS INCREASING BY THE DAY",
    content: "I decree & declare that; I'm prevailing over every delay, arguments and witchcraft. And the flow of cash and inexhaustible riches is increasing by the day. The rhema in my lips is prevailing over hard situations and dispatching the Angels of money to bring in the billions. This is the life I live. Glorious and inexhaustible. Oh what a life! What a blessed expectations!!! Blessed be God forever more!!! Hallelujah!! Please speak in other tongues!!!",
  },
  {
    day: 23,
    title: "NATIONS AWAIT MY MANIFESTATION",
    content: "Oh Hallelujah! My days are anointed and instructed to bring peace, prosperity and comfort to me. Daily I walk in this consciousness and I love the so much favors and victorious life it brings. I strongly affirm that I have money, so much money. I affirm that I have health, glorious health. I affirm that nations await my manifestations and am up for it, not stopping till every man, tongue and tribe knows and live the Spirit life. This is my realities and My Life!! Glory Glory to God!!! Please Let's Pray in the Spirit",
  },
  {
    day: 24,
    title: "PART OF THE GLORY GENERATION",
    content: "I'm alive and not die. Reigning triumphantly and sweatlessly over all forces of failure, witchcraft and evils. I belong to the generation of glory, so I don't die. We are the generation that will welcome Christ. Hallelujah! I conquer because I'm born to conquer. I'm born rich into the richest Kingdom in this life, so I live above lack and frustrations. This consciousness conquered my mind and satan and his kingdoms knows this. GloryyyyyyyYYYYYYYYYY. Pray in the Spirit.",
  },
  {
    day: 25,
    title: "NO STOPPING ME",
    content: "I affirm that I have disarmed death, fear and all the shame it carries. Heeyyya, I'm a life giving Spirit and my life and my cashflow affirmations in my mouth is mightily growing and prevailing over all negativities in this life. Till I hit my targets, there's no stopping me. Blessed be God forever more! Glorrrrry.... Pray in the Spirit!!!",
  },
  {
    day: 26,
    title: "THE GOD LIFE",
    content: "I have embraced the God life and because I have really embraced it, nothing is too big for me. I live this Christ conscious life because I now have His life. I have His Spirit. I have His mind. I am His body. Who can stop me, who can stand me? No one!!! Gloryyyyyyyyyyyyyyyyy. Pray in the Spirit now!",
  },
  {
    day: 27,
    title: "IT'S MY TIME",
    content: "I affirm that this is my time of manifestations. I was born and revealed at this time to display the virtues and perfections of Him Who called me out of darkness into His marvellous light. Immortality has conquered my mind and death is sacked, so I live to demonstrate the character of the Spirit. Till every man, nation, tribe and tongue knows and live this LIFE. Hallelujah!!! Glorrry. Come on Pray in the Spirit.",
  },
  {
    day: 28,
    title: "I GROW IN GRACE",
    content: "As I live, I affirm no force of darkness can stand nor overshadow me. I grow in grace and in the knowledge of our Lord Jesus Christ. No matter what they say, I grow and abound in grace; for where sin, difficulties and hardship abounds, grace abounded much more. Heeey, folks I'm gracing through life!!! Hahaha. What a life!! Pray in the Spirit!",
  },
  {
    day: 29,
    title: "JUST WINNING",
    content: "What do I do with troubles, challenges, trials and temptations? I just win, win and win. What do I do with folks who don't like me and want my downfall? I laugh because I don't fail! I only win, win and keep winning. What do I do when my targets seems too big and unsurmountable? I keep talking and talking because I don't bow to things I say to them and win and win them and I don't stop winning till I overcome every thing. I chose to be victorious and so I keep talking to things so I keep winning. Nothing and no one stops my victories. I just win!!! Gloryyyyyyyyyyyyyyyyy! Pray in the Spirit.",
  },
  {
    day: 30,
    title: "FIRE IN MY BONES",
    content: "I declare that I'm a terror to the kingdom of darkness. I rule over demons and over all their authorities. The anointing of God in my life destroys every yoke. No bondage, no sickness, no infection, no frustration, no delay, no disappointments, no lack. I call things when I need them and I have them because I call them. None resists or contradicts my words because I got the fire of God in my bones. I teach principalities and powers the complicated many sided wisdom of God. I don't fear nor cower because I got fire in my bones and I am burning for God nonstop. Gloryyyyyyyyyyyyyyyyy. Pray in the Spirit!",
  },
];

async function main() {
  console.log("Fetching current November 2025 affirmations (booklet 292)...");
  const rows = await sql`
    SELECT id, day_number, title, content
    FROM affirmations WHERE booklet_id = 292
    ORDER BY day_number ASC
  `;

  if (rows.length !== 30) {
    console.error(`Expected 30 rows, found ${rows.length}`);
    await sql.end(); process.exit(1);
  }

  let changed = 0;
  for (const row of rows) {
    const data = NOVEMBER.find(a => a.day === row.day_number);
    if (!data) { console.error(`No data for day ${row.day_number}`); continue; }

    const titleMatch = row.title.trim() === data.title.trim();
    const bodyMatch = row.content.trim() === data.content.trim();

    if (!titleMatch || !bodyMatch) {
      await sql`
        UPDATE affirmations SET title = ${data.title}, content = ${data.content}
        WHERE id = ${row.id}
      `;
      const changes = [];
      if (!titleMatch) changes.push(`title: "${row.title}" → "${data.title}"`);
      if (!bodyMatch) changes.push("body updated");
      console.log(`  ✓ Day ${row.day_number}: ${changes.join(", ")}`);
      changed++;
    } else {
      console.log(`  — Day ${row.day_number}: no change`);
    }
  }

  console.log(`\nDone. ${changed} of 30 days updated.`);
  await sql.end();
}

main().catch(e => { console.error(e); sql.end(); process.exit(1); });
