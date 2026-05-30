// Claude scoring of new jobs against a track's rubric.
// Raw fetch to the Anthropic Messages API — no SDK, so this runs unchanged in
// a Cloudflare Worker. The rubric goes in a cached system block (same bytes
// across every job in a track → cache hits after the first call), and we force
// a tool call so the model returns structured JSON, not prose.

import { RUBRICS, SCORE_ALERT, SCORE_BORDERLINE } from "./criteria.mjs";

const API_URL = "https://api.anthropic.com/v1/messages";
// Scoring is a constrained classification task; Haiku 4.5 handles it well and
// keeps weekly cost low. Override with env.SCORING_MODEL if you want Opus/Sonnet.
const DEFAULT_MODEL = "claude-haiku-4-5";

const SCORE_TOOL = {
  name: "record_score",
  description: "Record the fit score and reasoning for one job.",
  input_schema: {
    type: "object",
    properties: {
      score: {
        type: "number",
        description: "Fit score 0–10. <=2 = disqualified, >=7 = strong match.",
      },
      reason: {
        type: "string",
        description: "One or two sentences: why this score. Name the deciding factor.",
      },
      salaryNote: {
        type: "string",
        description: 'Optional flag, e.g. "verify salary — unlisted". Empty string if none.',
      },
    },
    required: ["score", "reason"],
  },
};

function verdictFor(score) {
  if (score >= SCORE_ALERT) return "alert";
  if (score >= SCORE_BORDERLINE) return "review";
  return "reject";
}

/** Build the per-job user message. Description is capped to keep tokens sane. */
function jobToText(job) {
  const money = (n) => (n == null ? "unlisted" : `$${Math.round(n).toLocaleString()}`);
  return [
    `Title: ${job.title}`,
    `Company: ${job.company || "—"}`,
    `Location: ${job.location || "—"}`,
    `Salary: ${money(job.salaryMin)}–${money(job.salaryMax)} (${job.salaryFlag})`,
    "",
    "Job description:",
    (job.description || "").slice(0, 4000),
  ].join("\n");
}

/**
 * Score one job. Returns { score, verdict, reason, salaryNote } — or, on
 * failure, { score: null, verdict: "error", reason }.
 */
export async function scoreJob(job, trackKey, { apiKey, model = DEFAULT_MODEL } = {}) {
  const rubric = RUBRICS[trackKey];
  if (!rubric) throw new Error(`No rubric for track "${trackKey}"`);

  const body = {
    model,
    max_tokens: 512,
    system: [
      {
        type: "text",
        text:
          "You score job listings for a specific candidate against the rubric " +
          "below. Be honest and calibrated: most jobs are mediocre fits (4–6). " +
          "Reserve >=7 for genuinely strong matches and <=2 for disqualifiers. " +
          "Always call record_score.\n\n" +
          rubric,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [SCORE_TOOL],
    tool_choice: { type: "tool", name: "record_score" },
    messages: [{ role: "user", content: jobToText(job) }],
  };

  let resp;
  try {
    resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { score: null, verdict: "error", reason: `network: ${err.message}` };
  }

  if (!resp.ok) {
    const text = (await resp.text()).slice(0, 300);
    return { score: null, verdict: "error", reason: `HTTP ${resp.status}: ${text}` };
  }

  const data = await resp.json();
  const toolUse = (data.content || []).find((b) => b.type === "tool_use");
  if (!toolUse?.input) {
    return { score: null, verdict: "error", reason: "no tool_use in response" };
  }

  const { score, reason, salaryNote } = toolUse.input;
  return {
    score,
    verdict: verdictFor(score),
    reason: reason || "",
    salaryNote: salaryNote || "",
  };
}

/**
 * Score many jobs with bounded concurrency (default 4). Mutates nothing;
 * returns a new array of jobs each with `.score`, `.verdict`, `.reason`,
 * `.salaryNote` merged in.
 */
export async function scoreJobs(jobs, creds, { concurrency = 4 } = {}) {
  const out = new Array(jobs.length);
  let next = 0;

  async function worker() {
    while (next < jobs.length) {
      const i = next++;
      const job = jobs[i];
      const result = await scoreJob(job, job.track, creds);
      out[i] = { ...job, ...result };
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, jobs.length) }, worker)
  );
  return out;
}
