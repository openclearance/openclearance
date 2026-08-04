# Spec addition — the EVIDENCE POINTER (a general primitive; OC records and points, it never adjudicates)

**Date:** 2026-07-12 · **Author:** OM-C (standard lane) · **Target version:** v0.2 (additive; v0.1 FROZEN)
**Status:** REVIEW-READY → OM-CR → OM-OR sequences into the v0.2 wave → Pramod
**First consumer:** the GI / designation element (`geographical-indication-designation-2026-07-12.md`). Designed as a
**general** primitive — any self-attested claim may point at evidence.
**Branch:** `feat/gi-designation` (local, not pushed).

---

## 1. What this is, and the one line it exists to hold

> **The standard carries the CLAIM plus a tamper-evident POINTER to evidence. The platform SHOWS the evidence. The
> human decides. OpenClearance never says "this claim is true."**

Many of the most valuable things a maker can assert — *this is a Pattachitra*, *I am an authorised user*, *I made
this by hand in my workshop* — **cannot be verified**: not by OpenClearance, and not by a government. Designing a
verification method, a registry lookup, a "stronger tier," or any adjudication path would make OC a **vouching
authority**. OC refuses to be one. (This is the CA / HTTPS model: a CA binds a claim to an accountable identity; it
does not certify that the company behind the certificate is honest. A KYC-gated "guaranteed authentic" registry is our
**foil, not our model**.)

But refusing to adjudicate is not the same as having nothing to offer. What OC *can* do — and what nobody has done
properly — is define the **normative shape of a tamper-evident pointer to evidence**, so that an honest maker can
*show their working* and a human can judge for themselves. **Evidence of making**: the process video, the photographs
of the work being made, the artisan at work.

OC defines the **structure**. OMA (the site) **hosts and displays** it. OC never holds a byte.

## 2. Why it is general, not GI-only

A self-attested claim of *any* kind may want to point at evidence: a GI/origin claim, a collecting-society assignment
(`grantAuthority`), an edition/impression statement, an attribution, a condition report, a provenance step. So the
primitive is defined **once**, at the top level, and each claim type becomes a *consumer* of it. GI is simply the
first.

The wiring is a **JSON Pointer from the evidence to the claim it supports** — see §4.

## 3. The normative rules (this is the whole design; the schema is downstream of it)

- **E-1 — EVIDENCE NEVER CHANGES A VERDICT.** *(the load-bearing rule)*
  The presence, absence, quantity, or apparent quality of evidence MUST NOT alter any `clearance.*` boolean, any
  `designation.productNaming.protectedNameUsePermitted`, any `VerificationState`, or any `confidence` value. A
  `basis.inputs` array MUST NOT cite an `evidence` item as an input to a determination. **Evidence exists so a HUMAN
  can judge — it does not upgrade a machine verdict.** A producer that raises a verdict on the strength of evidence
  produces an **inconsistent manifest**, and a conforming verifier MUST reject it (`REJECTED`).

- **E-2 — OC ADJUDICATES NOTHING; IT DOES NOT GRADE.**
  There is no evidence grade, score, rank, sufficiency test, or authenticity finding, and there never will be. Fields
  such as `evidenceGrade`, `evidenceScore`, `sufficient`, or `verified` MUST NOT be emitted (`additionalProperties:
  false` enforces this structurally). OC **records and points**. Whether a video is convincing is a human's judgment,
  and OC has no opinion.

- **E-3 — OC HOSTS NO BYTES.**
  `locator` points off-manifest (OMA, or anywhere). The `integrity.hash` is the **identity** of the evidence; locators
  are convenience/mirrors. A dead or unreachable locator **does NOT invalidate the manifest** and MUST NOT change any
  verdict (this follows from E-1). Evidence is *never* load-bearing for manifest validity — a manifest with a broken
  evidence link is still a valid manifest.

- **E-4 — HONEST TIME (read this one carefully; see §5).**
  The content hash makes evidence **swap-evident immediately**: the evidence bytes are content-addressed and the
  `evidence` block sits inside the manifest payload, which is itself protected byte-exactly (Tier-0 integrity; at
  Tier-1, the C2PA signature). You cannot substitute a different video without breaking the manifest.
  **Backdating is a different problem and the hash does not solve it.** Absent an independent time anchor, `capturedAt`
  is a **self-asserted** time — protected from *alteration* but not anchored to an outside clock. A manifest **MUST
  NOT** claim evidence is "independently timestamped" or "provably not backdated" unless an RFC-3161 token is present.
  **RFC-3161 is DEFINED here and forward-compatible, but is NOT yet live** (v0.3-class roadmap). Do not imply otherwise.

- **E-5 — EVIDENCE IS NOT A TIER.**
  There is no "evidence-verified" `VerificationState`. The four states (`REJECTED`, `UNVERIFIED_SIGNAL`,
  `ATTESTED_DELEGATE`, `ATTESTED_DIRECT`) are untouched. Attaching evidence never moves a manifest up the tier ladder.
  Tiers are about *who signed*; evidence is about *what a human can look at*. Orthogonal, and kept so.

