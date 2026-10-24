#!/usr/bin/env node
// Public-text check for pull requests opened by the maintainer or by Dependabot.
//
// This repository is public, and every commit message and PR body in it is read
// by the audience the standard is written for. For PRs opened from the
// maintainer account (and Dependabot's), this check enforces the identity and
// trailer rules in CONTRIBUTING.md:
//   - every commit in the PR is authored and committed by an allowed identity;
//   - no commit message or PR body carries a co-author trailer, a coding-session
//     trailer or session link, or the retired identity domain.
// PRs from other contributors are not subject to it: co-author trailers are
// normal practice in an open project, and their identities are their own.
//
// Inputs come from the environment, never from interpolated command text:
//   PR_AUTHOR   login of the account that opened the PR
//   BASE_SHA    the PR's base commit; HEAD_SHA the PR's head commit
//   PR_BODY     the PR description (may be empty)
//
// Usage: node scripts/check-public-text.mjs            (reads the environment)
//        node scripts/check-public-text.mjs --self-test

import { execFileSync } from "node:child_process";

const SUBJECT_LOGINS = new Set(["cfpramod", "dependabot[bot]"]);
const ALLOWED_AUTHORS = new Set([
  "pramod@open-museum.art",
  "5059134+cfpramod@users.noreply.github.com", // edits made in the GitHub web UI
  "49699333+dependabot[bot]@users.noreply.github.com",
]);
// GitHub itself commits web-UI edits, merges and Dependabot updates.
const ALLOWED_COMMITTERS = new Set([...ALLOWED_AUTHORS, "noreply@github.com"]);
const DENIED_TEXT = [
  [/^[ \t]*co-?authored[- ]by\b/im, "a co-author trailer"],
  [/^[ \t]*claude[- ]session\b/im, "a coding-session trailer"],
  [/claude\.ai\/code\/session/i, "a coding-session link"],
  [/chainalign/i, "the retired identity domain"],
];

// Pure check: returns the list of problems for one PR.
export function checkPublicText({ author, commits, body }) {
  if (!SUBJECT_LOGINS.has(author)) return null;
  const problems = [];
  const scan = (text, where) => {
    for (const [pattern, label] of DENIED_TEXT) {
      if (pattern.test(text)) problems.push(`${where} contains ${label}`);
    }
  };
  for (const c of commits) {
    const short = c.sha.slice(0, 7);
    if (!ALLOWED_AUTHORS.has(c.authorEmail)) problems.push(`commit ${short} is authored by a non-allowed identity`);
    if (!ALLOWED_COMMITTERS.has(c.committerEmail)) {
      problems.push(`commit ${short} is committed by a non-allowed identity`);
    }
    scan(c.message, `commit ${short} message`);
  }
  scan(body ?? "", "the PR body");
  return problems;
}

function readCommits(base, head) {
  for (const sha of [base, head]) {
    if (!/^[0-9a-f]{40}$/.test(sha ?? "")) throw new Error(`not a full commit SHA: '${sha}'`);
  }
  const out = execFileSync("git", ["log", "--format=%H%x1f%ae%x1f%ce%x1f%B%x1e", `${base}..${head}`], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .split("\x1e")
    .map((rec) => rec.replace(/^\n/, ""))
    .filter((rec) => rec.length > 0)
    .map((rec) => {
      const [sha, authorEmail, committerEmail, message] = rec.split("\x1f");
      return { sha, authorEmail, committerEmail, message };
    });
}

function selfTest() {
  const ok = { sha: "a".repeat(40), authorEmail: "pramod@open-museum.art", committerEmail: "pramod@open-museum.art", message: "Fix a thing\n\nBody text.\n" };
  const cases = [
    ["clean maintainer PR", { author: "cfpramod", commits: [ok], body: "Plain description." }, 0],
    ["web-UI edit committed by GitHub", { author: "cfpramod", commits: [{ ...ok, authorEmail: "5059134+cfpramod@users.noreply.github.com", committerEmail: "noreply@github.com" }], body: "" }, 0],
    ["Dependabot update", { author: "dependabot[bot]", commits: [{ ...ok, authorEmail: "49699333+dependabot[bot]@users.noreply.github.com", committerEmail: "noreply@github.com" }], body: "Bumps x from 1 to 2." }, 0],
    ["unknown author identity", { author: "cfpramod", commits: [{ ...ok, authorEmail: "someone@example.com" }], body: "" }, 1],
    ["unknown committer identity", { author: "cfpramod", commits: [{ ...ok, committerEmail: "someone@example.com" }], body: "" }, 1],
    ["co-author trailer in a message", { author: "cfpramod", commits: [{ ...ok, message: "Fix\n\nCo-Authored-By: A <a@example.com>\n" }], body: "" }, 1],
    ["co-author trailer without hyphen or colon", { author: "cfpramod", commits: [{ ...ok, message: "Fix\n\nCo-Authored by A <a@example.com>\n" }], body: "" }, 1],
    ["session trailer in a message", { author: "cfpramod", commits: [{ ...ok, message: "Fix\n\nClaude-Session: abc\n" }], body: "" }, 1],
    ["session link in the body", { author: "cfpramod", commits: [ok], body: "See https://claude.ai/code/session_x" }, 1],
    ["retired domain in the body", { author: "cfpramod", commits: [ok], body: "Mail x@ChainAlign.com" }, 1],
    ["prose mention of co-authorship is not a trailer", { author: "cfpramod", commits: [ok], body: "No co-authored-by trailers are used here." }, 0],
    ["outside contributor is not subject", { author: "someone-else", commits: [{ ...ok, authorEmail: "x@example.com", message: "Fix\n\nCo-authored-by: B <b@example.com>\n" }], body: "" }, null],
  ];
  let bad = 0;
  for (const [name, input, want] of cases) {
    const got = checkPublicText(input);
    const n = got === null ? null : got.length;
    if (n === want) console.log(`  ok    self-test: ${name}`);
    else {
      bad += 1;
      console.error(`  FAIL  self-test: ${name} (expected ${want} problem(s), got ${n}${got?.length ? ": " + got.join("; ") : ""})`);
    }
  }
  return bad;
}

console.log("Public text");
if (process.argv.includes("--self-test")) {
  const bad = selfTest();
  console.log("");
  if (bad > 0) {
    console.error(`Public-text self-test FAILED: ${bad} case(s).`);
    process.exit(1);
  }
  console.log("Public-text self-test passed.");
} else {
  const author = process.env.PR_AUTHOR ?? "";
  if (!SUBJECT_LOGINS.has(author)) {
    console.log(`  ok    PR opened by '${author}', an outside contributor; the maintainer identity rules do not apply`);
    console.log("");
    console.log("Public-text check passed.");
  } else {
    const commits = readCommits(process.env.BASE_SHA, process.env.HEAD_SHA);
    const problems = checkPublicText({ author, commits, body: process.env.PR_BODY ?? "" });
    for (const p of problems) console.error(`  FAIL  ${p}`);
    console.log("");
    if (problems.length > 0) {
      console.error(`Public-text check FAILED: ${problems.length} problem(s). See CONTRIBUTING.md, "Commit identity and messages".`);
      process.exit(1);
    }
    console.log(`  ok    ${commits.length} commit(s) and the PR body follow the identity and trailer rules`);
    console.log("Public-text check passed.");
  }
}
