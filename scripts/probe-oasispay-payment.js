require("dotenv").config({ path: ".env.vercel.prod" });

const OASISPAY_API_BASE = "https://api.oasispayhq.com/api/v1";
const paymentId = process.argv[2] || "3b0f6328-28da-421a-a503-6df0441a2361";

(async () => {
  const secret = process.env.OASISPAY_SECRET_KEY;
  if (!secret) throw new Error("No OASISPAY_SECRET_KEY in .env.vercel");
  console.log(`GET ${OASISPAY_API_BASE}/payments/${paymentId}`);
  const res = await fetch(`${OASISPAY_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log(text.slice(0, 2000));
})().catch(console.error);
