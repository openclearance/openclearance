# OM-C Handover — 2026-06-12

**Lane:** OM-C (standard) · **Repo:** openclearance · **Model:** Sonnet 4.6
**Branch:** `feat/standard-durability` (1 commit ahead of `main`)
**Status:** REVIEW-READY — awaiting OM-CR review + Pramod decisions

---

## Completed: C2 — Durability

### 1. Persistent identifiers (done)

All canonical identifiers migrated from `openclearance.org/v0.1/` to
`w3id.org/clearance-manifest/v0.1/`:

- Schema `$id`s in all 3 schemas updated
- `@context` `contains` constraint updated to w3id.org IRI
- `context.jsonld` `@vocab` and `oc:` prefix updated to w3id.org
- Examples `cc0-accepted.json` + `deny-unrecognized.json` payload context-IRIs
  updated, hashes recomputed
- Spec prose + rules.md rule-resolution URIs updated
- VERSIONING.md documents the two-base strategy
- `docs/w3id-registration.md` has the exact .htaccess + PR steps

**[DECISION-NEEDED] w3id.org PR** — The PR to https://github.com/perma-id/w3id.org
must be submitted from Pramod's GitHub account. Technical steps + `.htaccess` content
are ready in `docs/w3id-registration.md`.

### 2. IANA media type (analysis done; decision pending)

`docs/MEDIA-TYPE.md` contains full analysis.

**[DECISION-NEEDED] IANA vs vendor tree** — Recommendation: use vendor tree
`application/vnd.openclearance.manifest+json` for v0.1 (honest about current adoption
level); migrate to standards tree for v1.0. If Pramod chooses the vendor tree, schema
+ examples need a follow-on update (the `payloadType` const).

### 3. Conformance coverage (done)

`scripts/conformance.mjs` now has 22 checks (was 10):

- **Rule-registry advisory**: known rules → no advisory; unrecognised rules → advisory
  emitted and validates against `advisory-entry.schema.json`
- **JSON-LD expansion round-trip**: `ClearanceManifest` and `clearance` expand to correct
  w3id.org vocab IRIs; expand→compact round-trip recovers context
- **Negative fixtures**: `bad-hash.json` (integrity fail), `missing-required-fields.json`
  (schema fail)
- New positive fixture `unrecognized-rule.json` (the advisory-contract test vector)

`npm run conformance` → 22/22 pass. `astro build` → clean.

---

## Escalations logged

```
2026-06-12T14:17Z  OM-C  [DECISION-NEEDED]  w3id.org PR …
2026-06-12T14:17Z  OM-C  [DECISION-NEEDED]  IANA media-type choice …
2026-06-12T14:17Z  OM-C  [PROGRESS]  C2 durability complete …
```

---

## Next drive: C1 — Authenticity (DO NOT START YET)

Awaiting OM-CR review of this branch and Pramod's w3id + IANA decisions.
C1 begins after this branch merges. Do not start signing/C2PA work before then.