- **E-6 — ONE DIRECTION ONLY.**
  Evidence points **at** the claim (`supports`); a claim does **not** list its evidence. A single direction means the
  two can never disagree. A renderer (OMA) collects an item's evidence by filtering `evidence[]` on `supports`.

## 4. The field (normative schema fragment, v0.2)

New **optional** top-level array. Reuses the v0.1 integrity idiom (`{alg: "sha-256", hash}`) verbatim.

```jsonc
"evidence": {
  "type": "array",
  "description": "GENERAL evidence-pointer block: tamper-evident POINTERS to evidence held OFF-MANIFEST. OC hosts no bytes (E-3). NORMATIVE: evidence NEVER changes a verdict (E-1); OC records and points, it does not adjudicate or grade (E-2). Evidence exists so a HUMAN can judge. Empty/absent = no evidence offered, which is NOT a negative finding.",
  "items": { "$ref": "#/$defs/evidenceItem" }
}
```

```jsonc
"$defs": {
  "evidenceItem": {
    "type": "object",
    "required": ["id", "type", "supports", "mediaType", "integrity", "locator", "declaredBy"],
    "additionalProperties": false,
    "properties": {
      "id": { "type": "string", "minLength": 1, "description": "Stable id, unique within the manifest." },

      "type": {
        "type": "string",
        "description": "The KIND of evidence. Descriptive only — it carries no weight and implies no grade (E-2).",
        "enum": [
          "process-video", "making-of-photograph", "artisan-at-work", "workshop-documentation",
          "materials-and-tools", "witness-statement", "document", "other"
        ]
      },
      "typeName": { "type": "string", "minLength": 1, "description": "REQUIRED when type='other'." },

      "supports": {
        "type": "string",
        "pattern": "^/",
        "description": "RFC 6901 JSON Pointer to the CLAIM this evidence is offered in support of, e.g. '/designation/marks/0' or '/grantAuthority/collectingSociety'. This is what makes the primitive GENERAL: any self-attested claim may be pointed at. One direction only (E-6)."
      },

      "mediaType": { "type": "string", "minLength": 1, "description": "IANA media type of the evidence bytes, e.g. 'video/mp4', 'image/jpeg'." },
      "byteSize": { "type": "integer", "minimum": 0 },

      "integrity": {
        "type": "object",
        "required": ["alg", "hash"],
        "additionalProperties": false,
        "description": "SHA-256 over the exact bytes of the evidence. THE tamper-evident binding: content-addressed, so the evidence cannot be swapped (E-4). Same idiom as the v0.1 Tier-0 envelope.",
        "properties": {
          "alg": { "const": "sha-256" },
          "hash": { "type": "string", "pattern": "^[0-9a-f]{64}$" }
        }
      },

      "locator": {
        "type": "array",
        "minItems": 1,
        "description": "Where the bytes may be fetched. OC hosts NONE of this (E-3). The hash is the identity; locators are convenience/mirrors. A dead locator does NOT invalidate the manifest and changes no verdict.",
        "items": { "type": "string", "format": "uri" }
      },

      "capturedAt": {
        "type": "string", "format": "date-time",
        "description": "SELF-ASSERTED capture time. Protected from ALTERATION by the manifest's integrity hash, but NOT anchored to an independent clock (E-4). Absent an RFC-3161 token this does NOT prove the evidence was not backdated."
      },

      "declaredBy": {
        "type": "object",
        "required": ["actor", "role"],
        "additionalProperties": false,
        "description": "Who offers this evidence, in PROV terms. The evidence is THEIR attestation, not OC's finding.",
        "properties": {
          "actor": { "type": "string", "minLength": 1 },
          "role": { "type": "string", "minLength": 1 }
        }
      },

      "caption": { "type": "string", "description": "Human-readable caption for display (OMA renders it). Descriptive; carries no weight." },

      "timeAnchor": { "$ref": "#/$defs/timeAnchor" }
    }
  },

  "timeAnchor": {
    "type": "object",
    "required": ["type"],
    "additionalProperties": false,
    "description": "OPTIONAL independent time anchor over `integrity.hash`. FORWARD-COMPATIBLE: RFC-3161 is DEFINED here but is NOT yet live in the reference implementation (v0.3-class roadmap). When type='none' or the anchor is absent, the evidence time is SELF-ASSERTED and the manifest MUST NOT claim independent timestamping or non-backdating (E-4).",
    "properties": {
      "type": { "type": "string", "enum": ["rfc3161", "none"] },
      "token": { "type": "string", "description": "base64 DER RFC-3161 TimeStampToken over integrity.hash. Present only when type='rfc3161'." },
      "tsa": { "type": "string", "format": "uri", "description": "The third-party Time Stamping Authority that issued the token." }
    },
    "allOf": [{
      "if": { "properties": { "type": { "const": "rfc3161" } } },
      "then": { "required": ["token", "tsa"] }
    }]
  }
}
```

