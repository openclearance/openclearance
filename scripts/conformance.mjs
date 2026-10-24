#!/usr/bin/env node
// Clearance Manifest conformance check (v0.1 + the v0.2 rights vocabulary).
//
// Sections:
//   1+2. Schemas: well-formed, correct dialect/$id, compile under ajv.
//   3+4+5. Positive envelopes: schema-valid, byte-exact integrity, payload valid.
//   6. Rule-registry advisory check: known rules emit no advisory; unrecognised rules
//      generate an 'unrecognised_rule' advisory while remaining schema-valid.
//   7. JSON-LD expansion round-trip: the context expands key terms to expected IRIs.
//   8. Negative fixtures: confirm expected failure on bad hash and invalid payload.
//   9. v0.2 rights vocabulary (grantAuthority / designation / evidence): schema +
//      context checks, the reference cross-field consistency checks (the authority
//      gate, the designation and evidence input bans, evidence-pointer resolution,
//      the protected-name guard), and the fixture vectors for each.

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
//    verify that known terms resolve to the expected openclearance.org vocab IRIs.
// ---------------------------------------------------------------------------
console.log("");
console.log("JSON-LD expansion");

const CONTEXT_URL = "https://openclearance.org/v0.1/context.jsonld";
const VOCAB_BASE = "https://openclearance.org/v0.1/vocab#";
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
// 9. v0.2 rights vocabulary: grantAuthority (authority axis), designation
//    (designation axis), evidence (the general evidence pointer).
//
//    The v0.2 manifest schema carries the frozen v0.1 body unchanged and adds the
//    three axes as optional top-level blocks. Cross-field rules that JSON Schema
//    cannot express are enforced by the reference consistency check below; a
//    manifest violating one is inconsistent and a conforming verifier MUST treat
//    it as REJECTED:
//      - single carriage: the blocks live at the top level or in the v0.1
//        `extensions` bridge, never both; every rule below runs on one
//        normalised view of the manifest;
//      - the authority gate: a right assigned to a collecting society (or of
//        unconfirmed scope) must read false in the v0.1-visible clearance boolean
//        itself, including when the block rides the bridge;
//      - the designation input ban: no clearance facet's basis.inputs may cite
//        designation (a designation constrains what a product may be NAMED,
//        never whether a work may be reproduced);
//      - the evidence input ban: no basis.inputs anywhere may cite an evidence
//        item (evidence exists for a human; it never changes a verdict);
//        both bans apply to what a field denotes under every recognised reading
//        (pointer, fragment, dotted or bracketed path, either carriage);
//      - evidence-pointer resolution: every evidence[].supports JSON Pointer
//        (RFC 6901) must resolve to a node in the manifest;
//      - the protected-name guard: productNaming.protectedNameUsePermitted may be
//        true only on a mark self-claimed as both of-the-class and authorised,
//        under a confirmed legal basis (never voluntary-code, never unknown), in
//        the same jurisdiction as the naming verdict;
//      - jurisdiction coherence J-1..J-5, including at most one entry per facet
//        and jurisdiction.
//    Deliberately NOT checked: locator liveness (a dead evidence locator changes
//    nothing and this harness performs no network fetch by design), prose
//    requirements on basis.summary, and the consumer-side duties that have no
//    single-manifest observable (how a consumer outside the naming verdict's
//    jurisdiction acts; treating an absent block as no finding).
// ---------------------------------------------------------------------------
console.log("");
console.log("v0.2 rights vocabulary");

const v02Dir = join(root, "public", "v0.2");

// v0.2 rule registry additions (resolving to https://openclearance.org/v0.2/rules#<rule>).
const KNOWN_RULES_V02 = new Set([
  ...KNOWN_RULES,
  "right-assigned-to-collecting-society",
  "self-attested-authorised-user",
  "no-designation-claimed",
  "designation-claim-unknown",
  "designation-claim-attributed-only",
  "mark-not-applicable-historical",
  "voluntary-code-no-designation-right",
  "faithful-reproduction-unprotected",
  "non-original-photograph-protected",
]);

