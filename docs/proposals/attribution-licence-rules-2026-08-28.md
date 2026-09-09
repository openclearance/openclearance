# Registry addition — Baseline rules for the attribution licence (CC BY 4.0)

**Date:** 2026-08-28 · **Target:** rule registry (open set; no schema change) · v0.1 FROZEN

---

## 1. What this widens

Every rule in the published registry covers a licence that imposes **no condition on reuse**: CC0
and the Public Domain Mark grant everything and waive attribution. Everything else — including the
single most common licence on open-access cultural material after CC0 — resolves to
`default-deny`: every facet `false`, `confidence: low`.

That is honest, and it is a real limit. A work under an attribution licence **is** cleared for
commercial reproduction and for derivatives; it simply carries a condition. Declining to model the
condition means declining to clear the work at all, so the standard currently under-reports the
rights position of a large part of the corpus it exists to describe. Over-restriction is not the
safe side — it is the mirror-image error, and it is the one being made here.

The registry gives its own reason for the omission: these licences need `attributionRequired: true`
**with a specific credit string**, and a `shareAlikeRequired` facet, neither modelled by the v0.1
truth tables. **That reason now holds for only one of the two members.** The credit string exists,
and the requirement that it be present exactly when the obligation is asserted is established in
the artist-direct-grant proposal. The share-alike member's blocker is untouched and is **not** a
registry matter at all — see §8.

**This proposal covers the attribution licence only, and only version 4.0.**

## 2. What the licence actually requires

Quoted from the licence text rather than summarised, because the structure of the obligation is
what determines the design — and it is not the flat "give credit" it is usually read as.

**Conditional — required only "if it is supplied by the Licensor with the Licensed Material"**
(§3(a)(1)(A)): identification of the creator(s) and any others designated to receive attribution;
a copyright notice; a notice referring to the licence; a notice referring to the disclaimer of
warranties; and a URI or hyperlink to the material.

**Unconditional** (§3(a)(1)(B) and (C)): indicate if you modified the material and retain an
indication of previous modifications; and **"indicate the Licensed Material is licensed under this
Public License, and include the text of, or the URI or hyperlink to, this Public License."**

**Satisfiable by pointer** (§3(a)(2)): the conditions may be met "in any reasonable manner based on
the medium, means, and context", and the licence gives its own example — "providing a URI or
hyperlink to a resource that includes the required information."

**Revocable in part** (§3(a)(3)): "If requested by the Licensor, You must remove any of the
information required by Section 3(a)(1)(A)."

Three consequences follow, and each changes a rule below:

1. **Exactly one element is unconditionally required, and it is the licence identification.** Not
   the creator. A design that treats "credit the artist" as the core obligation models the
   conditional part and omits the mandatory one.
2. **The manifest cannot know whether the conditional elements were supplied**, so it can carry
   what it has and never assert that attribution has been *satisfied*.
3. **A frozen credit string is a liability**, because §3(a)(3) lets a licensor require removal of
   exactly the material such a string bakes in.

## 3. Design principles this obeys

| Principle | How this obeys it |
|---|---|
| **Fail-closed, never a partial guess** | Rules are scoped to one licence version. An unrecognised or differently-versioned value still resolves to `default-deny`. |
| **Honesty is the product** | The manifest carries the elements and asserts the obligation. It never certifies that a reuser's attribution complies. |
| **Guard both directions** | Under-reporting a granted right is as much a defect as over-granting one. This closes the under-reporting direction for a large class of works. |
| **Additive** | Registry ids are an open set; no schema change, no published URI moves. |

## 4. Normative rules

- **B-1 — The licence identification is mandatory, and it is machine-checkable.** §3(a)(1)(C) is
  not conditioned on what the licensor supplied. A manifest whose determination cites an
  attribution-licence rule MUST carry the licence URI in `rights.statement`. **This is the element
  a free-text credit string cannot guarantee** — a citation line naming artist, title and museum,
  with no licence identified, satisfies a "credit is present" test and fails the licence's one
  unconditional condition.

- **B-2 — The manifest carries elements; it never asserts compliance.** The conditional elements
  are required only where the licensor supplied them, which is a fact about the source, not about
  the work. The manifest therefore records what it holds and asserts that the obligation **exists**.
  No field may state that attribution has been satisfied, and no surface may present it that way.
  Whether a given reuse complies is the reuser's determination, on facts the manifest does not have.

- **B-3 — Where a required notice has no field, the source pointer is what discharges it, and it
  therefore becomes required.** Two of the conditional elements — a copyright notice and a
  disclaimer notice — have **no home in the manifest**. §3(a)(2) supplies the answer the standard
  should use rather than inventing one: the conditions may be satisfied by a URI to a resource
  containing the required information. So a determination citing an attribution-licence rule MUST
  carry a source URI to the object's own page. Without it, a manifest asserting the obligation
  provides no route by which a consumer could discharge the part it cannot carry.

- **B-4 — Attribution is carried as structured elements, with the rendered strings alongside, and
  the structure is authoritative.** The elements live in fields that already exist: creator in
  `work.artist.name`, title in `work.title`, the material's URI in the source URLs, the licence in
  `rights.statement`. `citation` carries the human-renderable form. Where they disagree the
  structured fields govern, because a rendered string is an interpretation of them.

- **B-5 — A baked credit string MUST NOT be treated as the durable record.** §3(a)(3) permits a
  licensor to require removal of the supplied attribution information. A consumer holding a frozen
  string cannot honour that; one resolving the structured elements at use time can. This is the
  same limitation the standard already states about withdrawal generally: the record is corrected
  at the source and consumers re-fetch, and the standard MUST NOT imply a push mechanism it does
  not have.

