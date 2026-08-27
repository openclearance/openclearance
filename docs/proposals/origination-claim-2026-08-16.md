# Spec addition — the ORIGINATION axis: what a work was made FROM

**Date:** 2026-08-16 · **Status:** proposal · **Target version:** v0.2 wave (version partition to be
confirmed against the standing version roadmap before schema authoring)
**Companion:** `motion-works-2026-08-16.md` (the supply channel this first serves is born-digital
motion work, but the axis is medium-neutral by design).

---

## 1. The problem: the vocabulary answers "may I use it", not "where did it come from"

Every existing axis of the manifest is about a work that already exists: may it be reproduced
(`clearance`), does the declarant hold the right they grant (`grantAuthority`), what may it be
called (`designation`). None of them can say the one thing a platform accepting **born-digital
submissions** has to record: **is this work an original creation, or was it made from an existing
work?**

The failure mode is specific and worth stating plainly. Open-access corpora make derivation
trivially cheap: an existing artwork can be run through a generative model and the output offered
as new work. When the input was open-access art, openness itself becomes the raw material for a
misrepresentation — and a rights standard that has no place to even *record* an origination claim
cannot distinguish the honest digital artist from that case, cannot ground a refusal, and cannot
ground a later withdrawal. It is not neutral; it is an accelerant.

The distinction that matters is **origination versus derivation** — what the work was made *from*.
It is deliberately NOT a distinction about tools. What a work was made *with* (which software,
which models, how much assistance) is a disclosure question already slated for the version
roadmap's AI-disclosure vocabulary, and it does not settle origination in either direction: a work
can be tool-heavy and entirely original, or tool-free and a copy.

## 2. A fourth axis, and the structural argument

| Axis | Question | Subject | Relationship to `clearance` |
|---|---|---|---|
| permission — `clearance` | may this work be used? | the work | *is* the verdicts |
| authority — `grantAuthority` | does the declarant hold the right? | the declarant's title | gates a facet CLOSED |
| designation — `designation` | what may it be called? | collective origin | MUST NEVER touch it |
| **origination — `origination`** *(new)* | **what was it made from?** | **the work's creative provenance** | **feeds it, fail-closed (O-4)** |

Origination cannot live inside `grantAuthority` (that axis is about title to rights in a work whose
provenance is not in question) nor `designation` (naming, collective, never touches clearance) nor
`evidence` (pointers, never claims). And unlike designation, origination **legitimately feeds** a
clearance determination: a work *declared* to be derived from an existing source has a rights chain
that runs through that source, and the manifest must be able to say so. A fourth top-level axis.

## 3. Normative rules

- **O-1 — Originality cannot be verified; the standard records the declaration, and nothing more.**
  There is no oracle for creative provenance — no registry lookup, no model, no authority that can
  certify "this was made from nothing but its maker". So this axis defines **no verification
  method, no originality grade, no certified-original state**, and never will. What it records is
  the maker's **declaration**: attributed, accountable, and — at an attested tier — signed. A
  consuming surface may honestly present *"declared an original creation by the maker, on the
  record"*; it MUST NOT present *"verified original"*, and no field exists from which such a claim
  could be derived. The value of the declaration is exactly its accountability: a false one is a
  provable, attributable, signed misrepresentation, permanently bound to the work's record.

- **O-2 — Absence is not a finding.** Most existing manifests (museum open-access records) carry no
  origination block; absence means only that no declaration was made. Mirror of the designation
  axis's absence rule.

- **O-3 — No third-party negative finding, ever.** The manifest MUST NOT carry "found derived",
  similarity scores, match flags, or any adjudicated provenance verdict — the standard has no
  adjudication path to ground one, and a false positive would defame an honest maker. Detection of
  undeclared derivation (perceptual matching against a corpus, forensic review) and its
  consequences (refusal at intake, removal from hosting, withdrawal of an attestation) are the
  consuming platform's controls, outside the manifest. The standard's contributions to that
  enforcement are structural: content-addressed hashes that make matching tractable, and a signed
  declaration that converts a match from a suspicion into a **contradiction of the maker's own
  record**.