function verifyManifestV02Advisories(manifest) {
  const advisories = [];
  const checkRule = (rule, path) => {
    if (rule && !KNOWN_RULES_V02.has(rule)) {
      advisories.push({
        code: "unrecognised_rule",
        severity: "advisory",
        message: `Rule '${rule}' is not in the v0.2 registry; manifest is still structurally valid.`,
        path,
        rule,
      });
    }
  };
  for (const facet of CLEARANCE_FACETS) {
    checkRule(manifest.clearance?.[facet]?.basis?.rule, `clearance.${facet}.basis.rule`);
  }
  checkRule(
    manifest.designation?.productNaming?.basis?.rule,
    "designation.productNaming.basis.rule"
  );
  (manifest.jurisdictionAssessments ?? []).forEach((entry, idx) => {
    checkRule(entry?.basis?.rule, `jurisdictionAssessments.${idx}.basis.rule`);
  });
  return advisories;
}

// RFC 6901 JSON Pointer resolution; returns undefined when the pointer does not resolve.
function resolvePointer(doc, pointer) {
  if (typeof pointer !== "string" || (pointer !== "" && !pointer.startsWith("/"))) {
    return undefined;
  }
  let node = doc;
  if (pointer === "") return node;
  for (const raw of pointer.slice(1).split("/")) {
    const token = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(node)) {
      if (!/^(0|[1-9][0-9]*)$/.test(token)) return undefined;
      node = node[Number(token)];
      if (node === undefined) return undefined;
    } else if (node !== null && typeof node === "object") {
      if (!Object.prototype.hasOwnProperty.call(node, token)) return undefined;
      node = node[token];
    } else {
      return undefined;
    }
  }
  return node;
}

// The v0.1-safe bridge: a v0.1 manifest carries the v0.2 blocks inside
// `extensions` under the v0.2 namespace key. A manifest uses exactly one home
// for the blocks; carrying blocks in both is inconsistent, because a consumer
// reading one home would see a different manifest from a consumer reading the
// other. The manifest is normalised once (blocks hoisted to the top level) and
// every rule runs on that single view, so the bridge cannot dodge any gate.
const V02_EXTENSION_KEY = "https://openclearance.org/v0.2/";
const V02_BLOCK_NAMES = ["grantAuthority", "designation", "evidence", "jurisdictionAssessments"];
function normaliseV02(manifest) {
  const ext = manifest.extensions?.[V02_EXTENSION_KEY];
  const bridge = ext !== null && typeof ext === "object" && !Array.isArray(ext) ? ext : {};
  const atTop = V02_BLOCK_NAMES.filter((name) => manifest[name] !== undefined);
  const inBridge = V02_BLOCK_NAMES.filter((name) => bridge[name] !== undefined);
  const view = { ...manifest };
  if (atTop.length === 0) {
    for (const name of inBridge) view[name] = bridge[name];
  }
  return { view, atTop, inBridge };
}

// Path tokens a basis input's `field` denotes, under every reading a verifier
// recognises: an RFC 6901 pointer ('/a/b', the normative form for a manifest
// node), its URI-fragment form ('#/a/b'), and the dotted/bracketed reading
// ('a.b.0', 'a[0]'). Bans are applied to what a field denotes, never to how it
// is spelled; a leading bridge prefix is removed so both carriages compare alike.
function fieldReadings(field) {
  const readings = [];
  const pointerTokens = (p) => p.slice(1).split("/").map((t) => t.replace(/~1/g, "/").replace(/~0/g, "~"));
  if (field.startsWith("/")) {
    readings.push(pointerTokens(field));
  } else if (field.startsWith("#")) {
    let decoded = null;
    try {
      decoded = decodeURIComponent(field.slice(1));
    } catch {
      decoded = null;
    }
    if (decoded === "") readings.push([]);
    else if (decoded?.startsWith("/")) readings.push(pointerTokens(decoded));
  } else {
    const bridgePrefix = `extensions.${V02_EXTENSION_KEY}`;
    let head = [];
    let rest = field;
    if (field === bridgePrefix || field.startsWith(`${bridgePrefix}.`) || field.startsWith(`${bridgePrefix}[`)) {
      head = ["extensions", V02_EXTENSION_KEY];
      rest = field.slice(bridgePrefix.length);
    }
    readings.push([...head, ...rest.split(/[.[\]]/).filter((t) => t !== "")]);
  }
  return readings.map((tokens) =>
    tokens[0] === "extensions" && tokens[1] === V02_EXTENSION_KEY ? { tokens: tokens.slice(2), bridged: true } : { tokens, bridged: false }
  );
}

