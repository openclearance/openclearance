# Spec addition — Collecting-society status (grant-authority axis)

**Date:** 2026-07-05, revised 2026-08-04 · **Target version:** v0.2 (additive; v0.1 FROZEN)

---

## 1. The problem this closes (why the manifest is otherwise dishonest)

A living artist who is a member of a **collecting society** — ProLitteris (CH), VG Bild-Kunst (DE), ADAGP (FR),
DACS (UK), ARS (US) — has, on joining, typically **assigned administration of specified reproduction rights to the
society**. From that point the artist can no longer directly self-license those categories: the right to grant them
sits with the society.

So an artist-signed Clearance Manifest that asserts `clearance.commercialReproduction.permitted: true` **on the
artist's own authority** may be asserting a right the signer **does not hold**. Under openclearance's honesty
contract that manifest is not merely optimistic — it is **void**: it grants what is not the grantor's to grant. For a
platform selling reproductions on the strength of a manifest (the commercial gate), that is the exact failure the
standard exists to prevent.

The fix is architectural and small: record the **authority** to grant as a first-class, declared fact, and make the
`commercialReproduction` facet **fail closed** whenever the authority to grant it has been assigned away.

## 2. Design principles this obeys (nothing new invented)

| OC principle | How this element honours it |
|---|---|
| **Declaration, not lookup** (static rights-facts; govern identity, not truth) | The society/assignment is a *declared* fact captured at onboarding. OC records and points; it does not adjudicate or call a registry. |
| **Fail-closed** | Ambiguous or assigned-away authority ⇒ the reproduction facet resolves to `permitted:false`. A false deny is tolerable; a right the signer lacks presenting as granted is the critical defect. |
| **Two orthogonal axes** (roadmap guardrail W-2) | **Authority-to-grant ⊥ permission.** This element is the *authority* axis; `clearance.*` remains the *permission* axis. They are kept separate and composed by an explicit rule, never conflated. |
| **Honesty is the product** | A manifest can no longer assert a reproduction right the artist assigned to a society. |
| **Additive, new namespace** | v0.2 only. v0.1 is frozen and untouched; a v0.1-safe bridge is defined (§7). |

## 3. The field (normative schema fragment, v0.2)

A new **optional** top-level block. Absent ⇒ no authority declaration (treated as `unknown` for the commercial-gate
interaction, §5 — i.e. fail-closed on reproduction for an artist-signed record; see §5.3 for the open-access
exception). Named `grantAuthority` so a future publisher / estate / gallery-exclusive assignment slots beside
`collectingSociety` without a schema break; v0.2 ships only the `collectingSociety` member.

