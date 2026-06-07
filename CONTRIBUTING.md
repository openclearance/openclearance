# Contributing to the Clearance Manifest standard

The Clearance Manifest is a small, deliberate specification. Contributions that strengthen the spec, sharpen the conformance check, or add recognised determination rules are welcome. See [`GOVERNANCE.md`](GOVERNANCE.md) for the decision process and change types. We are conservative about scope additions, and the fail-closed contract is non-negotiable: a change that could let a non-cleared work present as cleared will not be accepted.

This repository is both the normative spec and the static [openclearance.org](https://openclearance.org/) site that publishes it. The prose lives in `src/spec-prose/v0.1/` and is rendered into the site; the machine artifacts (schemas, JSON-LD context, conformance examples) are served verbatim from `public/v0.1/`.

## Before you open a PR

- **Read the spec.** [`src/spec-prose/v0.1/spec.md`](src/spec-prose/v0.1/spec.md) is the source of truth, published at [openclearance.org/v0.1/spec](https://openclearance.org/v0.1/spec). The schemas, context, rule registry, vocabulary, and examples all serve it.
- **Read [`GOVERNANCE.md`](GOVERNANCE.md).** It defines what counts as a patch, minor, or major change, and what each requires (use case, public review window, migration story).
- **Read [`VERSIONING.md`](VERSIONING.md).** Published versioned URLs are permanent and immutable. A published version is never edited in place; corrections and additions ship as a new version.
- **Check existing issues and PRs.** Someone may already be working on the same change.

## Types of contributions

### Spec clarifications and documentation

Improvements to prose in `src/spec-prose/v0.1/`, clearer examples, expanded glosses on vocabulary terms or rules, fixes to typos or broken links: these are welcome as direct PRs and typically merge as patch-level changes. They must not change the meaning of any published artifact.

### New conformance cases

If you find a real-world envelope or manifest that the conformance check should catch but does not, please add a case:

1. Add a small example envelope under `public/v0.1/examples/` (for a valid case the check should pass).
2. Run `npm install && npm run conformance` and confirm the suite is green, including the byte-exact integrity check over your new example.
3. Open a PR describing the failure mode the case exercises.

The conformance check (`scripts/conformance.mjs`) validates every published schema, the JSON-LD context, and every example envelope: schema compilation, the byte-exact Tier-0 integrity hash (SHA-256 over the exact UTF-8 bytes of the `payload` string, hashed verbatim before any re-parse), and the parsed payload against the manifest schema. If you change a schema or an example, the integrity hash on the affected example must be recomputed; the check will fail loudly if it drifts.

### Proposing a new determination rule

The rule registry (`/v0.1/rules`) is **open, not a closed enum**: an unrecognised `basis.rule` id is structurally valid and yields a non-fatal `unrecognised_rule` advisory, never a schema rejection. Adding a *recognised* rule to the registry baseline is a patch or minor change. A proposal should include the rule id (kebab-case), the inputs it reads, the determination it justifies, why an existing rule is insufficient, and a worked `basis` example. A published rule id's meaning is frozen; corrections ship as a new id or version.

### Proposing a new field, clearance facet, or vocabulary term

These are minor or major changes per [`GOVERNANCE.md`](GOVERNANCE.md) and require:

- A real implementation use case (not theoretical completeness).
- Whether it can live under the `extensions` escape hatch instead: the default answer should be "try extensions first".
- The JSON-LD mapping for `context.jsonld` if the term's semantics are non-obvious.
- An example manifest demonstrating the change.
- For new fields, the corresponding update to `clearance-manifest.schema.json`, the v0.1 `context.jsonld`, and `spec.md` together, with no drift between the three.
- For minor changes: a 14-day minimum public review window.

Open an issue using the [spec-change-proposal form](.github/ISSUE_TEMPLATE/spec-change-proposal.yml) first, to surface the idea before writing the PR.

### Proposing a breaking change

Breaking changes ship under a major version bump and require a 30-day public RFC and demonstrated implementation experience. Any change to the Tier-0 integrity derivation is breaking by definition and must be introduced with an explicit envelope-version marker or deferred to a major bump, never by silently changing the derivation. Open an issue and propose the RFC.

### Reporting bugs

If you've found a real bug in the spec (a JSON Schema that doesn't match the prose, an example whose integrity hash is wrong, a `context.jsonld` mapping that disagrees with a field's definition), open an issue describing what you observed and what you expected. If the bug could let a non-cleared work present as cleared, or otherwise affects integrity or forgery resistance, follow [`SECURITY.md`](SECURITY.md) instead and do not open a public issue.

## Local setup

```
git clone https://github.com/cfpramod/openclearance
cd openclearance
npm install
npm run conformance   # validate the published v0.1 artifacts
npm run dev           # local dev server for the site
npm run build         # static build to dist/
```

`npm run build` must succeed before any change ships. `npm run conformance` is the published-artifact gate and runs in CI on every push and pull request that touches the spec artifacts or the check itself.

## Code style

- Spec and site prose: editorial, restrained, technical. No marketing language. Do not use em-dashes or en-dashes; use colons, commas, or parentheses instead. `→` is the only special glyph used in copy. Rights language stays non-absolute ("helps establish", "supports"), never an absolute guarantee. Match the existing voice.
- JSON examples: realistic-looking values; do not fabricate institution names or dates beyond what an example needs.
- Scripts: standard Node ESM, dependency-light. The conformance check uses only `ajv`, `ajv-formats`, and `node:crypto`.

## License

The Clearance Manifest standard uses a dual license, and contributions follow the part of the project they touch:

- **Prose and documentation contributions** (the normative spec text in `src/spec-prose/`, site prose, and all human-readable docs) are licensed under [CC-BY-4.0](LICENSE).
- **Machine-artifact contributions** (anything under `public/v0.1/`: JSON Schemas, the JSON-LD context, examples) are dedicated to the public domain under [CC0-1.0](public/v0.1/LICENSE).

By contributing, you agree to license your contribution under the license that governs the file you are changing, as described above. You retain copyright. We do not require a CLA.
