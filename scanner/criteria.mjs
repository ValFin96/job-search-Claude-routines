// Compact scoring rubric per track, embedded so the Worker can score at
// runtime without reading the repo .md files. The human-readable source of
// truth stays in job_criteria_*.md at repo root — if you change those, mirror
// the substance here.
//
// Scale: 0–10. Threshold convention (from the .md files):
//   >= 7.0  → alert (send to Telegram)
//   5.0–6.9 → borderline (review manually)
//   < 5.0   → reject

export const SCORE_ALERT = 7.0;
export const SCORE_BORDERLINE = 5.0;

export const RUBRICS = {
  marketing: `TRACK: Marketing Manager (Sydney). Candidate = Val: senior marketing
manager, business-side, NOT engineer. Wants internal/corporate/government brand
roles, mid-senior+, remote or hybrid, ~$120k+ AUD.

DISQUALIFY (score <= 2) if the role is:
- agency / client-facing services, presales, business development, or any sales
  (account manager/director/executive, field sales, new business)
- junior (coordinator, assistant, intern, graduate) despite the title
- fully on-site with no flexibility

REWARD (push toward 8–10):
- internal brand / corporate / government, no external clients
- AI / automation / MarTech tools in the JD
- flexible hours, autonomy ("own your roadmap", self-directed)
- small/collaborative team, work-life balance stated
- iworkfor.nsw.gov.au or similar gov role

PENALISE (drag toward 5–6): high-pressure / "fast-paced" / "deadline-driven" /
"juggling competing priorities" language; vague seniority.

SALARY: if unlisted, do NOT reject — assume gov/large-corp manager ≈ $120k–150k
(pass), startup/SME manager ≈ $100k–130k (pass but note "verify salary").`,

  aiAdoption: `TRACK: AI Adoption / Enablement (Sydney or AU-remote). Candidate = Val:
business-side AI power user (daily Claude Code, n8n, Copilot), enterprise
presales + training background. NOT a developer / ML engineer / data scientist.
Wants business/consulting/enablement AI roles, ~$120k+ AUD.

DISQUALIFY (score <= 2) if the role:
- is hands-on technical: software/ML/data engineer, data scientist, devops/mlops,
  AI researcher, full-stack — or requires model training/fine-tuning
- requires a CS/engineering degree, PhD, or 3+ hard coding reqs as REQUIREMENTS
  (Python/PyTorch/TensorFlow/Kubernetes/SageMaker/CI-CD)
- is recruitment/sales dressed up with "AI"

REWARD (push toward 8–10):
- explicitly "no coding required" / "non-technical background welcome"
- mentions Claude / Anthropic specifically
- training / enablement / upskilling teams on AI
- change management / org transformation focus
- consulting/advisory (internal or external), AI governance/responsible AI
- prompt engineering framed as a business skill; remote-first

NOTE: tool *usage* (Claude, ChatGPT, Copilot, n8n, Zapier) is fine and good;
only building/engineering the tools disqualifies. Sydney's AI-adoption market is
thin, so genuine business-side matches are valuable — don't inflate weak ones,
but don't punish a role just for being rare.`,
};
