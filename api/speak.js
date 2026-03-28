import { InferenceClient } from "@huggingface/inference";

const MODEL_ID = process.env.HF_TTS_MODEL || "facebook/mms-tts-eng";
const MAX_TEXT_LENGTH = 4000;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  };
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}

function cleanText(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
}

export const maxDuration = 60;

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== "POST") {
    return json(405, { detail: "Method not allowed." });
  }

  if (!process.env.HF_TOKEN) {
    return json(500, { detail: "HF_TOKEN is not configured on the server." });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { detail: "Invalid JSON body." });
  }

  const text = cleanText(body?.text || "");
  if (!text) {
    return json(400, { detail: "No readable text was provided." });
  }

  try {
    const client = new InferenceClient(process.env.HF_TOKEN);
    const audio = await client.textToSpeech({
      model: MODEL_ID,
      inputs: text
    });

    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        ...corsHeaders()
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Text-to-speech failed.";
    return json(502, { detail: message });
  }
}
