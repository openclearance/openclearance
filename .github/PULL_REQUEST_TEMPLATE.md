## What changed

<!-- One or two sentences. State the change, not the motivation. -->

## Why

<!-- Optional. Link an issue if there is one. Skip if the title says it. -->

## Pre-merge checks

- [ ] `npm run conformance` passes (all schemas, the context, and every example green, including the byte-exact integrity check)
- [ ] `npm run build` succeeds
- [ ] If a published v0.1 artifact under `public/v0.1/` changed: confirm this is permitted (published versioned URLs are immutable per `VERSIONING.md`; corrections normally ship as a new version, not an in-place edit)
- [ ] If a new field, clearance facet, or vocabulary term: the JSON Schema, the v0.1 `context.jsonld`, and `spec.md` are all updated together (no drift between the three)
- [ ] If a schema or example changed: the affected example's `integrity.hash` is recomputed and the conformance check confirms it
- [ ] If a new determination rule: it is documented in the rule registry (`src/spec-prose/v0.1/rules.md`) with inputs and a worked example
- [ ] The change preserves the fail-closed contract (missing / ambiguous / non-affirmative signals still resolve to a deny)
- [ ] If user-facing: `README.md` / `CHANGELOG.md` updated