### `@context` additions
```jsonc
"evidence":     "oc:evidence",
"supports":     "oc:supports",
"locator":      { "@id": "oc:locator", "@type": "@id" },
"capturedAt":   { "@id": "oc:capturedAt", "@type": "xsd:dateTime" },
"declaredBy":   "prov:wasAttributedTo",
"timeAnchor":   "oc:timeAnchor",
"caption":      "oc:caption"
```

## 5. What the binding actually proves today (stated precisely, so nobody overclaims it)

| Property | Status **today** | Mechanism |
|---|---|---|
| Evidence cannot be **swapped** for different bytes | ✅ **Solved now** | SHA-256 content hash, inside the byte-exact manifest payload (Tier-0), under the C2PA signature at Tier-1 |
| Evidence cannot be **added/removed** unnoticed | ✅ **Solved now** | the `evidence` array is inside the protected payload |
| Evidence is bound to **this** manifest | ✅ **Solved now** | it *is* the manifest; the `supports` pointer binds it to a specific claim |
| Evidence provably **predates** a given moment | ⚠️ **Only as strong as the attestation** | at Tier-1, OM's accountable signature seals it at a time **OM asserts** — accountable, but **not independently anchored** |
| Evidence provably **not backdated** by the declarant | ❌ **NOT solved today** | requires an **RFC-3161** token from a third-party TSA — **defined here, not yet live** (v0.3 roadmap) |

**The honest sentence for external copy:** *"The evidence is sealed to the record — it cannot be swapped or altered
after the fact. Independent third-party time-anchoring is on the roadmap; today the timestamp carries our accountable
attestation, not an independent clock."* Do **not** say "provably not backdated" until RFC-3161 ships.

*(This is the third time this lane has had to correct an RFC-3161-is-live assumption — Amar longevity doc §2.2, and now
here. Recommend OM-OR treat "RFC-3161 is live" as a standing red-flag phrase in any brief until v0.3 lands.)*

## 6. Onboarding capture (the maker's side)

At upload, the maker may attach **evidence of making** to any claim they have declared:
- "Show how it was made" → upload process video / making-of photographs / artisan-at-work images.
- Each item is hashed on receipt (`integrity`), given a `supports` pointer to the claim it backs, and a caption.
- Copy MUST be honest about what it does: *"This doesn't get checked by us or by anyone — it's how you show your work
  to a person who's deciding. We seal it so it can't be swapped later, and we show it. We never claim it proves
  anything."* That sentence is E-1/E-2 made legible to the maker, and it is the rights-literacy the program exists for.

## 7. What OMA does with it (the seam — OC makes it possible, OMA builds it)

OMA renders a **making-of gallery** straight off the manifest: filter `evidence[]` where `supports` points at the claim
being displayed, fetch each item from its `locator`, **re-hash and compare against `integrity.hash`** before display
(so a tampered or substituted file is caught at render time), and show it with its caption.

OMA hosts the bytes. **OC hosts none, and grades none.** The gallery is captioned as what it is — *the maker showing
their work* — never as verification. **OM-A/OM-QC own that copy; the standard just guarantees the structure and the
tamper-evidence.**

## 8. Conformance vectors required

1. Valid evidence item, hash matches → manifest valid.
2. **Negative (E-1):** a manifest whose `basis.inputs` cites an `evidence` item, or whose verdict differs with vs.
   without evidence → **`REJECTED`**.
3. **Negative (E-2):** a manifest carrying an `evidenceGrade` / `verified` field → schema-invalid.
4. Broken/unreachable `locator` → manifest still **valid**, verdict **unchanged** (E-3).
5. `timeAnchor` absent → manifest MUST NOT be read as independently timestamped (E-4).
6. Evidence attached to a claim, verdict **identical** to the same manifest without it (E-1, positive control).

## 9. Versioning & v0.1-safe bridge

- **v0.2, additive.** v0.1 frozen; reuses the v0.1 integrity idiom.
- **v0.1-safe bridge:** carry `evidence` in v0.1 `extensions` under the v0.2 namespace; a v0.1 consumer MUST-ignore it.
  **The ignore-failure is completely safe** — because evidence changes no verdict (E-1), a consumer that ignores it
  reaches the *identical* determination. This is the cleanest bridge of the three v0.2 elements, and it is a direct
  consequence of E-1. (Contrast `grantAuthority`, where ignoring the block means over-granting.)

## 10. For OM-OR / Pramod

- **Cross-element consistency question (yours to rule, not mine).** The `grantAuthority` / collecting-society element
  (branch `feat/collecting-society-status`, currently in your gate) still carries a `verification` block with
  `manual-link-out` and states `manually-verified` / `conflict`. Under the "OC does not adjudicate" ruling, should that
  be **harmonised** to this model — i.e. record *who checked and when* as a plain attestation, with **no verified
  state and no grade**? **My recommendation: yes, harmonise** — a `manually-verified` state is OC recording a verdict,
  which is the thing we just said OC does not do. I have **not** touched that branch; it is under your gate.
- **RFC-3161** remains the one real gap (E-4). It is the difference between "cannot be swapped" (have it) and "cannot
  be backdated" (don't). Worth pulling forward in the v0.3 wave if evidence-of-making becomes load-bearing commercially.
