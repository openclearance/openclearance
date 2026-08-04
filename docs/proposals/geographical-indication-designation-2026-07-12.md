# Spec addition — Geographical Indication & origin/authenticity marks (the DESIGNATION axis)

**Date:** 2026-07-12 · **Author:** OM-C (standard lane) · **Target version:** v0.2 (additive; v0.1 FROZEN)
**Status:** REVIEW-READY → OM-CR (spec gate) → OM-OR sequences into the v0.2 wave → Pramod
**Rides:** the v0.2 wave, alongside `grantAuthority` (collecting-society) and the **evidence pointer**.
**Depends on:** `evidence-pointer-2026-07-12.md` — GI is its **first consumer**.
**Anchor:** UNDRIP Art. 31 (traditional cultural expressions) — this is its rights-vocabulary expression.
**Branch:** `feat/gi-designation` (local, not pushed — OM-OR sequences).

> **RE-AIMED 2026-07-12 (Pramod, mid-flight).** An earlier draft of this document designed a *verification* method for
> GI claims (register citation, a "stronger tier," a verification-state ladder) on the premise that GI registers are
> public and enumerable. **That premise is deleted.** A GI claim **cannot be verified — not by OpenClearance, and not
> by a government.** It is a **self-claim, full stop.** Designing a verification tier would make OC a *vouching
> authority*, which is exactly what OC refuses to be. What replaces it is in §6.

---

## 1. The ask, and the THREE ways to get it wrong

Artworks carry legally-protected **origin marks**: statutory GIs (India's GI Act register — Madhubani, Pattachitra,
Mysore & Thanjavur painting, Bidriware, Channapatna, Pochampally ikat, Kanchipuram silk…; EU PDO/PGI), certification
and collective marks, and the **Indigenous-authenticity regimes** that matter most to OM — Toi Iho (Māori, NZ), the
Igloo Tag (Inuit, Canada), Australia's Indigenous Art Code.

Three symmetrical failures, all of which void the manifest:

| Failure | Shape | Fixed by |
|---|---|---|
| Asserting a right the signer **does not hold** | artist self-licenses a right assigned to their collecting society | `grantAuthority` |
| Asserting a restriction **the law does not impose** | treating a GI as if it restricted *reproduction* of an open-access work | **D-1, §3** |
| **Pretending to VOUCH for what cannot be verified** | OC "certifying" that a GI claim is true | **§6 — OC does not adjudicate** |

The third is the one this re-aim adds, and it is the deepest: it is the difference between OC and a KYC-gated
"guaranteed authentic" registry. **That registry model is our foil, not our model.**

## 2. The axis question — this is a THIRD axis, and here is the proof

It does not belong under `grantAuthority`, and the argument is structural, not aesthetic: **putting it there would
*cause* the bug in §3.**

| Axis | Question it answers | Subject | Relationship to `clearance` |
|---|---|---|---|
| **permission** — `clearance` | May this work be reproduced / adapted? | the **work** | *is* the clearance booleans |
| **authority** — `grantAuthority` | Does the declaring party **hold** the right they purport to grant? | an **individual** (title chain) | **gates a facet CLOSED** |
| **designation** — `designation` *(new)* | What may this be lawfully **CALLED**, and **who** may call it that? | **collectively**: an origin + a class of authorised producers | **MUST NEVER TOUCH IT** |

**The structural proof.** `grantAuthority`'s defining behaviour is to gate a `clearance` facet **closed**.
`designation`'s defining behaviour is to **never touch `clearance`**. Two blocks with *opposite* relationships to the
same target cannot share a home: housing designation under `grantAuthority` would inherit the "GI restricts
reproduction" bug **by construction**. Add the different subject (collective origin vs. individual title chain) and
the case is closed.

**Conclusion: a third top-level axis, `designation`.**

## 3. The anti-trap (D-1) — NORMATIVE, load-bearing

> **A protected designation constrains what a NEW PRODUCT may be NAMED. It does NOT constrain whether an existing
> work may be REPRODUCED.**