- **B-6 — An absent creator is a legitimate state and MUST NOT fail the determination closed.**
  §3(a)(1)(A)(i) applies only where the licensor supplied a creator identification; an anonymous or
  workshop attribution is not a missing field, it is the state of the record.
  `work.artist.attributionType` already distinguishes these, so absence is **distinguishable from
  omission** and needs no new signal. A rule set that required a named creator would deny clearance
  to anonymous works the licence plainly grants.

- **B-7 — Modification indication is the reuser's obligation, not the manifest's — with one
  exception.** §3(a)(1)(B) binds whoever shares the material. The manifest is not the sharer and
  cannot discharge it. **But where a manifest itself describes a modified rendition of the licensed
  material, it MUST indicate that**, because it is then supplying the very material whose
  modification must be indicated.

- **B-8 — Rules are scoped to one licence version, and other versions are not assumed
  equivalent.** The ids in §5 name version 4.0. Earlier versions differ in ways that bear on these
  rules — including the removal-request clause B-5 rests on. An unversioned "attribution licence"
  rule would invite a 4.0 truth table to be applied to a 3.0 work, which is a partial guess of
  exactly the kind the fail-closed default exists to refuse. Other versions get their own rules,
  or they get `default-deny`.

## 5. Registry additions

| Rule id | Asserts | Keys on (`inputs`) | Outcome |
|---|---|---|---|
| `cc-by-4-0-grants-commercial` | `clearance.commercialReproduction.permitted` | the licence value, carried verbatim | `true` |
| `cc-by-4-0-grants-derivatives` | `clearance.derivatives.permitted` | the licence value, carried verbatim | `true` |
| `cc-by-4-0-requires-attribution` | `clearance.attributionRequired.required` | the licence value, carried verbatim | `true` |

Emitting any of the three obliges the other two: a manifest may not grant the uses without
asserting the condition they are granted under. `confidence` follows the source signal as it does
for every other rule; a licence value the producer could not resolve to a specific version remains
`default-deny` under B-8.

**No schema change.** Every field these rules require is already published, which is what makes
this a registry proposal — the test being *what does the shipped schema already carry*, not what
the change is called.

## 6. Conformance vectors required

1. An attribution-licensed record with licence URI, source URI and citation present ⇒ **valid**;
   commercial and derivative facets `true`, attribution required `true`.
2. **Negative (B-1):** a determination citing an attribution-licence rule with `rights.statement`
   absent or carrying no licence URI ⇒ REJECTED.
3. **Negative (B-3):** the same with no source URI ⇒ REJECTED.
4. **Negative (A-4 composition):** attribution asserted with `citation` absent ⇒ REJECTED.
5. **(B-6)** An anonymous or workshop attribution with no creator name ⇒ **valid**, facets
   unchanged. The vector that proves the rules do not deny what the licence grants.
6. **Negative (B-8):** an attribution-licence value the producer could not resolve to version 4.0
   ⇒ `default-deny`, not a 4.0 determination.
7. **(B-4)** A record whose citation string and structured fields disagree ⇒ the structured fields
   govern; the vector fixes precedence rather than leaving it to implementations.
8. **(B-2)** No field anywhere in a conforming manifest asserts that attribution has been
   satisfied ⇒ schema-invalid by construction if one is introduced.

## 7. Versioning & v0.1-safe bridge

**No bridge is needed, and the reason is the same test as §5:** this adds no schema surface. Rule
ids live in the registry, which is an open set outside the schema, and every field the rules require
is published in v0.1.

Rule-id recognition already degrades correctly: a verifier that does not recognise these ids emits
a **non-fatal advisory and MUST NOT reject**. Such a consumer reads `commercialReproduction: true`,
`derivatives: true` and `attributionRequired: true` off facets it already understands, with the
credit strings in `citation` and the licence in `rights.statement`. **It can comply with the licence
without recognising the rule that produced the determination** — the condition rides in a required
v0.1 facet, not in the rule id. That is the whole reason this element is safe where a new facet
would not be.

## 8. Share-alike: specified, not proposed

Recorded so it is ready when the version partition is settled, rather than left as "blocked".

- **It is not a registry addition.** `clearance` is closed and carries exactly three facets; a
  reciprocal-licensing obligation has nowhere to live. `shareAlikeRequired` is **new schema
  surface**, so it is a version-partition question and cannot ride in a rule-registry proposal.
- **It is in the unsafe class for compatibility.** A consumer that ignored the obligation would
  take a derivative without applying the reciprocal terms the obligation exists to impose — it
  over-grants. So the facet needs both halves of the bridge pattern: the block rides in the
  extensions container, **and** its consequence is expressed where an existing consumer can see it.
- **The v0.1-visible consequence is `derivatives.permitted: false`.** Until a consumer understands
  share-alike, derivatives are not granted to it — the true position (permitted under reciprocal
  terms) rides in the extension for consumers that do. That is fail-closed in the correct direction
  and it costs only the capability the consumer could not have exercised safely anyway.
- **The commercial facet is unaffected**, since share-alike conditions the licensing of adaptations,
  not reproduction.

## 9. Open questions

- **Q-B1.** Whether the copyright and disclaimer notices should eventually be carried directly
  rather than discharged by pointer (B-3). The pointer route is licence-sanctioned and needs no new
  surface; carrying them would be more robust against a source page changing, and is a
  next-version question.
- **Q-B2.** Which other versions of the attribution licence warrant their own rules, and in what
  order. Driven by what the corpus actually contains rather than by completeness.
- **Q-B3.** The registry's own closing sentence states that adding these licences is "a future
  registry PR, not a schema change". That is correct for this proposal and **incorrect for
  share-alike**, by §8. It is published, frozen prose. Whether a shipped version can carry errata
  at all is a governance question this proposal raises and does not answer.
