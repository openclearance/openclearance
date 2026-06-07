#!/usr/bin/env node
// Clearance Manifest v0.1 conformance check.
//
// This is the published-artifact gate that runs in CI. It exercises the parts of
// the standard that must hold for every released v0.1 artifact:
//
//   1. Every JSON Schema, the JSON-LD context, and every example envelope is
//      well-formed JSON.
//   2. Each schema declares the Draft 2020-12 dialect and its permanent $id, and
//      compiles cleanly under ajv (a schema that does not compile is unusable to
//      every downstream validator).
//   3. Every example Tier-0 envelope validates against tier0-envelope.schema.json.
//   4. The byte-exact integrity contract holds: integrity.hash equals the
//      SHA-256 of the exact UTF-8 bytes of the payload STRING, hashed verbatim,
//      with NO re-parse or re-serialize. This is the spine of the Tier-0
//      envelope, so it is checked the way the spec says a verifier must: hash
//      the bytes first, THEN parse.
//   5. The parsed payload of each example validates against
//      clearance-manifest.schema.json.
//
// It is intentionally dependency-light (ajv + ajv-formats + node:crypto) and has
// no network access. It validates the artifacts as published under public/v0.1/.

import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const v01 = join(root, "public", "v0.1");

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL  ${msg}`);
};
const pass = (msg) => console.log(`  ok    ${msg}`);

const readJson = (path) => {
  const text = readFileSync(path, "utf8");
  try {
    return { text, json: JSON.parse(text) };
  } catch (err) {
    fail(`${path} is not valid JSON: ${err.message}`);
    return null;
  }
};

console.log("Clearance Manifest v0.1 conformance");
console.log("");

// ---------------------------------------------------------------------------
// 1 + 2. Schemas: well-formed, correct dialect/$id, and compile under ajv.
// ---------------------------------------------------------------------------
console.log("Schemas");

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

const schemaFiles = {
  manifest: "clearance-manifest.schema.json",
  tier0: "tier0-envelope.schema.json",
  advisory: "advisory-entry.schema.json",
};

const compiled = {};
for (const [key, file] of Object.entries(schemaFiles)) {
  const loaded = readJson(join(v01, file));
  if (!loaded) continue;
  const { json } = loaded;
  const expectedId = `https://openclearance.org/v0.1/${file}`;
  if (json.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    fail(`${file} must declare the Draft 2020-12 $schema dialect`);
  }
  if (json.$id !== expectedId) {
    fail(`${file} $id must be ${expectedId} (found ${json.$id})`);
  }
  try {
    compiled[key] = ajv.compile(json);
    pass(`${file} compiles`);
  } catch (err) {
    fail(`${file} does not compile: ${err.message}`);
  }
}

// The JSON-LD context must at least be well-formed JSON with an @context.
const ctx = readJson(join(v01, "context.jsonld"));
if (ctx) {
  if (!ctx.json["@context"]) {
    fail("context.jsonld must have an @context member");
  } else {
    pass("context.jsonld well-formed");
  }
}

// ---------------------------------------------------------------------------
// 3 + 4 + 5. Example envelopes: schema-valid, byte-exact integrity, payload valid.
// ---------------------------------------------------------------------------
console.log("");
console.log("Example envelopes");

const examplesDir = join(v01, "examples");
const exampleFiles = readdirSync(examplesDir).filter((f) => f.endsWith(".json"));
if (exampleFiles.length === 0) {
  fail("no example envelopes found under public/v0.1/examples");
}

for (const file of exampleFiles.sort()) {
  const loaded = readJson(join(examplesDir, file));
  if (!loaded) continue;
  const envelope = loaded.json;

  // 3. Envelope shape.
  if (compiled.tier0) {
    if (compiled.tier0(envelope)) {
      pass(`${file} validates against tier0-envelope.schema.json`);
    } else {
      fail(`${file} fails tier0-envelope schema: ${ajv.errorsText(compiled.tier0.errors)}`);
      continue;
    }
  }

  // 4. Byte-exact integrity: hash the payload string's UTF-8 bytes verbatim,
  //    compare, and only then parse. Never re-serialize before hashing.
  const payloadString = envelope.payload;
  if (typeof payloadString !== "string") {
    fail(`${file} payload must be a string (the byte-exact serialized manifest)`);
    continue;
  }
  const computed = createHash("sha256").update(payloadString, "utf8").digest("hex");
  if (computed === envelope.integrity?.hash) {
    pass(`${file} integrity hash is byte-exact`);
  } else {
    fail(`${file} integrity mismatch: declared ${envelope.integrity?.hash}, computed ${computed}`);
    continue;
  }

  // 5. Parsed payload validates against the manifest schema.
  let payload;
  try {
    payload = JSON.parse(payloadString);
  } catch (err) {
    fail(`${file} payload string is not valid JSON: ${err.message}`);
    continue;
  }
  if (compiled.manifest) {
    if (compiled.manifest(payload)) {
      pass(`${file} payload validates against clearance-manifest.schema.json`);
    } else {
      fail(`${file} payload fails manifest schema: ${ajv.errorsText(compiled.manifest.errors)}`);
    }
  }
}

console.log("");
if (failures > 0) {
  console.error(`Conformance FAILED: ${failures} problem(s).`);
  process.exit(1);
}
console.log("Conformance passed.");
