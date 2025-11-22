# Teman Companion — Event-Specific Empathy Agent

A lightweight, event-focused conversational agent that reassures hesitant attendees and answers questions with evidence from real feedback. It includes:

- A single static landing page with an event title, description, guest list, and a “Chat to know more” link
- A Telegram bot specialized to the event via a slug (deep link `/start <slug>`) that:
  - Greets first, then asks for the user’s concern
  - Retrieves relevant testimonials (RAG) and an attendee proficiency snapshot
  - Generates empathetic, actionable replies with an LLM

## Deployed Website
- Live: https://traetraenychackathonu04c.vercel.app

## Tools Used
- Node.js (ESM)
- Telegram Bot API (HTTP long-poll)
- OpenAI API
  - Chat: `gpt-5.1` (fallback `gpt-4o`)
  - Embeddings: `text-embedding-3-large`
- Vercel (static hosting)
- Local JSON data + file-based vector store
- Cosine similarity retrieval

## Project Structure
- `index.html` — one-page event landing
- `src/telegram.js` — Telegram bot runner (greeting-first, per-chat memory, deep link)
- `src/response.js` — reply composer with event context, RAG results, attendee snapshot
- `src/retrieval.js` — cosine similarity search over stored embeddings
- `src/ingest.js` — builds `embeddings.json` from `feedback.json`
- `src/utils/openai.js` — OpenAI REST calls and offline fallbacks
- `src/attendees.js` — summarizes RSVP proficiency levels
- `data/events/<slug>/event.json` — event metadata
- `data/events/<slug>/feedback.json` — testimonials
- `data/events/<slug>/attendees.json` — RSVP proficiency levels
- `data/events/<slug>/embeddings.json` — vector store (generated)

## Quick Start
1. Install Node v18+ (v22 recommended) and clone the repo.
2. Ingest embeddings for your event:
   - `npm run ingest -- spanish_meetup_dec5`
3. Run the Telegram bot (long-poll):
   - PowerShell (same session):
     - `$env:OPENAI_API_KEY="<your_openai_key>"`
     - `$env:OPENAI_CHAT_MODEL="gpt-5.1"`
     - `$env:TELEGRAM_BOT_TOKEN="<your_telegram_bot_token>"`
     - `$env:EVENT_SLUG="spanish_meetup_dec5"`
     - `npm run telegram`
4. Open the landing page (Vercel deployment) and click “Chat to know more”.

## Environment Variables
- `OPENAI_API_KEY` — required for online LLM replies
- `OPENAI_CHAT_MODEL` — default `gpt-5.1`
- `OPENAI_EMBED_MODEL` — default `text-embedding-3-large`
- `TELEGRAM_BOT_TOKEN` — bot token from BotFather
- `EVENT_SLUG` — selects event data (`spanish_meetup_dec5` in demo)

## Notes
- No secrets are stored in the repo; all keys are read from environment variables.
- Offline fallback: when `OPENAI_API_KEY` is missing, rule-based replies tailor by topic (levels, shyness, vibe) but online mode is recommended.

## Roadmap
- Switch to webhook mode for cloud-hosted bot
- Upgrade vector store to `pgvector`/Faiss/HNSW for larger datasets
- Admin tools for buddy introductions and KPI tracking