**D-1 (normative).** The `designation` block **MUST NOT** modify, reduce, or condition any `clearance.*` facet. A
manifest in which a designation has reduced a clearance boolean is **inconsistent**; a conforming verifier **MUST
reject it** (`REJECTED`) — not merely advise. Specifically:

- A **CC0 / public-domain** work carrying a designation mark **remains fully cleared for reproduction.** A CC0 museum
  scan of an 18th-century Pattachitra is **not** restricted by a modern GI. A register created in the 2000s cannot
  retroactively encumber an 18th-century artefact.
- No value of `workDesignation`, `producerClaim`, or `productNaming` may be read as a reproduction restriction.

Inventing a restriction the law does not impose is the mirror image of asserting a right the signer does not hold.
The standard refuses both.

**D-2 — the fail-closed DIRECTIONS differ, and the difference is normative.**

| | `grantAuthority` (authority axis) | `designation` (this axis) |
|---|---|---|
| **`unknown` ⇒** | **deny reproduction** (`clearance.commercialReproduction: false`) | **deny the NAME** (`protectedNameUsePermitted: false`) |
| **effect on reproduction** | closes it | **none — `clearance.*` untouched** |
| **risk closed against** | granting a right you may not hold | (a) designating a product with a name you are not entitled to, **and** (b) inventing a reproduction restriction that does not exist |

Both are "fail-closed," but they close against **different risks**, so they close in **different directions**.

**D-3 — truthful descriptive reference is ALWAYS permitted.**
`protectedNameUsePermitted: false` means *the product MUST NOT be designated **by** the protected name.* It does not
forbid truthfully **describing** the work. *"A fine-art print reproducing an 18th-century Pattachitra painting held by
[museum]"* describes the **work**; it does not designate the **product** as a GI good. Forbidding that would
over-restrict — which is its own dishonesty (see §1, failure 2).

## 4. The field (normative schema fragment, v0.2)

New optional top-level block. Reuses v0.1 `$defs/basis`. **Note what is NOT here: no verification block, no register
adjudication, no verified state.** Every substantive field is a **declared self-claim**.

```jsonc
"designation": {
  "type": "object",
  "required": ["marks", "productNaming"],
  "additionalProperties": false,
  "description": "DESIGNATION axis: what this work may lawfully be CALLED, and who is entitled to call it that. Orthogonal to `clearance` (permission) and `grantAuthority` (authority-to-grant). NORMATIVE (D-1): MUST NOT restrict any `clearance` facet. Every claim here is SELF-ATTESTED: OC records it and does NOT verify it (§6).",
  "properties": {
    "marks": {
      "type": "array",
      "description": "Protected origin/authenticity marks CLAIMED for this work. Empty = none claimed — which is NOT an assertion that none apply, and NOT a negative finding (§8).",
      "items": { "$ref": "#/$defs/protectedMark" }
    },
    "productNaming": { "$ref": "#/$defs/productNaming" }
  }
}
```

