# Spec addition — TIME-BASED (MOTION) WORKS: coverage, the display-play use, offline verification

**Date:** 2026-08-16 · **Status:** proposal · **Target version:** v0.2 wave (version partition to be
confirmed against the standing version roadmap before schema authoring)

---

## 1. The problem: the manifest was shaped around stills

The Clearance Manifest clears one creative work and binds that clearance to delivered bytes. For a
still image the two are nearly the same thing: one work, one primary rendition, one hash. A
**time-based work** — video, animation — breaks that identity three ways, and a display surface that
plays such works from a *cached* manifest adds a fourth, operational constraint:

1. **Coverage.** What does the attestation cover when the work has duration — the whole work, any
   single frame, a still export offered as a separate product?
2. **The play.** Publicly *displaying* a time-based work (a subscription screen playing it on
   rotation) is a different restricted act from *reproducing* it. The clearance vocabulary has no
   facet for it, so today a display surface must either overload `commercialReproduction` (wrong
   act) or proceed without a recorded permission (unrecorded use).
3. **Editions.** A displayed work may be limited not by print run but by *simultaneous displays*.
   The existing edition/impression discussion is print-shaped.
4. **Offline verification.** A display device revalidates rights on its own rotation cycle against
   a manifest it cached earlier, frequently without connectivity. Whatever the vocabulary defines
   must be verifiable **at the edge, offline** — a rights model that only works with a live call
   home fails exactly where display hardware lives.

## 2. Design principles (nothing new invented)

| Principle | How this element honours it |
|---|---|
| **Fail-closed** | A use the manifest does not address is not cleared. New facets are optional; absence means "not addressed", never "allowed". |
| **Work ≠ rendition** | The manifest clears ONE work; every delivered byte object (video file, poster frame, still export) is a distinct rendition with its own content hash, bound to the work by the manifest. This is the still-image integrity idiom, pluralised. |
| **Declaration, not lookup** | Play counts, metering, and payment are platform telemetry. The manifest carries the *permission*, never the ledger. |
| **Additive, new namespace** | The frozen bodies are untouched; motion fields are optional additions in the current version namespace. |

## 3. Normative rules

- **M-1 — One work, many renditions.** A motion manifest clears the WORK as a temporal whole. Each
  rendition carries its own `integrity` hash (the v0.1 idiom). A rendition's hash binds bytes to the
  cleared work; it never extends the clearance to uses the facets do not grant.

- **M-2 — A frame is part of the work; a still product is a distinct use.** Any excerpt or frame is
  covered by the work's facets *as part of the time-based work* (a paused frame on a display surface
  is display, not a new use). But offering a still rendition as a **separate product** (a print of a
  frame) is a distinct use with its own facet (M-4). Clearance for the moving work does not silently
  become clearance for frame merchandise.

- **M-3 — `displayPlay` is a first-class facet.** Public performance/communication of a time-based
  work by a display surface is a restricted act distinct from reproduction in essentially every
  copyright regime, and it is the act a display subscription actually consists of. New optional
  facet `clearance.displayPlay` (permit-facet shape, with basis). Absent ⇒ not addressed ⇒ a
  display surface MUST NOT play the work on the strength of this manifest.

- **M-4 — `stillExport` is a first-class facet.** Permission to derive still renditions from the
  work and offer them as separate products. Absent ⇒ fail-closed for that use, even where
  `commercialReproduction` of the moving work is granted.

- **M-5 — Display editions ride the edition vocabulary, with one new requirement.** Limited
  editions of displayed works are capped in *simultaneous displays*, not copies. This proposal does
  not pre-empt the pending edition/impression vocabulary; it contributes the requirement that the
  edition model support a `limited-simultaneous-displays` form alongside print-run forms. Until that
  vocabulary lands, edition limits for motion works are contractual, not manifest-borne, and a
  manifest MUST NOT imply otherwise.

- **M-6 — OFFLINE VERIFIABILITY is a normative property, not an implementation nicety.** A
  conforming manifest and envelope MUST be fully verifiable with **no network access**, given a
  locally cached **trust bundle**: the envelope bytes, the embedded signature chain (the C2PA
  envelope already embeds its credential chain precisely so offline verification is possible), and
  the attestor's DID document cached together with its retrieval time. No verification step may
  require a live call. Verification performed offline is verification **as of the trust bundle's
  cache time**: the verifier states (to itself and any audit trail) that validity, binding, and
  actor-binding held at bundle time. Freshness of *status* (a later withdrawal the device has not
  yet seen) is a consumer staleness policy: the standard defines what "verified offline as of T"
  means; the consuming surface declares and enforces its own maximum staleness window. This is the
  honest division — an offline device cannot see a revocation until it syncs, and pretending
  otherwise would be a verification claim the device cannot make.

- **M-7 — The audio layer is never silently covered.** A motion work with a synchronised audio
  track carries a second rights layer (composition, recording) that the visual-work clearance does
  not reach. A motion manifest MUST state the audio position: no audio, audio cleared together with
  the work by the same determination, or audio not cleared (which fail-closes `displayPlay` with
  sound). Silence about audio is the one thing the manifest may not offer.

## 4. Field sketch (schema authored after review, following the current version's idioms)

```jsonc
// source gains a motion-media block (sibling to imageUrls, same accept-path optionality)
"media": {
  "kind": "video",
  "durationSeconds": 93.4,
  "mediaType": "video/mp4",
  "audio": "none" | "cleared-with-work" | "not-cleared",
  "renditions": [
    { "role": "delivery" | "preview" | "poster-frame" | "still-export",
      "url": "…", "mediaType": "video/mp4",
      "integrity": { "alg": "sha-256", "hash": "…" },   // v0.1 idiom, per rendition
      "width": 3840, "height": 2160 }
  ]
}

// clearance gains two optional facets (existing permitFacet shape)
"displayPlay":  { "permitted": true,  "basis": { … } },
"stillExport":  { "permitted": false, "basis": { … } }
```

