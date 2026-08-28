const handle = "ZionHouseIntl";

(async () => {
  const res = await fetch(`https://www.youtube.com/@${handle}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ZionHouseSite/1.0)" },
  });
  const html = await res.text();
  const channelId = html.match(/"channelId":"(UC[^"]+)"/)?.[1]
    || html.match(/"externalId":"(UC[^"]+)"/)?.[1];
  const ids = [...new Set([...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]))];
  console.log(JSON.stringify({ channelId, videoIds: ids.slice(0, 12) }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
