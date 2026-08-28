# Spec addition — Artist-direct grant, and the intake profile for a self-represented maker

**Date:** 2026-08-28 · **Target version:** v0.2 registry additions + a documented intake profile
(no schema change; v0.1 FROZEN)

---

## 1. The problem this closes

Every determination rule in the published registry keys on a **licence signal attached to a record
fetched from an institution**: `cc0-grants-commercial` keys on `license.type = CC0`, and everything
that fails to match a permissive row resolves to `default-deny`. That is the correct shape for the
corpus the standard was first built against — open-access records published by museums.

A **living artist publishing their own work** does not arrive that way. There is no upstream
licence field to key on, because there is no upstream: the maker *is* the rights source. Today such
a record has three bad options — carry no positive basis and fail closed, borrow a licence rule
whose stated input is a field the record does not have, or emit a rule id no verifier recognises.
The first denies a grant the maker actually made; the second misstates the basis; the third yields
an `unrecognised_rule` advisory on every record.

This proposal closes the gap with **no schema change**: registry rule ids for a grant that rests on
the maker's own declaration, the composition rules that keep such a grant honest, and a documented
intake profile so that a self-represented maker's manifest is well-formed rather than improvised
per record.

It also surfaces something worth stating plainly: **v0.1's vocabulary encodes an
institutional-source model in at least two places**, and artist-direct intake is the first real
consumer that does not fit (§5.1, §5.2). Neither is a defect in a frozen version — but both are
now known, and both belong in the next version's scope rather than being papered over per record.

## 2. Design principles this obeys (nothing new invented)

| Principle | How this element honours it |
|---|---|
| **Declaration, not lookup** | The grant records that the maker *declared* it. No authorship check, no title search, no registry call. The standard governs identity, not truth. |
| **Fail-closed** | Absent grant, absent authority, or a conflict with the authority axis ⇒ the granting facets read `false`. |
| **Honesty is the product** | A grant may not assert a right the maker has assigned elsewhere, and may not impose an obligation a consumer cannot discharge. |
| **Additive** | Registry ids are an open set that grows by proposal; no schema change, no published URI moves. |
| **The symmetry of dishonesty** | Guarded both ways: asserting a right the signer does not hold, and denying one the maker actually granted. Over-restriction is not the safe side. |

## 3. Normative rules

- **A-1 — The grant is a declaration, and the standard never certifies entitlement.** An
  artist-direct grant records that the maker declared they hold the right and grant it. The
  standard defines **no authorship verification, no title check, and no certified-holder state**,
  and will not: there is no oracle for authorship, and a registry entry is not one either. A
  surface may honestly present *"granted directly by the maker, on the record"*; it MUST NOT
  present *"verified rights holder"*. The value of the declaration is its accountability — a false
  grant is a provable, attributable, and at an attested tier signed misrepresentation.

- **A-2 — A direct grant needs its own rule ids, and the split from licensed works is by BASIS.**
  Where a maker applies a **published public licence** to the work, that licence's own rule ids
  apply and the record is an ordinary licensed record that happens to originate with an artist —
  nothing here is needed. Where the maker grants **directly, on terms not expressed as a published
  licence**, the basis is the declaration itself and the rule ids in §4 apply. The distinction is
  not cosmetic: the two bases fail differently, and a consumer auditing why a facet reads `true`
  must be able to tell "this licence's truth table" from "this maker said so".

- **A-3 — A direct grant composes with the authority axis and fails closed on conflict.** A grant
  of `clearance.commercialReproduction.permitted` or `clearance.derivatives.permitted` on the
  maker's own authority, in a manifest whose authority block records that category as assigned to a
  collecting society, is a **contradiction** and MUST be rejected. Both granting facets are named
  because either alone conveys a right that may have been assigned away.

- **A-4 — A required credit MUST be dischargeable.** Where
  `clearance.attributionRequired.required` reads `true`, `citation` MUST be present. A manifest
  that requires attribution while carrying no credit strings imposes a duty it does not let a
  consumer perform — an obligation with no way to comply is not a rights term, it is a trap. This
  is the general form of the gap the registry names as its stated reason for holding the
  attribution-bearing licence family out of the baseline (§4.1).

- **A-5 — Commerce requires an attested tier.** A direct grant relied upon for commercial use MUST
  be carried at an attested tier. At the integrity-only tier the declaration is an unverified
  signal bound to no accountable identity, and the whole value of a direct grant (A-1) is that a
  false one is attributable. The commercial gate is not relaxed for self-represented makers — it is
  the case that most needs it, because no institution stands behind the record.

