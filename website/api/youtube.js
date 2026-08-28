const CHANNEL_ID = "UCWoDJeY01x659YIOVyA8Mog";
const CHANNEL_HANDLE = "ZionHouseIntl";
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

function decodeXml(str) {
  return String(str || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseRss(xml) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
  const seen = new Set();
  const videos = [];

  for (const match of entries) {
    const block = match[1];
    const id = block.match(/<yt:videoId>([^<]+)/)?.[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const title = decodeXml(block.match(/<title>([^<]+)/)?.[1] || "Zion House Intl");
    const thumbnail =
      block.match(/<media:thumbnail url="([^"]+)/)?.[1] ||
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    const published = block.match(/<published>([^<]+)/)?.[1] || null;

    videos.push({
      id,
      title,
      thumbnail,
      published,
      url: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
    });
    if (videos.length >= 12) break;
  }

  return videos;
}

async function fetchVideos() {
  const res = await fetch(RSS_URL, {
    headers: { "User-Agent": "ZionHouseWebsite/1.0" },
  });
  if (!res.ok) throw new Error(`YouTube RSS failed: ${res.status}`);
  const xml = await res.text();
  return parseRss(xml);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const videos = await fetchVideos();
    return res.status(200).json({
      channelId: CHANNEL_ID,
      channelHandle: CHANNEL_HANDLE,
      channelUrl: `https://www.youtube.com/@${CHANNEL_HANDLE}`,
      liveEmbedUrl: `https://www.youtube.com/embed/live_stream?channel_id=${CHANNEL_ID}`,
      videos,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Failed to load YouTube videos" });
  }
};

module.exports.fetchVideos = fetchVideos;
module.exports.CHANNEL_ID = CHANNEL_ID;
