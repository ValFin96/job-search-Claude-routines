// Step 1 test runner — verify the Adzuna pull + relevance filter locally
// before anything is deployed.
//
//   ADZUNA_APP_ID=xxx ADZUNA_APP_KEY=yyy node scanner/test-pull.mjs
//
// Prints, per track: how many jobs Adzuna returned, how many were rejected by
// a title-level exclude keyword, and the kept (relevant) jobs.

import { TRACKS } from "./config.mjs";
import { pullTrack } from "./pull.mjs";

const appId = process.env.ADZUNA_APP_ID;
const appKey = process.env.ADZUNA_APP_KEY;

if (!appId || !appKey) {
  console.error(
    "Missing credentials. Run with:\n" +
      "  ADZUNA_APP_ID=xxx ADZUNA_APP_KEY=yyy node scanner/test-pull.mjs\n\n" +
      "Get a free key at https://developer.adzuna.com/signup"
  );
  process.exit(1);
}

const money = (n) => (n == null ? "—" : `$${Math.round(n).toLocaleString()}`);

for (const [key, track] of Object.entries(TRACKS)) {
  console.log(`\n${"=".repeat(72)}\n  TRACK: ${track.label}\n${"=".repeat(72)}`);

  const { kept, rejected, errors } = await pullTrack(key, track, { appId, appKey });

  if (errors.length) {
    console.log(`\n  ⚠ ${errors.length} query error(s):`);
    errors.forEach((e) => console.log(`    - ${e}`));
  }

  console.log(
    `\n  ${kept.length + rejected.length} unique jobs returned · ` +
      `${rejected.length} rejected by title filter · ${kept.length} relevant\n`
  );

  if (!kept.length) {
    console.log("  No relevant new jobs.");
    continue;
  }

  kept
    .sort((a, b) => (b.created || "").localeCompare(a.created || ""))
    .forEach((j, i) => {
      console.log(`  ${i + 1}. ${j.title}`);
      console.log(`     ${j.company || "—"} · ${j.location || "—"}`);
      console.log(
        `     salary: ${money(j.salaryMin)}–${money(j.salaryMax)} [${j.salaryFlag}] · ` +
          `posted ${j.created.slice(0, 10)} · matched "${j.matchedPhrase}"`
      );
      console.log(`     ${j.url}`);
      console.log("");
    });
}

console.log("Done.");
