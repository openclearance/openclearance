# Spec addition — Scoped rights statements, for records whose fields do not share one licence

**Date:** 2026-08-28 · **Target version:** v0.2 (additive; v0.1 FROZEN)

---

## 1. The problem this closes

A manifest asserts its rights position at the level of the **record**. That assertion is true of
most of a typical open-access record and false of part of it more often than the shape admits.

A live open-access API in current use returns, on **every** response, a licence block stating that
one named field — the curatorial description — is licensed under an attribution licence, while all
other data in the response is CC0. The record's rights position is therefore not one position but
two, and the field carrying different terms is precisely the field a publisher most wants to quote:
human-written interpretive text.

A manifest that carried that text under a record-level CC0 statement would assert a permission the
source did not grant. That is the *asserting a right the grantor does not hold* half of the
symmetry the standard already guards in the other direction — and it is the more dangerous half
here, because the failure is silent and the consumer acting on it is doing exactly what the
manifest told them they could.

**Three properties of the real case shape the design, and each rules out an obvious approach:**

1. **The divergence is structural, not per-record.** The licence block is a constant on every
   response, not a flag on some objects. So this is not an anomaly to detect per record; it is a
   standing property of a source, and any design that treats it as an exception will be wrong for
   the whole corpus.
2. **The permissive half is itself qualified** — the CC0 designation is stated together with the
   source's own terms of use. A record that flattens it to a bare licence value with high
   confidence claims more than the source said.
3. **The divergent half cannot be resolved to a canonical licence URI from the source's own
   metadata.** The machine-readable licence links carry only the CC0 URI; the attribution licence
   appears in prose alone, and that prose names a licence version and jurisdiction combination that
   does not exist. **Resolving it to a URI would mean inventing one** — upgrading the source's
   ambiguity into the manifest's certainty. Any model for carried third-party terms must therefore
   be able to hold an **unresolvable** statement verbatim.

**Today the honest handling is to fence the field: do not carry text whose terms the manifest
cannot state.** That is correct now and wrong as a destination — the interpretive layer is
materially valuable, and losing it is a real cost. This proposal is what makes carrying it
possible.

## 2. What the manifest already assumes, precisely

v0.1 does **not** assume a record has one licence. It already carries independent open-access
positions for images and for metadata, so **divergence at asset-class granularity is first-class.**
What it assumes is uniformity *within* an asset class — and the case above breaks exactly that:
divergence *inside* the metadata class, with a single unscoped record-level statement as the place
the flattening happens.

**A conforming v0.1 manifest cannot carry the text at all** — the work block is closed and has no
description field. So there is no v0.1 defect to fix here and no published document is wrong. This
is a proposal about what becomes expressible next, and the rule it establishes must be in place
**before** any carried-text field is added, not after.

## 3. Axis placement (this is not a new axis)

The house test is an element's relationship to `clearance`. A scoped statement does not gate a
facet closed, does not govern naming, and does not feed a determination. It answers *may this be
reused, and on what terms* — the **permission** question — about a **different subject**: a carried
field rather than the work.

So this is **not a new axis; it is a third granularity of the existing one.**

| Granularity | Field | Subject |
|---|---|---|
| Record | `rights.statement` | the whole manifest's position |
| Asset class | `rights.imageOpenAccess` / `rights.metadataOpenAccess` | images vs. metadata |
| **Node** | **this element** | **one named field inside the record** |

Stating this matters practically: an element that looked like a new axis would invite a parallel
set of determination rules and a second adjudication path. There is none. A scoped statement
carries terms and points at what they govern.

## 4. Normative rules

- **S-1 — A scoped statement narrows a named node; it MUST NOT touch `clearance`.** The record's
  clearance booleans are about the work. Someone's catalogue prose carrying its own terms says
  nothing about whether the depicted work may be reproduced, and a manifest in which a scoped
  statement altered `commercialReproduction` or `derivatives` MUST be rejected.

- **S-2 — Any carried third-party text field MUST carry its own scope, or MUST NOT be carried.**
  Where no scope is present, a consumer necessarily reads the field under the record-level
  statement. **Note the direction, because it is the reverse of the usual case: here silence
  GRANTS MORE than the source did.** The familiar absence bug over-restricts and is merely
  unhelpful; this one over-permits, and the consumer discovers it from the rights holder.

- **S-3 — One direction only: the scope points at the node.** A scope entry carries an RFC 6901
  JSON Pointer resolving to the node it governs, and the pointer MUST resolve within the same
  manifest. Nodes do not point back. A single direction is what makes it impossible for the two to
  disagree, and it is the idiom the evidence pointer already establishes.

- **S-4 — The fail direction is do-not-reuse-the-field, never deny-the-work.** An unresolvable,
  absent or unrecognised scope on a text field means that field MUST NOT be reused. It MUST NOT
  propagate into any clearance facet. Fail-closed does not have one global meaning: the risk being
  closed against here is republishing someone's prose without permission, not reproducing the work.

- **S-5 — A statement that the source did not express as a resolvable URI MUST be carriable
  verbatim, and MUST NOT be normalised into one.** Where a source states terms only in prose, the
  manifest carries that prose as given. A producer that maps prose onto a canonical licence URI is
  making a legal determination the source did not make, and doing it silently. The raw statement
  stays authoritative over any interpretation of it — the same rule the standard already applies to
  parsed source strings elsewhere.

- **S-6 — A scope MUST record the source field it was read from.** The forensic link binding a
  carried assertion to the field it came from, matching the treatment the record-level rights
  position already gets. Without it a scope is an unattributable claim about a third party's terms.