- **A-6 — Absence is unknown, and unknown fails closed — but absence MUST be distinguishable from
  a considered "nothing assigned".** No grant and no authority declaration ⇒ both granting facets
  read `false`. That is not a finding against the maker; it is the absence of a basis. A maker who
  has assigned nothing to anyone states that positively through the authority axis's existing
  "none" value rather than by silence, so that "retained everything" and "never asked" are
  different records rather than the same empty one.

- **A-7 — Withdrawal is named, never faked.** A living maker may withdraw a grant, and will do so
  far more often than a museum record changes its licence. The status and revocation layer is
  **pending and not part of this proposal**; until it ships, a manifest MUST NOT imply a
  self-revoking mechanism it does not have. A withdrawn grant is communicated by the record no
  longer being published and by consumers re-fetching — which is a real limitation and MUST be
  stated to makers at intake as such, not glossed. **This element makes the revocation layer more
  urgent, not less.**

- **A-8 — A grant over derived material composes fail-closed.** Where a manifest declares
  derivation from sources and any relied-on source right is unresolved, the granting facets read
  `false` regardless of the maker's direct grant. A maker cannot grant downstream what their own
  chain has not established upstream. This is the origination axis's composition rule; it is named
  here so that the two are read together.

- **A-9 — The record's origin MUST be stated honestly, never masqueraded.** A self-represented
  maker's record MUST NOT carry another institution's federation identifier in the source block.
  Borrowing an institution's code to satisfy a required field asserts an institutional provenance
  that does not exist, and it corrupts the federation identifier for every consumer that keys on
  it. The intake convention in §5.1 states what such a record carries instead.

## 4. Registry additions

Rule ids are a bare kebab-case token resolving under the registry's permanent URL, and the set is
open: adding these needs no schema change, and a verifier that does not recognise them emits a
non-fatal advisory rather than rejecting the document.

| Rule id | Asserts | Keys on (`inputs`) | Outcome |
|---|---|---|---|
| `artist-direct-grants-commercial` | `clearance.commercialReproduction.permitted` | the maker's declared grant of commercial reproduction, carried verbatim | `true` |
| `artist-direct-grants-derivatives` | `clearance.derivatives.permitted` | the maker's declared grant of derivative use, carried verbatim | `true` |
| `artist-direct-requires-attribution` | `clearance.attributionRequired.required` | the maker's declared credit requirement | `true` |

Two notes on shape, both deliberate:

- **These are the first registry rules whose `inputs` cite a declaration rather than a fetched
  field.** That is legitimate and it is not the evidence case: the declaration *is* the rights
  source here, not support for one. The distinction matters because evidence is barred from
  entering a determination's inputs, and a reader must not conclude the same bar applies to the
  grant itself.
- **`artist-direct-requires-attribution` is the registry's first rule that sets
  `attributionRequired` to `true`.** Every baseline attribution rule to date waives it. A rule that
  imposes an obligation is subject to A-4: it may only be emitted alongside a `citation`.

### 4.1 What this unblocks, flagged rather than folded

The registry states that the attribution-bearing licence family is held out of the baseline because
those licences need `attributionRequired: true` **with a specific credit string**, which the v0.1
truth tables do not model. The credit string exists — `citation` carries it — and A-4 makes it
mandatory exactly when the obligation is asserted. **That removes the stated blocker.** Adding
those licences is nonetheless a separate registry proposal with its own truth tables and vectors,
and is not folded here.

## 5. The intake profile

The minimum well-formed manifest for a self-represented maker. Everything below uses existing
fields; the profile is a documented convention, not new surface.

- **`work.artist.attributionType`** — `named`. A self-represented maker's record is by definition
  attributed to a named maker.
- **`rights.statement`** — the licence URI where the maker applied a published licence; otherwise
  `null`, with the declared terms carried in `rights.sourceApiValue` (see §5.2 for the tension this
  exposes).
- **`clearance`** — the three facets, each with a `basis` whose `rule` is a §4 id (direct grant) or
  the applicable licence's id, and whose `inputs` carry the declaration verbatim.
- **`citation`** — REQUIRED whenever `attributionRequired.required` is `true` (A-4). The maker
  supplies the credit line they want; the profile does not invent one for them.
- **The authority block** — required in practice. Its absence reads as unknown and fails
  reproduction closed (A-6), so a maker who has assigned nothing states that positively.
- **Tier** — attested wherever commerce is in scope (A-5).
- **Designation, evidence, origination** — optional, and each composes by its own rules.

### 5.1 The source field, and the honest convention

