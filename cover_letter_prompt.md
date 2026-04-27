# Cover Letter Prompt

This is the exact prompt sent to Claude API after the resume is generated.
The n8n workflow injects the variables in [BRACKETS] automatically.

---

## PROMPT (copy this exactly into the n8n Claude node)

```
You are writing a cover letter on behalf of Valeriya Finogeeva ("Val"), a senior marketing professional based in Sydney, Australia.

Your job is to write a cover letter that sounds like Val wrote it herself — not like AI wrote it.
It must be specific to this company and role, not a template.

---

STRICT RULES:
- No em dashes (—) anywhere.
- No exclamation marks.
- No phrases like: "I am excited to apply", "I am passionate about", "I would love the opportunity", "I believe I would be a great fit."
- Under 250 words total.
- Three paragraphs only.
- Plain, confident, commercially intelligent tone.
- Do not repeat what is already obvious from the resume — the cover letter should add context, not summarise the CV.
- Do not start sentences with "I" more than twice in the entire letter.
- Sound like a senior professional who knows what they bring — not someone who is asking for a chance.

---

JOB DETAILS:
Title: [JOB_TITLE]
Company: [COMPANY_NAME]
Job Description:
[JOB_DESCRIPTION_FULL_TEXT]

---

VAL'S BACKGROUND SUMMARY (do not repeat this verbatim — use it as context):
10 years across digital marketing, programmatic campaign execution, platform specialisation (Google DV360, CM360, GA4), and enterprise presales consulting. Currently at Experian, closing a $200k+ deal within her first 7 months. Has trained ~40 students as a digital marketing instructor. Strong cross-industry experience and a track record of translating complex data and technology into commercial outcomes.

---

EXTRA CONTEXT FROM VAL (if she replied to the Telegram message with additional notes):
[EXTRA_CONTEXT_FROM_VAL]

---

RELEVANT EXTRA EXPERIENCE TO CONSIDER (use only if genuinely useful — do not force it):
[RELEVANT_EXTRA_EXPERIENCE]

---

INSTRUCTIONS:

PARAGRAPH 1 — THE HOOK
Why this role at this specific company. Not generic. Reference something real about the company, the team, the product, or the market position if you can infer it from the JD. Show she has done her homework without being sycophantic.

PARAGRAPH 2 — WHY HER
One or two specific, concrete examples from her background that directly match what the role needs. Pull from the JD requirements. Use a specific achievement or experience — not general claims. Reference a confirmed figure from her background if relevant.

PARAGRAPH 3 — THE CLOSE
Forward-looking. What she brings to the table. Confident and concise. End with a single clear call to action — not a desperate one.

---

OUTPUT FORMAT:
Plain text only. No subject line. No "Dear Hiring Manager" — start directly with the first paragraph. No sign-off needed (Val will add her name manually).

After the letter, add a section titled "COVER LETTER NOTES FOR VAL":
- One sentence explaining the main angle you took
- Flag if any assumption was made about the company or role
- Note if any extra experience was included and why
```

---

## HOW n8n USES THIS PROMPT

In the n8n Claude node (second Claude call, after resume generation):
- Model: claude-sonnet-4-6 (or latest available)
- Replace all [BRACKETED] variables
- Temperature: 0.5 (slightly more creative than resume — needs to sound personal)
- Max tokens: 800

The output feeds into:
1. The Gmail node (sent alongside the tailored resume)
2. The Telegram message (the COVER LETTER NOTES summary is included in the digest)
