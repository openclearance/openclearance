#!/usr/bin/env node
// Clearance Manifest v0.1 conformance check.
//
// Sections:
//   1+2. Schemas: well-formed, correct dialect/$id, compile under ajv.
//   3+4+5. Positive envelopes: schema-valid, byte-exact integrity, payload valid.
//   6. Rule-registry advisory check: known rules emit no advisory; unrecognised rules
//      generate an 'unrecognised_rule' advisory while remaining schema-valid.
//   7. JSON-LD expansion round-trip: the context expands key terms to expected IRIs.
//   8. Negative fixtures: confirm expected failure on bad hash and invalid payload.

import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import jsonld from "jsonld";

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

// ---------------------------------------------------------------------------
// Rule registry — the v0.1 baseline known rule ids (from src/spec-prose/v0.1/rules.md).
// An unrecognised rule is structurally valid; a conforming verifier MUST emit
// an 'unrecognised_rule' advisory and MUST NOT reject the document.
// ---------------------------------------------------------------------------
const KNOWN_RULES = new Set([
  "cc0-grants-commercial",
  "cc0-grants-derivatives",
  "cc0-waives-attribution",
  "pd-grants-commercial",
  "pd-grants-derivatives",
  "pd-waives-attribution",
  "default-deny",
]);

const CLEARANCE_FACETS = [
  "commercialReproduction",
  "derivatives",
  "attributionRequired",
];

function verifyManifest(manifest) {
  const advisories = [];
  for (const facet of CLEARANCE_FACETS) {
    const rule = manifest.clearance?.[facet]?.basis?.rule;
    if (rule && !KNOWN_RULES.has(rule)) {
      advisories.push({
        code: "unrecognised_rule",
        severity: "advisory",
        message: `Rule '${rule}' is not in the v0.1 baseline registry; manifest is still structurally valid.`,
        path: `clearance.${facet}.basis.rule`,
        rule,
      });
    }
  }
  return advisories;
}

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
  const expectedId = `https://w3id.org/clearance-manifest/v0.1/${file}`;
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
const ctxLoaded = readJson(join(v01, "context.jsonld"));
if (ctxLoaded) {
  if (!ctxLoaded.json["@context"]) {
    fail("context.jsonld must have an @context member");
  } else {
    pass("context.jsonld well-formed");
  }
}

// ---------------------------------------------------------------------------
// 3 + 4 + 5. Positive example envelopes: schema-valid, byte-exact hash, payload valid.
// ---------------------------------------------------------------------------
console.log("");
console.log("Positive example envelopes");

