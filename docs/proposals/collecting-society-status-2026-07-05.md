# Spec addition — Collecting-society status (grant-authority axis)

**Date:** 2026-07-05 · **Author:** OM-C (standard lane) · **Target version:** v0.2 (additive; v0.1 FROZEN)
**Status:** REVIEW-READY → OM-CR (code/spec gate) → OM-OR sequences into the v0.2 wave → Pramod
**Feeds:** Pramod's Tuesday collector deck ("every artefact gets an honest manifest") + the standard's roadmap.
**Coordinate with:** OM-ST (deck) via OM-OR. **Companion (internal, not in this repo):** the bounded ProLitteris
inquiry email draft — held locally at `session-states/om-c-prolitteris-inquiry-DRAFT-2026-07-05.md` (DO NOT SEND;
for Pramod). Kept out of this public-repo deliverable deliberately.

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
          "description": "THE substantive item: which rights categories the artist assigned to the society. Determines whether a `clearance` facet is the artist's to grant. Open, honesty-bearing set. 'none' = member but nothing relevant assigned (artist retains all); 'unknown' = member, assignment scope not yet confirmed ⇒ fail-closed on reproduction.",
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
          }
        },
        "verification": {
          "type": "object",
          "required": ["method", "state"],
          "additionalProperties": false,
          "description": "How the declaration may be checked. MANUAL link-out only — no automated registry call is made or implied (no complete registry API exists; automated name-search yields false negatives, e.g. Warhol absent from VG Bild-Kunst's search). OC records the pointer and the human-set state; it does not adjudicate.",
          "properties": {
            "method": { "const": "manual-link-out" },
            "registryUrl": {
              "type": "string", "format": "uri",
              "description": "The society's public name-search / member page a human uses to check. A pointer, not a data source OC reads."
            },
            "verifiedBy": { "type": "string", "description": "Who performed the manual check, if any." },
            "verifiedAt": { "type": "string", "format": "date-time" },
            "state": {
              "type": "string",
              "description": "declared-unverified = the artist's word, unchecked (default). manually-verified = a human confirmed against the society's public search. conflict = the society's public record differs from the declaration (⇒ fail-closed, §5.4).",
              "enum": ["declared-unverified", "manually-verified", "conflict"]
            }
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
an implementation detail for OM-CR to confirm against the 2020-12 conformance harness.)*

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

**5.4 `conflict`** (society's public record differs from the declaration) ⇒ fail-closed on reproduction until
resolved, same as an assignment covering reproduction.

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
- `verification.state` is **human-set**: it defaults to `declared-unverified` (the artist's word) and only a human
  may raise it to `manually-verified`. This keeps the element inside the govern-identity-not-truth model: OC records
  the declaration and the pointer; it does not certify the fact.

## 7. Versioning & v0.1-safe bridge

- **v0.2, additive, new namespace.** v0.1 stays frozen; no published v0.1 URI moves (VERSIONING.md).
- New rule id `right-assigned-to-collecting-society` joins the v0.2 rule registry (open set; no schema change to add).
- **v0.1-safe bridge** (same pattern as the `models3d` ruling): a v0.1 producer MAY carry the block inside v0.1
  `extensions` under the v0.2 namespace; a v0.1 consumer MUST-ignore it. A v0.1 consumer that ignores it will read the
  artist's `commercialReproduction` at face value — therefore the **bridge is advisory only**, and any commercial gate
  relying on an artist-signed v0.1 manifest SHOULD require the v0.2 element to be understood (documented as a
  known v0.1 boundary — ties to `[[openclearance-v01-capability-boundary]]`).

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
`verification.state` starts at `declared-unverified`. (UI copy is OM-A's build + OM-QC's gate; this proposal fixes the
data captured and the fail-closed defaults, not the pixels.)

## 9. Worked examples

**9.1 ProLitteris member who assigned commercial reproduction → honest deny.**
```jsonc
"grantAuthority": { "collectingSociety": {
  "society": "prolitteris", "memberId": "PL-XXXXX",
  "assignedCategories": ["commercial-reproduction", "resale-royalty"],
  "verification": { "method": "manual-link-out", "registryUrl": "https://prolitteris.ch/…", "state": "declared-unverified" }
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
  "verification": { "method": "manual-link-out", "state": "declared-unverified" } } }
```
`clearance.commercialReproduction` proceeds on the artist's own declaration — the authority axis imposes no constraint.

## 10. What this unlocks for the deck (OM-ST, via OM-OR)

The design lets the deck honestly claim **"every artefact gets an honest manifest"**: for a society member, the
manifest does not fabricate a reproduction grant the artist assigned away — it records the society as the licensing
path. That is the honesty the collector is buying. The deck should present it as *the standard refusing to overclaim
on the artist's behalf*, not as a limitation. **Coordinate exact deck wording through OM-OR → OM-ST; this doc is the
source of truth for what the standard actually does.**

## 11. Open items for OM-OR / Pramod

- **Definitive ProLitteris answer** ("what may a member self-license directly?") — bounded email drafted for Pramod
  (see companion file). The `assignedCategories` default-mapping for a ProLitteris member firms up once answered.
- **Baseline society set** — v0.2 ships the five named; `other` covers the rest. Confirm the five are the right
  first tranche for Pramod's collector base.
- **Normative sign-off** — this changes the manifest shape, so adoption into a published v0.2 is an OM-OR/Pramod
  decision (my `escalate_to_opus_when` boundary); this proposal is the design, not a unilateral schema flip.
