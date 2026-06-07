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
- `/v0.1/` : spec landing. **Placeholder.** See the note below.

## Build

```bash
npm install
npm run build      # static output to dist/
npm run dev        # local dev server
npm run preview    # preview the production build
```

`npm run build` must succeed before deploy. The site is fully static; the deploy
target (Cloudflare Pages) and DNS are configured separately.

## Spec wiring (TODO after the byte-exact merge)

The `/v0.1/` route is a deliberate placeholder. It does **not** yet serve the
real spec artifacts, and no spec content is fabricated.

Once the byte-exact Tier-0 rewrite (open-museum-mcp PR #68) merges and the
artifacts are final, wire the files from `open-museum-mcp/spec/clearance/v0.1/`
to permanent paths under `/v0.1/`:

| Source (in open-museum-mcp)              | Permanent path                          |
| ---------------------------------------- | --------------------------------------- |
| `context.jsonld`                         | `/v0.1/context.jsonld`                  |
| `clearance-manifest.schema.json`         | `/v0.1/clearance-manifest.schema.json`  |
| `tier0-envelope.schema.json`             | `/v0.1/tier0-envelope.schema.json`      |
| `advisory-entry.schema.json`             | `/v0.1/advisory-entry.schema.json`      |
| `rules.md`                               | `/v0.1/rules`                           |
| `spec.md`                                | `/v0.1/spec`                            |
| `examples/`                              | `/v0.1/examples/`                       |

The `@context` IRI `https://openclearance.org/v0.1/context.jsonld` is the spec's
sole normative authority for term expansion, so the file at that path must be
byte-stable once published. Do not publish until the artifacts are frozen.
Detailed wiring options are commented at the top of
`src/pages/v0.1/index.astro`.

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