```jsonc
"grantAuthority": {
  "type": "object",
  "additionalProperties": false,
  "description": "Who holds the authority to grant reuse of this work. Orthogonal to `clearance` (which records permission). Declared, never looked up. v0.2 carries only `collectingSociety`.",
  "properties": {
    "collectingSociety": {
      "type": "object",
      "required": ["society", "assignedCategories", "verification"],
      "additionalProperties": false,
      "properties": {
        "society": {
          "type": "string",
          "description": "Registered collecting society the artist belongs to, or 'none'. 'other' + `societyName` for a society outside the v0.2 baseline set.",
          "enum": ["none", "prolitteris", "vg-bild-kunst", "adagp", "dacs", "ars", "other"]
        },
        "societyName": {
          "type": "string", "minLength": 1,
          "description": "Free-text society name. REQUIRED when society='other'; forbidden otherwise (see allOf)."
        },
        "memberId": {
          "type": ["string", "null"],
          "description": "The artist's membership identifier if held; null if unknown/not provided. Never required — many members do not know their ID."
        },
        "assignedCategories": {
          "type": "array",
          "minItems": 1,
          "description": "THE substantive item: which rights categories the artist assigned to the society. Determines whether a `clearance` facet is the artist's to grant. Open, honesty-bearing set. 'none' = member but nothing relevant assigned (artist retains all); 'unknown' = member, assignment scope not yet confirmed ⇒ fail-closed on reproduction. 'none' and 'unknown' are SENTINELS, not categories: each MUST be the array's only member when present (enforced below) — a manifest cannot simultaneously claim 'nothing assigned' and name a specific assigned category, or claim both 'nothing assigned' and 'not yet confirmed'.",
          "items": {
            "type": "string",
            "enum": [
              "commercial-reproduction",
              "reproduction-all",
              "derivative",
              "reprography",
              "broadcast",
              "lending-public-display",
              "resale-royalty",
              "none",
              "unknown"
            ]
          },
          "allOf": [
            { "if": { "contains": { "const": "none" } }, "then": { "maxItems": 1 } },
            { "if": { "contains": { "const": "unknown" } }, "then": { "maxItems": 1 } }
          ]
        },
        "verification": {
          "type": "object",
          "required": ["method"],
          "additionalProperties": false,
          "description": "How the declaration may be checked, and by whom it has been — PROVENANCE for the declaration, never a second verdict. MANUAL link-out only — no automated registry call is made or implied (no complete registry API exists; automated name-search yields false negatives, e.g. Warhol absent from VG Bild-Kunst's search). If a human checking `registryUrl` finds the assignment differs from what was declared, they correct `assignedCategories` itself — the gate (§5) reads only `assignedCategories`, never this block, so there is no separate 'verified' or 'conflict' state for OC to assert (that would be OC adjudicating the declaration, which the standard does not do).",
          "properties": {
            "method": { "const": "manual-link-out" },
            "registryUrl": {
              "type": "string", "format": "uri",
              "description": "The society's public name-search / member page a human uses to check. A pointer, not a data source OC reads."
            },
            "verifiedBy": { "type": "string", "description": "Who performed a manual check against `registryUrl`, if any. Absent = declared and never checked; presence records that someone looked, not that OC vouches for the result." },
            "verifiedAt": { "type": "string", "format": "date-time", "description": "When the check happened, if it did." }
          }
        }
      }
    }
  },
  "allOf": [
    {
      "if": { "properties": { "collectingSociety": { "properties": { "society": { "const": "other" } } } } },
      "then": { "properties": { "collectingSociety": { "required": ["societyName"] } } }
    }
  ]
}
```

*(The `allOf`/`if-then` binds `societyName` to `society:'other'`. It is expressed at the top level because JSON Schema
`if/then` cannot be nested cleanly under a `$ref`'d sub-object with `additionalProperties:false`; final placement is
an implementation detail to confirm against the 2020-12 conformance harness at schema-authoring time.)*

## 4. `@context` additions (JSON-LD)

