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
Security considerations: the payload is a signed or hash-protected JSON-LD document;
  consumers MUST verify integrity before processing.
Published specification: https://w3id.org/clearance-manifest/v0.1/
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

> **Awaiting Pramod's call.**

| | Option A — standards tree | Option B — vendor tree |
|--|--------------------------|------------------------|
| Type | `application/clearance-manifest+json` | `application/vnd.openclearance.manifest+json` |
| Registration | IANA formal review (weeks–months) | None required (immediate) |
| Appropriateness | Best for v1.0+ with multiple adopters | Best for v0.x single-implementation |
| Schema change needed | No (current type is already this form) | Yes (updates `payloadType` const + examples) |

**Recommendation:** Use Option B (`vnd.` vendor tree) for v0.1, allowing the spec
to be honest about its current adoption level. Plan Option A (standards-tree IANA
registration) for v1.0 after C3 governance is in place and a second independent
implementation exists.

Once Pramod decides:

- **Option A chosen:** no schema change needed; open an IANA registration request
  per the template above.
- **Option B chosen:** update `tier0-envelope.schema.json` `payloadType` const,
  update all example envelopes, and update the spec prose reference in `spec.md`.
