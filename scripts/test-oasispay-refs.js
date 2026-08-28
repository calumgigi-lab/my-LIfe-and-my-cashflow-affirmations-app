require("dotenv").config({ path: ".env.local" });
const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";

const tests = [
  { label: "admin approved #243", userId: 8, ref: "adae2765-3daf-4a50-b168-e93f130bbb80", bookletId: 300 },
  { label: "nana rejected #247", userId: 79, ref: "3b0f6328-28da-421a-a503-6df0441a2361", bookletId: 300 },
];

(async () => {
  for (const t of tests) {
    const res = await fetch(`${API}/api/payments/oasispay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": String(t.userId) },
      body: JSON.stringify({ reference: t.ref, bookletId: t.bookletId }),
    });
    const data = await res.json();
    console.log(`${t.label}: ${res.status}`, data);
  }

  const init = await fetch(`${API}/api/payments/oasispay/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": "79" },
    body: JSON.stringify({ bookletId: 300, platform: "android" }),
  });
  const initData = await init.json();
  console.log("\nInitialize for nana:", init.status, initData);
})().catch(console.error);
