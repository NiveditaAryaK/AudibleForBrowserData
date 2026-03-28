function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  };
}

export default async function handler() {
  return new Response(
    JSON.stringify({
      ok: true,
      deployed: true,
      provider: "vercel",
      model: process.env.HF_TTS_MODEL || "facebook/mms-tts-eng"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders()
      }
    }
  );
}
