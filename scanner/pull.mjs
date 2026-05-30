// Adzuna job pulling + relevance filtering.
// Pure functions, no Node-only APIs — so the Cloudflare Worker can import this
// file directly once Step 1 is verified.

import { ADZUNA_COUNTRY, MAX_DAYS_OLD, RESULTS_PER_PAGE } from "./config.mjs";

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs";

/** Build a single Adzuna search URL. */
function buildUrl({ appId, appKey }, phrase, where, page = 1) {
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(RESULTS_PER_PAGE),
    what: phrase,
    max_days_old: String(MAX_DAYS_OLD),
    sort_by: "date",
  });
  if (where) params.set("where", where);
  return `${ADZUNA_BASE}/${ADZUNA_COUNTRY}/search/${page}?${params}`;
}

/** Normalise one raw Adzuna job result into our flat shape. */
function normalize(raw, trackKey, minSalary, matchedPhrase) {
  const salaryMin = raw.salary_min ?? null;
  const predicted = raw.salary_is_predicted === "1" || raw.salary_is_predicted === 1;
  let salaryFlag;
  if (salaryMin == null) salaryFlag = "unlisted";
  else if (predicted) salaryFlag = "predicted";
  else if (salaryMin >= minSalary) salaryFlag = "ok";
  else salaryFlag = "low";

  return {
    id: String(raw.id),
    track: trackKey,
    title: raw.title || "",
    company: raw.company?.display_name || "",
    location: raw.location?.display_name || "",
    salaryMin,
    salaryMax: raw.salary_max ?? null,
    salaryFlag,
    url: raw.redirect_url || "",
    created: raw.created || "",
    description: (raw.description || "").replace(/\s+/g, " ").trim(),
    matchedPhrase,
  };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True if the title contains `term` as a whole word (case-insensitive). */
function hasWord(title, term) {
  return new RegExp(`\\b${escapeRe(term)}\\b`, "i").test(title);
}

/**
 * Decide whether a job survives the pull-stage relevance filter.
 * Returns null if kept, or a short rejection reason string.
 */
function rejectReason(job, track) {
  const title = job.title || "";
  if (!track.titleInclude.some((kw) => hasWord(title, kw))) {
    return "title: no relevant keyword";
  }
  const hit = track.titleExclude.find((kw) => title.toLowerCase().includes(kw.toLowerCase()));
  if (hit) return `title: excluded ("${hit}")`;
  if (job.salaryFlag === "low") return "salary: listed below floor";
  return null;
}

/**
 * Pull all jobs for one track: runs every search phrase, merges, de-duplicates
 * by Adzuna job id, then applies the relevance filter.
 * Returns { kept, rejected, errors }. Each rejected job has a `.reason`.
 */
export async function pullTrack(trackKey, track, creds, { delayMs = 250 } = {}) {
  const byId = new Map();
  const errors = [];

  for (const phrase of track.searchPhrases) {
    try {
      const resp = await fetch(buildUrl(creds, phrase, track.where));
      if (!resp.ok) {
        errors.push(`"${phrase}" → HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
        continue;
      }
      const data = await resp.json();
      for (const raw of data.results || []) {
        const id = String(raw.id);
        if (!byId.has(id)) {
          byId.set(id, normalize(raw, trackKey, track.minSalary, phrase));
        }
      }
    } catch (err) {
      errors.push(`"${phrase}" → ${err.message}`);
    }
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  }

  const kept = [];
  const rejected = [];
  for (const job of byId.values()) {
    const reason = rejectReason(job, track);
    if (reason) rejected.push({ ...job, reason });
    else kept.push(job);
  }
  return { kept, rejected, errors };
}