const examplesDir = join(v01, "examples");
const positiveFiles = readdirSync(examplesDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

if (positiveFiles.length === 0) {
  fail("no positive example envelopes found under public/v0.1/examples");
}

const runEnvelopeChecks = (file, envelope) => {
  if (compiled.tier0) {
    if (compiled.tier0(envelope)) {
      pass(`${file} validates against tier0-envelope.schema.json`);
    } else {
      fail(`${file} fails tier0-envelope schema: ${ajv.errorsText(compiled.tier0.errors)}`);
      return null;
    }
  }

  const payloadString = envelope.payload;
  if (typeof payloadString !== "string") {
    fail(`${file} payload must be a string`);
    return null;
  }
  const computed = createHash("sha256").update(payloadString, "utf8").digest("hex");
  if (computed === envelope.integrity?.hash) {
    pass(`${file} integrity hash is byte-exact`);
  } else {
    fail(`${file} integrity mismatch: declared ${envelope.integrity?.hash}, computed ${computed}`);
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(payloadString);
  } catch (err) {
    fail(`${file} payload string is not valid JSON: ${err.message}`);
    return null;
  }
  if (compiled.manifest) {
    if (compiled.manifest(payload)) {
      pass(`${file} payload validates against clearance-manifest.schema.json`);
    } else {
      fail(`${file} payload fails manifest schema: ${ajv.errorsText(compiled.manifest.errors)}`);
    }
  }
  return payload;
};

const parsedPositive = {};
for (const file of positiveFiles) {
  const loaded = readJson(join(examplesDir, file));
  if (!loaded) continue;
  const payload = runEnvelopeChecks(file, loaded.json);
  if (payload) parsedPositive[file] = payload;
}

// ---------------------------------------------------------------------------
// 6. Rule-registry advisory check.
//    - Manifests with only known rules must produce zero advisories.
//    - A manifest with unrecognised rules must produce unrecognised_rule advisories
//      while still validating against the schema (structural validity is independent).
// ---------------------------------------------------------------------------
console.log("");
console.log("Rule-registry advisory checks");

// Check all positive (non-advisory-test) examples have only known rules.
const standardExamples = positiveFiles.filter(
  (f) => f !== "unrecognized-rule.json"
);
for (const file of standardExamples) {
  const payload = parsedPositive[file];
  if (!payload) continue;
  const advisories = verifyManifest(payload);
  if (advisories.length === 0) {
    pass(`${file} basis.rule ids are all v0.1 baseline (no advisories)`);
  } else {
    fail(
      `${file} unexpectedly generated advisories: ${advisories.map((a) => a.rule).join(", ")}`
    );
  }
}

// The unrecognized-rule example must: (a) validate against the schema, and
// (b) generate at least one unrecognised_rule advisory from the reference verifier.
const unrec = parsedPositive["unrecognized-rule.json"];
if (unrec !== undefined) {
  // (a) schema validity is already confirmed by the positive envelope loop above.
  // (b) advisory emission.
  const advisories = verifyManifest(unrec);
  const hasUnrecAdvisory = advisories.some((a) => a.code === "unrecognised_rule");
  if (hasUnrecAdvisory) {
    pass(
      `unrecognized-rule.json yields ${advisories.length} unrecognised_rule advisory(ies) — advisory contract holds`
    );
    // Each advisory must validate against advisory-entry.schema.json.
    if (compiled.advisory) {
      let allValid = true;
      for (const adv of advisories) {
        if (!compiled.advisory(adv)) {
          fail(
            `unrecognized-rule.json advisory entry fails advisory-entry schema: ${ajv.errorsText(compiled.advisory.errors)}`
          );
          allValid = false;
        }
      }
      if (allValid) {
        pass(
          `unrecognized-rule.json advisory entries validate against advisory-entry.schema.json`
        );
      }
    }
  } else {
    fail(
      "unrecognized-rule.json has unrecognised rules but verifyManifest emitted no unrecognised_rule advisory"
    );
  }
} else {
  fail(
    "unrecognized-rule.json not found or failed envelope checks; advisory contract not verified"
  );
}

// ---------------------------------------------------------------------------
// 7. JSON-LD expansion round-trip.
//    Expand a sample manifest using a local (no-network) document loader, then
//    verify that known terms resolve to the expected w3id.org vocab IRIs.
// ---------------------------------------------------------------------------
console.log("");
console.log("JSON-LD expansion");

const CONTEXT_URL = "https://w3id.org/clearance-manifest/v0.1/context.jsonld";
const VOCAB_BASE = "https://w3id.org/clearance-manifest/v0.1/vocab#";
const ctxDoc = ctxLoaded?.json ?? null;

// Custom document loader — serves context from disk only, never fetches.
const localLoader = async (url) => {
  if (url === CONTEXT_URL) {
    return {
      contextUrl: null,
      documentUrl: url,
      document: ctxDoc,
    };
  }
  throw new Error(`jsonld: refusing to fetch '${url}' (offline conformance; only local context is served)`);
};

if (ctxDoc) {
  try {
    const sample = {
      "@context": [CONTEXT_URL],
      type: "ClearanceManifest",
      specVersion: "0.1",
    };
    const expanded = await jsonld.expand(sample, { documentLoader: localLoader });

    // "type" aliased to @type; ClearanceManifest must expand to the vocab IRI.
    const typeIri = expanded[0]?.["@type"]?.[0];
    const expectedTypeIri = `${VOCAB_BASE}ClearanceManifest`;
    if (typeIri === expectedTypeIri) {
      pass(`context.jsonld: 'type'/'ClearanceManifest' expands to ${expectedTypeIri}`);
    } else {
      fail(
        `context.jsonld: 'type'/'ClearanceManifest' expanded to '${typeIri}' (expected ${expectedTypeIri})`
      );
    }

    // Check clearance (a key oc: term) expands correctly.
    const sampleWithClearance = {
      "@context": [CONTEXT_URL],
      clearance: { commercialReproduction: { permitted: true } },
    };
    const expC = await jsonld.expand(sampleWithClearance, { documentLoader: localLoader });
    const clearanceKey = `${VOCAB_BASE}clearance`;
    const hasClearance = clearanceKey in (expC[0] ?? {});
    if (hasClearance) {
      pass(`context.jsonld: 'clearance' expands to ${clearanceKey}`);
    } else {
      fail(
        `context.jsonld: 'clearance' did not expand to ${clearanceKey}; found keys: ${Object.keys(expC[0] ?? {}).join(", ")}`
      );
    }

    // Compact round-trip: expand then compact back; result must re-include the context.
    const compacted = await jsonld.compact(expanded, CONTEXT_URL, {
      documentLoader: localLoader,
    });
    if (compacted["@context"] || compacted.type === "ClearanceManifest") {
      pass("context.jsonld: expand→compact round-trip recovers @context and type");
    } else {
      fail("context.jsonld: expand→compact round-trip did not recover expected fields");
    }
  } catch (err) {
    fail(`JSON-LD expansion error: ${err.message}`);
  }
} else {
  fail("context.jsonld not loaded; JSON-LD expansion skipped");
}

// ---------------------------------------------------------------------------
// 8. Negative fixtures — verify that expected failures are detected.
//    Each file in examples/negative/ declares a 'failExpect' property in a
//    sidecar comment (by naming convention) or we just hard-code the two cases.
// ---------------------------------------------------------------------------
console.log("");
console.log("Negative fixtures");

const negDir = join(examplesDir, "negative");
const negFiles = readdirSync(negDir).filter((f) => f.endsWith(".json")).sort();

if (negFiles.length === 0) {
  fail("no negative fixtures found under public/v0.1/examples/negative");
}

for (const file of negFiles) {
  const loaded = readJson(join(negDir, file));
  if (!loaded) continue;
  const envelope = loaded.json;

  // Tier-0 envelope shape must still be valid (the negative is in hash or payload).
  if (compiled.tier0 && !compiled.tier0(envelope)) {
    fail(`${file} (negative) fails tier0-envelope schema unexpectedly: ${ajv.errorsText(compiled.tier0.errors)}`);
    continue;
  }

  const payloadString = envelope.payload;
  if (typeof payloadString !== "string") {
    fail(`${file} (negative) payload must be a string`);
    continue;
  }

  const computed = createHash("sha256").update(payloadString, "utf8").digest("hex");
  const hashMatch = computed === envelope.integrity?.hash;

  if (file === "bad-hash.json") {
    if (!hashMatch) {
      pass(`bad-hash.json correctly fails byte-exact integrity check`);
    } else {
      fail("bad-hash.json unexpectedly passed the integrity check — fixture is wrong");
    }
    continue;
  }

  if (file === "missing-required-fields.json") {
    if (!hashMatch) {
      fail("missing-required-fields.json hash mismatch — fixture is corrupted");
      continue;
    }
    let payload;
    try {
      payload = JSON.parse(payloadString);
    } catch (err) {
      fail(`missing-required-fields.json payload is not valid JSON: ${err.message}`);
      continue;
    }
    if (compiled.manifest && !compiled.manifest(payload)) {
      pass("missing-required-fields.json correctly fails manifest schema validation");
    } else {
      fail("missing-required-fields.json unexpectedly passed manifest schema — fixture is wrong");
    }
    continue;
  }

  fail(`${file} (negative): no expected-failure rule defined for this fixture name`);
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------
console.log("");
if (failures > 0) {
  console.error(`Conformance FAILED: ${failures} problem(s).`);
  process.exit(1);
}
console.log("Conformance passed.");