```jsonc
"$defs": {
  "protectedMark": {
    "type": "object",
    "required": ["scheme", "legalBasis", "name", "jurisdiction", "workDesignation", "producerClaim", "declaredBy"],
    "additionalProperties": false,
    "description": "A CLAIMED protected mark. SELF-ATTESTED throughout. OC carries the claim and points at any evidence the claimant offers (via the `evidence` block); it does NOT verify, grade, or adjudicate it (§6).",
    "properties": {
      "scheme": {
        "type": "string",
        "enum": ["gi-india", "eu-pdo", "eu-pgi", "certification-mark", "collective-mark", "indigenous-authenticity-mark", "code-of-conduct", "other"]
      },
      "schemeName": { "type": "string", "minLength": 1, "description": "e.g. 'GI Registry (India)', 'Toi Iho', 'Igloo Tag', 'Indigenous Art Code'. REQUIRED when scheme='other'." },

      "legalBasis": {
        "type": "string",
        "description": "The ACTUAL legal force of the mark being claimed. Honesty-bearing: a VOLUNTARY CODE (e.g. Australia's Indigenous Art Code — a dealer code of conduct) MUST NOT be recorded as though it conferred a statutory designation right (D-8).",
        "enum": ["statutory-gi", "certification-trademark", "collective-trademark", "voluntary-code", "unknown"]
      },

      "name": { "type": "string", "minLength": 1, "description": "The protected designation claimed, e.g. 'Orissa Pattachitra'." },

      "designationRef": {
        "type": "string", "format": "uri",
        "description": "OPTIONAL reference identifying WHICH designation is meant (disambiguation only — 'Pattachitra' is ambiguous without it). NORMATIVE: this identifies the DESIGNATION, never the CLAIMANT. It confers ZERO verification and MUST NOT be presented as evidence that this work or maker qualifies (§6)."
      },

      "jurisdiction": {
        "type": "string",
        "description": "ISO 3166-1 alpha-2 of the granting jurisdiction ('IN','NZ','CA','AU') or 'EU'. A designation right is TERRITORIAL — it does not travel (D-9)."
      },

      "workDesignation": {
        "type": "string",
        "description": "Does the CLAIMANT assert the work is of this protected class? DESCRIPTIVE, self-attested. Carries NO reproduction restriction (D-1).",
        "enum": ["claimed", "attributed", "not-applicable", "unknown"]
      },

      "producerClaim": {
        "type": "object",
        "required": ["claimsAuthorisation"],
        "additionalProperties": false,
        "description": "The maker's SELF-ATTESTED entitlement claim. NOTE (D-6): OC records only what the claimant states. OC MUST NOT record a third-party NEGATIVE finding ('not authorised') — it has no adjudication path to ground one, and a false negative would defame an honest maker.",
        "properties": {
          "claimsAuthorisation": {
            "type": "string",
            "enum": ["claimed", "not-claimed", "not-applicable"],
            "description": "'claimed' = the maker asserts authorised-user / licensee status. 'not-claimed' = they make no such claim (NOT a finding that they are unauthorised). 'not-applicable' = the maker predates or falls outside the scheme (e.g. an 18th-c. artisan)."
          },
          "authorisedUserRef": {
            "type": ["string", "null"],
            "description": "A membership/authorised-user identifier the maker CHOOSES to state. Self-attested. OC does not look it up (§6). Its presence changes NO verdict."
          }
        }
      },

      "declaredBy": {
        "type": "object",
        "required": ["actor", "role"],
        "additionalProperties": false,
        "description": "WHO made this claim, in PROV terms. The claim is THEIRS, accountably — that is the whole trust model (§6). Not OC's finding.",
        "properties": {
          "actor": { "type": "string", "minLength": 1 },
          "role":  { "type": "string", "minLength": 1 }
        }
      },
      "declaredAt": { "type": "string", "format": "date-time" }
    }
  },

  "productNaming": {
    "type": "object",
    "required": ["protectedNameUsePermitted", "basis", "permittedDescriptor"],
    "additionalProperties": false,
    "description": "The instant, machine-actionable answer for a product DERIVED from this work (e.g. an OM print): may that product be DESIGNATED by the protected name? Reuses v0.1 `$defs/basis`. This is the ONLY thing the designation axis gates — it NEVER gates reproduction (D-1). It is a deterministic function of the DECLARED inputs, not an adjudication of their truth (§6).",
    "properties": {
      "protectedNameUsePermitted": {
        "type": "boolean",
        "description": "MAY a derived product be designated BY the protected name, ON THE STRENGTH OF THE DECLARANT'S OWN ATTESTATION? `false` does not forbid truthfully DESCRIBING the work (D-3) and does not restrict reproduction (D-1)."
      },
      "basis": { "$ref": "#/$defs/basis" },
      "permittedDescriptor": {
        "type": "string", "minLength": 1,
        "description": "The honest phrasing a product MAY lawfully bear. Precedent: v0.1 `citation` already carries rendered strings."
      }
    }
  }
}
```

## 5. Normative rules

