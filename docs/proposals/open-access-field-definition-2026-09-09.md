# Spec clarification — What `imageOpenAccess` and `metadataOpenAccess` mean

**Date:** 2026-09-09 · **Type:** definition of an existing published field · **Behaviour change:** none

---

## 1. The defect

`rights.imageOpenAccess` and `rights.metadataOpenAccess` are **required** fields in the published
manifest schema, and **neither is defined anywhere in the standard.**

- In the schema they are bare booleans — `{ "type": "boolean" }` — in a block where the sibling
  `statement` carries a description and `confidence` carries an enumerated value set. The two
  open-access fields carry **neither**: no description, and no constraint beyond the type.
- In the JSON-LD context they have a term IRI and a datatype, and nothing else.
- In the spec prose they are not mentioned.

So every consumer supplies its own reading, and the only guidance available is the field name. That
is the worst possible guidance here, because **"open access" is a sector term of art that most often
means *openly licensed for reuse*** — while the source signals these fields are commonly derived
from mean something narrower, and sometimes something else entirely.

A source may publish an image permission that says *this image may be displayed, at any size* while
saying nothing at all about licensing, and carry its reuse terms in an entirely separate field. A
manifest that renders such a permission as `imageOpenAccess: true` is not wrong — but a consumer
reading the field name as a licence has been given no way to know that.

**The risk is precise, and it is not that the emitting implementation is wrong: it is that the
standard publishes a field whose name invites a consumer to conclude more than the field asserts,
with nothing in the specification to stop them.**

## 2. The definition

> **`rights.imageOpenAccess`** — whether the source makes the image **available**, without access
> restriction, as the source itself declares availability. It is an **availability signal, not a
> rights determination**. It does not assert that the image is openly licensed, that it may be
> reproduced, or that it may be reused in any way.
>
> **`rights.metadataOpenAccess`** — the same, for the record's descriptive metadata rather than its
> image. **See §3.1: this field's value is determined by the accept/deny outcome the clearance facets
> already carry, so its disposition is an open question rather than a settled definition.**
>
> **The permission questions are answered by `clearance`**, whose facets each carry a `basis` naming
> the rule, its inputs and its reasoning. A consumer determining whether a work may be reproduced,
> adapted, or sold **MUST** read `clearance`, and **MUST NOT** derive that determination from either
> open-access field.
>
> Each field is derived from whatever signal its source publishes about availability. Because
> sources differ in what they publish and in what they mean by it, the value is **only as specific
> as its source's own declaration**, and the manifest's `verification.determinationSource` records
> which field it was read from.

## 3. Why availability, and not permission

**The decisive argument is redundancy.** If `imageOpenAccess` meant *cleared for reuse*, it would
duplicate `clearance.commercialReproduction` — which already carries that answer, with a rule id,
its inputs, and a written summary.

A second boolean asserting the same permission with **no basis** is not merely redundant; it is
**unaccountable by construction**. The architecture of this manifest is that every permission
carries its reasoning, so that a determination can be audited rather than trusted. A bare boolean
granting a permission is the one shape the design does not allow anywhere else, and reading these
fields as permissions would introduce exactly that shape into the middle of the rights block.

The availability reading also has the merit of making the fields *useful and distinct*: whether an
image can be obtained at all is a real question, separate from whether it may be reused, and one the
clearance facets do not answer.

**This definition changes no behaviour.** It states what the field already means, and it makes
existing implementations correct as written rather than requiring any of them to change.

### 3.1 `metadataOpenAccess` carries no independent information, which is §3's argument again

The availability definition holds for the image field and **does not do useful work for the metadata
field**, for a reason worth stating rather than smoothing over.

An image can be unavailable while its record is retrievable — a source may publish a record and
withhold, restrict, or forbid the display of its image — and the field then carries real
information. In the reference implementation the image field genuinely varies among accepted
records: it is set `true` in most source adapters, `false` in two, and in one case **computed from
the source's own per-image rights data** rather than fixed at all. That computed case is the
asymmetry in live form: for one source, a record whose descriptive metadata is openly dedicated but
whose image carries its own usage conditions is accepted **as open metadata with the image field
`false`**, and the restricted image is then withheld. Metadata openness and image openness come
apart there, in the reference implementation, on real records.

**The metadata field has no equivalent variation.** Across the accept path it is `true` for every
record from every source; it is `false` only on the **deny** path — where a manifest is still
produced, carrying a total denial. So the field is **exactly collinear with the accept/deny outcome**:
`true` on every accepted record, `false` on every denied one.

**That is not a second observation. It is §3's redundancy argument reaching the metadata field.** The
accept/deny outcome is already carried by `clearance`, whose facets state it with a rule id, its
inputs and a written summary. `metadataOpenAccess` restates that same outcome as **a bare boolean
with no basis** — the one shape §3 establishes the design does not permit anywhere else. The field
does not need a better definition so much as it needs a reason to exist alongside the facets that
already answer it.

**Two dispositions are available and this document does not choose between them:**

