// Step sync between the iPhone Shortcut and the app.
// The Shortcut calls  /api/steps?code=ABC123&steps=8423   (saves today's steps)
// The Shortcut can also send /api/steps?code=ABC123&weight=88.4 (latest weight, kg)
// The app calls       /api/steps?code=ABC123              (reads them back)
// The code is a random sync code the app makes for each phone. Needs an Upstash Redis database
// connected to this project in Vercel (Storage tab) — the same kind Yes Chef uses.

const ALPHA = /[^A-Z0-9]/g;
const clean = (c) => String(c || "").toUpperCase().replace(ALPHA, "").slice(0, 16);
const londonDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date()); // YYYY-MM-DD

async function redis(cmd) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { missing: true };
  const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `redis ${r.status}`);
  return j;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const q = { ...(req.query || {}), ...(typeof req.body === "object" && req.body ? req.body : {}) };
  const code = clean(q.code);
  if (code.length < 8) return res.status(400).json({ error: "code", message: "Missing or invalid sync code." });
  const key = `cal:steps:${code}`;

  try {
    const wkey = `cal:weight:${code}`;
    if (q.weight != null && q.weight !== "") {
      const kg = Math.round(parseFloat(String(q.weight).replace(",", ".").replace(/[^\d.]/g, "")) * 10) / 10;
      if (isNaN(kg) || kg < 20 || kg > 700) return res.status(400).json({ error: "weight", message: "Weight should be a number." });
      const prev = await redis(["GET", wkey]);
      if (prev.missing) return res.status(503).json({ error: "nodb", message: "Step sync isn't set up: connect an Upstash Redis database in Vercel." });
      const old = prev.result ? JSON.parse(prev.result) : null;
      // Same reading again (Health hasn't had a new weigh-in): keep its original time so it isn't counted twice.
      const rec = old && old.kg === kg ? old : { kg, at: Date.now() };
      await redis(["SET", wkey, JSON.stringify(rec), "EX", 2592000]);
      if (q.steps == null || q.steps === "") return res.status(200).json({ ok: true, weight: rec, message: `Saved weight ${kg}` });
    }
    if (q.steps != null && q.steps !== "") {
      const n = Math.round(parseFloat(String(q.steps).replace(/[^\d.]/g, "")));
      if (isNaN(n) || n < 0 || n > 200000) return res.status(400).json({ error: "steps", message: "Steps should be a number." });
      const rec = { steps: n, at: Date.now(), date: londonDate() };
      const r = await redis(["SET", key, JSON.stringify(rec), "EX", 259200]);
      if (r.missing) return res.status(503).json({ error: "nodb", message: "Step sync isn't set up: connect an Upstash Redis database in Vercel." });
      return res.status(200).json({ ok: true, ...rec, message: `Saved ${n.toLocaleString("en-GB")} steps` });
    }
    const r = await redis(["MGET", key, wkey]);
    if (r.missing) return res.status(503).json({ error: "nodb" });
    const [st, wt] = r.result || [];
    return res.status(200).json({ ...(st ? JSON.parse(st) : { steps: null }), weight: wt ? JSON.parse(wt) : null });
  } catch (e) {
    console.error("[calories steps]", e);
    return res.status(500).json({ error: "fail" });
  }
}
