# Telegram Delivery Failure — 2026-05-17

**Run date:** 2026-05-17
**Status:** FAILED — Telegram messages could not be sent

## What happened

The Anthropic cloud execution environment blocked outbound requests to api.telegram.org.

- Bash curl: returned "Host not in allowlist" (network-level block)
- WebFetch GET to api.telegram.org: returned HTTP 403 Forbidden (Telegram blocks requests from this IP range / tool sends GET not POST)

No Telegram messages were sent during this run — not the startup ping, not the digest, nothing.

## What was done instead

All run outputs were committed to the GitHub repository:
- reports/marketing-manager/2026-05-17.md
- reports/ai-adoption/2026-05-17.md
- This file (TELEGRAM_DELIVERY_FAILED_2026-05-17.md)

## Digest message that would have been sent

---

Weekly two-track job scan complete (2026-05-17).

TRACK A - Marketing Manager: scanned ~18 roles, 0 scored >=7.0.
TRACK B - AI Adoption: scanned ~12 roles, 0 scored >=7.0.

No new applications needed this week.

THREE roles below threshold worth a manual look (see report files):
1. Yellow Brick Road Home Loans — Marketing Manager, Sydney, Hybrid, $160k+. Score 6.3. Flexible culture but niche industry.
2. Advisory Firm (Woods & Co posting) — Marketing Manager, Sydney CBD, Hybrid, $120k-$140k. Score 6.0. Interstate travel flagged.
3. Anonymous company, Alexandria — Marketing Manager, Hybrid, $160k. Score 5.8. Fresh posting (May 16), company unknown.

Track B standout to manually review:
- Fujitsu AI Enablement & Adoption Lead, Sydney Hybrid, posted ~May 10. Score 5.8. BUT requires enterprise architecture background — likely a stretch. Full JD at: https://au.talent.com/view?id=618872773247769698

Market note: AI adoption specialist market thin in Sydney this week (most roles posted in April). Tomoro was acquired by OpenAI on May 11 — watch for new roles from them.

Job board 403 note: All major boards (SEEK, Indeed, LinkedIn, iworkfor.nsw.gov.au) blocked direct page access. Data from search engine snippets only. Some details unconfirmed.

---

## Action required

Val should check the GitHub repo for full details, or reconfigure the Telegram bot delivery to work from this environment.

To fix: the environment's network policy needs to permit outbound connections to api.telegram.org. This can be configured in the Claude Code on the Web environment settings.