The attested-tier envelope's bound-asset `assetType` (today `image`) extends to `video`, with the
hard binding using the C2PA binding appropriate to the container (BMFF hash for MP4-family assets).

## 5. Conformance vectors required (sketch)

1. Motion manifest with `displayPlay` granted and `stillExport` absent ⇒ valid; a still-product
   consumer reads fail-closed (M-4).
2. **Negative:** `audio` absent on a motion manifest ⇒ schema-invalid (M-7).
3. `audio: "not-cleared"` with `displayPlay.permitted: true` and no muted-play scoping ⇒ REJECTED
   (M-7's fail-close; exact scoping semantics to be fixed at schema time).
4. Rendition hash mismatch ⇒ the rendition is rejected; the manifest itself remains valid (M-1 —
   binding failure is per-rendition, mirroring the dead-locator rule for evidence).
5. Offline vector: verification of the attested envelope completes against a supplied trust bundle
   with the network loader disabled (M-6) — the conformance harness already refuses network
   fetches, which becomes the enforcement mechanism rather than an accident of test design.
6. **Negative (M-8):** a motion manifest exposing a still through `source.imageUrls` with
   `clearance.commercialReproduction.permitted: true` while `stillExport` is not granted ⇒
   REJECTED. Without this the v0.1-visible surface asserts frame-merchandise permission that the
   work's own facets withhold — the leak the bridge would otherwise open (M-2, M-4).
7. **Positive companion to M-8, fixing its boundary:** the same manifest with
   `commercialReproduction.permitted: false` and a poster frame exposed through `source.imageUrls`
   ⇒ **valid**. M-8 is conditioned on asserting the permission, not on exposing a still; read
   without this vector it could be implemented as "a motion work may never publish a poster
   frame", which removes a capability the rule deliberately preserves. An ordinary still-image
   manifest is untouched either way — there the image *is* the work.

## 6. Versioning & v0.1-safe bridge

- **Additive, new namespace.** v0.1 stays frozen; no published v0.1 URI moves (VERSIONING.md). New
  rule ids for the facets join the rule registry (an open set — adding one breaks no published
  schema).

- **Why a bridge is required rather than optional.** The shipped v0.1 schema sets
  `additionalProperties: false` at the document root, on `clearance`, and on `source`. A manifest
  carrying `clearance.displayPlay`, `clearance.stillExport` or `source.media` inline is therefore
  **schema-invalid to a v0.1 verifier — rejected whole, not partially understood.** The direction of
  that failure is fail-closed and so it is safe; the consequence is not acceptable. Rejection is not
  degradation: it makes a publisher of the new vocabulary invalid to every existing consumer at
  once, turning a version step into a coordinated cutover instead of a gradual adoption.

- **The bridge.** `media`, `displayPlay` and `stillExport` ride in the v0.1 `extensions` container
  under the new namespace — the forward-compatible escape hatch v0.1 already defines, whose
  unrecognised terms a consumer MUST ignore. A v0.1 consumer validates the document and reaches a
  determination rather than rejecting it.

- **What an ignoring consumer concludes, and why that is safe.** v0.1 has no vocabulary for the
  performance of a time-based work, so a consumer that ignores the extension cannot derive play
  permission from it: M-3's absent-facet rule holds for that consumer by construction, because no
  field exists from which a permission could be read. This is the ignore-safe case — ignoring costs
  such a consumer capability, never safety.

- **The degradation is not neutral, and a rule follows from it.** A consumer that ignores `media`
  cannot tell the work is time-based at all; it sees at most a still under `source.imageUrls`.
  **M-8, normative: any still exposed through the v0.1 image fields MUST itself be cleared by the
  v0.1 facets carried in the same manifest.** A poster frame published through `imageUrls` on a manifest
  whose `commercialReproduction` reads `true` is an assertion about that still — and M-2 makes a
  still offered as a separate product a distinct use. A work whose frames are not cleared as
  separate products MUST NOT expose one through the v0.1 image fields while asserting that
  permission.

- **On carrying a restriction where an older consumer cannot see it.** For an authority gate the
  anti-abuse rule is sharp: the extension must never gate a facet closed while the v0.1 body still
  reads `true`. Here it is narrower, because none of v0.1's three facets *is* display — there is no
  v0.1 field for the extension to contradict. The residual risk is therefore not contradiction but
  **over-reading**: a consumer treating `commercialReproduction: true` as blanket permission over
  whatever bytes it can reach. The preceding rule closes the reachable case. Beyond it,
  `media.renditions` is extension-only by design, so a v0.1 consumer never obtains the moving bytes
  it might otherwise mis-clear — the delivery rendition is not reachable from the v0.1 surface at
  all.

## 7. Open questions

- **Q-M1.** Version partition: do `displayPlay`/`stillExport`/`media` enter the current additive
  wave or the next — decided with the standing version-roadmap sign-off, not here.
- **Q-M2.** Generative/unbounded works (no fixed duration): what `durationSeconds` and rendition
  hashing mean for a work that renders in real time. Deferred; such works may need an attested
  *renderer* rather than attested bytes, which is a materially different trust object.
- **Q-M3.** Muted-play semantics for `audio: "not-cleared"` (permit visual-only display or
  fail-close entirely) — a real product question with a legal edge; both directions are honest if
  stated, one must be chosen at schema time.