- **O-4 — Declared derivation is a legitimate state, and it composes fail-closed.** Deriving from
  an existing work is not a defect when the chain is honest: the block records each source (by
  content hash where available, work reference, or description) and **the right relied on** to
  derive from it (`own-work`, `public-domain`, `licensed`, `permission-granted`, `unknown`).
  Composition rule, verifier-checkable within the single manifest: a manifest declaring derivation
  where any source's relied-on right is **`unknown`** MUST read `false` in the v0.1-visible
  `clearance.commercialReproduction.permitted` and `clearance.derivatives.permitted` — asserting
  commercial clearance while one's own declaration leaves the source chain unresolved is the same
  inconsistency class as the collecting-society gate, and a conforming verifier MUST reject the
  contradiction. (Unlike designation and evidence, origination MAY be cited in `basis.inputs`: it
  is a declared, rights-relevant fact, exactly like a collecting-society assignment.)

- **O-5 — Evidence composes; it never upgrades.** The maker MAY point evidence at the origination
  claim through the general evidence block (`supports: "/origination"`, or at a specific source
  entry): working files, process captures, iteration history — the maker showing the work. The
  inherited evidence rules apply unchanged: evidence exists for a human, changes no verdict, and no
  quantity of process documentation converts a declaration into a verification.

- **O-6 — Tools are not sources.** Tool disclosure (including generative-model disclosure) is a
  separate vocabulary with its own pending design, and toolchain provenance metadata, where it
  exists, may travel as evidence. Its absence is not a negative signal — most pipelines emit none —
  and its presence proves nothing about what the work was made from. The origination axis asks one
  question and refuses to blur it.

- **O-7 — The withdrawal path is named, not faked.** A declaration shown false after publication is
  the canonical case for attestation status/withdrawal — a layer that belongs to the pending
  status vocabulary, not to this axis. Until that layer exists, withdrawal is operational (the
  attestor ceases to serve and attest the record; hosting surfaces remove the work), and a manifest
  MUST NOT imply a self-revoking mechanism it does not have. This axis makes the need concrete;
  it does not counterfeit the mechanism.

## 4. The field (sketch; schema authored after review)

```jsonc
"origination": {
  "type": "object",
  "required": ["assertion", "declaredBy"],
  "additionalProperties": false,
  "properties": {
    "assertion": {
      "enum": ["original-creation", "derived-from-declared-sources"]
      // original-creation: not made from any existing artwork. A DECLARATION (O-1).
      // derived-from-declared-sources: made from the listed sources, honestly (O-4).
    },
    "sources": {
      // REQUIRED, minItems 1, when assertion = derived-from-declared-sources (schema-enforced);
      // forbidden when original-creation.
      "items": {
        "required": ["relation", "sourceRight"],
        "properties": {
          "workRef":    { /* uri — the source work, where identifiable */ },
          "integrity":  { /* {alg, hash} — content hash of the source bytes, where held */ },
          "description":{ /* free text where neither ref nor hash exists */ },
          "relation":   { "enum": ["derived-from", "incorporates", "adapts"] },
          "sourceRight":{ "enum": ["own-work", "public-domain", "licensed", "permission-granted", "unknown"] },
          "rightRef":   { /* uri — licence or permission record, optional */ }
        }
        // at least one of workRef / integrity / description (schema-enforced)
      }
    },
    "declaredBy": { /* {actor, role} — PROV idiom, as everywhere */ },
    "declaredAt": { /* date-time */ }
  }
}
```

## 5. Conformance vectors required (sketch)

1. `original-creation` declaration ⇒ valid; no effect on any clearance facet.
2. Derived, single source `public-domain` with `workRef` + hash ⇒ valid; clearance proceeds on its
   stated basis, which MAY cite the origination fields in `basis.inputs`.
3. **Negative (O-4):** derived with a source `sourceRight: "unknown"` while
   `commercialReproduction.permitted: true` ⇒ REJECTED.
4. **Negative:** `derived-from-declared-sources` with no `sources` ⇒ schema-invalid; `original-creation`
   with `sources` present ⇒ schema-invalid.
5. **Negative (O-1/O-3):** a manifest carrying `verifiedOriginal`, a similarity score, or any match
   field ⇒ schema-invalid by construction.
6. Evidence pointed at `/origination` ⇒ valid; verdicts identical with the evidence removed (O-5).
7. `origination` absent ⇒ valid, no finding either way (O-2).

## 6. What this lets a platform say and do, honestly

