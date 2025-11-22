import fs from "fs";
import path from "path";
import { search } from "./retrieval.js";
import { buildResponse } from "./response.js";
import { proposeConnection } from "./matchmaking.js";
import { llmEnabled, getChatModelName } from "./utils/openai.js";

const token = process.env.TELEGRAM_BOT_TOKEN || "";
const api = token ? `https://api.telegram.org/bot${token}` : "";
const statePath = path.resolve("data/telegram_state.json");
const defaultSlug = process.env.EVENT_SLUG || "spanish_meetup_dec5";

function loadState() {
  if (!fs.existsSync(statePath)) return { offset: 0, chats: {} };
  const s = JSON.parse(fs.readFileSync(statePath, "utf-8"));
  if (!s.chats) s.chats = {};
  return s;
}

function saveState(s) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(s, null, 2), "utf-8");
}

async function tg(pathname, body) {
  const res = await fetch(`${api}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}`);
  return res.json();
}

async function sendMessage(chat_id, text) {
  return tg("/sendMessage", { chat_id, text });
}

async function getUpdates(offset) {
  const r = await tg("/getUpdates", { offset, timeout: 20 });
  return r.result || [];
}

function pushHistory(chat, role, content) {
  chat.history = chat.history || [];
  chat.history.push({ role, content });
  if (chat.history.length > 8) chat.history = chat.history.slice(-8);
}

function formatReply(query, results, reply, proposal) {
  const lines = [reply];
  if (proposal) lines.push(`\nWould you like an intro to ${proposal.member_name}?`);
  return lines.join("\n");
}

function parseStart(text) {
  if (!text.startsWith("/start")) return null;
  const parts = text.split(" ");
  return parts.length > 1 ? parts[1].trim() : null;
}

async function greetIntro(chat_id, slug) {
  try {
    const metaPath = path.resolve(`data/events/${slug}/event.json`);
    let title = "this event";
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      title = meta.title || title;
    }
    const intro = `Hi! I’m Teman Companion for ${title}. How are you today?\n\nIf you’re curious or a bit nervous, I can help. What’s on your mind about attending? (e.g., your level, arriving alone, vibe)`;
    await sendMessage(chat_id, intro);
  } catch {}
}

function isGreeting(text) {
  const t = text.toLowerCase();
  return ["hi", "hello", "hey", "hola"].some(w => t === w || t.startsWith(w + " "));
}

async function handleText(state, chat_id, text) {
  const maybeSlug = parseStart(text);
  if (maybeSlug) state.chats[chat_id] = { slug: maybeSlug, stage: "awaiting_concern" };
  const chat = state.chats[chat_id] || { slug: defaultSlug, stage: "awaiting_concern" };
  state.chats[chat_id] = chat;
  const slug = chat.slug || defaultSlug;

  const cleaned = text.replace(/^\/start\s+\S+/, "").trim();

  if (text.startsWith("/start") || chat.stage === "awaiting_concern") {
    if (isGreeting(cleaned) || text.startsWith("/start")) {
      await greetIntro(chat_id, slug);
      chat.stage = "awaiting_concern";
      return;
    }
    // treat this as the first concern
    chat.stage = "active";
  }

  if (isGreeting(cleaned)) {
    await sendMessage(chat_id, "Hi! What’s on your mind about attending?");
    chat.stage = "awaiting_concern";
    return;
  }

  pushHistory(chat, "user", cleaned || text);
  const results = await search(cleaned || text, 3, slug);
  const reply = await buildResponse(cleaned || text, results, slug, chat.history);
  const proposal = proposeConnection(results);
  const out = formatReply(text, results, reply, proposal);
  await sendMessage(chat_id, out);
  pushHistory(chat, "assistant", out);
}

async function loop() {
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN not set");
    process.exit(1);
  }
  let state = loadState();
  console.log(`Telegram bot started. Default event slug: ${defaultSlug}`);
  while (true) {
    try {
      const updates = await getUpdates(state.offset);
      if (updates.length) console.log(`Received ${updates.length} updates`);
      for (const u of updates) {
        state.offset = Math.max(state.offset, (u.update_id || 0) + 1);
        const msg = u.message || u.edited_message || null;
        if (!msg || !msg.text) continue;
        const text = msg.text.trim();
        console.log(`Chat ${msg.chat.id}: ${text} | llm=${llmEnabled()} model=${getChatModelName()}`);
        await handleText(state, msg.chat.id, text);
        saveState(state);
      }
    } catch (e) {
      console.error(`Polling error: ${e.message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

loop();
