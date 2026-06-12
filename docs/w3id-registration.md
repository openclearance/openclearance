# w3id.org Persistent-ID Registration

> **[DECISION-NEEDED — Pramod]**
> The w3id.org PR must be submitted from an individual's GitHub account with commit
> rights to https://github.com/perma-id/w3id.org. The technical steps below are
> ready; someone with a GitHub account needs to fork the repo and open the PR.

## Why w3id.org

Every canonical URI in Clearance Manifest v0.1 previously lived under
`openclearance.org`. If that domain ever lapsed, every conforming document, every
validator, and every JSON-LD processor pinned to those IRIs would break. This is the
single-point-of-failure that w3id.org is designed to solve.

`w3id.org` (Web 3.0 Identifiers) is a community-maintained permanent-redirect
service hosted at https://github.com/perma-id/w3id.org. Adding an entry means
submitting a tiny `.htaccess` file to that repo. Once merged, `w3id.org` redirects
to wherever the content actually lives — and if the canonical domain ever changes,
only the `.htaccess` entry needs to be updated, not every emitted manifest.

## Canonical-IRI migration (C2 durability drive)

As part of the C2 durability drive, the spec has migrated all canonical identifiers
from `https://openclearance.org/v0.1/` to `https://w3id.org/clearance-manifest/v0.1/`:

| Artifact | Old IRI (still resolves) | New canonical IRI |
|----------|--------------------------|-------------------|
| Manifest schema | `https://openclearance.org/v0.1/clearance-manifest.schema.json` | `https://w3id.org/clearance-manifest/v0.1/clearance-manifest.schema.json` |
| Envelope schema | `https://openclearance.org/v0.1/tier0-envelope.schema.json` | `https://w3id.org/clearance-manifest/v0.1/tier0-envelope.schema.json` |
| Advisory schema | `https://openclearance.org/v0.1/advisory-entry.schema.json` | `https://w3id.org/clearance-manifest/v0.1/advisory-entry.schema.json` |
| JSON-LD context | `https://openclearance.org/v0.1/context.jsonld` | `https://w3id.org/clearance-manifest/v0.1/context.jsonld` |
| Vocab namespace | `https://openclearance.org/v0.1/vocab#` | `https://w3id.org/clearance-manifest/v0.1/vocab#` |
| Rule registry | `https://openclearance.org/v0.1/rules#<id>` | `https://w3id.org/clearance-manifest/v0.1/rules#<id>` |

The `openclearance.org` paths continue to serve the files at their original locations
(the domain still hosts the content), so existing links, validators, and documents
that reference the old IRIs keep working. The w3id.org redirects make the canonical
identifier independent of the domain.

## Steps to register

### 1. Fork the w3id.org repo

```
https://github.com/perma-id/w3id.org
```

Fork it under your personal GitHub account.

### 2. Create the namespace directory and .htaccess

Create `clearance-manifest/.htaccess` in the fork:

```apache
Options -MultiViews
AddDefaultCharset utf-8

RewriteEngine On

# Redirect all requests under /clearance-manifest/ to openclearance.org, preserving path.
# Example: https://w3id.org/clearance-manifest/v0.1/context.jsonld
#       → https://openclearance.org/v0.1/context.jsonld
RewriteRule ^(.*)$ https://openclearance.org/$1 [R=302,L]
```

Note: start with `302` (temporary) until the namespace is confirmed stable, then
change to `301` (permanent). A `301` can be cached aggressively by redirectors, so
it is safer to stabilise with `302` first.

### 3. Create clearance-manifest/README.md

```markdown
# clearance-manifest

Clearance Manifest open standard — the portable, cryptographically-verifiable
rights-clearance artifact format for creative works.

Spec home: https://openclearance.org
Contact: [your name / maintainers@openclearance.org]
```

### 4. Open the PR

- Title: `Add clearance-manifest namespace`
- Body: reference the spec homepage and this repository

The w3id.org maintainers typically review and merge within a few days.

### 5. After merge

Once the PR is merged:
1. Verify the redirect works: `curl -I https://w3id.org/clearance-manifest/v0.1/context.jsonld`
   should return `HTTP/1.1 302` (or 301) pointing to `https://openclearance.org/v0.1/context.jsonld`.
2. Optionally upgrade the `.htaccess` from `302` to `301`.
3. Remove this `[DECISION-NEEDED]` notice from the escalations log.

## Immutability promise

The old `openclearance.org` paths are not removed. Per VERSIONING.md, published URIs
stay live indefinitely. The w3id.org redirect is an *additional* layer of durability,
not a replacement.