A submission page can require the declaration and display it as what it is. An intake pipeline can
refuse what its own matching flags — as *its* editorial control, grounded outside the manifest. And
when a declaration is later shown false, the record itself is the instrument: signed, dated,
attributed, content-bound. The standard does not catch liars; it makes lying **cost something
permanent**.

## 7. Versioning & v0.1-safe bridge

- **Additive, new namespace.** v0.1 stays frozen; no published v0.1 URI moves (VERSIONING.md). The
  new rule ids join the rule registry (an open set — adding one breaks no published schema).

- **Why a bridge is required rather than optional.** The shipped v0.1 schema sets
  `additionalProperties: false` at the document root. A top-level `origination` block carried inline
  is therefore **schema-invalid to a v0.1 verifier — rejected whole, not ignored.** The direction of
  that failure is fail-closed and so it is safe; the consequence is not acceptable. Rejection is a
  compatibility break rather than graceful degradation: it would make a publisher of this axis
  invalid to every existing consumer at once.

- **The bridge.** `origination` rides in the v0.1 `extensions` container under the new namespace —
  the forward-compatible escape hatch v0.1 already defines, whose unrecognised terms a consumer MUST
  ignore. A v0.1 consumer validates the document and reaches a determination rather than rejecting
  it.

- **⚠ This axis is NOT ignore-safe on its own, and that is why O-4 is mandatory rather than
  advisory.** The evidence pointer is ignore-safe by construction: because evidence changes no
  verdict, a consumer that ignores it reaches the *identical* determination. Origination is
  different in kind, because **it can feed a clearance determination** — a declared-derived work's
  rights chain runs through its sources. A consumer that ignored the block while the core booleans
  still read `true` would **over-grant**, in exactly the way ignoring an authority gate would. O-4 is
  what closes that gap: it requires the consequence to be expressed in the v0.1-visible
  `clearance.commercialReproduction.permitted` and `clearance.derivatives.permitted`, so a consumer
  that has never heard of this axis still reads the safe answer off fields it already understands.
  **The bridge alone would not be sufficient here; the bridge and O-4 together are.** This is the
  practical significance of the section 2 argument that origination, unlike designation, legitimately
  feeds a clearance determination — it also determines what compatibility costs.

- **The bridge MUST NOT be used to carry a gate the v0.1 body contradicts.** A manifest whose
  extension declares derivation with an unresolved source right while the core `clearance` booleans
  still read `true` is inconsistent under O-4 and MUST be rejected, never shipped. The bridge exists
  so that older consumers stay correct — not so that a restriction can be filed where they cannot
  see it.

- **A declaration of `original-creation` grants nothing by itself**, so for that assertion the
  ignore-failure costs a consumer information, never safety.

## 8. Open questions

- **Q-O1.** Version partition (with the roadmap sign-off): this axis, the AI-disclosure vocabulary,
  and the status/withdrawal layer are three related pieces the partition should sequence together —
  the second and third are already pending there.
- **Q-O2.** Style imitation versus derivation: a work "in the manner of" an artist without using
  any existing work's bytes or composition is not derivation in this axis's sense, and the standard
  does not attempt to encode where homage ends — that is a human and legal judgment. Stated here so
  nobody reads the axis as claiming otherwise.
- **Q-O3.** Whether `sourceRight: "licensed"` should eventually require a resolvable `rightRef` at
  an attested tier (a licence you can point to), or whether that over-burdens honest small makers.
  The same question applies to `"permission-granted"`, which is equally unverifiable from the
  document alone and should be decided together with it rather than raised separately later.
- **Q-O4.** The incentive shape of an honest declaration, stated openly because implementers
  otherwise meet it late. Under O-2 absence is not a finding, and under O-4 declaring a source right
  of `unknown` closes commercial clearance — so a maker with a genuinely unresolved chain is, on the
  document alone, better served by omitting the block than by completing it honestly. This is not a
  defect the schema can fix: the standard cannot compel a declaration it also refuses to verify, and
  a penalty for honesty is the price of the composition rule that makes O-4 meaningful. The control
  is the one named in section 6 — a platform that requires the declaration at intake, where an
  omission is visible *as* an omission rather than as silence — and the recorded original-creation
  declaration carries its own value, so the honest path is not merely altruistic. Any future move to
  make `unknown` less costly MUST NOT become a route for laundering an unresolved chain into a clean
  one.
