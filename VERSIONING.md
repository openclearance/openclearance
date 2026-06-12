# Versioning and URL stability

This document is the public promise behind the Clearance Manifest's schema and
context URLs. It explains how versions are numbered, what is guaranteed to stay
stable, and how the canonical "latest" pointer works.

## Semantic versioning at the spec level

Clearance Manifest versions are `MAJOR.MINOR.PATCH`:

- **PATCH** (e.g. v0.1.0 to v0.1.1): clarifications, new examples, additive
  OPTIONAL fields, and other backward-compatible changes that no conforming
  consumer needs to react to.
- **MINOR** (e.g. a future `v0.x`): additive, backward-compatible vocabulary or
  field changes: new optional fields and expanded recommended-rule baselines
  that older validators can safely ignore. Requires a real use case and a public
  review window.
- **MAJOR** (e.g. an eventual `v1.0`): breaking changes. Requires demonstrated
  implementation experience, broad review, and a migration story.

A version's schema validates documents that declare that version (`specVersion`),
but the `@context` IRI (not `specVersion`) is the normative authority for term
expansion.

## Permanent, immutable, stable URLs

Every published version is served at two permanent bases, both of which stay
live indefinitely:

```
https://w3id.org/clearance-manifest/v0.1/...   ← canonical (durable; domain-independent)
https://openclearance.org/v0.1/...              ← original (still served; redirects in place)
```

The **canonical** base is the w3id.org namespace. The `$id`s in the JSON Schemas and
the IRI used in the JSON-LD `@context` array reference the w3id.org base. The
w3id.org service redirects to `openclearance.org` for content delivery (see
`docs/w3id-registration.md`). This two-layer approach ensures that if the
`openclearance.org` domain ever lapses, the canonical identifiers continue to resolve
by updating only the w3id.org redirect entry — without breaking any emitted manifest
or validator pinned to the canonical IRI.

The `openclearance.org/v0.1/` paths remain live and are never removed; content at
those paths never changes. Existing tooling that references the old base continues to
work.

Once a version is published:

- Its schema `$id`s, JSON-LD context, rule-registry ids, and document shapes are
  **frozen**. We do not edit a published version in place. Corrections and
  additions ship as a new version.
- Its URLs (both bases) stay live indefinitely. Breaking a published URL would break
  every document, validator, and toolchain pinned to it, so we treat it as a trust
  violation, not a maintenance decision.

(The misspelling `clearence.org`, registered first by accident, is kept only as a
301 redirect typo-trap and is never a canonical base.)

## Canonical = latest, with no redirects

- **The documentation defaults to the newest version.** "Read the spec" points at
  the current line (today, v0.1).
- **Older version pages stay published** and link forward to the current line.
  They are not removed and are supported indefinitely.
- **No redirects from old to new.** A request for `v0.1/...` must keep resolving
  to v0.1, because version-pinned tooling depends on it.

## Deprecation

Fields and recommended-rule ids may be deprecated but are not removed within a
major version. Deprecations are called out in the spec prose and in JSON Schema
`description` fields, with the version in which removal is planned.

## Integrity-derivation stability

The Tier-0 integrity hash is **byte-exact**: it is the SHA-256 of the exact UTF-8
bytes of the `payload` string carried in the envelope (no canonicalization).
There is therefore no canonicalization step to version. Any future change to how
the hashed bytes are derived would change the integrity contract, so it MUST be
introduced with an explicit envelope-version marker or deferred to a major bump,
never by silently changing the derivation. (Pre-publication, v0.1 replaced an
earlier RFC 8785 / JCS canonicalization with this byte-exact form; since v0.1 is
not yet served and has no adopters, the change was made in place.)

## Stability commitment

- v0.1 is released and frozen; it remains valid and served indefinitely.
- Within a major version, minor and patch releases are backward-compatible.
- Anything breaking ships only under a new major version, with migration guidance.
