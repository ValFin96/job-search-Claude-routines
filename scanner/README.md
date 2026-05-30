# Job scanner

Weekly pipeline: pull Adzuna → drop already-seen jobs (KV) → score new ones
with Claude → Telegram the matches. Pure ESM, runs in the Cloudflare Worker
([../webhook-worker/worker.js](../webhook-worker/worker.js) `scheduled()`).

## Files
- `config.mjs` — search phrases + title/salary filter per track. `MAX_DAYS_OLD = 8` (weekly + 1-day margin).
- `pull.mjs` — Adzuna fetch/merge/dedup-within-run/filter.
- `criteria.mjs` — scoring rubric per track (mirror of `../job_criteria_*.md`).
- `score.mjs` — Claude scoring (raw fetch, cached system block, forced tool_use). Default model `claude-haiku-4-5`.
- `dedup.mjs` — KV-backed "seen jobs" so each run is only new jobs.
- `test-pull.mjs` — local pull test (no scoring).

## Local test (pull only)
```
ADZUNA_APP_ID=xxx ADZUNA_APP_KEY=yyy node scanner/test-pull.mjs
```

## Deploy the weekly worker
From `webhook-worker/`:
```
# 1. Create the KV store, paste the printed id into wrangler.toml (SEEN_JOBS)
wrangler kv namespace create SEEN_JOBS

# 2. Set secrets (values never go in git)
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler secret put ADZUNA_APP_ID
wrangler secret put ADZUNA_APP_KEY
wrangler secret put ANTHROPIC_API_KEY
# optional: wrangler secret put SCORING_MODEL   (e.g. claude-sonnet-4-6)

# 3. Deploy (registers the Mon-morning Sydney cron)
wrangler deploy

# 4. Smoke-test the cron path without waiting a week
wrangler dev --test-scheduled
#   then: curl "http://localhost:8787/__scheduled?cron=0+22+*+*+0"
```

Tuning: scoring thresholds + rubric live in `criteria.mjs`; search terms in
`config.mjs`. Change `crons` in `wrangler.toml` to reschedule.
