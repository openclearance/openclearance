# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately via [GitHub Security Advisories](https://github.com/openclearance/openclearance/security/advisories/new). Do not open a public issue. If you cannot use GitHub Security Advisories, email **contact@openclearance.org** with "openclearance security" in the subject.

You can expect an acknowledgement within 7 days. Confirmed issues will be patched on the latest v0.x release line; older lines are not maintained.

## Scope

This repository holds the Clearance Manifest **specification** and the openclearance.org site, not a production rights engine. In scope are the normative spec prose, the JSON Schemas, the JSON-LD context, the determination-rule registry, the vocabulary, the conformance examples, and any reference tooling published here.

The standard's strongest guarantees are about **fail-closed determination**, **schema correctness**, and **integrity-envelope soundness**. Reports in these areas are highest priority.

## What counts as a vulnerability here

- **A path that lets a non-cleared work present as cleared.** This is the standard's spine and the most serious class of report. If spec language, a schema, the context, or a rule definition could cause a missing, ambiguous, or non-affirmative rights signal to resolve to anything other than a deny, that is a P0. A false clear is a critical defect; a false deny is tolerable by design.
- **Schema permits a document the spec prose forbids.** If `clearance-manifest.schema.json`, `tier0-envelope.schema.json`, or `advisory-entry.schema.json` accept a document the spec body explicitly rules out, that is a P0. The schemas are normative and conformant implementations rely on them.
- **Schema rejects a document the spec prose permits.** The inverse (a valid manifest or envelope that the published schemas reject) is equally in scope. Either direction creates implementation divergence. Note specifically that a structurally valid manifest carrying an *unrecognised* `basis.rule` MUST validate (it yields an advisory, not a rejection); a schema that rejects it is a bug.
- **Integrity-envelope unsoundness.** Spec language or a schema that lets two conforming verifiers disagree on whether a Tier-0 envelope's `integrity.hash` matches its `payload`, or that admits a hashing input other than the exact UTF-8 bytes of the `payload` string. The Tier-0 envelope is byte-exact precisely to remove the canonicalization attack surface; any reintroduction of that surface is in scope. So is any ambiguity that would let a verifier attribute authenticity to a Tier-0 (`UNVERIFIED_SIGNAL`) manifest.
- **JSON-LD context drift.** A term whose JSON Schema, `context.jsonld` mapping, and prose definition disagree, where the disagreement could mislead a consumer building on the semantic IRIs.
- **Ambiguity that enables forgery or audit-defeat.** Spec language that lets two implementations disagree on a rights-relevant claim for the same work, or that weakens the auditable `verification` / `basis` trail.

## Out of scope

- Bugs in third-party or reference producers and verifiers (for example, the open-museum-mcp engine). Report those to that implementation's own maintainers; this repository maintains only the specification. A rights-gate bypass in a *producer* is a vulnerability in that producer.
- Suggestions to add new rules, fields, vocabulary terms, or clearance facets. Those are spec proposals, not vulnerabilities; see [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`GOVERNANCE.md`](GOVERNANCE.md).
- Cosmetic issues in spec prose or the site, broken links, or typos. Open an ordinary issue.

## Disclosure

Once a fix ships, the advisory will be published with credit to the reporter unless you ask otherwise. CVE assignment is via GitHub.
