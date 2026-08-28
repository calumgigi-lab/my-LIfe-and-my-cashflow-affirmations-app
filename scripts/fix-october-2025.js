require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

const OCTOBER = [
  {
    day: 1,
    title: "I HAVE DOMINION IN CASH",
    content: "Consciously standing on top of the systems of this world, I will never live broke in this life. How could I!! Born into the richest Kingdom, with inexhaustible riches. How could I be broke, in a performing Kingdom where we live our believe and see the impossible! kajiboda zeledaa. Lezuu garoki, gada ganga shuka latisha!!! I can never walk out of this world empty. I have dominion in cash and have refused to stagger nor see the contrary. In the Name of Jesus!!! Sooner than you think, I'm becoming a financial giant this generation can't do without. Oh glory to God!!! Come on folks, speak in other tongues!!!",
  },
  {
    day: 2,
    title: "I CALL THE THINGS THAT BE NOT",
    content: "GloryyyyyyyyyyyyyyYyy!! Living the Spirit Life, I run this life by the Power of the Holy Ghost, ruthlessly controlling all negativities and calling the things that be not and they be. Gloglo bata, kentuko cash!!! Thank God I'm big!! Bigger than all the lying systems. For when they are cast down, I'm lifted up. Hallelujah! What a life I have in Christ Jesus; Immortal, invisible, invincible and wantless. Gankasi supeka, jagaliga titi!!! Oh hallelujah, this is my realities folks. Reigning in righteousness with sweatless triumphs over all hellish forces. Blessed be God forever!!! Please pray in the spirit!",
  },
  {
    day: 3,
    title: "THE WORD IS WORKING",
    content: "I Affirm that the Word is working mightily in me, so I have refused lack and failure, disease and infirmities. They don't function in my blood. Blessed is she that believes, the Bible says; there shall be a performance of that which was told her from the Lord. Yes, I believe and declare that I do not lack anything! I do not lack personnels. I do not lack money and I do not lack fame, power and influence. Glory to God! Folks, speak in other tongues!!!",
  },
  {
    day: 4,
    title: "NOTHING STOPS ME",
    content: "I decree & declare that I'm getting bigger everyday as I dominate this world; the systems, the forces, the evil powers and all their human agents. Oh Hallelujah, Hallelujah!!! I have conquered money and now enjoy dominion over her. I affirm that I will never walk this life empty. This is my consciousness and nothing stops me. Glory to God! Filled with deepest thanksgivings to my Father in the Name of Jesus. I'm more than conquerors through Him that called me. Blessed be God!!! Hallelujah!!! Pray in the spirit.",
  },
  {
    day: 5,
    title: "GOD'S GLORY IS REVEALED IN ME",
    content: "I'm the exact and physical expression of Jesus on this earth. His glory is revealed in me to humble satan and his demons. Depopulating hell with the Message of Life and demonstrating the character of the Spirit. Heeeyaaaa!!! Configured never to bow, I live an upward and forward life, reigning in righteousness over kingdoms, thrones and dominions, visible and invisible as I subdue 2025 with every negativities it may bring. Ha yaya, lezee dayata. Oh Gloryyyyyyyyy What a time to be alive! What a life! Blessed be God forever more!!! Come on let's pray in the Spirit!",
  },
  {
    day: 6,
    title: "I DISPLAY HIS VIRTUES",
    content: "I Affirm! Cash is ceaselessly attracted to me because I'm a willing channel for Kingdom advancement, blessing humanity and making so many lives beautiful. Zede dede, kuntu ganga, lizi tebiti. GloryyyyyyyyYYyyYYYyy The walls are falling down before me, as I display the virtues and perfections of Him Who called me out of darkness into His marvellous light. I now live in that Kingdom of light where I reign victoriously and joyfully over every name that is named not only in this world but in the world that is to come. Hallelujah!!!",
  },
  {
    day: 7,
    title: "IMMORTALITY RUNS IN MY BLOOD",
    content: "I create my realities with the words of my mouth. For with the heart I believed unto righteousness and with the mouth I confessed unto my salvation. And Jesus says, if I shall say to this mountain be thou removed and be cast into the sea and shall not doubt in my heart but believe that what I say I have, then I have whatsoever I say. I boldly affirm that immortality runs in my blood, making it impossible for me to be trapped, manipulated or destroyed. Hallelujah!!! What a staggering reality and life I have in Christ. Gloryyy!!! Come on let's Pray in the Spirit!!!",
  },
  {
    day: 8,
    title: "THERE'S NO IMPOSSIBILITY WITH ME",
    content: "I affirm that I live by the Power of the Spirit Who raised Christ from the dead. This Power vitalizes my mortal bodies. In Him I live, move and have my being. So, I'm Christ! I'm immortal and I'm indestructible!!! There's no impossibilities with me for God is my sufficiency. Institutions and houses I didn't build, moneys I didn't own, farms I didn't cultivate, businesses I didn't found, cars and airplanes I didn't buy are commanded to be delivered to me. I got excess favours. I pluck money from trees! Nations are calling for me and diverse blessings follow me wherever I go. Blessed be God forever!! GloryyyyyYyyyyyyyYYyy, let's pray in the Spirit.",
  },
  {
    day: 9,
    title: "THE WORLD IS MINE",
    content: "As a harbinger of a counter culture on this earth, I refuse to conform to the standards of this world because this failing systems can't set standards for me. I declare that the world is mine, from east to west, from north to south. The best things, the people, the currencies, everything, everywhere. Heyaaaa!!! I live the Spirit life and everything I do works. As an aroma of death; every adversary, spirts or human, all satanic agents goes down and perish for my sake. I do not lack cash. I don't get sick, I don't bow and I don't die. Kanka tusa, legi didi!!! Pray in the Spirit folks!!! Nothing will escape us!!!",
  },
  {
    day: 10,
    title: "MADE IN THE SAME MANNER AS JESUS",
    content: "Glory Glory Glory Glory Glory!!! I have subdued sickness, infirmities, disease and death. Failure sees me and flees. Lack, frustration and stagnation flee as I appear. Evil men and women flee at my presence. Forces scatter at the hearing of my name. Made in the same manner as Jesus, I'm a life-giving Spirit and whatsoever and whosoever couldn't stand Jesus won't stand me. His blood runs in my veins. His dominion controls my thoughts. His riches attend to my life and cash ceaselessly flows into my life. I'm so rich in this world!! You don't get!!! Heeeey, I pluck money from trees!! Zegi baba, shinti tata!! Oh Hallelujah! Let's pray in the Spirit folks!",
  },
  {
    day: 11,
    title: "BORN WITHOUT CORRUPTION",
    content: "I affirm that monies I didn't own are commanded to be turned into my accounts just like that. I'm immortal, for that same Spirit that raised Jesus from death is constantly unaging and renewing my life. Being born again, I was born without corruption. So, I'm done with lack, failure, tension and depression. Bigger than the systems and the oppositions it brings; I live above their evil antics, deceptions and corruption. This is my consciousness and my capacities. Hallelujah!! Please Pray in the Spirit!!!",
  },
  {
    day: 12,
    title: "LINEAGE OF SPIRITS",
    content: "Hallelujah!! I'm of the lineage of Spirits where earthly elements don't cage nor control. I lay up gold as dust by the Power of the Spirit. Gloryyyy! I'm that stone that is laid in Zion, if you fall on me, you will be crushed and if I fall on you, you will be grinded into powder. \"For I lay in Zion a Chief corner stone, the Bible says; elect and precious. Whoever falls on this Stone will be crushed and whosoever this Stone falls on, will be grinded into powder.\" Hallelujah!!! You don't dare for I'm that living stone that crushes and grinds!! Glory to God!!!! Pray in other tongues.",
  },
  {
    day: 13,
    title: "I KILL AND MAKE ALIVE",
    content: "I affirm that I'm unstoppable and got no respect for all the negative forces of this life!!! I kill and make alive. In the Name of Jesus, I affirm that my life is speedily advancing forward and upward. Eternal life runs in every fibre of my being. For that same Spirit that raised Jesus from death immortalizes my mortal bodies, controls my soul and powers my finances. With me, failure, low life, diseases and death got no chance. Blessed be God forever!!! Glory Glory to God!!! Please pray in the Spirit!!!",
  },
  {
    day: 14,
    title: "I SEE THE REWARD OF THE WICKED",
    content: "The Lord is my sufficiency and the saving strength of His anointed. I don't fear nor cower. For a thousand may fall at my side and ten thousand beside me but it shall not come near me. With my eyes I see the reward of the wicked. I'm immortal, indestructible, incorruptible, blameless and indefatigable. Heeeeeya!!! And in my cash flow, I affirm; I shall never be moved. No matter what I hear, feel or see. I declare that I operate the economic system of the Spirit. So there is no lack, failure, draught, disease and death in my path. Gloryyyyyyyyyyyyyyyyy! Please Let's Pray in the Spirit.",
  },
  {
    day: 15,
    title: "THE GOLDEN AGE OF THE CHURCH",
    content: "Heeeya! We are in the golden age of the Church and satan can't stop this. Cash is raining in Church. It's raining in my life and my accounts by the Power of the Spirit. We are manifesting so much riches. So much harvest of souls, so much power, so much grace and so much glory beyond measures. Leganga, jigeda hallelujah!!! Heeeeeya!!! And in my cash flow, I affirm; I shall never be moved. Gloryyyy!! Folks, I hear the sound of abundance of the big cash and the big soul harvests!!! Come on, Shout and Pray in the Spirit!!!",
  },
  {
    day: 16,
    title: "NO EVIL SURVIVES MY PRESENCE",
    content: "Power jumps out of every part of my being; my tongue, my eyes, my hands, my feet and every strand of hair in my body, yeaaa, even in my shadow. Kalaba da tete laga. Hallelujah!! No evil survives my presence. As a burning and a shining light, fire devours before me and flames of fire behind me. His life is in me, is in my soul, my body, my organs, in every cell of my blood and in every fibre of my being. Glory to God! Please pray in the Spirit!",
  },
  {
    day: 17,
    title: "I'M BUILT FOR THIS GENERATION",
    content: "As I speak in tongues, I educate the Angels to carry out specific instructions on my life, finances, family, future and assignment. Conscious of my divine life, I'm getting richer everyday, even in the midst of harshest economy. For when men are cast down, I live in constant and consistent cashflow, because I'm not a man. I'm so rich! So powerful! So famous and so influential! Built for this generation, nothing will absolutely stop nor determine me!!! No matter what I hear, feel or see. I declare that I operate the economic system of the Spirit. So there is no lack, failure, draught, disease and death in my path. Blessed be God forever! Please pray in the Spirit.",
  },
  {
    day: 18,
    title: "I AM CONFIDENT IN HIS CAPACITY",
    content: "Hallelujah! I affirm that I live gloriously in this life in an atmosphere of indestructibility, with so much Peace, happiness, riches, miracles, absolute dominion and incredible cashflow. God, the builder of all things has made my life so beautiful. He's building my finances, my home and my Ministry. I'm confident in His capacity. He knows that I trust Him and I'm not shifting to the left nor to the right. Kaza gaga! Hallelujah!!! Folks, please let's Pray in the Spirit!!!",
  },
  {
    day: 19,
    title: "I'M GROWING BIGGER EVERYDAY",
    content: "I'm grateful for every dime, grateful for every height, grateful for every trials, grateful for every opportunity, grateful for every provision and grateful for every contact. I got a target and I'm not gonna stop till I hit it. I affirm that I'm growing bigger everyday and I got riches from nations, the seas, the land, the ancient mountains and the secret places of darkness. I declare that the same circumstances that are sinking people, families and businesses today are the same circumstances that is bringing so much promotions to me. Ohh Gloryyyyyyyyyyyy!!! What a life I have in Christ. What a time! Hallelujah Please Pray in other tongues folks",
  },
  {
    day: 20,
    title: "DEATH GOT NO POWER OVER ME",
    content: "Glory to God!! I have refused to bow nor give in and by the Power of the Spirit I subdue oppositions and all contrary powers. If you come after me you are in trouble and if I come after you, you are finished!!! I don't take wrong steps because I got the wisdom of God working in my mind. I just win, win and win. Reigning in life and consciously walking in the light of life, I'm life conscious so death got no power over me. Hallelujah!!! Wow Pray in the Spirit",
  },
  {
    day: 21,
    title: "MERCY HAS FOUND ME",
    content: "Blessed be God!!! Mercy has found me, and being born into the last house, I thank God for the former house. I thank God for the real money. I thank God for the name of Jesus. I thank God for the blood. I thank God for the fearless, ageless and deathless life. I thank God for the revelation of His Word and I thank God for the coming great wealth transfer and I thank God for the coming massive end time Revival. What a consciousness!!! GloryyyYYYYYyyYYYyyy Please Let's Pray in the Spirit",
  },
  {
    day: 22,
    title: "SETTLED FOR THE BIG LIFE",
    content: "Hallelujah!!! I'm born of God and have overcome this world with its failing systems. Having refused to be poor, I have settled for the big life. Salvation is given to me to pass on to the world and I'm committed to this one assignment. Conscious of the grace that brings riches, I'm set for the big cash because there's no chance for lack in me, my finances and my Ministry. And Called to wrap up the age, I have vowed never to settle for less and that's just the way it is. Glory to God!! Hallelujah!!! Let's pray in the Spirit Folks!!!",
  },
  {
    day: 23,
    title: "JESUS IS GOD'S IDEA OF ME",
    content: "Heeeeeeyaaaaa! Ready to take the world, I just get things done by the Power of the Spirit, Who is the Father in me that does the works. There's no stopping me nor failing, for in Him I do not fail nor think lack, disease or death. I affirm that Jesus is God's concept of me. Whatever and whoever Jesus is, that's Who I'm. He is all I am, nothing short nothing left. Oh what a life I have received! GloryyyyyYYYYYYYYYYyy. Please Pray in the Spirit",
  },
  {
    day: 24,
    title: "I AM TOO BIG AND I DO BIG THINGS",
    content: "I Affirm that I'm too big and I do big things. Far bigger than the world's idea of me. I refuse to look down on myself for my sufficiency is of God. I'm in the midst of plenty and enjoying the abundance of grace. I'm full of life, with plenty of cash flooding in and out of my blessed life. Hallelujah!! I refuse to fear nor cower. And now conscious of my Godness, anyone coming against me is coming against God and because you don't ground God, you don't ground me. Glory to God!!! Hallelujah!!! Please Pray in the Spirit",
  },
  {
    day: 25,
    title: "I AM ABSOLUTELY UNLIMITED",
    content: "I don't see the wrong pictures and I don't dream wrong dreams. With my sanctified and glorified thoughts, I declare that I'm becoming too big in this world, absolutely unlimited, yea, not with the Holy Spirit on my inside. Look here folks!!! I'm the full manifestation of God's indescribable love. Fearless, ageless, deathless, wantless and beyond every limitations!!! I have said no to denials and have refused to be delayed nor disappointed. I'm excited with God's addiction and ultimate desire to see me so prosperous and in health, so there's no stopping me. Heeeeeeeey!!! Shout Glorrrrry and Pray in the Spirit!!!",
  },
  {
    day: 26,
    title: "OCCUPYING TILL HE COMES",
    content: "We are the last house, predestined, ordained, born, prepared and now revealed for the greatest Manifestations of all times. Legaba!!! Occupying till He comes, I have refused to think like a victim. I have refused to think like the weak. I have refused to think like the poor and I have refused to think like the frustrated. I lambano the riches of nations. I lambano the riches of the oceans. I lambano the riches of the gentiles and the riches in the secret place of darkness. Shout Gloryyyyy!!! Folks let's Pray in the Spirit!",
  },
  {
    day: 27,
    title: "I GOT CASH CONSTANTLY GROWING IN MY HANDS",
    content: "Hallelujah, I affirm that I have received so much Power to make wealth. So I make friends with money because it's so easy for me to have money. I got cash constantly growing in my hands and supernaturally reproducing more money. I know that there's something in me that can't wait nor bow to poor life! Yes, because the assignment is large and the demands are urgent. Hell is closing in with speed and the gates of hell shall not prevail, I forbid!! Heyyyaaaa Please Pray in the Spirit!!",
  },
  {
    day: 28,
    title: "LIFE IS SO EASY FOR ME",
    content: "Lebe saba nunge ti gi zaboti, gashi lagada!!! The Word says I shall have whatsoever I say so I say whatever I want and I will keep saying it because I have whatsoever I say. I declare that I have received cash in excess and my life is eternally secured. So much cash is flooding my life from the North, West, East and South and every opposition to this flow is swallowed up by the earth. They go on talking against me and they keep going down and I keep going up. Thank God I'm big: Big in cash! Big in wisdom! Big in influence! Big in numbers! Big in swag! Mighty in strength and great in riches. Zalabazo kiti kata zitiga andiga. Heeeeeey! Please Pray in the Spirit..",
  },
  {
    day: 29,
    title: "THE BIG MONEY IS COMING",
    content: "Grace for great wealth has naturally separated me from poor life. I decree that the waiting is over. I'm stepping into the big cash. The glory is in me so the big Money is coming to me now!!! I'm moving into big finances as I give big with big expectations to receive big and nothing stops me. I give so much and I receive so much. I receive new houses, cars, lands, clothes, jewelries, phones and all things that pertains to life Hallelujah!!! Pray in the Spirit Folks!!",
  },
  {
    day: 30,
    title: "TREASURES OF NATIONS ARE TURNED TO ME",
    content: "I affirm that people I know and those I do not know are bringing so much favors to me. Access is so easy and treasures of nations are being turned to me. I affirm that God has caused all grace to abound towards me. So no matter what I see, I'm smiling through life. I have overcome failure, sickness, greed, infirmities and death because greater is He that is in me than he that is in the world!!! Hallelujah!! I possess my possessions forcefully and violently and nothing is impossible for me in the Name of Jesus. Pray in the Spirit!!",
  },
  {
    day: 31,
    title: "MY WORDS ARE GRACED",
    content: "I don't belong to the dying systems of this world. I belong to a Spiritual System where things work because they are programmed to work. I refuse to walk in doubt and unbelief. I don't speak idle, corrupt or empty words. My words are graced and seasoned with salt. I declare that all bitterness, and wrath, and anger, and clamour, and evil speakings are put away from me with all malice. Gloryyyyy. Please speak in other tongues!!!",
  },
];

async function main() {
  console.log("Fetching current October 2025 affirmations...");
  const rows = await sql`
    SELECT id, day_number, title, content
    FROM affirmations WHERE booklet_id = 291
    ORDER BY day_number ASC
  `;

  if (rows.length !== 31) {
    console.error(`Expected 31 rows, found ${rows.length}`);
    await sql.end(); process.exit(1);
  }

  let changed = 0;
  for (const row of rows) {
    const data = OCTOBER.find(a => a.day === row.day_number);
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

  console.log(`\nDone. ${changed} of 31 days updated.`);
  await sql.end();
}

main().catch(e => { console.error(e); sql.end(); process.exit(1); });
