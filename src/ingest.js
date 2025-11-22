import fs from "fs";
import path from "path";
import { embedTexts, saveJSON, readJSON } from "./utils/openai.js";

const slug = process.argv[2] || process.env.EVENT_SLUG || "spanish_meetup_dec5";
const baseDir = path.resolve("data");
const eventDir = path.join(baseDir, "events", slug);
const feedbackPath = path.join(eventDir, "feedback.json");
const fallbackPath = path.join(baseDir, "sample_feedback.json");
const outPath = path.join(eventDir, "embeddings.json");

function getRecords() {
  const f = readJSON(feedbackPath);
  if (f && Array.isArray(f) && f.length) return f;
  const s = readJSON(fallbackPath);
  if (s && Array.isArray(s) && s.length) return s;
  throw new Error("No feedback data found for event in data/events/<slug>/feedback.json or data/sample_feedback.json");
}

function serialize(r) {
  const a = [r.anxieties, r.positive, r.improve].filter(Boolean).join("\n");
  return a;
}

async function run() {
  const records = getRecords();
  const texts = records.map(serialize);
  const embeddings = await embedTexts(texts);
  const out = records.map((r, i) => ({
    id: i,
    member_name: r.member_name || null,
    tags: r.tags || [],
    text: serialize(r),
    embedding: embeddings[i]
  }));
  saveJSON(outPath, out);
  console.log(`Embedded ${out.length} records for ${slug} -> ${outPath}`);
}

run().catch(e => {
  console.error(e.message);
  process.exit(1);
});
