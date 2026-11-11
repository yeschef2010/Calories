// Estimates calories from a description and/or a photo, using Claude.
// Needs ANTHROPIC_API_KEY in Vercel. Optional: CALORIES_INVITE_CODE (one code, or several separated by commas)
// so only people with the code can use your API credit.

export const config = { maxDuration: 30 };

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

const PROMPT = `You estimate calories in food for a simple UK calorie counter.
The user has described and/or photographed something they ate. Break it into separate foods and estimate each one.
Use typical UK portion sizes when none is given ("a bowl of pasta" = a normal home serving). For photos, judge the portion from the plate and cutlery.
Reply with ONLY a JSON object, no other text:
{"items":[{"name":"short food name","kcal":number,"portion":"assumed portion, e.g. 1 medium (120g)"}],"note":"optional short caveat, or empty"}
Round kcal to the nearest 5. If there is no food, reply {"items":[],"note":"I couldn't see any food"}.`;

const norm = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });

  const codes = String(process.env.CALORIES_INVITE_CODE || "").split(",").map(norm).filter(Boolean);
  if (codes.length && !codes.includes(norm(req.headers["x-access"]))) {
    return res.status(403).json({ error: "access", message: "Enter your invite code to use estimates." });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "nokey", message: "Estimates aren't set up yet: add ANTHROPIC_API_KEY in Vercel." });
  }

  const { text = "", image = null } = req.body || {};
  const content = [];
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(image || "");
  if (m) content.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
  content.push({ type: "text", text: `${PROMPT}\n\nWhat they ate: ${String(text).slice(0, 500) || "(see photo)"}` });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 600, messages: [{ role: "user", content }] }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("[calories] API error", r.status, data?.error?.message);
      return res.status(502).json({ error: "api", message: "Couldn't get an estimate just now." });
    }
    const reply = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const start = reply.indexOf("{"), end = reply.lastIndexOf("}");
    const json = JSON.parse(reply.slice(start, end + 1));
    return res.status(200).json(json);
  } catch (e) {
    console.error("[calories]", e);
    return res.status(500).json({ error: "fail", message: "Couldn't get an estimate just now." });
  }
}