// True when an input cites the named block: the field addresses the block, a
// node inside it, or a container holding it (the manifest root, `extensions`,
// or the bridge object), in either carriage.
function citesBlock(inputs, block) {
  return (inputs ?? []).some((input) => {
    if (typeof input?.field !== "string") return false;
    return fieldReadings(input.field).some(({ tokens, bridged }) => {
      if (tokens.length === 0) return true;
      if (tokens[0] === block) return true;
      return !bridged && tokens.length === 1 && tokens[0] === "extensions";
    });
  });
}

const CONFIRMED_LEGAL_BASES = new Set([
  "statutory-gi",
  "certification-trademark",
  "collective-trademark",
]);

// Reference cross-field consistency check. Returns a list of problems; any
// problem means the manifest is inconsistent and MUST be treated as REJECTED.
function checkV02Consistency(manifest) {
  const problems = [];
  const { view, atTop, inBridge } = normaliseV02(manifest);
  const { grantAuthority, designation, evidence, jurisdictionAssessments } = view;

  // One home: v0.2 blocks at the top level and in the bridge at once is inconsistent.
  if (atTop.length > 0 && inBridge.length > 0) {
    problems.push(
      `v0.2 blocks are carried both at the top level (${atTop.join(", ")}) and in the extensions bridge (${inBridge.join(", ")}); a manifest uses exactly one home`
    );
  }

  // Authority gate: assigned-away (or unconfirmed) rights must already read
  // false in the v0.1-visible clearance boolean. 'unknown' leaves the holder of
  // every assignable right unconfirmed, so it gates both facets.
  const cats = grantAuthority?.collectingSociety?.assignedCategories ?? [];
  const gated = [];
  if (cats.includes("commercial-reproduction") || cats.includes("reproduction-all")) {
    gated.push("commercialReproduction");
  }
  if (cats.includes("derivative")) {
    gated.push("derivatives");
  }
  for (const facet of gated) {
    if (manifest.clearance?.[facet]?.permitted === true) {
      problems.push(
        `clearance.${facet}.permitted is true while the right is recorded as assigned to a collecting society`
      );
    }
  }
  if (cats.includes("unknown")) {
    for (const facet of ["commercialReproduction", "derivatives"]) {
      if (manifest.clearance?.[facet]?.permitted === true) {
        problems.push(
          `clearance.${facet}.permitted is true while the collecting-society assignment scope is unconfirmed`
        );
      }
    }
  }

  // Input bans: clearance bases may cite neither designation nor evidence;
  // the naming basis may not cite evidence.
  for (const facet of CLEARANCE_FACETS) {
    const inputs = manifest.clearance?.[facet]?.basis?.inputs;
    if (citesBlock(inputs, "designation")) {
      problems.push(`clearance.${facet}.basis.inputs cites a designation path`);
    }
    if (citesBlock(inputs, "evidence")) {
      problems.push(`clearance.${facet}.basis.inputs cites an evidence item`);
    }
  }
  if (citesBlock(designation?.productNaming?.basis?.inputs, "evidence")) {
    problems.push("designation.productNaming.basis.inputs cites an evidence item");
  }
  (jurisdictionAssessments ?? []).forEach((entry, idx) => {
    if (citesBlock(entry?.basis?.inputs, "designation")) {
      problems.push(`jurisdictionAssessments[${idx}].basis.inputs cites a designation path`);
    }
    if (citesBlock(entry?.basis?.inputs, "evidence")) {
      problems.push(`jurisdictionAssessments[${idx}].basis.inputs cites an evidence item`);
    }
  });

  // Jurisdiction coherence (J-1..J-4): the asserted scope and its per-jurisdiction
  // refinement must compose fail-closed with the core clearance booleans.
  const scope = manifest.verification?.jurisdictions;
  const entries = jurisdictionAssessments ?? [];
  if (entries.length > 0) {
    if (!Array.isArray(scope) || scope.length === 0) {
      problems.push("jurisdictionAssessments present without a declared verification.jurisdictions scope");
    } else if (scope.includes("worldwide")) {
      problems.push(
        "jurisdictionAssessments present under a 'worldwide' scope — worldwide asserts jurisdiction-independent grounds, which per-jurisdiction divergence contradicts"
      );
    } else {
      for (const [idx, entry] of entries.entries()) {
        if (!scope.includes(entry?.jurisdiction)) {
          problems.push(
            `jurisdictionAssessments[${idx}] assesses '${entry?.jurisdiction}', which is outside the asserted scope`
          );
        }
      }
      const seen = new Set();
      for (const [idx, entry] of entries.entries()) {
        const key = `${entry?.facet}|${entry?.jurisdiction}`;
        if (seen.has(key)) {
          problems.push(
            `jurisdictionAssessments[${idx}] repeats ${entry?.facet} for '${entry?.jurisdiction}'; each facet has at most one entry per jurisdiction`
          );
        }
        seen.add(key);
      }
      const byFacet = new Map();
      for (const entry of entries) {
        if (!byFacet.has(entry.facet)) byFacet.set(entry.facet, []);
        byFacet.get(entry.facet).push(entry);
      }
      for (const [facet, facetEntries] of byFacet) {
        const covered = new Set(facetEntries.map((e) => e.jurisdiction));
        const missing = scope.filter((j) => !covered.has(j));
        if (missing.length > 0) {
          problems.push(
            `jurisdictionAssessments for ${facet} do not cover the full asserted scope (missing: ${missing.join(", ")})`
          );
        }
        const outcomes = facetEntries.map((e) => e.outcome === true);
        const core = manifest.clearance?.[facet];
        if (facet === "attributionRequired") {
          const conjunction = outcomes.some(Boolean);
          if (core && core.required !== conjunction) {
            problems.push(
              `clearance.attributionRequired.required must be ${conjunction} (required anywhere in scope requires it in the core boolean)`
            );
          }
        } else {
          const conjunction = outcomes.every(Boolean);
          if (core && core.permitted !== conjunction) {
            problems.push(
              `clearance.${facet}.permitted must be ${conjunction} (the fail-closed conjunction of the per-jurisdiction outcomes)`
            );
          }
        }
      }
    }
  }

  // Evidence pointers must resolve. They resolve against the normalised view,
  // so a pointer such as /designation/marks/0 resolves in either carriage.
  (evidence ?? []).forEach((item, idx) => {
    if (resolvePointer(view, item?.supports) === undefined) {
      problems.push(`evidence[${idx}].supports ('${item?.supports}') does not resolve to any node`);
    }
  });

  // Protected-name guard: `true` requires a qualifying self-attested claim on a
  // confirmed legal basis, in the jurisdiction the naming verdict is scoped to
  // (a designation right is territorial and does not travel). 'registered' (a
  // self-claimed register entry) and 'claimed' (self-claimed authorisation
  // without one) both qualify; badge display on a consuming surface is a
  // stricter, display-side matter.
  if (designation?.productNaming?.protectedNameUsePermitted === true) {
    const qualifies = (designation.marks ?? []).some(
      (m) =>
        m?.workDesignation === "claimed" &&
        ["registered", "claimed"].includes(m?.producerClaim?.claimsAuthorisation) &&
        CONFIRMED_LEGAL_BASES.has(m?.legalBasis) &&
        m?.jurisdiction === designation.productNaming.jurisdiction
    );
    if (!qualifies) {
      problems.push(
        `productNaming.protectedNameUsePermitted is true without a mark in '${designation.productNaming.jurisdiction}' self-claimed as of-the-class and authorised under a confirmed legal basis`
      );
    }
  }

  return problems;
}