- **D-1** — designation MUST NOT restrict reproduction. Violation ⇒ `REJECTED`. *(§3)*
- **D-2** — fail-closed directions differ: `unknown` ⇒ deny the **name**, never the reproduction. *(§3)*
- **D-3** — truthful descriptive reference to the work is always permitted. *(§3)*
- **D-4 — the claim is the basis, and it is labelled as such.** `producerClaim.claimsAuthorisation = "claimed"` **and**
  `workDesignation = "claimed"` ⇒ `protectedNameUsePermitted: true`, rule **`self-attested-authorised-user`**. The
  `basis.summary` **MUST** state that this rests on the declarant's own attestation and is **not verified by
  OpenClearance**. *(The maker is accountable for their claim — signed, on the record. That is the CA/HTTPS model:
  bind the claim to an accountable identity; do not certify its truth.)*
- **D-5 — historical works.** `claimsAuthorisation = "not-applicable"` ⇒ `protectedNameUsePermitted: false`, rule
  **`mark-not-applicable-historical`**, with a truthful `permittedDescriptor`. **`clearance` untouched** — the CC0-scan
  case, and the whole point.
- **D-6 — OC records NO negative finding.** `not-claimed` means *the maker asserts nothing*; it MUST NOT be rendered,
  displayed, or serialised as *"not authorised"*, and OC MUST NOT emit a third-party negative authorisation finding at
  all — it has **no adjudication path** to ground one (§6). Withholding the name is not an accusation.
- **D-7 — no adjudication, no lookup.** OC does not call, scrape, or consult any register, and the manifest never
  asserts that OC checked anything. *(This replaces the deleted verification tier — see §6.)*
- **D-8 — voluntary codes confer no designation right.** `legalBasis: voluntary-code` MUST NOT set
  `protectedNameUsePermitted: true`. Carried for transparency; its obligations are operational, not manifest-borne.
- **D-9 — territoriality.** A designation right is territorial. A consumer MUST NOT infer protection *or* permission
  outside `jurisdiction`. Fail-closed on the name.
- **E-1 (inherited, and it BITES here).** **Evidence of making NEVER flips `protectedNameUsePermitted`.** A beautiful
  process video does **not** upgrade the verdict. `productNaming.basis.inputs` MUST NOT cite an `evidence` item. The
  video is there **for a human**. *(See `evidence-pointer-2026-07-12.md`.)*

v0.2 rule ids (open set): `self-attested-authorised-user` · `no-designation-claimed` · `designation-claim-unknown` ·
`mark-not-applicable-historical` · `voluntary-code-no-designation-right`.
**Deleted from the earlier draft:** ~~`authorised-user-of-registered-gi`~~, ~~`no-authorised-user-status`~~ — both
implied a verification OC does not and will not perform.

## 6. Why there is NO verification method here (the re-aim — normative rationale)

**A GI claim cannot be verified. Not by OpenClearance, and not by a government.** Whether *this* work genuinely issues
from *that* tradition, made *that* way, by a maker entitled to the name, is a judgment — not a lookup. There is no
oracle, and a register entry is not one either.

So OC designs **no** verification method, **no** registry lookup, **no** "stronger tier," and **no** adjudication path.
Doing so would make OC a **vouching authority** — the precise thing it refuses to be. *Govern identity, not truth.*
This is the CA / HTTPS model: a CA binds a claim to an **accountable identity**; it does not certify that the claimant
is honest. A KYC-gated *"guaranteed authentic"* registry is **our foil, not our model.**

**What replaces it — and it is more useful than a fake verdict:**

1. **The claim is carried as a claim** — self-attested, attributed (`declaredBy`), and, at Tier-1, **signed**. A false
   claim is then a *provable, attributable, signed lie*. That is accountability, and it is what OC actually offers.
2. **The claimant may point at EVIDENCE OF MAKING** — the process video, the photographs of the work being made, the
   artisan at work — through the general **`evidence`** block, bound tamper-evidently by content hash.
3. **A HUMAN judges.** The evidence **does not upgrade the verdict** (E-1). It exists so a person can look and decide.

> **The line: the standard carries the CLAIM plus a tamper-evident POINTER to evidence; the platform SHOWS the
> evidence; the human decides. OpenClearance never says "this GI is true."**

