// July 2026 booklet — table of contents (titles) provided by the author.
// Body text is temporary and will be replaced once the author delivers it.
// Temp content is unique per day (includes the title) so the admin duplicate /
// placeholder cleanup tools never remove these rows.

const TEMP = (title) => `${title}\n\n(Full affirmation coming soon.)`;

const TITLES = [
  "IT'S TIME TO TRY MY HARDEST",
  "RESPONDING TO THE NEXT LEVEL",
  "ALWAYS ON TIME",
  "NO TO POWERLESSNESS",
  "RAISED TO RESIST THE DEVIL",
  "I TRUST GOD",
  "EASY ACCESS",
  "I DON'T SUFFER WHAT MEN SUFFER",
  "ANOTHER MENTALITY",
  "INSTRUCTED TO LIVE CHRIST",
  "NONE OF THESE DISEASES",
  "I WILL FINISH MY COURSE",
  "CITIZEN OF HEAVEN",
  "I'M JOINED TO THE LORD",
  "I'M IN THE BOOK OF LIFE",
  "MY CROWN OF RIGHTEOUSNESS",
  "I'M A SON OF GOD",
  "SEE WHAT I HAVE BECOME",
  "SECURED",
  "HOLY SPIRIT",
  "GRACE IS WORKING IN ME",
  "BEAUTIFUL THINGS ARE SPOKEN OF ME",
  "POWERS HINDERING SPEED ARE CRUSHED",
  "THE DREAMS ARE HAPPENING",
  "I'M LANDING IT BIG",
  "MY LIFE IS ADVANCING",
  "THE TRUMP OF AN ARCHANGEL",
  "THE NATIONS BELONG TO GOD",
  "LOST IN THE VISION",
  "I'M HAVING IT ALL",
  "NO TO RELIGION",
];

module.exports = TITLES.map((title, i) => ({
  day: i + 1,
  title,
  content: TEMP(title),
}));