// --- v0.2 schema + context compile ---
let v02Manifest = null;
{
  const loaded = readJson(join(v02Dir, "clearance-manifest.schema.json"));
  if (loaded) {
    const { json } = loaded;
    const expectedId = "https://openclearance.org/v0.2/clearance-manifest.schema.json";
    if (json.$schema !== "https://json-schema.org/draft/2020-12/schema") {
      fail("v0.2 clearance-manifest.schema.json must declare the Draft 2020-12 $schema dialect");
    }
    if (json.$id !== expectedId) {
      fail(`v0.2 clearance-manifest.schema.json $id must be ${expectedId} (found ${json.$id})`);
    }
    try {
      v02Manifest = ajv.compile(json);
      pass("v0.2 clearance-manifest.schema.json compiles");
    } catch (err) {
      fail(`v0.2 clearance-manifest.schema.json does not compile: ${err.message}`);
    }
  }
}

const ctx2Loaded = readJson(join(v02Dir, "context.jsonld"));
if (ctx2Loaded) {
  if (!ctx2Loaded.json["@context"]) {
    fail("v0.2 context.jsonld must have an @context member");
  } else {
    pass("v0.2 context.jsonld well-formed");
  }
}

// --- v0.2 JSON-LD expansion: new terms mint in the v0.2 vocabulary; terms
//     carried from v0.1 keep their v0.1 IRIs (term-identity continuity). ---
const CONTEXT_URL_V02 = "https://openclearance.org/v0.2/context.jsonld";
const VOCAB_BASE_V02 = "https://openclearance.org/v0.2/vocab#";
if (ctx2Loaded?.json) {
  const localLoaderV02 = async (url) => {
    if (url === CONTEXT_URL_V02) {
      return { contextUrl: null, documentUrl: url, document: ctx2Loaded.json };
    }
    if (url === CONTEXT_URL) {
      return { contextUrl: null, documentUrl: url, document: ctxDoc };
    }
    throw new Error(`jsonld: refusing to fetch '${url}' (offline conformance)`);
  };
  try {
    const sample = {
      "@context": [CONTEXT_URL_V02],
      clearance: { commercialReproduction: { permitted: true } },
      grantAuthority: { collectingSociety: { society: "none" } },
      designation: { marks: [] },
      evidence: [{ supports: "/designation" }],
    };
    const expanded = await jsonld.expand(sample, { documentLoader: localLoaderV02 });
    const top = expanded[0] ?? {};
    const expectations = [
      ["clearance", `${VOCAB_BASE}clearance`, "carries its v0.1 IRI"],
      ["grantAuthority", `${VOCAB_BASE_V02}grantAuthority`, "mints in the v0.2 vocabulary"],
      ["designation", `${VOCAB_BASE_V02}designation`, "mints in the v0.2 vocabulary"],
      ["evidence", `${VOCAB_BASE_V02}evidence`, "mints in the v0.2 vocabulary"],
    ];
    for (const [term, iri, how] of expectations) {
      if (iri in top) {
        pass(`v0.2 context: '${term}' ${how} (${iri})`);
      } else {
        fail(`v0.2 context: '${term}' did not expand to ${iri}; found: ${Object.keys(top).join(", ")}`);
      }
    }
  } catch (err) {
    fail(`v0.2 JSON-LD expansion error: ${err.message}`);
  }
}