- **S-7 — Scopes are READ, never INFERRED.** A producer MUST NOT derive a scope from heuristics,
  field-name conventions, or knowledge of what a class of source usually does. A scope not stated
  by the source is not a scope. **This is the boundary that keeps the standard out of adjudicating
  other parties' rights positions:** carrying what a source published about its own terms is
  reporting; deciding what a source's terms *probably* are is adjudication, and the standard does
  not do it.

- **S-8 — A scope narrows only what it names.** Nodes with no scope take the record-level position
  unchanged. The presence of scopes MUST NOT be read as widening the record statement for anything
  they do not cover, and a scope MUST NOT grant more than the record-level statement — it is a
  narrowing instrument only.

- **S-9 — ⚠ The governed node and its scope MUST travel at the same visibility.** This is the rule
  most likely to be broken by a well-meaning implementation, and it is the one that matters most.
  If a carried text field were placed where an older consumer can read it while its scope rode in
  the forward-compatible container that such a consumer ignores, that consumer would read the text
  under the record's permissive statement — **the original bug, reintroduced by the compatibility
  mechanism itself.** Either both are visible to a consumer or neither is. See §7.

## 5. Field sketch (schema authored after review)

```jsonc
// top-level, optional; each entry governs exactly one node
"rightsScopes": [
  {
    "governs": "/work/description",        // RFC 6901 pointer; MUST resolve (S-3)
    "statement": {
      // exactly one of `uri` or `text` — a source that gave a resolvable licence,
      // or one that did not (S-5). Never both, so no entry can imply a mapping
      // between prose and a URI that the source did not make.
      "uri": "https://creativecommons.org/licenses/by/4.0/",
      "text": "…the source's own wording, verbatim…"
    },
    "readFrom": { "field": "info.license_text", "value": "…" }   // S-6
  }
]
```

`statement` being an exclusive choice is deliberate: it is the schema-level expression of S-5. A
producer cannot record a URI *and* the prose it was derived from, because that pairing is precisely
the silent normalisation the rule forbids.

## 6. Conformance vectors required

1. A carried text node with a scope naming an attribution licence by URI ⇒ **valid**; clearance
   facets identical to the same manifest without the scope (S-1).
2. **Negative (S-2):** a carried third-party text node with no scope entry governing it ⇒
   REJECTED.
3. **Negative (S-3):** a scope whose pointer does not resolve within the manifest ⇒ REJECTED.
4. **Negative (S-1):** a manifest in which a scope's presence changes any clearance facet ⇒
   REJECTED. Both granting facets exercised separately.
5. **(S-4)** A node whose scope is present but carries terms the consumer does not recognise ⇒
   document **valid**, the node not reusable, **every clearance facet unchanged**. The vector
   exists to prove the fail direction does not leak into the work's verdict.
6. **Negative (S-5):** a scope carrying both `uri` and `text` ⇒ schema-invalid.
7. **(S-5)** A scope carrying only verbatim `text`, where the source expressed no resolvable URI ⇒
   **valid**. The unresolvable case is a first-class outcome, not a degraded one.
8. **Negative (S-8):** a scope granting more than the record-level statement ⇒ REJECTED.
9. **Negative (S-9):** a manifest carrying a governed text node in the v0.1-visible body while its
   scope rides in the extensions container ⇒ REJECTED.

## 7. Versioning & v0.1-safe bridge

- **Additive, new namespace.** v0.1 stays frozen; no published URI moves.
- **Why a bridge is required.** The v0.1 document root is closed, so a top-level `rightsScopes`
  block carried inline is schema-invalid to a v0.1 verifier — rejected whole rather than ignored.
  Fail-closed in direction, but a compatibility break rather than graceful degradation. The block
  therefore rides in the v0.1 extensions container under the new namespace.
- **Ignore-safety: this element is safe ONLY because of S-9, and that is not a technicality.**
  Considered alone, a scope is not ignore-safe in the way evidence is — evidence changes no verdict,
  so ignoring it is free, whereas ignoring a scope means reading a field under the wrong terms.
  What makes it safe is that **the thing a scope governs is itself new surface**, so it rides in the
  same container: a consumer that ignores the scope also cannot see the text, and reaches the
  identical determination about the work. **The safety property is a consequence of the two
  travelling together, not of the scope's own shape** — which is exactly why S-9 is normative and
  why violating it does not merely degrade compatibility, it recreates the defect.
- **Nothing here changes a v0.1-visible field**, so no consequence needs mirroring into the frozen
  body: a scope withholds a reuse the frozen vocabulary never granted, because the frozen
  vocabulary cannot carry the field at all.

## 8. Open questions

- **Q-S1.** Whether scopes should be permitted over nodes other than carried third-party text —
  a rendition, an evidence item, a citation string. The rules are written to generalise, and the
  first consumer is text; widening the permitted target set is a decision to take deliberately
  rather than by silence.
- **Q-S2.** Whether a record-level statement should become **required** to state its own
  qualification where the source qualified it (property 2 in §1: an open designation stated
  together with a terms-of-use document). Today such a record flattens to a bare licence value with
  high confidence, which claims more than the source did. Related to this element but separable,
  and it touches the frozen body rather than new surface.
- **Q-S3.** Whether an unresolvable verbatim statement should carry a producer-declared *intent*
  field (for example, "the source appears to intend an attribution licence") — **recommended
  against**, and recorded here so the question is answered once: such a field is S-7 wearing a
  disclaimer, and its presence would be read as guidance no matter how it is captioned.