The source block requires a museum identifier, whose `code` is the federation identifier. A
self-represented maker has no museum. A-9 forbids borrowing one, so the profile fixes a **reserved
federation code** for records that originate with the maker through the intake surface, with the
maker's practice name and site carried in the accompanying name and URL fields.

This is honest as far as the field's meaning goes — the source block records **where the record
came from**, not where the object has been, and such a record genuinely came from the maker. It is
nonetheless awkward that the container is named `museum`, and this proposal does not pretend
otherwise: **the field name encodes an assumption that the corpus has now outgrown.** Generalising
the container is a next-version change, listed in §8.

### 5.2 The second institutional assumption

`rights.statement` is documented as taking `null` **on a deny** — "no positive open-rights
statement applies". A maker granting bespoke terms produces a record with a positive grant and no
standard URI, which is a *different* state wearing the same value. The profile's answer for now is
narrow and honest: **a bespoke direct grant carries its terms in `rights.sourceApiValue` and its
consequence in the `clearance` facets**, which are the fields a consumer actually reads, and does
not rely on `statement` to carry meaning it was not defined to carry. A positive-grant-without-URI
state belongs in the next version alongside §5.1.

## 6. Conformance vectors required

1. Direct grant, authority retained and declared as such, commercial and derivative use granted,
   attribution required with `citation` present ⇒ **valid**.
2. **Negative (A-4):** `attributionRequired.required: true` with `citation` absent ⇒ REJECTED.
3. **Negative (A-3):** a direct grant reading `true` on **either** `commercialReproduction` **or**
   `derivatives`, in a manifest whose authority block records that category as assigned to a
   collecting society ⇒ REJECTED. Both facets exercised separately.
4. **Negative (A-5):** a direct grant relied on for commercial use at the integrity-only tier ⇒
   not commerce-eligible.
5. **(A-6)** No grant and no authority declaration ⇒ document **valid**, both granting facets read
   `false`. Distinguished from vector 1 by the presence of a positive "nothing assigned"
   declaration there and its absence here.
6. **Negative (A-8):** declared derivation with an unresolved source right, and a direct grant
   asserting **either** granting facet `true` ⇒ REJECTED.
7. **Negative (A-9):** a maker-originated record carrying an existing institution's federation
   code ⇒ REJECTED.
8. **(A-2)** A maker applying a published licence ⇒ **valid** with that licence's rule ids, and the
   §4 ids absent. Guards against emitting both bases for one facet.

## 7. Versioning & v0.1-safe bridge

**This element needs no extensions bridge, and the reason is worth stating rather than leaving as
an apparent omission** — the two preceding proposals in this wave both required one.

- **It adds no schema surface.** Rule ids live in the registry, which is an open set outside the
  schema, and every field the profile uses is already published in v0.1. There is nothing to carry
  in the extensions container, so the bridge pattern does not apply.
- **Rule-id recognition already has a defined degradation, and it is the right one.** A verifier
  that does not recognise a §4 id emits a **non-fatal advisory and MUST NOT reject** the document.
  A consumer that has never heard of artist-direct grants still reads the correct booleans off the
  facets it already understands; what it loses is the ability to explain them. That is capability
  lost, not safety.
- **One thing does NOT degrade with the rest, and it is A-5.** The commercial-tier requirement is
  carried by the envelope tier, not by a clearance facet, so a consumer that reads only the
  booleans can act commercially on a grant that never met the tier bar. **The advisory path does
  not protect this rule**; it is enforced by the consumer checking the tier, as the commercial gate
  already requires for every other basis. Stated explicitly because the rest of this element
  degrades so cleanly that a reader could reasonably assume this part does too.
- **The authority block referenced by A-3 and A-6 carries its own bridge**, defined where that
  element is specified; nothing here changes it.

## 8. Open questions

- **Q-A1.** Generalising the source container beyond a museum identifier (§5.1), so a
  self-represented maker, an estate, a gallery or a foundation is a first-class origin rather than
  a reserved code inside a field named for institutions. Next-version scope; it moves a published
  field, so it is a version-partition question rather than an additive one.
- **Q-A2.** A positive-grant-with-no-standard-URI state for `rights.statement` (§5.2), decided
  together with Q-A1 since both are the same assumption surfacing in different fields.
- **Q-A3.** Withdrawal (A-7) — the pending status layer is the dependency, and this element makes
  it materially more urgent, because a living maker withdrawing a grant is an ordinary event rather
  than an exceptional one.
- **Q-A4.** Whether a direct grant should eventually be required to name the works it covers
  individually, or may stand as a practice-wide default applied at intake. The second is what makes
  onboarding tractable; the first is what makes a grant precise. Both are honest, and the choice
  should be made once rather than per implementation.
