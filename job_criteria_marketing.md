# Job Search Criteria

This file defines exactly what jobs to find, keep, and reject.
The n8n workflow uses this to filter listings before scoring.

---

## TARGET ROLE TYPES

- Marketing Strategy Manager / Senior Marketing Manager
- Product Marketing Manager
- Marketing Operations Manager / Director
- Marketing Technology (MarTech) Manager
- Growth Marketing Manager (internal brand only — not agency)
- Digital Marketing Manager (internal brand only)
- CRM Manager / Campaign Manager (internal)
- Demand Generation Manager

---

## INCLUDE KEYWORDS (OR logic — job must match at least one)

"marketing manager"
"product marketing"
"marketing operations"
"marketing ops"
"martech"
"marketing technology"
"growth marketing"
"digital marketing manager"
"marketing strategist"
"campaign manager"
"CRM manager"
"demand generation"
"marketing lead"
"senior marketing"
"head of marketing"
"B2B marketing"

---

## EXCLUDE KEYWORDS (if these appear prominently in the title or JD, reject the listing)

### Role type exclusions (title-level)
"agency"
"presales"
"pre-sales"
"business development"
"account director"
"account manager"
"account executive"
"sales manager"
"field sales"
"new business"

### Culture/environment exclusions (JD-level — if 2+ appear, flag or reject)
"fast-paced"
"fast paced"
"competing priorities"
"multiple competing"
"high pressure"
"high-pressure"
"client-facing"
"client facing"
"agency environment"
"juggling priorities"
"deadline-driven"
"deadline driven"
"hit the ground running"
"dynamic environment"
"no two days the same"

---

## HARD FILTERS

| Filter | Value |
|---|---|
| Location | Sydney, NSW (on-site or hybrid accepted) |
| Work arrangement | Remote or hybrid only. Flag any fully in-office role. |
| Salary | $120,000+ AUD where listed. If not listed: pass through — Claude flags in Telegram. |
| Role type | Exclude agency roles entirely. Internal brand / corporate / government only. |
| Min seniority | Mid-senior and above (Senior, Lead, Manager, Head of, Principal) |

---

## SCORING BONUSES (used by Claude — not hard filters)

| Signal | Bonus |
|---|---|
| Role explicitly internal / no external clients | +0.5 |
| AI / automation / MarTech tools mentioned | +0.5 |
| Flexible hours or 35-hour week mentioned | +0.5 |
| "Autonomy", "self-directed", "own your roadmap" | +0.5 |
| Small or collaborative team culture | +0.3 |
| Work-life balance / supportive culture explicitly mentioned | +0.3 |
| iworkfor.nsw.gov.au (government role — typically lower stress) | +0.3 |

---

## SCORE THRESHOLD

- Score 7.0 or above: Generate tailored resume + cover letter + send Telegram alert
- Score 5.0–6.9: Log to Google Sheet with status "Below threshold — review manually"
- Score below 5.0: Log as "Rejected" and discard

---

## JOB BOARDS IN SCOPE

| Board | Method |
|---|---|
| Seek | RSS feed |
| Indeed | RSS feed |
| iworkfor.nsw.gov.au | HTTP scrape |
| LinkedIn (via Google Jobs) | SerpAPI |

---

## DEDUPLICATION RULE

If the same job (matched by title + company name) has already been logged in Google Sheets in the last 30 days, skip it. Do not send duplicate Telegram alerts.

---

## SALARY ASSUMPTION LOGIC

If salary is not listed in the job posting, Claude should:
1. Check company type and seniority level
2. If government / large corporate at manager level: assume $120k–$150k range (pass)
3. If startup or SME at manager level: flag as "Salary not listed — likely $100k–$130k range, verify before applying"
4. If clearly a junior role despite the title: reject
