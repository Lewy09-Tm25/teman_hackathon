import fs from "fs";
import path from "path";
import { chatCompletion, llmEnabled } from "./utils/openai.js";
import { getAttendeeSnapshot } from "./attendees.js";

function loadEventMeta(eventSlug) {
  if (!eventSlug) return null;
  const p = path.resolve(`data/events/${eventSlug}/event.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

export async function buildResponse(query, evidences, eventSlug = null, history = []) {
  const meta = loadEventMeta(eventSlug);
  const context = evidences.map((e, i) => `Case ${i + 1}:\nConcern: ${e.text}\nMember: ${e.member_name || "Anonymous"}\nTags: ${e.tags.join(", ")}`).join("\n\n");
  const snapshot = eventSlug ? getAttendeeSnapshot(eventSlug) : null;
  const system = meta
    ? `You are an empathetic guide for Teman, specializing in the event "${meta.title}" on ${meta.date_time} at ${meta.location}. Reassure newcomers using concise, evidence-based testimonials from past members. Keep tone warm, practical, and non-patronizing. Offer a concrete next step at the end.`
    : `You are an empathetic community guide for Teman. You reassure hesitant newcomers using concise, evidence-based testimonials from past members. Keep tone warm, practical, and non-patronizing. Offer a concrete next step at the end.`;
  const contextMsg = `Relevant member experiences:\n${context}\n\n${snapshot ? `Attendee proficiency snapshot:\n${snapshot}\n\n` : ""}`;
  if (!llmEnabled()) {
    return ruleBasedReply(query, evidences, meta, snapshot);
  }
  const messages = [
    { role: "system", content: system },
    { role: "system", content: contextMsg },
    ...history.filter(h => h && h.role && h.content),
    { role: "user", content: query }
  ];
  const text = await chatCompletion(messages);
  return text;
}

function ruleBasedReply(query, evidences, meta, snapshot) {
  const q = (query || "").toLowerCase();
  const echo = (query || "").slice(0, 140);
  const names = evidences.map(e => e.member_name).filter(Boolean);
  const one = names[0] || "a regular";
  const two = names[1] || null;
  const mention = two ? `${one} and ${two}` : one;
  const title = meta?.title || "this event";
  const base = [`You mentioned: "${echo}"`, `Thanks for sharing. At ${title}, many attendees start with similar feelings.`];
  if (q.includes("level") || q.includes("proficiency") || q.includes("beginner") || q.includes("intermediate") || q.includes("advanced") || q.includes("fluent") || q.includes("accent")) {
    if (snapshot) base.push(snapshot);
    base.push(`We group by comfort level and offer buddy intros so beginners feel comfortable.`);
  } else if (q.includes("shy") || q.includes("nervous") || q.includes("anxious") || q.includes("afraid") || q.includes("judge") || q.includes("alone") || q.includes("awkward")) {
    base.push(`Members like ${mention} felt similarly and found that small prompts and a welcoming mentor eased first conversations.`);
    base.push(`Would you like me to arrange a buddy intro for when you arrive?`);
  } else if (q.includes("vibe") || q.includes("what to expect") || q.includes("schedule") || q.includes("format")) {
    base.push(`The vibe is friendly and low-pressure. We start with short prompts in small groups, then rotate for variety.`);
  } else {
    base.push(`We tailor the evening to your comfort: small groups, gentle prompts, and mentors who check in.`);
  }
  return base.join("\n\n");
}
