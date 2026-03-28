import { InferenceClient } from "@huggingface/inference";

const MODEL_ID = process.env.HF_TTS_MODEL || "facebook/mms-tts-eng";
const MAX_TEXT_LENGTH = 4000;

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

function json(res, status, payload) {
  res.status(status).json(payload);
}

function cleanText(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
}

export const maxDuration = 60;

export default async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { detail: "Method not allowed." });
    return;
  }

  if (!process.env.HF_TOKEN) {
    json(res, 500, { detail: "HF_TOKEN is not configured on the server." });
    return;
  }

  const text = cleanText(req.body?.text || "");
  if (!text) {
    json(res, 400, { detail: "No readable text was provided." });
    return;
  }

  try {
    const client = new InferenceClient(process.env.HF_TOKEN);
    const audio = await client.textToSpeech({
      model: MODEL_ID,
      inputs: text
    });

    const buffer = Buffer.from(await audio.arrayBuffer());
    res.setHeader("Content-Type", "audio/wav");
    res.status(200).send(buffer);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Text-to-speech failed.";
    json(res, 502, { detail: message });
  }
}