// --- Fixture vectors ---
// schema: "0.2" | "0.1" (which manifest schema the fixture must validate against;
//   the bridge fixture is a v0.1 manifest). valid: expected schema outcome.
// verdict: "ok" | "rejected" for schema-valid fixtures. reason: text the expected
//   problem contains, so a rejected vector fails for the rule it exists to test.
// extra: named follow-on checks.
const V02_VECTORS = {
  "rights-society-assigned-deny.json": { schema: "0.2", valid: true, verdict: "ok", extra: "assigned-deny" },
  "rights-society-none.json": { schema: "0.2", valid: true, verdict: "ok" },
  "rights-society-unknown-deny.json": { schema: "0.2", valid: true, verdict: "ok", extra: "unknown-deny" },
  "rights-designation-historical-cc0.json": { schema: "0.2", valid: true, verdict: "ok", extra: "historical" },
  "rights-designation-self-attested.json": { schema: "0.2", valid: true, verdict: "ok", extra: "self-attested" },
  "negative/rights-bridge-contradiction.json": { schema: "0.1", valid: true, verdict: "rejected", reason: "assigned to a collecting society" },
  "negative/rights-designation-cited-input.json": { schema: "0.2", valid: true, verdict: "rejected", reason: "cites a designation path" },
  "negative/rights-evidence-cited-input.json": { schema: "0.2", valid: true, verdict: "rejected", reason: "cites an evidence item" },
  "negative/rights-supports-unresolved.json": { schema: "0.2", valid: true, verdict: "rejected", reason: "does not resolve to any node" },
  "negative/rights-naming-unconfirmed-basis.json": { schema: "0.2", valid: true, verdict: "rejected", reason: "protectedNameUsePermitted is true without a mark" },
  "negative/rights-sentinel-mix.json": { schema: "0.2", valid: false },
  "negative/rights-sentinel-unknown-none.json": { schema: "0.2", valid: false },
  "negative/rights-scheme-basis-mismatch.json": { schema: "0.2", valid: false },
  "negative/rights-other-scheme-unnamed.json": { schema: "0.2", valid: false },
  "negative/rights-other-society-unnamed.json": { schema: "0.2", valid: false },
  "negative/rights-evidence-grade.json": { schema: "0.2", valid: false },
  "negative/rights-mark-verification-field.json": { schema: "0.2", valid: false },
  "negative/rights-jurisdictions-bad-scope.json": { schema: "0.2", valid: false },
  "rights-jurisdiction-divergence.json": { schema: "0.2", valid: true, verdict: "ok", extra: "divergence" },
  "negative/rights-jurisdiction-core-overgrant.json": { schema: "0.2", valid: true, verdict: "rejected", reason: "fail-closed conjunction" },
  "negative/rights-jurisdiction-partial-matrix.json": { schema: "0.2", valid: true, verdict: "rejected", reason: "do not cover the full asserted scope" },
  "negative/rights-jurisdiction-under-worldwide.json": { schema: "0.2", valid: true, verdict: "rejected", reason: "under a 'worldwide' scope" },
  "negative/rights-dual-carriage.json": { schema: "0.2", valid: true, verdict: "rejected", reason: "carried both at the top level" },
  "negative/rights-designation-cited-bridge-dotted.json": { schema: "0.1", valid: true, verdict: "rejected", reason: "commercialReproduction.basis.inputs cites a designation path" },
  "negative/rights-designation-cited-bridge-pointer.json": { schema: "0.1", valid: true, verdict: "rejected", reason: "commercialReproduction.basis.inputs cites a designation path" },
  "negative/rights-naming-wrong-territory.json": { schema: "0.2", valid: true, verdict: "rejected", reason: "without a mark in 'US'" },
  "negative/rights-jurisdiction-duplicate-entry.json": { schema: "0.2", valid: true, verdict: "rejected", reason: "repeats commercialReproduction for 'EU'" },
  "negative/rights-jurisdictions-worldwide-mixed.json": { schema: "0.2", valid: false },
  "negative/rights-society-unknown-derivatives.json": { schema: "0.2", valid: true, verdict: "rejected", reason: "derivatives.permitted is true while the collecting-society assignment scope is unconfirmed" },
};

