const fs = require("fs");
const path = require("path");
const { fetchVideos, CHANNEL_ID } = require("../api/youtube");

(async () => {
  const videos = await fetchVideos();
  const outDir = path.join(__dirname, "..", "public", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const payload = {
    channelId: CHANNEL_ID,
    channelHandle: "ZionHouseIntl",
    channelUrl: "https://www.youtube.com/@ZionHouseIntl",
    liveEmbedUrl: `https://www.youtube.com/embed/live_stream?channel_id=${CHANNEL_ID}`,
    syncedAt: new Date().toISOString(),
    videos,
  };
  fs.writeFileSync(path.join(outDir, "youtube.json"), JSON.stringify(payload, null, 2));
  console.log(`Synced ${videos.length} videos to public/data/youtube.json`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
