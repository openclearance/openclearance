# openclearance.org

The standards site for the **Clearance Manifest** open standard: a portable,
fail-closed, byte-exact rights-clearance artifact that travels with a creative
work. The manifest composes existing standards (Creative Commons and
RightsStatements.org for status, schema.org and Dublin Core for description and
provenance, W3C PROV for the determination event, SHA-256 and C2PA for
integrity and signing) rather than inventing new cryptography or a new rights
vocabulary. It is emitted today by the
[open-museum-mcp](https://github.com/cfpramod/open-museum-mcp) engine.

This repo is the static Astro site published at **openclearance.org**. It is the
public home of the spec; the working draft of the spec itself lives in the
`open-museum-mcp` repo until extraction.

## Pages

- `/` : overview, what openclearance is and why it exists.
- `/principles` : design principles, compose don't reinvent.
- `/v0.1/` : the v0.1 specification, including the prose, the rule registry, the vocabulary, and the machine artifacts (schemas, JSON-LD context, examples).

## Build

```bash
npm install
npm run build      # static output to dist/
npm run dev        # local dev server
npm run preview    # preview the production build
```

`npm run build` must succeed before deploy. The site is fully static; the deploy
target (Cloudflare Pages) and DNS are configured separately.

## Spec source and parity

The `/v0.1/` route serves the published specification: the prose (rendered from
`src/spec-prose/v0.1/`), the rule registry, the vocabulary, and the
machine-readable artifacts under `public/v0.1/`.

The authoritative source of the spec is the
[open-museum-mcp](https://github.com/cfpramod/open-museum-mcp) engine's
`spec/clearance/v0.1/`. This repo vendors those files byte-identically so the
spec resolves from its canonical home. Served paths:

| Artifact                | Path                                   |
| ----------------------- | -------------------------------------- |
| JSON-LD context         | `/v0.1/context.jsonld`                 |
| Manifest schema         | `/v0.1/clearance-manifest.schema.json` |
| Tier-0 envelope schema  | `/v0.1/tier0-envelope.schema.json`     |
| Advisory-entry schema   | `/v0.1/advisory-entry.schema.json`     |
| Rule registry           | `/v0.1/rules`                          |
| Specification prose     | `/v0.1/spec`                           |
| Conformance examples    | `/v0.1/examples/`                      |

The `@context` IRI `https://openclearance.org/v0.1/context.jsonld` is the spec's
sole normative authority for term expansion, so the file at that path is
byte-stable. `npm run conformance` recomputes the byte-exact Tier-0 integrity
hashes and validates every published artifact against its schema, and runs in CI
on every change.

## Accent colour

The accent is a single CSS custom property, `--accent`, defined in
`src/styles/global.css`. It currently defaults to a restrained ink-blue. To
switch to the oxblood/dark-red alternative, change only the `--accent` and
`--accent-soft` lines there (the oxblood values are present, commented). The
favicon at `public/favicon.svg` has a matching ink-blue fill to update by hand
if the accent flips.

## License

The Clearance Manifest standard uses a dual license:

- **Specification text and documentation** (the normative prose in
  `src/spec-prose/`, the rendered spec pages, this README, and the governance
  docs) are licensed under [CC-BY-4.0](LICENSE). Attribution anchors the
  standard's identity.
- **Machine-readable artifacts** under
  [`public/v0.1/`](public/v0.1/LICENSE) (the JSON Schemas, the JSON-LD context,
  and the conformance examples) are dedicated to the public domain under
  [CC0-1.0](public/v0.1/LICENSE), so implementers can embed them without
  friction.

Copyright 2026 Pramod Prasanth.

## Conventions

- Editorial voice, sentence case headings, no em-dashes. `→` is the only special
  glyph used in copy.
- Rights language is non-absolute ("helps establish", "supports"), never
  absolute guarantees.
