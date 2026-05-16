// Cloudflare Worker: Telegram -> Claude Code Routine bridge
// Receives Telegram webhook updates, forwards message text to the routine's /fire endpoint

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    try {
      const update = await request.json();

      // Only process text messages from Val's chat
      const message = update.message;
      if (!message || !message.text || String(message.chat.id) !== env.TELEGRAM_CHAT_ID) {
        return new Response("Ignored", { status: 200 });
      }

      const text = message.text.trim();

      // Skip bot commands that aren't for us
      if (text.startsWith("/") && !text.startsWith("/apply")) {
        return new Response("Ignored", { status: 200 });
      }

      // Acknowledge receipt immediately so Val knows it's working
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: "Got it — running your job search now. A full two-track scan usually takes several minutes (sometimes 10-15+). I'll post the results here as soon as they're ready — no need to resend."
        })
      });

      // Fire the Claude routine with Val's message
      const fireResponse = await fetch(
        `https://api.anthropic.com/v1/claude_code/routines/${env.ROUTINE_TRIGGER_ID}/fire`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.ROUTINE_API_TOKEN}`,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "experimental-cc-routine-2026-04-01"
          },
          body: JSON.stringify({ text: text })
        }
      );

      if (!fireResponse.ok) {
        const err = await fireResponse.text();
        console.error("Routine fire failed:", err);

        // Send error details to Telegram so Val can see what went wrong
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text: `Something went wrong: ${err.substring(0, 200)}`
          })
        });
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Worker error:", err);
      return new Response("Error", { status: 500 });
    }
  }
};
