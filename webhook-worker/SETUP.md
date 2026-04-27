# Telegram Webhook Worker Setup

This Cloudflare Worker bridges your Telegram bot to the Claude Code Application Generator routine.
When you reply to the bot in Telegram, the worker forwards your message to the routine.

## One-time setup (10 minutes)

### 1. Create free Cloudflare account
Go to https://dash.cloudflare.com/sign-up (free, no credit card)

### 2. Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

### 3. Add secrets
```bash
cd webhook-worker
wrangler secret put ROUTINE_TRIGGER_ID
# Paste: ***REDACTED-TRIGGER-ID***

wrangler secret put ROUTINE_API_TOKEN
# Paste: the token you generate in step 4

wrangler secret put TELEGRAM_BOT_TOKEN
# Paste: ***REDACTED-TELEGRAM-BOT-TOKEN***
```

### 4. Generate the routine API token
1. Go to https://claude.ai/code/scheduled
2. Find "Job Application Generator" routine
3. Click Edit (pencil icon)
4. Click "Add another trigger" -> "API"
5. Click "Generate token"
6. Copy the token (shown once, save it)

### 5. Deploy the worker
```bash
cd webhook-worker
wrangler deploy
```
It will print a URL like: `https://telegram-job-bot.YOUR-SUBDOMAIN.workers.dev`

### 6. Set Telegram webhook
Replace YOUR_WORKER_URL with the URL from step 5:
```bash
curl "https://api.telegram.org/bot***REDACTED-TELEGRAM-BOT-TOKEN***/setWebhook?url=YOUR_WORKER_URL"
```

### Done. Test it:
Send "hello" to your bot in Telegram. You should get a response within 1-2 minutes.

## How it works
1. You send a message to the Telegram bot
2. Telegram forwards it to this Cloudflare Worker
3. Worker calls the Claude routine's /fire API with your message
4. Routine processes your request and sends results back via Telegram

## Costs
- Cloudflare Workers free tier: 100,000 requests/day (more than enough)
- Claude routine: uses your existing Anthropic credits
