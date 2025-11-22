import fs from "fs";
import path from "path";

const endpoint = "https://api.openai.com/v1";
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-5.1";
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-large";

function getKey() {
  return process.env.OPENAI_API_KEY || "";
}

function hasKey() {
  return !!getKey();
}

async function request(path, body) {
  if (!hasKey()) throw new Error("OPENAI_API_KEY not set");
  const res = await fetch(`${endpoint}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${t}`);
  }
  return res.json();
}

function naiveEmbed(text, dim = 512) {
  const v = new Array(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    v[code % dim] += 1;
  }
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map(x => x / n);
}

export async function embedTexts(texts, model = EMBED_MODEL) {
  if (!hasKey()) return texts.map(t => naiveEmbed(t));
  const r = await request("/embeddings", { model, input: texts });
  return r.data.map(x => x.embedding);
}

export async function embedText(text, model = EMBED_MODEL) {
  const [e] = await embedTexts([text], model);
  return e;
}

export async function chatCompletion(messages, model = CHAT_MODEL) {
  if (!hasKey()) {
    const u = messages.find(m => m.role === "user")?.content || "";
    const hint = "I can introduce you to a friendly regular if you’d like.";
    return `${u}\n\nMany attendees felt similarly and found the events welcoming after a gentle start. ${hint}`;
  }
  try {
    const r = await request("/chat/completions", { model, messages });
    console.log(`LLM chat ok model=${model}`);
    return r.choices?.[0]?.message?.content || "";
  } catch (e) {
    const fallback = "gpt-4o";
    console.warn(`LLM chat failed for ${model}: ${e.message}. Falling back to ${fallback}`);
    const r = await request("/chat/completions", { model: fallback, messages });
    return r.choices?.[0]?.message?.content || "";
  }
}

export function getChatModelName() {
  return CHAT_MODEL;
}

export function llmEnabled() {
  return hasKey();
}

export function saveJSON(p, data) {
  const dir = path.dirname(p);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
}

export function readJSON(p) {
  if (!fs.existsSync(p)) return null;
  const t = fs.readFileSync(p, "utf-8");
  return JSON.parse(t);
}
