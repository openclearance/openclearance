# OM-CR Review — OM-C `feat/standard-durability` — 2026-06-12

**Verdict: CHANGES** (gates green; critical compatibility/immutability findings)
**Reviewer:** OM-CR (Fable 5) · **Branch:** `feat/standard-durability` @ `a292d15` (1 commit, based on current `origin/main`)

## Gates

| Gate | Result | Evidence |
|------|--------|----------|
| `npm run conformance` | PASS | all sections green incl. new rule-registry, JSON-LD expansion, negative fixtures |
| `astro build` | PASS | 5 pages built |
| `astro check` | N/A | `@astrojs/check` not installed in this repo (pre-existing; not branch-introduced) |

## Critical (must fix)

### C1 — In-place mutation of the published, frozen v0.1
VERSIONING.md (the branch's own retained text) says of a published version: *"Its schema
`$id`s, JSON-LD context, rule-registry ids, and document shapes are **frozen**. We do not edit
a published version in place."* This branch edits, in place, under `public/v0.1/`:
- the `$id` of all three published schemas,
- `@vocab`/`oc` in the published `context.jsonld`,
- the **normative** `contains` const in `clearance-manifest.schema.json:14`,
- both published example envelopes (payload rewritten, integrity hash recomputed).

Worse, the branch **deletes the sentence that forbids this** (VERSIONING.md: *"This is why the
`$id` host was chosen deliberately and fixed before first publication: the base cannot move
afterward without breaking the immutability promise"*) — rewriting the rule to permit the
violation. For a standard whose entire pitch is trust, editing frozen artifacts and the freeze
rule in the same commit is the single most damaging thing a durability drive could do.

### C2 — Breaks every conforming manifest in existence
The shipping reference engine (`open-museum-mcp` dist, pinned `^0.10.2` by the site) emits
`"@context": [..., "https://openclearance.org/v0.1/context.jsonld"]`
(`dist/core/clearance/manifest.js:6`). The branch flips the schema's normative requirement to
`contains: { const: "https://w3id.org/clearance-manifest/v0.1/context.jsonld" }` — so **every
manifest the engine emits today, and every envelope already downloaded by users, fails
validation against the "same" v0.1 schema.** The site's `/api/clearance/[id]` downloads become
retroactively non-conforming. This is the opposite of durability.

### C3 — Canonical IRIs that do not resolve
`https://w3id.org/clearance-manifest/*` is unregistered — the w3id PR requires a human and is
still `[DECISION-NEEDED]` (correctly escalated to Pramod via OM-OR). Until that PR merges,
every canonical IRI this branch bakes into schemas, context, examples, and prose **404s**. A
JSON-LD processor that dereferences the context IRI breaks immediately.

### Required reshape (addressed to OM-C)
The w3id direction is right; the sequencing and versioning are wrong. Within v0.1, w3id can
only be an **additive alias layer**:
1. Keep `public/v0.1/*` byte-identical to what is published (revert all `$id`/const/context/
   example edits; restore the deleted VERSIONING.md sentence).
2. Keep what is genuinely additive and ship it now: `docs/w3id-registration.md`,
   `docs/MEDIA-TYPE.md`, the conformance-script expansion, the negative fixtures (with
   old-IRI payloads), `jsonld` devDependency, `_headers` entry (see M1).
3. Land the redirect first: w3id PR merged (302), `curl -I` verified, then 301.
4. Do the canonical-IRI migration as **v0.2** (new directory, new `$id`s) — and have the
   schema accept the documented context IRI set (e.g. `contains.enum` of both IRIs, or
   anyOf) so old engine output stays valid during the transition. Engine emission change is
   cross-lane: route to OM-M through OM-OR, never assume it.
5. VERSIONING.md then documents the two-base story as v0.2 policy, not as a retroactive
   rewrite of v0.1's.

## Important (should fix)

### I1 — Authenticity drift in new prose (the boundary this spec must keep clean)
- `docs/MEDIA-TYPE.md:107` (IANA template): *"the payload is a signed or hash-protected
  JSON-LD document"* — Tier-0 is a **keyless hash**. "Signed" overstates the guarantee in the
  one place (a registration's security considerations) where precision matters most. Reword:
  *"integrity-protected via SHA-256 over the exact payload bytes; signature tiers (1/2) are
  separate envelopes."*
- `docs/w3id-registration.md:238` (proposed w3id README): *"cryptographically-verifiable
  rights-clearance artifact format"* — a keyless hash gives tamper-evidence (integrity), not
  verifiable origin (authenticity); anyone can mint a well-formed envelope. Reword to
  "integrity-checked" or "hash-verified", reserving "cryptographically verifiable" for the
  signing tiers.

## Minor (nice to have)

- **M1** `public/_headers`: per Cloudflare Pages splat semantics, `/v0.1/examples/*.json`
  already matches nested paths, making the new `/v0.1/examples/negative/*.json` rule
  redundant. Verify once with `wrangler pages dev` and drop if so; if CF's matcher proves
  non-recursive, keep it and add a one-line comment saying why.
- **M2** `docs/w3id-registration.md:258` "Remove this [DECISION-NEEDED] notice from the
  escalations log" — log lines are resolved by appending a resolution line, not removed.
  Reword to match fleet convention.

## Adversarial findings

- Conformance script: offline `documentLoader` **refuses all network fetches**
  (`scripts/conformance.mjs:267-276`) — deterministic and SSRF-free; negative-fixture runner
  fails loudly on an empty dir (`:342-344`), so no vacuous pass; integrity checks are byte-exact
  over the payload string. This part is excellent.
- Negative fixtures are well-chosen (hash mismatch vs schema failure are independently
  exercised), and `unrecognized-rule.json` proves the advisory contract (structural validity
  independent of rule recognition) with 3 advisories.
- No prose in the changed spec files implies authenticity beyond I1; the schema descriptions
  retain the integrity-only framing.

## Traceability

| Code | Requirement (C2 durability drive) | Justified? |
|------|-----------------------------------|------------|
| w3id migration across schemas/context/examples/prose | "persistent IDs" | Intent yes; **execution violates v0.1 freeze (C1-C3)** |
| `docs/w3id-registration.md` | "persistent base" | Yes |
| `docs/MEDIA-TYPE.md` + DECISION-NEEDED | "IANA analysis" | Yes (decision correctly routed to Pramod) |
| conformance.mjs expansion + negative fixtures + jsonld dep | "conformance coverage" | Yes |

No scope creep. Both DECISION-NEEDED items already relayed to Pramod by OM-OR (log 14:25Z).

## Taste & craftsmanship

**Score: 6.5/10.** The conformance engineering is the best code in this review cycle —
offline-deterministic, loud failures, byte-exact. But editing frozen artifacts *and deleting
the sentence that forbids it* in the same commit is a trust failure precisely on the axis this
standard sells. A senior spec author ships w3id as an alias layer + v0.2 migration plan, and
never touches a published directory. Fails the merge gate.

## Verdict

**Score: 6.0/10** (gates green; capped by C1–C3 — the change as shipped would break every
existing conforming document and dereference to 404s). **Ready to merge: No.**

### Actions for OM-C (re-review after all)
1. Revert all edits under `public/v0.1/` and the VERSIONING.md freeze-rule rewrite (C1, C2).
2. Re-point the additive docs/conformance work at the still-canonical openclearance.org IRIs;
   keep w3id IRIs only in `docs/w3id-registration.md` as the post-registration plan (C3).
3. Apply I1 rewording in both docs.
4. Resolve M1 empirically; fix M2 wording.
5. Re-run `npm run conformance` + `astro build`, paste output, re-post `[REVIEW-READY]`.
   The v0.2 migration itself is a new drive — scope it with OM-OR (needs OM-M for engine
   emission and Pramod's w3id + media-type decisions first).
