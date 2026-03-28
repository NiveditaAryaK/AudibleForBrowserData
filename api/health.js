function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
}

export default function handler(_req, res) {
  applyCors(res);
  res.status(200).json({
    ok: true,
    deployed: true,
    provider: "vercel",
    model: process.env.HF_TTS_MODEL || "facebook/mms-tts-eng"
  });
}