Map the new terms into the v0.2 vocabulary (same pattern as v0.1's context). Reproduction-rights administration is a
first-class relation; reuse PROV/schema.org where honest, mint `oc:` terms where not:

```jsonc
"grantAuthority":      "oc:grantAuthority",
"collectingSociety":   "oc:collectingSociety",
"society":             "oc:society",
"societyName":         "schema:name",
"memberId":            "oc:memberId",
"assignedCategories":  "oc:assignedCategories",
"registryUrl":         { "@id": "oc:registryUrl", "@type": "@id" },
"verifiedBy":          "prov:wasAttributedTo",
"verifiedAt":          { "@id": "prov:generatedAtTime", "@type": "xsd:dateTime" }
```

## 5. The interaction rule (normative — the load-bearing bit)

This is where the authority axis composes with the permission axis. It is a **consumer-side and producer-side**
rule; the reference producer MUST NOT emit a manifest that violates it, and a conforming verifier MUST enforce it.

**5.1 Authority gates the commercial-reproduction facet.**
Let `A = grantAuthority.collectingSociety.assignedCategories`.

- If `A` contains **`commercial-reproduction`** or **`reproduction-all`** → the artist has assigned that right to the
  society; it is **not theirs to grant directly**. `clearance.commercialReproduction` MUST resolve to
  `permitted: false`, with:
  ```jsonc
  "basis": {
    "rule": "right-assigned-to-collecting-society",
    "inputs": [
      { "field": "grantAuthority.collectingSociety.society", "value": "prolitteris" },
      { "field": "grantAuthority.collectingSociety.assignedCategories", "value": ["commercial-reproduction"] }
    ],
    "summary": "Commercial reproduction is administered by the artist's collecting society; it is licensable via the society, not by the artist's direct grant."
  }
  ```
  A producer that emits `commercialReproduction.permitted: true` alongside such an assignment is producing an
  **inconsistent manifest**; a conforming verifier MUST treat it as `REJECTED` (not merely advisory) — asserting a
  right the signer does not hold is a fail-closed-class defect, not an unrecognised-rule advisory.

**5.2 `derivative` is symmetric** for `clearance.derivatives` (assigned ⇒ `permitted: false`, same rule id with the
`derivative` category in `inputs`).

**5.3 `none` / no declaration.**
- `society: "none"` **or** `assignedCategories: ["none"]` ⇒ no authority constraint; the artist retains authority;
  `clearance` proceeds on the artist's own declaration.
- **Block absent** ⇒ for an **artist-signed** record, treat as `unknown` (§5.5, fail-closed on reproduction). For the
  existing **open-access museum** corpus (v0.1 CC0/PD works, no living-artist grant), the block is simply not
  applicable and its absence is correct — the CC0/PD basis already grounds the grant. (A CC0 dedication is itself the
  authority; a collecting society cannot re-encumber a public-domain work.)

**5.4 A discrepancy found on manual check is not a separate state — it corrects the declaration.** If a human
following `verification.registryUrl` finds the society's public record differs from what `assignedCategories`
currently says, the fix is to **update `assignedCategories` to what is now known** (recording `verifiedBy`/
`verifiedAt` for that correction), or set it to `unknown` if the discrepancy cannot yet be resolved (§5.5, fail-closed
on reproduction). There is no third `verification` state for OC to hold pending resolution — the declaration itself
is either corrected or marked unknown; OC never carries a flagged-but-unresolved "conflict" verdict.

**5.5 `unknown`** (member, scope unconfirmed) ⇒ fail-closed on reproduction. Ambiguous authority is a deny, exactly
as an ambiguous licence is under the v0.1 fail-closed contract. Onboarding SHOULD drive `unknown` toward a resolved
value, but the manifest must be honest in the interim.

**5.6 What is NOT gated.** `attributionRequired` and non-reproduction categories (`broadcast`, `resale-royalty`, etc.)
do not affect the commercial-reproduction / derivatives facets. They are carried for completeness and for future
facets; v0.2 defines the gating only for the two reproduction-bearing categories that map to existing clearance
facets. (Resale-royalty / droit de suite is an artist ENTITLEMENT, not a grant the buyer needs — carried, never gating.)

## 6. Verification is a manual link-out — never an automated lookup (normative rationale)

No collecting society exposes a complete, authoritative registry API. ProLitteris has **no** public registry yet; the
sister societies offer **incomplete** name-search web forms (e.g. Warhol is absent from VG Bild-Kunst's search).
Automated lookup would therefore produce **false negatives** — "not found" would be read as "not a member / free to
grant," the exact wrong direction under fail-closed. So:

- OC **MUST NOT** call, scrape, or imply an automated society lookup.
- `verification.registryUrl` is a **pointer a human follows**, not a source OC reads.
- `verification.verifiedBy`/`verifiedAt` record that a human looked, and when — never that OC certified the fact.
  There is no verified/unverified state for OC to hold: the declaration (`assignedCategories`) is either what the
  artist stated, unchanged, or it has been corrected by whoever checked it. Either way, OC records and points; it
  does not adjudicate.

## 7. Versioning & v0.1-safe bridge

- **v0.2, additive, new namespace.** v0.1 stays frozen; no published v0.1 URI moves (VERSIONING.md).
- New rule id `right-assigned-to-collecting-society` joins the v0.2 rule registry (open set; no schema change to add).
- **v0.1-safe bridge — the gate lives in the v0.1 body, not only in the extension.** The `grantAuthority` block
  itself rides in v0.1 `extensions` under the v0.2 namespace (a v0.1 consumer MUST-ignore the extension, per the
  v0.1-safe pattern) — but §5.1's rule is not carried only there. **Normative: whenever `grantAuthority` gates a
  facet closed, the v0.1-visible `clearance.commercialReproduction.permitted` (or `.derivatives.permitted`) MUST
  already read `false`.** v0.1 already permits `permitted:false` with a `basis`, so a v0.1-only consumer that has
  never heard of `grantAuthority` still reads the safe, correct answer directly off the core v0.1 field it already
  understands — it does not need to understand the extension at all. **The bridge MUST NOT be used to carry a gate
  that the v0.1 body itself contradicts**: a manifest where the extension records an assignment away but the core
  `clearance` boolean still reads `true` is an inconsistent manifest under §5.1 and MUST be rejected, never shipped.
  With this, the element closes the failure it exists to close for every consumer, v0.1-only or v0.2-aware — there
  is no advisory-only gap.

## 8. Onboarding capture (the artist flow — declaration, not interrogation)

At artist onboarding, capture three things, in plain language:

1. **"Are you a member of a collecting society?"** → dropdown: none · ProLitteris · VG Bild-Kunst · ADAGP · DACS · ARS
   · other (free-text). Default: none.
2. **"Your member ID (optional)."** → free text; may be left blank.
3. **The substantive question — "Which rights did you assign to them?"** → checkboxes mapped to `assignedCategories`,
   in artist-legible wording ("commercial reproduction of your work", "adaptations / derivatives", "reprography",
   "broadcast", "public lending / display", "resale royalty (droit de suite)"). If the artist does not know →
   **`unknown`** (which fails reproduction closed until resolved), and surface the society's page as a **link-out** to
   check manually.

The onboarding UI **links out** to the relevant society's search/member page for a manual check; it never calls it.
`verification.verifiedBy`/`verifiedAt` stay unset until a human actually checks. (This proposal fixes the data
captured and the fail-closed defaults, not the UI copy or pixels.)

## 9. Worked examples

**9.1 ProLitteris member who assigned commercial reproduction → honest deny.**
```jsonc
"grantAuthority": { "collectingSociety": {
  "society": "prolitteris", "memberId": "PL-XXXXX",
  "assignedCategories": ["commercial-reproduction", "resale-royalty"],
  "verification": { "method": "manual-link-out", "registryUrl": "https://prolitteris.ch/…" }
}},
"clearance": { "commercialReproduction": {
  "permitted": false,
  "basis": { "rule": "right-assigned-to-collecting-society",
    "inputs": [ { "field": "grantAuthority.collectingSociety.society", "value": "prolitteris" },
                { "field": "grantAuthority.collectingSociety.assignedCategories", "value": ["commercial-reproduction"] } ],
    "summary": "Commercial reproduction is administered by ProLitteris; licence via the society, not the artist's direct grant." } },
  "derivatives": { … }, "attributionRequired": { … } }
```
The manifest is **honest**: it names the society as the path, rather than asserting a grant the artist cannot make.

**9.2 Non-member (or nothing relevant assigned) → artist's grant stands.**
```jsonc
"grantAuthority": { "collectingSociety": { "society": "none", "assignedCategories": ["none"],
  "verification": { "method": "manual-link-out" } } }
```
`clearance.commercialReproduction` proceeds on the artist's own declaration — the authority axis imposes no constraint.

## 9a. Conformance vectors required

1. `assignedCategories` contains `commercial-reproduction` ⇒ `clearance.commercialReproduction.permitted: false` in
   the **v0.1-visible field itself**, with `basis.rule: "right-assigned-to-collecting-society"` (§5.1, §7).
2. **Negative:** a manifest whose `grantAuthority` gates a facet closed but whose v0.1-visible
   `clearance.commercialReproduction.permitted` still reads `true` ⇒ `REJECTED` (§7, the v0.1-bridge fix — proves the
   gate cannot be satisfied only in the ignorable extension).
3. `assignedCategories: ["none"]` ⇒ no constraint on `clearance`; the artist's own declaration stands (§5.3, §9.2).
4. `assignedCategories: ["unknown"]` ⇒ `clearance.commercialReproduction.permitted: false` (§5.5).
5. **Negative:** `assignedCategories: ["none", "commercial-reproduction"]` and `assignedCategories: ["unknown", "none"]`
   ⇒ schema-invalid (the sentinel-exclusivity constraint on `assignedCategories`).
6. `verification` present with only `method` (no `verifiedBy`/`verifiedAt`) ⇒ valid; declared-and-unchecked is a
   normal state, not a defect.
7. `verification.verifiedBy`/`verifiedAt` present ⇒ carried as provenance only; does **not** change the
   `clearance` verdict, which is driven solely by `assignedCategories` (§6, §5.4).

## 10. What this makes possible to say honestly

For a society member, the manifest no longer fabricates a reproduction grant the artist assigned away — it records
the society as the licensing path instead. That is a real honesty guarantee to point to: the standard refusing to
overclaim on an artist's behalf, not a limitation of the format.

## 11. Open questions

- **Definitive answer on what a collecting-society member may self-license directly** — firms up the
  `assignedCategories` default mapping once answered; per-society, since practice differs.
- **Baseline society set** — this proposal ships five named societies (ProLitteris, VG Bild-Kunst, ADAGP, DACS, ARS);
  `other` covers the rest. Worth confirming this is the right first tranche before publication.
