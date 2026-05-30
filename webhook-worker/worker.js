// Cloudflare Worker: Telegram-send proxy for the Claude Code routine.
//
// Routes:
//   GET  /send/<PROXY_TOKEN>?text=<URL-ENCODED-TEXT>  -> forwards to Telegram sendMessage
//   POST /send  with `Authorization: Bearer <PROXY_TOKEN>` and JSON `{text, disable_web_page_preview?}`
//   POST /     (legacy Telegram webhook endpoint) -> bot-trigger path is retired;
//              replies politely so a stray message isn't silent.
//
// The routine cannot reach api.telegram.org directly from the CCR sandbox, so
// it goes through this worker (Cloudflare egress is unrestricted). The proxy
// auth token is a Cloudflare secret (PROXY_TOKEN) — separate from the bot
// token. Compromise risk: an attacker with the proxy token can only send
// messages to Val's chat — they cannot read messages or escalate.
//
// On a weekly cron the worker also runs the job scan end to end: pull Adzuna →
// drop already-seen jobs (KV) → score new ones with Claude → Telegram the
// matches. See scheduled() at the bottom.

import { TRACKS } from "../scanner/config.mjs";
import { pullTrack } from "../scanner/pull.mjs";
import { filterNew, markSeen } from "../scanner/dedup.mjs";
import { scoreJobs } from "../scanner/score.mjs";

const money = (n) => (n == null ? "—" : `$${Math.round(n / 1000)}k`);

/** Send one message to Val's Telegram chat. */
async function sendTelegram(env, text) {
  return fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  });
}

/** Telegram caps messages at 4096 chars — split on blank lines to stay under. */
async function sendTelegramChunked(env, text) {
  const LIMIT = 3800;
  const blocks = text.split("\n\n");
  let buf = "";
  for (const block of blocks) {
    if (buf && buf.length + block.length + 2 > LIMIT) {
      await sendTelegram(env, buf);
      buf = "";
    }
    buf = buf ? `${buf}\n\n${block}` : block;
  }
  if (buf) await sendTelegram(env, buf);
}

function formatJob(j, i) {
  const salary = `${money(j.salaryMin)}–${money(j.salaryMax)}`;
  const flag = j.salaryNote ? ` ⚠️ ${j.salaryNote}` : "";
  return (
    `${i}. [${j.score}/10] ${j.title}\n` +
    `   ${j.company || "—"} · ${j.location || "—"} · ${salary}${flag}\n` +
    `   ${j.reason}\n` +
    `   ${j.url}`
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // === Outbound proxy: routine -> worker -> Telegram ===
    if (path === "/send" || path.startsWith("/send/")) {
      // Auth: token in path (/send/<token>) for GET, or `Authorization: Bearer <token>` for POST.
      let providedToken = null;
      if (path.startsWith("/send/")) {
        providedToken = decodeURIComponent(path.slice("/send/".length));
      } else {
        const auth = request.headers.get("Authorization") || "";
        if (auth.startsWith("Bearer ")) providedToken = auth.slice("Bearer ".length);
      }
      if (!env.PROXY_TOKEN || providedToken !== env.PROXY_TOKEN) {
        return new Response("Forbidden", { status: 403 });
      }

      // Extract message text from query string (GET) or JSON body (POST).
      let text;
      let disablePreview = true;
      if (request.method === "GET") {
        text = url.searchParams.get("text");
      } else if (request.method === "POST") {
        try {
          const body = await request.json();
          text = body && body.text;
          if (body && typeof body.disable_web_page_preview === "boolean") {
            disablePreview = body.disable_web_page_preview;
          }
        } catch {
          return new Response("Bad JSON body", { status: 400 });
        }
      } else {
        return new Response("Method not allowed", { status: 405 });
      }
      if (!text || typeof text !== "string") {
        return new Response('Missing "text"', { status: 400 });
      }

      const tgResp = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text,
            disable_web_page_preview: disablePreview,
          }),
        }
      );
      const tgBody = await tgResp.text();
      return new Response(tgBody, {
        status: tgResp.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // === Legacy Telegram webhook endpoint (POST /) ===
    // The bot-trigger path is retired (routine now runs on a weekly schedule).
    // If a stray message arrives, reply explaining so the user isn't left guessing.
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    try {
      const update = await request.json();
      const message = update.message;
      if (!message || !message.text || String(message.chat.id) !== env.TELEGRAM_CHAT_ID) {
        return new Response("Ignored", { status: 200 });
      }

      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: "The bot-trigger path is no longer active. The job-search routine runs on its own weekly schedule and will message you with results — no action needed."
        })
      });

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Worker error:", err);
      return new Response("Error", { status: 500 });
    }
  },

  // === Weekly job scan (cron) ===
  // Always sends a final Telegram message — even on zero matches or error —
  // so a silent run can never look like a healthy one.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScan(env));
  },
};

/** Full pipeline for one cron tick. */
async function runScan(env) {
  const creds = { appId: env.ADZUNA_APP_ID, appKey: env.ADZUNA_APP_KEY };
  const scoreCreds = { apiKey: env.ANTHROPIC_API_KEY, model: env.SCORING_MODEL };

  try {
    const sections = [];
    let totalNew = 0;
    let totalAlerts = 0;

    for (const [key, track] of Object.entries(TRACKS)) {
      const { kept, errors } = await pullTrack(key, track, creds);
      if (errors.length) console.error(`${key} pull errors:`, errors);

      const fresh = await filterNew(kept, env.SEEN_JOBS);
      if (!fresh.length) continue;
      totalNew += fresh.length;

      const scored = await scoreJobs(fresh, scoreCreds);
      // Remember every new job we saw (even rejects) so it never resurfaces.
      await markSeen(fresh, env.SEEN_JOBS);

      const alerts = scored
        .filter((j) => j.verdict === "alert")
        .sort((a, b) => b.score - a.score);
      const review = scored.filter((j) => j.verdict === "review").length;
      totalAlerts += alerts.length;

      if (alerts.length || review) {
        const lines = alerts.map((j, i) => formatJob(j, i + 1));
        sections.push(
          `🎯 ${track.label} — ${alerts.length} match(es)` +
            (review ? `, ${review} borderline` : "") +
            (lines.length ? `\n\n${lines.join("\n\n")}` : "")
        );
      }
    }

    if (!totalNew) {
      await sendTelegram(env, "Weekly job scan: no new listings this week.");
      return;
    }
    if (!totalAlerts) {
      await sendTelegram(
        env,
        `Weekly job scan: ${totalNew} new listing(s), none scored a match (≥7). Nothing to action.`
      );
      return;
    }
    await sendTelegramChunked(
      env,
      `Weekly job scan — ${totalAlerts} match(es) from ${totalNew} new listing(s):\n\n` +
        sections.join("\n\n———\n\n")
    );
  } catch (err) {
    console.error("Scan error:", err);
    await sendTelegram(env, `Weekly job scan failed: ${err.message}`);
  }
}
