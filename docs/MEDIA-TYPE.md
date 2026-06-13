# Media-Type Registration

> **[DECISION-NEEDED — Pramod]**
> The current media type `application/clearance-manifest+json` is unregistered.
> Two options are analysed below. **Recommendation: register in the vendor tree as
> `application/vnd.openclearance.manifest+json`** for now, and plan the standards-tree
> registration for v1.0. See "Decision" at the bottom.

## Background

The Tier-0 envelope today declares `"payloadType": "application/clearance-manifest+json"`.
This type is used in:

- `public/v0.1/tier0-envelope.schema.json` — `payloadType` const
- All Tier-0 example envelopes
- The reference engine (`open-museum-mcp`) when it emits envelopes

The type is not registered with IANA. Unregistered media types can collide with
future registrations, and some strict consumers (HTTP intermediaries, Content-Type
negotiation) may reject or mis-handle them.

## Option A — Standards tree: `application/clearance-manifest+json`

**How it works:** Register the type in the IANA standards tree (RFC 6838 §3.1).
This requires submitting a formal registration template to the `media-types@iana.org`
mailing list. The community reviews the proposal and IANA assigns it.

**Pros:**
- Clean, stable top-level type with no vendor prefix.
- No cost; fully open.
- Appropriate for a format aiming to become a genuine open standard.

**Cons:**
- The review process can take weeks to months.
- Reviewers may ask for revisions, a reference spec at a stable URL (which we will
  have once w3id.org is registered), or evidence of adoption.
- Premature for a format that today has one reference implementation and is not yet
  adopted by a second independent party. RFC 6838 §3.1 expects the registration to
  document the format completely; v0.1 is stable but Tier-1/2 (signing) are not yet
  implemented.

**Registration template sketch (for IANA submission when ready):**
```
Type name:            application
Subtype name:         clearance-manifest+json
Required parameters:  none
Optional parameters:  none
Encoding:             as per application/json (UTF-8; binary transfer OK)
Security considerations: the payload is integrity-protected via SHA-256 over the
  exact UTF-8 bytes of the payload string; consumers MUST verify the hash before
  processing. Signature tiers (Tier-1 delegated / Tier-2 direct, via C2PA) are
  separate envelopes and are not part of the Tier-0 media type.
Published specification: https://openclearance.org/v0.1/
Applications: open-access cultural heritage search engines, rights-clearance pipelines
Fragment identifier considerations: none defined
Restrictions on usage: none
Author: [maintainers@openclearance.org]
Change controller: Open Clearance Standard Working Group (TBD)
```

## Option B — Vendor tree: `application/vnd.openclearance.manifest+json` (Recommended)

**How it works:** Use the `vnd.` vendor-tree prefix (RFC 6838 §3.2). Vendor-tree
types can be used without formal IANA registration (though optional registration is
available). They are conventionally named `application/vnd.<org>.<type>+json`.

**Pros:**
- Available immediately with no review process.
- Honest: the `vnd.` prefix signals "this is a vendor-defined format, not yet an
  adopted standard," which accurately describes v0.1.
- Fully valid in HTTP `Content-Type` and JSON Schema `$schema` declarations.
- Consistent with how other emerging standards start (e.g. GitHub's
  `application/vnd.github+json`, many FHIR types).

**Cons:**
- Less clean than the bare standards-tree form.
- Requires a schema change (`payloadType` const, examples) once decided.
- If/when the format is adopted broadly, a migration to the standards tree would
  require another schema bump.

## Decision

**Pramod decided (2026-06-12): vendor tree (`application/vnd.openclearance.manifest+json`) for v0.2; plan standards-tree registration for v1.0.**

| | Option A — standards tree | Option B — vendor tree (chosen) |
|--|--------------------------|------------------------|
| Type | `application/clearance-manifest+json` | `application/vnd.openclearance.manifest+json` |
| Registration | IANA formal review (weeks–months) | None required (immediate) |
| Appropriateness | Best for v1.0+ with multiple adopters | Best for v0.x single-implementation |
| Schema change needed | No (current v0.1 type is already this form) | Yes (v0.2 `payloadType` const + examples) |

The current v0.1 `payloadType` const (`application/clearance-manifest+json`) is **frozen** in
the published schema and must not be changed in-place. The vendor-tree type takes effect in
**v0.2**, coordinated with OM-M via OM-OR. At that point:

1. Update `public/v0.2/tier0-envelope.schema.json` `payloadType` const.
2. Update the v0.2 example envelopes.
3. Update the spec prose reference in `src/spec-prose/v0.2/spec.md`.
4. Open an optional IANA vendor-tree registration (no formal review required).