for (const [rel, expect] of Object.entries(V02_VECTORS)) {
  const loaded = readJson(join(v02Dir, "examples", rel));
  if (!loaded) continue;
  const manifest = loaded.json;
  const validate = expect.schema === "0.1" ? compiled.manifest : v02Manifest;
  if (!validate) continue;
  const schemaOk = validate(manifest);

  if (!expect.valid) {
    if (!schemaOk) {
      pass(`${rel} correctly fails v${expect.schema} schema validation`);
    } else {
      fail(`${rel} unexpectedly passed v${expect.schema} schema validation`);
    }
    continue;
  }

  if (!schemaOk) {
    fail(`${rel} fails v${expect.schema} schema: ${ajv.errorsText(validate.errors)}`);
    continue;
  }
  pass(`${rel} validates against the v${expect.schema} manifest schema`);

  const problems = checkV02Consistency(manifest);
  if (expect.verdict === "rejected") {
    const matched = problems.find((p) => p.includes(expect.reason));
    if (matched) {
      pass(`${rel} is correctly REJECTED as inconsistent (${matched})`);
    } else if (problems.length > 0) {
      fail(`${rel} was REJECTED, but not for the expected reason '${expect.reason}': ${problems.join("; ")}`);
    } else {
      fail(`${rel} was expected to be REJECTED but the consistency check found no problem`);
    }
    continue;
  }

  if (problems.length > 0) {
    fail(`${rel} unexpectedly inconsistent: ${problems.join("; ")}`);
    continue;
  }
  pass(`${rel} passes the cross-field consistency check`);

  const advisories = verifyManifestV02Advisories(manifest);
  if (advisories.length === 0) {
    pass(`${rel} rule ids are all in the v0.2 registry (no advisories)`);
  } else {
    fail(`${rel} unexpectedly generated advisories: ${advisories.map((a) => a.rule).join(", ")}`);
  }

  // Named follow-on checks per vector.
  if (expect.extra === "divergence") {
    const core = manifest.clearance.commercialReproduction.permitted;
    const eu = manifest.jurisdictionAssessments.find((e) => e.jurisdiction === "EU");
    const ch = manifest.jurisdictionAssessments.find((e) => e.jurisdiction === "CH");
    if (core === false && eu?.outcome === true && ch?.outcome === false) {
      pass(`${rel} core boolean is the fail-closed conjunction; the EU entry refines upward, the CH entry denies`);
    } else {
      fail(`${rel} must deny in the core boolean while carrying EU=permitted / CH=denied refinements`);
    }
  }
  if (expect.extra === "assigned-deny") {
    const facet = manifest.clearance.commercialReproduction;
    if (facet.permitted === false && facet.basis.rule === "right-assigned-to-collecting-society") {
      pass(`${rel} denies commercial reproduction in the v0.1-visible boolean with the assignment rule`);
    } else {
      fail(`${rel} must read permitted:false with rule right-assigned-to-collecting-society`);
    }
  }
  if (expect.extra === "unknown-deny") {
    const v = manifest.grantAuthority.collectingSociety.verification;
    if (manifest.clearance.commercialReproduction.permitted === false && v.verifiedBy && v.verifiedAt) {
      pass(`${rel} fails reproduction closed on 'unknown'; verifiedBy/verifiedAt carried as provenance only`);
    } else {
      fail(`${rel} must deny commercial reproduction and carry verifiedBy/verifiedAt without effect`);
    }
  }
  if (expect.extra === "historical") {
    const c = manifest.clearance;
    const allCleared =
      c.commercialReproduction.permitted === true &&
      c.derivatives.permitted === true &&
      c.attributionRequired.required === false;
    if (allCleared && manifest.designation.productNaming.protectedNameUsePermitted === false) {
      pass(`${rel} keeps the CC0 work fully cleared while withholding the protected name`);
    } else {
      fail(`${rel} must keep clearance fully open (the designation axis never touches it)`);
    }
    // Evidence must be verdict-inert: stripping it changes nothing.
    const stripped = JSON.parse(JSON.stringify(manifest));
    delete stripped.evidence;
    const strippedProblems = checkV02Consistency(stripped);
    if (strippedProblems.length === 0) {
      pass(`${rel} verdict is identical with evidence removed (evidence changes no verdict)`);
    } else {
      fail(`${rel} verdict changed when evidence was removed: ${strippedProblems.join("; ")}`);
    }
  }
  if (expect.extra === "self-attested") {
    const naming = manifest.designation.productNaming;
    if (naming.protectedNameUsePermitted === true && naming.basis.rule === "self-attested-authorised-user") {
      pass(`${rel} permits the protected name via self-attested-authorised-user`);
    } else {
      fail(`${rel} must permit the name under rule self-attested-authorised-user`);
    }
    if (/not verified/i.test(naming.basis.summary)) {
      pass(`${rel} naming basis.summary states the verdict is not verified by OpenClearance`);
    } else {
      fail(`${rel} naming basis.summary must state the verdict rests on attestation, not verification`);
    }
    // A registered-user claim is what a consuming surface keys badge display to:
    // the value, its stated register identifier, and evidence pointed at the
    // producer claim itself — all machine-readable from the manifest alone.
    const pc = manifest.designation.marks[0].producerClaim;
    const evidenceAtClaim = (manifest.evidence ?? []).some(
      (e) => resolvePointer(manifest, e.supports) === pc
    );
    if (pc.claimsAuthorisation === "registered" && pc.authorisedUserRef && evidenceAtClaim) {
      pass(`${rel} carries a registered-user claim with its register ref and evidence at the claim node`);
    } else {
      fail(`${rel} must claim 'registered' with authorisedUserRef and evidence supporting the producer claim`);
    }
  }
}

