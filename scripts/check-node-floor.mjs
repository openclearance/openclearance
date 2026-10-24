#!/usr/bin/env node
// Node toolchain floor check.
//
// `.nvmrc` pins the Node version that CI (setup-node `node-version-file`) and
// local `nvm use` run. Every package in package-lock.json may declare an
// `engines.node` range, and a dependency bump can raise that floor above the
// pinned version without any other file changing. This check fails when the
// pinned version does not satisfy every declared range, so the bump that raises
// the floor is the change that has to move the pin.
//
// Usage: node scripts/check-node-floor.mjs [repo-root]

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import semver from "semver";

const here = dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ?? join(here, "..");

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL  ${msg}`);
};
const pass = (msg) => console.log(`  ok    ${msg}`);

// npm's os/cpu/libc matching: a list of allowed values, or '!value' exclusions.
const allows = (list, value) => {
  if (!Array.isArray(list) || list.length === 0) return true;
  if (list.includes(`!${value}`)) return false;
  const allowed = list.filter((v) => !v.startsWith("!"));
  return allowed.length === 0 || allowed.includes(value);
};
const libc =
  process.platform === "linux"
    ? process.report?.getReport()?.header?.glibcVersionRuntime
      ? "glibc"
      : "musl"
    : null;
const installsHere = (entry) =>
  allows(entry.os, process.platform) &&
  allows(entry.cpu, process.arch) &&
  (libc === null || allows(entry.libc, libc));

console.log("Node toolchain floor");

const pinnedRaw = readFileSync(join(root, ".nvmrc"), "utf8").trim().replace(/^v/, "");
const pinned = semver.valid(pinnedRaw);
if (!pinned) {
  fail(`.nvmrc must name one exact version (x.y.z), found '${pinnedRaw}'`);
} else {
  pass(`.nvmrc pins Node ${pinned}`);

  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  // Lockfile v2/v3: `packages` is keyed by install path; "" is the root package.
  // Older packages may declare engines as an array of "node <range>" strings.
  // An optional package restricted to another os/cpu/libc is never installed
  // here (npm skips it the same way), so its range does not bind this platform.
  const ranges = [];
  let skipped = 0;
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if ((entry?.optional || entry?.devOptional) && !installsHere(entry)) {
      skipped += 1;
      continue;
    }
    const engines = entry?.engines;
    const name = path === "" ? "package.json" : path.replace(/^.*node_modules\//, "");
    if (typeof engines?.node === "string") {
      ranges.push([name, engines.node]);
    } else if (Array.isArray(engines)) {
      for (const item of engines) {
        const match = typeof item === "string" ? item.match(/^\s*node\s*(.*)$/) : null;
        if (match) ranges.push([name, match[1] || "*"]);
      }
    }
  }

  for (const [name, range] of ranges) {
    if (semver.validRange(range) === null) {
      fail(`${name} declares engines.node '${range}', which is not a valid semver range`);
    } else if (!semver.satisfies(pinned, range)) {
      fail(`${name} requires Node ${range}; .nvmrc pins ${pinned}`);
    }
  }
  if (failures === 0) {
    pass(
      `Node ${pinned} satisfies all ${ranges.length} engines.node ranges in package-lock.json ` +
        `(${skipped} optional packages for other platforms skipped on ${process.platform}-${process.arch})`
    );
  }
}

console.log("");
if (failures > 0) {
  console.error(`Node floor check FAILED: ${failures} problem(s).`);
  process.exit(1);
}
console.log("Node floor check passed.");
