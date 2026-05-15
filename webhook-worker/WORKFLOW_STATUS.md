# Telegram → Routine Workflow — Status & Debug Log

Last updated: 2026-05-16 — **STATUS: WORKING** (end-to-end test passed)

This file tracks the health of the Telegram-bot → Cloudflare-Worker → Claude-routine
pipeline, the issues found, and their fix status. **No secret values are stored here**
(secrets live only in `.env`, which is gitignored, and in Cloudflare as secrets).

## How the workflow works (end to end)

1. You message the Telegram bot `@valjobsearchbot`.
2. Telegram POSTs the update to a **Cloudflare Worker** (URL registered via Telegram `setWebhook`).
3. The Worker ([worker.js](worker.js)):
   - Ignores anything that isn't a text message from your chat ID.
   - Sends you an immediate "Got it, working on it…" ack.
   - Calls the Claude routine's `/fire` API with your message text.
4. The Claude routine ("Job Application Generator") processes the request and
   sends results back to you in Telegram.

Required Cloudflare secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
`ROUTINE_TRIGGER_ID`, `ROUTINE_API_TOKEN`.

## Issue tracker

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Telegram webhook URL is empty — Telegram forwards nothing (bot token was regenerated, which clears the webhook) | Blocker | **FIXED** — webhook re-set to `telegram-job-bot.valeriya-finogeeva.workers.dev`, `getWebhookInfo` clean |
| 2 | Deployed Cloudflare `TELEGRAM_BOT_TOKEN` secret is the old/stale token; current valid token is only in `.env` | Blocker | **FIXED** — secret updated from `.env`; ack message delivered in test |
| 3 | `TELEGRAM_CHAT_ID` removed from `wrangler.toml [vars]` but never added as a secret → new code would ignore every message | Blocker | **FIXED** — old `[vars]` binding dropped by redeploy, then added as secret (deploy had to precede `secret put`; Cloudflare error `code: 10053` blocks a secret shadowing an existing var binding) |
| 4 | `ROUTINE_API_TOKEN` empty in `.env` (cannot locally verify); a value is still deployed from 2026-04-27 | Unknown | **RESOLVED** — deployed token is still valid (no "Something went wrong" in test → `/fire` returned 200). `.env` line stays empty by design; the live value lives only as a Cloudflare secret. |

## Security audit (pre-GitHub-push) — PASSED

- GitHub repo `ValFin96/job-search-Claude-routines` is **PRIVATE**.
- `.env` is gitignored and has **never** been tracked.
- Current valid bot token and the routine API token were **never** committed.
- Only credential ever in git history: the **old bot token** in commit `0f78275`
  — already **revoked** (regenerated), so it is dead/harmless.
- Also at `0f78275`: trigger ID and chat ID. Low-sensitivity identifiers, not
  credentials, and useless without the API token (which never leaked). Private
  repo further limits exposure.
- That commit is already on `origin/main`; history rewrite is **optional**, not required.
- Pending uncommitted changes only *remove* secrets from tracked files → safe to push.

## Redundancy / cleanup notes

- `ROUTINE_API_TOKEN=` line in `.env` is empty and misleading — either fill it
  or remove it so the file reflects what's actually used.
- `wrangler.toml [vars]` block is now empty (all values are secrets). Keep the
  comment as documentation; the empty `[vars]` is harmless.
- The "Got it, working on it…" ack and the detailed error echo in `worker.js`
  are intentional UX, not redundant.

## Test log

### 2026-05-16 — fix-and-test session

Fixes applied, in order:
1. `wrangler secret put TELEGRAM_BOT_TOKEN` (value from `.env`) — success.
2. `wrangler deploy` — shipped current `worker.js`, dropped stale `TELEGRAM_CHAT_ID`
   `[vars]` binding. URL: `https://telegram-job-bot.valeriya-finogeeva.workers.dev`,
   Version `8ff722ed-6efb-40b1-a974-52e62dcf521d`.
3. `wrangler secret put TELEGRAM_CHAT_ID` — success (only worked *after* the deploy
   removed the var binding; before that it failed with `code: 10053`).
4. `setWebhook` → worker URL. `getWebhookInfo`: clean, no `last_error`,
   `pending_update_count: 0`.

End-to-end test: POSTed a simulated Telegram update (using the configured chat
ID) to the worker. Worker returned HTTP 200 `OK`. Telegram received **only** the
"Got it, working on it…" ack and **no** error message → confirms:

- Worker reachable and passed the chat-ID gate (chat-ID secret correct)
- Bot-token secret valid (outbound Telegram message delivered)
- Routine `/fire` returned 200 (ROUTINE_API_TOKEN + trigger ID valid)

**Result: pipeline fully operational.** A routine reply only follows if the
message actually warrants one (the test text was a no-op ping, so no application
output is expected — that is correct behaviour, not a fault).

### Operational runbook (if it breaks again)

1. `curl ".../getWebhookInfo"` — if `url` is empty, the webhook was cleared
   (usually because the bot token was regenerated). Re-run `setWebhook`.
2. `wrangler secret list` — confirm all 4 secrets exist.
3. If outbound Telegram fails: bot token secret is stale → `wrangler secret put
   TELEGRAM_BOT_TOKEN` with the current value, verify with `getMe`.
4. If "Something went wrong: ... 401": `ROUTINE_API_TOKEN` expired → regenerate
   at claude.ai/code/scheduled and `wrangler secret put ROUTINE_API_TOKEN`.
5. Watch a live run: `wrangler tail --format pretty` (note: only logs on the
   error path; a silent tail on success is normal).
6. Adding a secret that shares a name with a `wrangler.toml [vars]` entry fails
   (`code: 10053`) — remove it from `[vars]` and `wrangler deploy` first.
