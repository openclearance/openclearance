# Governance

This document describes how the Clearance Manifest standard evolves. The
standard is published at [openclearance.org](https://openclearance.org/).

## Current state

The Clearance Manifest has released v0.1, permanently published and frozen.
Pramod Prasanth maintains the standard as its initial steward. How governance
should broaden as adoption grows is deliberately an open question, addressed in
the next section.

## Open question: long-term governance model

The decision process described below (maintainer-stewarded, with public
discussion) is the **starting** model, not the settled one. How the Clearance
Manifest should be governed for the long term is intentionally left open, and we
want it decided through public input rather than declared up front.

Candidate models under consideration:

- **Maintainer-stewarded (current).** A single steward maintains the spec with
  open issues and public review windows. Lowest overhead and fastest to evolve;
  depends on a single steward's continuity.
- **Managed community specification.** A versioned core with a community process
  for extensions, profiles, and additions to the rule registry and vocabulary.
  Brings a structured contribution and review process while staying
  implementer-driven.
- **Formal standards body.** Submit the standard for formal standardisation.
  Maximum durability and weight; slower, more procedural, and less nimble for
  additive change.
- **Independent consortium or foundation.** A neutral multi-stakeholder body
  (cultural-heritage institutions, rights holders, reuse and print platforms,
  and tool vendors) holds the spec. Strong neutrality and shared ownership;
  requires a critical mass of committed members to stand up.

These models are not mutually exclusive over time: a common trajectory is
maintainer-stewarded, then managed community, then formal standardisation as
adoption deepens.

**We invite input from anyone with a stake in how rights-clearance evidence is
represented and governed:** institutions that make clearance determinations,
platforms that rely on them to gate reuse, and the developers building producers
and verifiers. The governance model is exactly where that voice matters.
Discussion happens in the pinned **"Long-term governance model"** issue in this
repository; that thread is the canonical record and will inform the decision.

## Principles

Clearance Manifest governance follows a small number of principles:

- **Stability over feature pace.** Once published, a versioned URL never changes.
  Documents conforming to v0.1 must remain valid against the v0.1 schemas and
  must keep expanding under the v0.1 context indefinitely. The URL-stability
  promise is spelled out in [`VERSIONING.md`](VERSIONING.md).
- **Fail-closed is non-negotiable.** A change that could let a non-cleared work
  present as cleared is rejected on sight. Missing, ambiguous, or
  non-affirmative rights signals must resolve to a deny. A false deny is
  tolerable; a false clear is a critical defect.
- **Compose, don't reinvent.** The standard binds existing standards through its
  JSON-LD context (Creative Commons and RightsStatements.org, schema.org and
  Dublin Core, W3C PROV, SHA-256 and C2PA). Proposals that reinvent
  cryptography, a rights vocabulary, or an integrity envelope that these already
  cover start from a high bar.
- **Forward compatibility is mandatory.** Implementations must not reject a
  document for an unknown `extensions` member, and must not reject a structurally
  valid manifest for an unrecognised `basis.rule`: the registry recognition is an
  advisory layer, never a schema gate.
- **Substance over presence.** Decisions to add or change fields, rules, or
  vocabulary require a real implementation use case, not theoretical
  completeness.
- **Open by default.** Discussions happen in public issues. Decisions are
  recorded with rationale.

## Decision process

For v0.1 and the near term, decisions are made by the maintainer with public
discussion in issues. As community contributors emerge, governance will move
toward consensus among maintainers, with explicit promotion criteria for new
maintainers.

## Change types

- **Patch (0.1.x):** Documentation clarifications, example corrections, and
  non-normative additions, including new entries to the determination-rule
  registry and new vocabulary glosses that do not change any document's meaning.
  Maintainer discretion.
- **Minor (0.x):** Additive changes preserving backward compatibility: new
  OPTIONAL payload fields, new clearance facets that older consumers safely
  ignore, and expanded recommended-rule baselines. Requires a proposed use case
  and a public review window (minimum 14 days).
- **Major (x.0):** Breaking changes, including any change to the Tier-0
  integrity derivation or the conceptual model. Requires demonstrated
  implementation experience, broad review, and a clear migration story. The
  integrity derivation in particular MUST NOT change silently: see
  [`VERSIONING.md`](VERSIONING.md).

## Adding payload fields

A proposal to add a field should include:

- The use case it serves.
- Whether it can live in the `extensions` escape hatch instead (the default
  answer should be "try extensions first").
- The validation rules and controlled vocabulary, if any.
- An example manifest.
- The JSON-LD mapping for `context.jsonld` if the term's semantics are not
  obvious from the field name.

## Adding clearance rules and vocabulary terms

The determination-rule registry (`/v0.1/rules`) is **open, not a closed enum**: a
`basis.rule` id that is not in the registry baseline is still a structurally
valid manifest and yields a non-fatal `unrecognised_rule` advisory, never a
schema rejection. Adding a recognised rule to the registry is therefore a patch
or minor change, not a breaking one.

A proposal to add a rule should include:

- The rule id (a bare kebab-case token resolving as a fragment under
  `/v0.1/rules`).
- The inputs it reads and the determination it justifies.
- Why an existing rule is insufficient.
- A worked example showing the rule in a `basis`.

Once a rule id is published under a version, its **meaning is frozen**. A
corrected or expanded meaning ships as a new rule id or under a new version, never
by editing a published id in place.

## Deprecation

Fields, clearance facets, and rule ids may be deprecated but are not removed
within a major version. Deprecation notices appear in the spec prose and in the
JSON Schema `description` fields, with the version in which removal is planned.

## Trademark and naming

"Clearance Manifest" and "openclearance" are not trademarked at this time. Tools
that produce or consume Clearance Manifests may state that they support the
Clearance Manifest standard.

## Out of scope for governance

The Clearance Manifest governance process does not define:

- Whether a specific rights determination is legally correct in a given
  jurisdiction. The standard defines the *shape and transport* of a
  determination, not its adjudication.
- The rights policy of any particular producer (which licenses an engine accepts,
  how strict its gate is).
- Validation methodology or quality benchmarks for any specific implementation.

These belong to implementations and to the authorities that make determinations,
not to the format.
