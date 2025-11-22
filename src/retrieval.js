import fs from "fs";
import path from "path";
import { embedText } from "./utils/openai.js";

function getEventPath(eventSlug) {
  if (eventSlug) return path.resolve(`data/events/${eventSlug}/embeddings.json`);
  return path.resolve("data/embeddings.json");
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(a) {
  return Math.sqrt(dot(a, a));
}

function cosine(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  return dot(a, b) / (na * nb);
}

function loadEmbeddings(eventSlug) {
  const p = getEventPath(eventSlug);
  if (!fs.existsSync(p)) return null;
  const t = fs.readFileSync(p, "utf-8");
  return JSON.parse(t);
}

export async function search(query, k = 3, eventSlug = process.env.EVENT_SLUG || null) {
  const store = loadEmbeddings(eventSlug);
  if (!store || !store.length) throw new Error("Embeddings not found. Run `npm run ingest` first.");
  const q = await embedText(query);
  const scored = store.map((r) => ({ r, score: cosine(q, r.embedding) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map(x => ({
    member_name: x.r.member_name,
    tags: x.r.tags,
    text: x.r.text,
    score: x.score
  }));
}