// --- v0.2 input bans apply to what a field denotes, not how it is spelled ---
// Each spelling is added as a clearance input to a known-good manifest. A
// spelling that reaches designation or evidence (in either carriage, or a
// container holding them) must be rejected; fields that name a source-record
// field or another manifest node must not be.
{
  const loaded = readJson(join(v02Dir, "examples", "rights-designation-historical-cc0.json"));
  if (loaded) {
    const bridge = `/extensions/${V02_EXTENSION_KEY.replace(/~/g, "~0").replace(/\//g, "~1")}`;
    const spellings = [
      ["/designation/marks/0/name", "designation"],
      ["#/designation/marks/0", "designation"],
      ["#%2Fdesignation%2Fmarks%2F0", "designation"],
      ["designation.marks.0.name", "designation"],
      ["designation[0]", "designation"],
      ["designation", "designation"],
      [`${bridge}/designation/marks/0`, "designation"],
      [`extensions.${V02_EXTENSION_KEY}.designation.marks.0`, "designation"],
      [`extensions.${V02_EXTENSION_KEY}[designation]`, "designation"],
      [bridge, "designation"],
      ["extensions", "designation"],
      ["#", "designation"],
      ["/evidence/0/id", "evidence"],
      ["evidence[0].id", "evidence"],
      [`${bridge}/evidence/0`, "evidence"],
      ["/rights/statement", null],
      ["rights_statement", null],
      ["license.type", null],
      ["designationNote", null],
    ];
    for (const [field, block] of spellings) {
      const manifest = JSON.parse(JSON.stringify(loaded.json));
      manifest.clearance.commercialReproduction.basis.inputs.push({ field, value: null });
      const problems = checkV02Consistency(manifest);
      const expected = `clearance.commercialReproduction.basis.inputs cites ${block === "evidence" ? "an evidence item" : "a designation path"}`;
      if (block === null) {
        if (problems.length === 0) {
          pass(`input field '${field}' does not cite designation or evidence`);
        } else {
          fail(`input field '${field}' wrongly rejected: ${problems.join("; ")}`);
        }
      } else if (problems.includes(expected)) {
        pass(`input field '${field}' is rejected as citing ${block}`);
      } else {
        fail(`input field '${field}' must be rejected as citing ${block} (found: ${problems.join("; ") || "no problem"})`);
      }
    }
  }
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