**The seam with OMA.** OMA hosts and displays the making-of gallery (*"the GI proof in its making"*), rendering it by
filtering `evidence[]` on `supports` → this mark, re-hashing each item against `integrity.hash` before display. **OC
hosts not one byte** and grades nothing. OC makes it *possible*; OMA builds it. *(OM-A build; OM-QC gates the copy —
which must never present the gallery as verification.)*

## 7. Where it bites

**7.1 OM's print/product labelling.** `productNaming` is the answer:
- `false` ⇒ the product **must not be designated** "a Pattachitra." It **may** be honestly described:
  *"Fine-art print reproducing a Pattachitra painting (Odisha, 18th c.), after the original held by …"* (D-3).
- `true` (self-attested authorised user) ⇒ the product **may** bear the name — **on the maker's accountable
  attestation**, and the label/UI must not imply OC verified it.

**7.2 The artisan-rights program (India-first) — the positive case, correctly grounded.**
The artisan proves something **not by us checking a register, but by SHOWING THE MAKING.** They declare their claim
(accountably, signed) and attach evidence of making; OMA shows it; a human judges. That is a *stronger and more honest*
form of proof than a registry tick, and it is available to artisans a register may never reach. And by D-1/D-2/D-6, an
artisan who claims nothing loses **nothing** about reproducing or selling their own work — only the protected name is
withheld, and they are **never** recorded as unauthorised.

## 8. What this element deliberately does NOT do (honesty boundary)

A registered mark is a **thin proxy** for a much richer set of community rights. This element records **claimed
designations**. It does **not** encode customary law, sui-generis TCE regimes, or a community's rights under UNDRIP
Art. 31 beyond what a claim happens to capture.

Normatively: **`marks: []` means "no mark is claimed." It MUST NOT be read, or presented, as "this work carries no
cultural rights."** Adding a field does not mean OM has "handled" Indigenous cultural rights, and the standard must not
let anyone imply it has.

## 9. Versioning, bridge, conformance

- **v0.2, additive.** v0.1 frozen; reuses v0.1 `$defs/basis`.
- **v0.1-safe bridge:** carry `designation` in v0.1 `extensions` under the v0.2 namespace; MUST-ignore for v0.1
  consumers. Because the axis is **non-restrictive** (D-1), a v0.1 consumer that ignores it **loses nothing about
  reproduction** — a strictly safer ignore-failure than `grantAuthority`'s (where ignoring means over-granting).
- **Conformance vectors:** the CC0-historical case (D-1/D-5 — `clearance` stays `true`); the self-attested-claim case
  (D-4, with the "not verified by OC" summary); the `unknown` case (D-2); **negative:** a manifest whose designation
  reduced a clearance boolean ⇒ `REJECTED` (D-1); **negative:** `productNaming.basis.inputs` citing an `evidence` item
  ⇒ `REJECTED` (E-1); a manifest carrying any GI *verification/verified* field ⇒ **schema-invalid** (D-7).

## 10. Rulings that are genuinely Pramod's — NOT decided here

- **P-1 (legal, needs counsel — the big one).** Does a giclée/photographic **print** of a GI-protected painting fall
  within the GI's **registered goods class** at all? If not, naming a print may not be capable of infringing, and our
  caution is belt-and-braces rather than legally required. **The design is safe under either answer** (we never
  designate a product by the GI absent a claim; we always describe truthfully) — but the answer decides whether we are
  appropriately careful or **over**-cautious, and over-caution carries its own honesty cost. Per-jurisdiction.
- **P-2.** Does OM become a signatory to the **Indigenous Art Code** / seek Toi Iho / Igloo Tag alignment? Ethical
  positioning, not a spec call.
- **P-3.** Does the artisan program actively help artisans **document their making** (the evidence path is now the
  proof path — this is where the program's effort should go, rather than into registry chasing)?
- **P-4.** Is the v0.2 baseline `scheme` set the right first tranche?
- **P-5 — CROSS-ELEMENT CONSISTENCY (also raised in the evidence doc).** The `grantAuthority` element still carries a
  `verification` block with `manually-verified` / `conflict` states. Under this ruling, OC recording a "verified" state
  is OC adjudicating. **Recommend harmonising it to the claim+evidence model.** I have not touched that branch — it is
  in OM-OR's gate.