- **Deprecate it.** A field whose value is a function of another part of the same document adds no
  information to a rights block, and the versioning policy already provides for deprecation without
  removal inside a major version.
- **Give it an independent meaning** — that the source publishes the descriptive metadata under an
  open licence or dedication. This would be a licensing claim rather than an availability one, and it
  is substantive: sources differ, and some publish reuse terms for metadata and not for images, or
  the reverse. It cannot simply be declared, though — see §3.2.

### 3.2 The underlying obstacle: there is no way to say "the source does not state this"

If `metadataOpenAccess` were redefined as a licensing claim, a producer whose source publishes **no
metadata-reuse terms at all** would have to assert either `true` or `false`. Both claim more than
the source said: `true` invents a grant, `false` invents a restriction, and the standard treats
inventing a restriction as the mirror-image error of inventing a grant, not the safe alternative.

**A required boolean cannot express "not established".** Wherever the absence of a source statement
is itself the finding, absence must be sayable — and here it is not. That is the real obstacle to
making this field mean something, and it belongs to the version decision rather than to any
individual producer.

**One consequence today, which needs no version decision:** because the value is determined by the
accept/deny outcome (§3.1), **a producer must not derive it from a source signal that concerns
something else.** Doing so cannot make the value more correct — it is `true` either way for a record
being accepted — and it creates the false impression that the value was substantiated. A value that
follows from the outcome should be emitted as what it is, not dressed in a source field that does
not determine it.

## 4. A general rule this makes explicit

**A permission to access or display material is not a permission to reuse it, and the standard MUST
NOT let one be promoted into the other.** Availability and licensing correlate strongly and are not
the same fact; where a source states them in different fields, a manifest must keep them in
different fields too. This is the same boundary the standard applies to delivery conditions
generally: what can be fetched, and on what terms it may be used, are separate questions, and the
correlation between them is not evidence.

## 5. Conformance

Two checks follow, both mechanical:

1. A conforming consumer **MUST NOT** treat either open-access field as a reuse permission. A
   determination of commercial reproduction, derivative use, or attribution that cites an
   open-access field in its `basis.inputs` is **non-conforming**.
2. A manifest carrying `imageOpenAccess: true` together with clearance facets reading `false` is
   **valid, and its combination is not a contradiction** — it states that the image is available and
   that its reuse is not cleared. A vector should assert this explicitly, because the pairing looks
   like an inconsistency to a reader holding the wrong definition, and an implementation that
   "corrects" it would introduce the error this clarification exists to prevent.

## 6. Where this can be published — and a structural finding

**This clarification cannot be added to the v0.1 artifacts, and the reason is worth recording
because it is larger than this field.**

`VERSIONING.md` defines a **PATCH** release as being precisely for *"clarifications, new examples,
additive OPTIONAL fields, and other backward-compatible changes that no conforming consumer needs to
react to."* This document is exactly that: the PATCH lane is where it belongs.

**That lane cannot be reached.** Three published commitments close it:

1. **In-place editing is forbidden.** *"Once a version is published … We do not edit a published
   version in place. Corrections and additions ship as a new version."* Adding a `description` to
   the published schema would change the bytes served at a permanent URL.
2. **There is no URL for a patch.** Published artifacts are served under `/v0.1/`, a MINOR-level
   path. No `/v0.1.1/` exists in the scheme.
3. **There is no document value for a patch.** `specVersion` is `{ "const": "0.1" }`, so a document
   cannot declare `0.1.1` even if one were published.

So the standard **defines a mechanism for clarifications and provides no path to publish one.** The
PATCH lane is specified and unreachable, and this is the first clarification to need it.

**Three options exist and the choice is a governance decision, not an editorial one:**

- **Carry it in the next MINOR line**, where a new versioned directory exists anyway. The
  clarification reaches readers of that version and never reaches readers of the current one — who
  are the readers with the ambiguity.
- **Publish it as non-versioned documentation** on the specification site: a clarifications page
  that binds no artifact and changes no published byte. This reaches current readers, and its
  weakness is that a clarification which is not in the schema is not seen by anyone reading only the
  schema.
- **Give the PATCH lane a real path** — a `/v0.1.1/` directory, or an explicit rule that a published
  version's non-normative annotations may change while its normative content may not. This is the
  general fix, it makes the existing PATCH definition honest, and it is the largest of the three.

**Until that is settled, this document is where the definition lives**, which is a holding position
and not an answer: a reader of the schema does not read the proposals directory.

## 7. Not addressed here

**The field names.** `imageOpenAccess` meaning *available* rather than *openly licensed* will be
misread by implementers who never reach this page, and a definition does not cure a name. Renaming a
published field is a breaking change to something other parties may already consume, so it belongs
with the version-partition decision and is deliberately left open.

**The disposition of `metadataOpenAccess`** (§3.1) — deprecation, or redefinition with a way to
express an unestablished state (§3.2). Both are version decisions. What this document settles is
that the field as it stands adds nothing the clearance facets do not already carry, and that no
producer-level change can alter that.
