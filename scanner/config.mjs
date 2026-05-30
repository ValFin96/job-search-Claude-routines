// Machine-readable distillation of the job_criteria_*.md files.
// The .md files stay the human-readable source of truth; this file is what
// the scanner code actually runs on. If you edit a criteria .md, mirror the
// change here.

export const ADZUNA_COUNTRY = "au"; // Australia

export const TRACKS = {
  marketing: {
    label: "Marketing Manager",
    criteriaFile: "job_criteria_marketing.md",
    // Each phrase is run as a separate Adzuna query (Adzuna `what` matches all
    // words in the phrase). Results are merged and de-duplicated by job id.
    searchPhrases: [
      "marketing manager",
      "senior marketing manager",
      "product marketing manager",
      "marketing operations manager",
      "marketing technology manager",
      "growth marketing manager",
      "demand generation manager",
      "head of marketing",
      "marketing strategist",
    ],
    where: "Sydney",
    // The job TITLE must contain at least one of these (whole-word match).
    // This is the main noise filter — Adzuna keyword matching is loose.
    titleInclude: [
      "marketing", "martech", "brand", "growth", "demand generation",
      "crm", "campaign", "communications", "go-to-market",
    ],
    // Title-level rejects: if any appears in the job TITLE, drop the job.
    titleExclude: [
      "agency", "presales", "pre-sales", "business development",
      "account director", "account manager", "account executive",
      "sales manager", "field sales", "new business", "intern", "graduate",
      "assistant", "coordinator", "executive",
    ],
    minSalary: 120000, // listed salaries below this are rejected; unlisted pass through
  },

  aiAdoption: {
    label: "AI Adoption Specialist",
    criteriaFile: "job_criteria_ai_adoption.md",
    searchPhrases: [
      "AI adoption",
      "AI enablement",
      "AI transformation",
      "AI implementation",
      "AI change management",
      "AI training",
      "AI program manager",
      "AI operations manager",
      "AI strategy",
      "digital transformation AI",
    ],
    where: "Sydney",
    // Title must mention AI explicitly — the broadest, highest-precision signal.
    titleInclude: ["ai", "artificial intelligence", "genai", "gen ai", "copilot"],
    // No AI-adoption role is titled "...Engineer/Developer/Architect/Scientist";
    // those are the hands-on technical roles the criteria explicitly excludes.
    titleExclude: [
      "engineer", "developer", "architect", "scientist", "devops", "mlops",
      "full stack", "fullstack", "ai researcher", "recruitment", "recruiter",
      "sales director", "sales manager", "account manager", "account director",
      "account executive", "intern", "graduate",
    ],
    minSalary: 120000,
  },
};

// Weekly run pulls jobs posted in the last N days. 8 (not 7) gives a 1-day
// overlap margin so nothing slips through between runs; KV dedup removes the
// repeats so the overlap never reaches Telegram.
export const MAX_DAYS_OLD = 8;
export const RESULTS_PER_PAGE = 50;
