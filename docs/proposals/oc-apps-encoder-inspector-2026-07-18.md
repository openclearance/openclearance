# Spec — the TWO OC APPS: ENCODER and INSPECTOR

**Date:** 2026-07-18 · **Author:** OM-C (design lead) · **Status:** SPEC — for **COUNCIL REVIEW (not self-signed)**
**Brief:** Pramod, via OM-OR (escalations 2026-07-18T11:32Z). **Build:** OM-M / B-pool. **Seam:** OM-AR.
**Branch:** `feat/oc-apps-spec` (off main; local, not pushed).
**Reconciles with:** the LOCKED Tier-1 attestor build contract (`session-states/om-c-tier1-attestor-build-contract-2026-06-18.md`)
— §3.4 shows the subprocess-signer seam maps onto it exactly.

**Why this lives in the OC repo:** these are the **standard's reference tooling** — the c2patool-to-C2PA
relationship. An open, independently-runnable **inspector is a conformance checker**, which is literally the C3
governance drive (the path to a second implementation). Reference tools belong with the standard they implement.

---

## 0. The one-line framing

> **The ENCODER writes a claim into a file. The INSPECTOR shows what a file claims.**
> Neither app decides whether the claim is *true* — and the Inspector is the most dangerous surface this project has
> ever shipped, because it is the one that *looks like* it decides. §4 is the longest section for that reason.

## 1. Verified technical foundation (checked at source 2026-07-18, not asserted from memory)

| Fact | Finding | Design consequence |
|---|---|---|
| c2patool embed formats | **JPEG, PNG, WebP, TIFF, HEIC, AVIF, DNG, MP4, MOV, MP3, WAV, PDF** | §3.5 format matrix; everything else ⇒ sidecar |
| Sidecar | `-s` ⇒ `.c2pa` file alongside output; **works for any format** | Universal fallback — **no artist is excluded by file type** |
| Remote manifest | `-r <url>` ⇒ URL reference embedded, manifest as sidecar | **Rejected for v1** — §3.6 (creates an OM-hosting dependency) |
| Custom assertions | `assertions[]` with `label` + arbitrary `data` | The OCM rides as a **vendor-labelled assertion** ✔ (matches the Tier-1 contract) |
| Production signing | `--signer-path <command>` subprocess signer; docs: *"In production, use a subprocess signer or remote signing service so that private key material never passes through c2patool"* | **Maps exactly onto the locked attestor seam** — §3.4 |
| **Default credentials** | ⚠️ **Built-in TEST key/cert fallback, confirmed uniformly across current + archived docs (§2). No contradicting source exists.** | **E-1 + E-6 + E-7** |
| In-place write | *"If the output file is the same as the source file, the tool will overwrite the source file."* (also: errors if output exists unless `--force`) | **E-2** — §3.2 |
| Install weight | `cargo install` = full Rust toolchain + multi-minute native build (`openssl-sys` et al.) — **CR-2 verified empirically** | **§5.4.1 — prebuilt binaries required** |
| Browser reading | `c2pa-web` + `c2pa-wasm` (wasm-bindgen) read manifests **client-side**; `c2pa-js-legacy` deprecated, node-v2 merged into `c2pa-js` (June 2026) | **A no-upload drop-zone is FEASIBLE** — §5.2 |

Sources: **[c2patool — CURRENT repo `contentauth/c2pa-rs/cli`](https://github.com/contentauth/c2pa-rs/blob/main/cli)** (the `contentauth/c2patool` repo was **archived 10 Dec 2024**; its `manifest.md` quote is reproduced identically in the live repo) ·
[c2patool usage](https://opensource.contentauthenticity.org/docs/c2patool/docs/usage/) ·
[c2pa-js](https://github.com/contentauth/c2pa-js) ·
[c2pa-web](https://opensource.contentauthenticity.org/docs/c2pa-js/packages/c2pa-web/) ·
[crates.io c2patool](https://crates.io/crates/c2patool/0.9.5)

## 2. ⚠️ THE HEADLINE FINDING — c2patool's default-credential behaviour, and why we must refuse it

> **CORRECTION, folded at council (CR-2 Axis 1). The previous revision of this section was wrong about its own
> evidence, and the correction makes the finding STRONGER.** It claimed "the two official docs disagree" and quoted
> the usage docs as stating *"No default/test certificate is automatically used if credentials aren't provided."*
> **That sentence does not exist in the docs.** It was the output of a summarising fetch tool answering my question
> about a page that simply does not discuss the topic — and I quoted a generated summary as if it were a verbatim
> source. CR-2 searched the usage page's raw text, `docs/x_509`, the changelog and the current repository, and found
> no trace of it.
>
> **This is my own rule turned on me.** P-3/D-6 across this document family: *absence of a statement is not a
> statement of absence.* A summary that is silent on a topic is not evidence that the behaviour is absent. **I
> rendered a null as a positive finding** — precisely what the standard forbids everywhere else. Recording it here
> rather than quietly editing it, because a spec that hides its own corrections has no standing to demand
> byte-exactness from anyone.

**What is actually true — verified independently by CR-2 across three sources, current and archived alike:**

- **c2patool `manifest.md`** (confirmed byte-for-byte, and present *identically* in the current repo):
  *"When you don't specify a key or certificate in the manifest `private_key` and `sign_cert` fields, the tool will
  use the **built-in key and cert**. You'll see a warning message, since they are meant for development purposes
  only."*
- **No contradicting statement exists anywhere.** The dangerous default is confirmed **consistently**, with **no
  ambiguity**, in every source checked.

**So the finding is not "the docs are muddy, so be careful." It is worse and simpler: the dangerous default is real,
current, and uniformly documented.** The version-independence posture below stands unchanged — we still refuse to
depend on the behaviour — but it now rests on confirmation rather than on doubt.

**Repository note (CR-2):** `contentauth/c2patool` was **archived on 10 December 2024**; work moved to
[`contentauth/c2pa-rs`](https://github.com/contentauth/c2pa-rs/blob/main/cli). The current repo's `cli/docs/manifest.md`
carries the *identical* built-in-cert warning. All citations in this document now point at the live repo.

**Why this is the most dangerous thing in the whole build.** If the Encoder inherits the built-in-test-cert path, an
artist who runs it without credentials gets a file carrying a **real, structurally valid C2PA Content Credential**
signed with a **publicly known development key**. Downstream tools — including ours — will render it as *signed*. That
is:
- **worthless as authenticity** (anyone holds that key, so anyone can forge it), and
- **worse than nothing**, because it *presents as* an attestation.

That is exactly the failure class this lane has spent the month designing out: **asserting something the signer cannot
back**. An Encoder that mass-produced test-signed files across an artist's archive would be the single largest
dishonesty this project could ship — at scale, silently, on files that then leave our control forever.

> ### E-1 (NORMATIVE, the hardest rule here) — THE ENCODER MUST NEVER SIGN WITH TEST OR DEVELOPMENT CREDENTIALS.
> The Encoder MUST NOT rely on, inherit, or fall through to c2patool's default-credential behaviour, whatever that
> behaviour currently is. It MUST **explicitly** supply credentials or **explicitly** decline to sign. Absent valid
> production credentials it MUST produce a **Tier-0 (unsigned, integrity-only)** artifact and **say so** — never a
> signed-looking one. A warning on stderr is **not** sufficient mitigation: warnings scroll past, and batch runs bury
> them entirely.
>
> **Conformance:** the test suite MUST include a vector asserting that running with no credentials produces
> **Tier-0 and exits non-zero on any `--sign` request** — never a test-signed file.

### 2.1 E-6 (NORMATIVE) — **THE TIER-0 CONTAINER: E-1 was guarding the door nobody uses** *(CR seat 1, F1)*

E-1 closes the `--sign` path. **The hazard has a second entrance, and it is the default one.**

**A C2PA manifest carries a claim signature by construction — c2patool cannot write an unsigned manifest.** So if the
Encoder produced its *Tier-0* output *via c2patool*, that output would be signed with **something**; and absent
explicit credentials, that something is **the built-in test key**. The result is **exactly the silently-test-signed
file E-1 exists to make impossible — produced by the no-`--sign` path the conformance suite never tested.** E-1 was
bolted to the door nobody uses and left open on the one everybody does.

**CR-2's finding makes this sharper, not milder.** Had the behaviour genuinely been version-ambiguous, a Tier-0 route
through c2patool would have been *risky*. Since the built-in-cert fallback is confirmed uniformly across current and
archived docs (§2), such a route is **reliably test-signed**. Not a hazard — a certainty.

> **E-6 (NORMATIVE).** A **Tier-0 artifact is the v0.1 OCM integrity envelope** — `{tier: 0, payloadType, payload,
> integrity{alg, hash}}` — carried as a sidecar or embedded as a bare assertion. **It is NOT a C2PA manifest.**
> The Encoder **MUST NOT invoke c2patool's signing path without an explicitly configured production signer — at any
> tier, under any flag, including the default path.** A Tier-0 run MUST produce an artifact carrying **no claim
> signature of any kind.**

**Conformance (the vector the suite was missing):** a **default, no-`--sign`** run produces an artifact with **no claim
signature**, asserted **structurally on the output bytes** — not on the CLI's own report of what it did.

### 2.2 E-7 (NORMATIVE) — POST-ENCODE SELF-VERIFICATION *(CR seat 1, F4)*

E-1b as first specced was a **blocklist** of known test/dev certificates — and a blocklist **rots exactly as fast as
the version drift E-1 refuses to depend on.** Enumerating bad certs is the same losing posture in a different coat.

> **E-7 (NORMATIVE).** After **every** signed encode, the Encoder MUST **inspect its own output** and assert that the
> signing certificate is **byte-identical to the explicitly configured credential**. Anything else — a test cert, a
> tool-substituted cert, a wrong-keystore accident — **fails the run** and the output MUST be discarded.

The blocklist survives as **defence-in-depth**, not as the gate. **The self-check is the invariant**, and it holds
against certificates nobody has enumerated yet. *(It also hands S5 a free regression harness: encode→inspect is
already the shape of conformance vector E-3.)*

## 3. THE ENCODER

### 3.1 What it does
Takes an artwork file + an OCM, and produces a **new** file carrying the manifest — embedded where the format allows,
sidecar otherwise. Single file or folder batch.

### 3.2 E-2 (NORMATIVE) — NEVER WRITE IN PLACE. NEVER MUTATE THE ORIGINAL.
c2patool **overwrites the source if output == source**. The Encoder MUST refuse `output == input`, MUST write to a new
path (or a staging dir in batch), and MUST NOT modify, move, or delete an original under any flag. There is **no
`--in-place`**, and there will not be one.

**Why so absolute:** the first real user is an artist entrusting a **10TB archive** (the Amar concierge deal). The
guarantee we sold there was *"your files are yours."* An encoder bug that corrupts originals would falsify that
promise irrecoverably — and unlike a bad manifest, **a destroyed original cannot be re-derived.** Batch mode makes the
blast radius the whole archive. This is the one place where an inconvenient CLI is obviously correct.

### 3.3 E-3 (NORMATIVE) — BYTE-EXACTNESS SURVIVES THE ENCODER
The v0.1 contract: the producer serializes the manifest **once**; that exact string is **both** the `payload` and the
hash input; consumers MUST NOT re-serialize. **The Encoder is a consumer here.** It MUST embed the payload string
**verbatim** and MUST NOT parse-and-re-serialize it (key reordering, whitespace normalisation, or unicode escaping
would all change the bytes and **silently break the integrity hash**).

*Implementation note for OM-M: treat the payload as an opaque byte string end to end. Do not round-trip it through a
JSON object. This is the single easiest way to ship a broken encoder that passes a smoke test — the file looks fine
and the hash fails only on verification.*

### 3.4 Tier semantics — what the Encoder may honestly produce
| Tier | Requires | Encoder produces it when | Emitted state |
|---|---|---|---|
| **Tier-0** | nothing (keyless) | **default** — no credentials | `UNVERIFIED_SIGNAL` — integrity, **not** authenticity |
| **Tier-1** | the OMA attestor's key (delegated) | `--sign` **with** a real attestor signer | `ATTESTED_DELEGATE` |
| **Tier-2** | the actor's **own** key | artist supplies their own production credentials | `ATTESTED_DIRECT` |

**The signer seam is already locked, and c2patool's `--signer-path` matches it exactly.** The Tier-1 attestor contract
says *"the seam is the signature, and only the signature"* — everything key-independent is the library; the attestor
holds the private key (KMS/HSM) and `did:web:open-museum.art` doc hosting. `--signer-path` delegates signing to an
external subprocess so **key material never passes through c2patool**. That is the same architecture, and the Encoder
MUST use it for Tier-1 rather than ever handling the attestor key itself.

**E-4 (NORMATIVE):** the Encoder MUST report the tier it actually produced, in machine-readable output, on **every**
file. Silence about tier is a lie by omission — and at batch scale it is a lie repeated thousands of times.

### 3.5 Format matrix
- **Embeddable** (verified list, §1) → embed by default.
- **Everything else** (incl. many RAW variants, PSD, SVG) → **sidecar `.c2pa`**, and the Encoder MUST state that the
  credential is **detachable** (a sidecar separated from its asset is simply gone — an honesty point the UI must carry,
  not a footnote).
- **E-5:** the Encoder MUST NOT silently transcode or re-encode an asset to make it embeddable. Re-encoding an
  artist's master to fit our tooling is a destructive act performed for our convenience. Offer sidecar; never
  transcode.

### 3.6 Remote manifests — REJECTED for v1
`-r` embeds a URL and hosts the manifest remotely. **Rejected**, because it recreates precisely the dependency the
Amar longevity guarantee was written to avoid: the credential stops being *in the file* and starts depending on **our
domain staying up**. Sidecar keeps the bytes with the artist. *(Revisit only if a hosting model is explicitly chosen —
Pramod call P-3.)*

### 3.7 Batch mode
- **Idempotent** — re-running over a done folder is a no-op, not a double-encode.
- **Resumable** — a run journal (path, input hash, tier, output, result) so an interrupted 10TB run resumes.
- **Fail-isolated** — one bad file MUST NOT abort the run or, worse, leave a half-written output.
- **Atomic per file** — write to temp, fsync, rename. Never a partially-written artwork file.
- **Summary is a REPORT, not a verdict** — counts by tier and by outcome. **No "success" framing for a Tier-0 run:**
  it succeeded at producing Tier-0, which is not authenticity, and the summary must say which.
- **Journal-write ordering (normative, confirming CR-2 Axis 3):** a journal entry is written **only after the atomic
  rename succeeds.** A crash mid-file therefore leaves **no row at all**, and *"no row = not done = retry"* is a clean
  invariant needing no two-phase commit. CR-2 verified this holds; stating it explicitly so it is not re-derived (or
  got wrong) at build time.
- **The journal is an instance of this codebase's established batch idiom** *(CR-2 Finding 5)*: append-only entries,
  an idempotency key, one-writer discipline — the same shape as the FSD-003 ledger and the collecting-society /
  provenance-seam idempotency patterns. Named so a future reader finds the precedents.

### 3.8 E-8 (NORMATIVE) — BATCH EXIT-CODE SEMANTICS, BOTH APPS *(CR seat 1, F3)*

**A 10TB run with 40 failed files that completes and exits `0` is a silent failure at the process boundary.** Any
pipeline wrapping the CLI reads `0` as *"all done"* — the outcome lives in the journal while the status code says
success. That is the `FP-2xx-outcome-blind-spot` class (art PR #71) in CLI form, and batch onboarding is exactly where
it bites hardest, because nobody reads a 200k-line journal by hand.

> **E-8 (NORMATIVE), applying to the Encoder AND the Inspector:**
> - **any failed file ⇒ non-zero exit.**
> - failures MUST be **enumerated on stderr**, not only in the journal.
> - **"failed" MUST be distinguishable from "skipped-as-already-done"** — in the journal *and* at the process
>   boundary. An idempotent re-run that skips 100k done files is **not** a run with 100k problems, and a run with 40
>   real failures must not read as a clean skip.

*Otherwise resumable batch runs train operators to ignore the one signal automation actually reads.*

## 4. THE INSPECTOR — the highest-risk surface in the project

Reads any file and shows what rights information it carries: **OCM when present**, plus broader **EXIF / IPTC / IIIF /
C2PA**. Single file or folder batch.

### 4.0 Why this section is disproportionately long
OM-OR called the web inspector *"the public trust surface."* Correct — and that is the danger. **Everything this lane
has built this month becomes UI here, and UI is where honest data gets captioned into a lie.** My own provenance-seam
finding stands: *a field that cannot lie can still be captioned into one.* The schema rules stop at the API boundary;
the Inspector is what the public actually sees. If the Inspector renders a green tick, the standard's honesty is
cosmetic.

### 4.1 I-1 (NORMATIVE) — NO AGGREGATE VERDICT. NO GREEN TICK.
The Inspector MUST NOT display a single overall status for a file — no "Verified", no "Rights OK", no score, no
traffic light, no letter grade. It reports **what is present, per source, with its epistemic grade** (§4.3). Any
aggregate is an adjudication, and **OC does not vouch** (the standing ruling: *govern identity, not truth*; the
KYC "guaranteed authentic" registry is our foil, not our model).

### 4.2 I-2 (NORMATIVE) — ABSENCE IS NOT A FINDING, IN EITHER DIRECTION
Most files will carry **nothing**. The Inspector MUST render that as *"No Clearance Manifest found in this file"* —
and MUST NOT render, imply, or caption it as *"no rights,"* *"unrestricted,"* *"public domain,"* *"free to use,"* or
*"clean."* Equally it MUST NOT imply the file is *suspect*. **This is D-6/P-3 as UI**: absence of a record is a
statement about the record, never about the work.

*(Corollary, and it will come up in design review: the empty state is the **most-viewed screen** in the whole app,
because most files have no OCM. It deserves the most careful copy in the product, not the least.)*

### 4.3 I-3 (NORMATIVE) — THREE EPISTEMIC GRADES, VISUALLY DISTINCT, NEVER MERGED
The Inspector's core intellectual job. Every displayed fact belongs to exactly one grade, and they **must not share a
visual language**:

| Grade | What it is | Examples | Honest phrasing |
|---|---|---|---|
| **A — COMPUTED** | deterministic math, offline, no trust required | Tier-0 SHA-256 integrity; C2PA hard-binding | *"The manifest bytes are unaltered — checked here, on your machine."* |
| **B — CRYPTOGRAPHIC + TRUST-ROOT** | math **plus** a resolvable trust anchor | C2PA signature validity; signer → `did:web` | *"Signed by X, whose key resolved at <domain> on <date>."* |
| **C — ASSERTED** | someone's claim, carried faithfully | every rights/provenance/GI field; all EXIF/IPTC | *"X states: …"* — **always attributed, never bare** |

**The failure to design against:** a signature check (grade B) rendered adjacent to rights content (grade C) reads as
*"the rights were verified."* They are different claims. The Tier-1 contract is explicit: `ATTESTED_DELEGATE` means
*"OMA's accountable signature on faithful carriage,"* **not** *"an independent third party verified the rights."*
**The Inspector MUST carry that distinction visually, not merely in a tooltip.**

**Where the §4.5 failure states sit in this scheme** *(CR-2 Finding 3)*: `REJECTED` is a **negative grade-B result** —
the cryptographic check ran and **failed**. It is not a fourth grade. *"Could not re-resolve"* is **grade B
incomplete** — the check could not be run at all. *"No credential present"* is **outside the grades entirely**: no
claim was made, so there is nothing to grade (I-2). **Failing a check, being unable to run a check, and there being
nothing to check are three different things, and the UI MUST NOT collapse them.**

### 4.3.1 I-7 (NORMATIVE) — THE INSPECTOR MUST DISQUALIFY DEV/TEST-KEY SIGNATURES ON READ *(CR seat 1, F2)*

E-1/E-6 stop **us** producing test-signed files. **The world is full of files test-signed by other tools** — stock
c2patool with no credentials produces one in a single command — **and the Inspector will read them.**

As first specced, such a file rendered as grade B: *"Signed by X, whose key resolved…"* — **a structurally valid
signature presented as a signature.** That is precisely the *"worse than nothing"* state §2 diagnoses, reproduced by
our own trust surface, on files we did not make.

> **I-7 (NORMATIVE).** A signature chaining to a **publicly known development/test certificate** MUST render in its
> **own visual state** — never a bare *"Signed by"* — carrying words to the effect of: **"signed with a publicly
> available development key — this signature carries no authenticity."** It MUST NOT be presented as grade-B
> authenticity.

**This is the symmetric closure of E-1: the write path refuses to make them; the read path refuses to dignify them.**
*(Conformance: a test-signed fixture — trivially produced with stock c2patool — renders the disqualifier.)*

### 4.4 I-4 (NORMATIVE) — SHOW CONFLICTS; DO NOT RECONCILE THEM
EXIF, IPTC, IIIF, C2PA and the OCM will disagree — different creators, different licences, different dates. The
Inspector MUST display each source **separately and attributed**, and MUST **surface** disagreement explicitly. It
MUST NOT merge them into one answer, rank them by trustworthiness, or silently prefer one.

**Reconciling conflicting rights claims is adjudication — the exact thing OC refuses.** And the disagreement is
frequently *the most useful thing on the screen*: an IPTC block saying "All rights reserved" beside an OCM saying CC0
is a **finding a human needs to see**, not a conflict for us to resolve on their behalf.

**Disambiguation — "surface disagreement" means PASSIVE TRANSPARENCY, not ACTIVE DETECTION** *(CR-2 Finding 2)*.
Two readings were available and they carry different risk:
- **PASSIVE (adopted):** always render **every source side-by-side, unranked, attributed**, and let a human see the
  conflict. Requires no comparison logic and **cannot accidentally adjudicate.**
- **ACTIVE (rejected):** the tool *computes* that two sources disagree and flags it. That requires deciding **which
  fields from different vocabularies are "the same claim"** — an interpretive step that is **itself adjudication**,
  smuggled in as a convenience feature.

**Adopted: passive.** The Inspector MUST NOT implement a cross-source equivalence engine. *(An equivalence map between
EXIF, IPTC, IIIF and OCM fields would become a second, unaccountable adjudicator living inside a tool whose entire
premise is that it does not adjudicate.)* Conformance vector #8 is read accordingly: **both sources rendered, neither
ranked, neither suppressed.**

### 4.5 I-5 (NORMATIVE) — HONEST FAILURE STATES
Distinguish, and never collapse:
- **`REJECTED`** — hash mismatch or broken signature chain. *A real negative finding.*
- **"could not re-resolve the signer's key"** — e.g. `did:web:open-museum.art` unreachable. **NOT invalid.** This is
  the Amar §2.1 gap made visible: the signature bytes are intact, but re-checking the key fetches a domain that may be
  down, offline, or (someday) gone. Copy MUST say *"could not check"* — never *"invalid"* or *"untrusted."*
- **"no credential present"** — §4.2.
- **"format not supported"** — our limitation, not a property of the file. Say so.

### 4.6 I-6 — CLIENT-SIDE ONLY FOR THE WEB SURFACE (privacy is a rights issue)
The web inspector MUST process files **entirely in-browser** via `c2pa-wasm`. **Bytes MUST NOT be uploaded.**

**Why this is a hard constraint, not a preference:** the users are **artists dropping unpublished work** and
**collectors dropping works whose provenance they are quietly checking**. Uploading either to our server would make OM
the custodian of exactly the material people are using the tool to be careful about. A rights tool that harvests the
files it inspects is self-refuting.

**Scoping the privacy claim precisely — "nothing leaves the device" was too broad** *(CR seat 1, N1)*. Grade-B
verification may **re-resolve a `did:web` key**, which is a network call. It moves **no file bytes** — but it leaks
**which signer someone is checking, and that a check is happening at all**. For *"a collector quietly checking a
work's provenance,"* that metadata is close to the whole sensitivity.

> **NORMATIVE:** live key re-resolution is **OPT-IN, per click.** Default behaviour verifies against the
> **embedded/cached chain**, labelled *"not re-checked live"* (`keyResolution.method: "embedded-chain"`, §4.6.1). The
> privacy claim MUST be stated at this precision — **no file bytes, no file hashes, and no automatic network calls** —
> rather than as an unqualified *"nothing leaves the device,"* which the re-resolution path would falsify.

*(An overbroad privacy promise is the same species of error as an overclaimed rights guarantee — and this lane has
already corrected one of those. §7 conformance asserts the default path makes zero network requests.)*

### 4.6.1 THE INSPECTOR OUTPUT SCHEMA — first cut *(CR-2 Finding 1)*

CR-2 is right that this was the gap that mattered most: §4's rules described **concepts**, and conformance vector #6
claimed the no-aggregate-verdict rule was *"asserted structurally, so it cannot be re-added without failing"* —
**while there was nothing to assert it against.** The `claimStatus` discipline worked because it was **enforced by an
actual schema** (`additionalProperties: false`, no dangerous enum value, an `allOf`/`if-then` closing the omission
gap). Intent is not enforcement. **Providing the schema now rather than flagging it owed**, because "asserted
structurally" quietly becoming "asserted in review comments" is exactly how this gets lost once building starts.

```jsonc
{
  "type": "object",
  "required": ["inspectedAt", "file", "sources"],
  "additionalProperties": false,
  "description": "Inspector output for ONE file. NORMATIVE: there is NO aggregate verdict field, NO score, NO overall status — and none may be added (additionalProperties:false makes I-1 structurally enforced, not merely intended).",
  "properties": {
    "inspectedAt": { "type": "string", "format": "date-time" },
    "file": {
      "type": "object",
      "required": ["name", "byteSize", "formatSupported"],
      "additionalProperties": false,
      "properties": {
        "name": { "type": "string" },
        "byteSize": { "type": "integer", "minimum": 0 },
        "formatSupported": { "type": "boolean", "description": "false = OUR limitation, not a property of the file (I-5)." }
      }
    },
    "sources": {
      "type": "array",
      "description": "One entry per metadata source found (ocm | c2pa | exif | iptc | iiif). Rendered SIDE-BY-SIDE, UNRANKED, ATTRIBUTED. No cross-source equivalence engine (I-4, passive reading). An EMPTY array means no rights metadata was found — which is NOT a finding about the work (I-2).",
      "items": { "$ref": "#/$defs/sourceReport" }
    }
  },
  "$defs": {
    "sourceReport": {
      "type": "object",
      "required": ["source", "grade", "checkOutcome", "fields"],
      "additionalProperties": false,
      "properties": {
        "source": { "type": "string", "enum": ["ocm", "c2pa", "exif", "iptc", "iiif"] },
        "grade": {
          "type": "string",
          "enum": ["computed", "cryptographic", "asserted"],
          "description": "I-3. computed = deterministic offline math. cryptographic = math + a trust root. asserted = someone's claim, always attributed. These MUST NOT share a visual language."
        },
        "checkOutcome": {
          "type": "string",
          "enum": ["passed", "failed", "could-not-check", "not-applicable"],
          "description": "I-5, and DELIBERATELY SEPARATE from `grade`. failed = the check RAN and failed (REJECTED, a real negative finding). could-not-check = the check COULD NOT RUN (e.g. did:web unreachable) — NOT invalid, NOT untrusted. not-applicable = nothing to check (grade 'asserted' carries no check). Collapsing these three is the failure I-5 forbids."
        },
        "signerDisqualified": {
          "type": "boolean",
          "default": false,
          "description": "I-7. TRUE when the signature chains to a publicly known development/test certificate. When true the consumer MUST render the disqualifier state and MUST NOT present the signature as authenticity."
        },
        "attribution": { "type": "string", "description": "WHO asserts this, for grade 'asserted'. A claim is never rendered bare." },
        "keyResolution": {
          "type": "object",
          "additionalProperties": false,
          "description": "Present for grade 'cryptographic'. N1: live re-resolution is OPT-IN.",
          "properties": {
            "method": { "type": "string", "enum": ["embedded-chain", "live-resolved"] },
            "resolvedAt": { "type": "string", "format": "date-time" },
            "note": { "type": "string", "description": "e.g. 'not re-checked live' for method=embedded-chain." }
          }
        },
        "fields": { "type": "object", "description": "The metadata as found, verbatim. Never normalised across sources, never merged." }
      }
    }
  }
}
```

**What the schema enforces that prose could not:** no aggregate verdict can be added (`additionalProperties: false` at
the root); `grade` and `checkOutcome` are **separate axes**, so "signed" cannot silently mean "rights verified" and a
failed check cannot be confused with an unrunnable one; `signerDisqualified` makes I-7 a **data property** rather than
a rendering nicety; and an empty `sources` array is a **structural fact**, not a verdict.

*(OM-D: the three-grade visual language keys off `grade`; the disqualifier state keys off `signerDisqualified`; the
three `checkOutcome` states must be visually distinct. OM-QC: every user-facing string derived from these fields is in
your gate.)*

### 4.7 Batch inspection
Folder → a **report**, not a verdict: per-file grades, an explicit *"no credential"* count (never framed as failures),
and conflicts surfaced. **No aggregate score for a folder**, for the same reason as I-1. Export CSV/JSON for the
onboarding pipelines.

**Resumability — closing the asymmetry with §3.7** *(CR-2 Finding 4)*. The Encoder's batch spec is thorough about
resumability because of the 10TB archive; the Inspector's was three sentences, despite **the same scale applying**. The
Inspector never writes to inspected files, so there is **no corruption risk** — but re-inspecting a 10TB archive from
scratch after an interruption is **hours of wasted work**, which is a real cost even when it is safe.

> **NORMATIVE:** the **incrementally-written CSV/JSON export doubles as the resume journal** — appended per file after
> that file's report is complete, with the same *"no row = not done = retry"* invariant as §3.7. An interrupted run
> resumes; it does not restart. E-8's exit-code rules apply here too.

Stating it explicitly rather than leaving it implied by omission — an unstated resume story becomes "restart from
file 1" at build time by default.

## 5. FORM FACTORS — weighed, per OM-OR's "to weigh, not adopt"

I agree with OM-OR's shape, with **one rejection** and **one hard constraint**:

### 5.1 CLI core — **ADOPT**
One library, thin CLI on top; every other form factor consumes it. Scriptable, batch-native, no upload, runs in an
artist's own environment, and it is the honest substrate for a **second implementation** (C3). **The library is the
product; the CLI is its first face.**

### 5.2 Web drop-zone INSPECTOR — **ADOPT, client-side only (I-6)**
The public trust surface, and technically confirmed feasible (`c2pa-web`/`c2pa-wasm`, §1). Highest-leverage artefact
here: anyone can check any file, including files we never touched — which is exactly what makes the standard credible
rather than self-serving. **Conditional on I-6 and on §4 in full.**

### 5.3 Web ENCODER — **REJECT for v1** *(my one departure from the suggested shape)*
Encoding **writes files** and **handles signing keys**. In a browser that means either uploading originals (violating
the §4.6 principle) or holding key material in a page. Both are bad, and the second is worse. **Encoding is
local-first.** *(A hosted signing service is a different proposition and a real Pramod decision — P-1.)*

### 5.4 Batch mode — **ADOPT** as a CLI mode (§3.7, §4.7), serving artist/collector onboarding.

### 5.4.1 DISTRIBUTION — "installable" is not the same as "reachable" *(CR-2, empirical)*

CR-2 actually ran `cargo install c2patool --locked` and reported it **genuinely compiling**: a substantial native
dependency tree (rustls, ring, **`openssl-sys`**, image/PNG codecs, an ASN.1/CBOR stack, colour-management libs) across
dozens of crates, **several minutes on a clean build**, requiring a **full Rust toolchain**.

**That is a distribution finding, and the spec had a blind spot.** §3.5 claims *"no artist is excluded by file type"* —
true, and irrelevant if they are **excluded by toolchain**. `cargo install` with an `openssl-sys` native build is a
well-known source of platform-specific friction; it is not a plausible onboarding path for a non-developer artist with
a 10TB archive.

> **NORMATIVE (distribution):** the CLI MUST ship as **prebuilt, signed binaries** for macOS (arm64 + x86_64), Windows
> and Linux, via GitHub Releases. `cargo install` / build-from-source is the **contributor** path, never the artist
> path. **A build step is a gate, and gating rights literacy behind a Rust toolchain would contradict the point of the
> program.**

*(Corollary for §6: whether c2patool is invoked as a subprocess or `c2pa-rs` is linked as a library is now a
**distribution** decision, not only an architectural one — a linked library ships as one binary; a subprocess must be
bundled and version-pinned. OM-M/OM-AR call, flagged in S1.)*

### 5.5 Not now
Desktop GUI · IDE/DAM plugins · a hosted encode API. All defensible later; none needed to prove the thing.

## 6. Build slices (for OM-M / B-pool, via OM-AR)
1. **S1 — OCM codec core.** Read/write the OCM assertion, byte-exact (E-3). Tier-0 integrity verify. *No C2PA yet.*
2. **S2 — Inspector CLI, single file.** OCM + C2PA + EXIF/IPTC read; three grades (I-3); honest failure states (I-5).
3. **S3 — Encoder CLI, single file, Tier-0 only.** E-1/E-2/E-3/E-5 enforced from the first commit — **not retrofitted.**
4. **S4 — Batch** for both (§3.7, §4.7).
5. **S5 — Tier-1 signing** via `--signer-path` against the locked attestor seam (§3.4).
6. **S6 — Web drop-zone inspector**, client-side WASM (I-6).

**Sequencing note:** S3 lands **Tier-0 only** on purpose. Signing arrives at S5, *after* the honesty rules are proven
in code. **Building the signing path first would create exactly the pressure that makes E-1 get "temporarily" relaxed
to unblock a demo.**

## 7. Conformance (the tools are themselves conformance-checked)
1. **E-1:** no credentials + `--sign` ⇒ **Tier-0 output and non-zero exit**; **never** a test-signed file.
2. **E-6 (NEW — the vector the suite was missing):** a **default, no-`--sign` run** produces an artifact carrying **no
   claim signature of any kind**, asserted **structurally on the output bytes**, not on the CLI's own report.
   *(This is now the single most important vector in the suite: it guards the path everybody uses.)*
3. **E-7 (NEW):** post-encode self-verification — a signed encode whose output certificate is **not byte-identical** to
   the configured credential ⇒ **run fails, output discarded.** Test with a deliberately substituted cert.
4. **E-1b (demoted to defence-in-depth):** a known dev/test certificate is detected and refused.
5. **E-2:** `output == input` ⇒ refused; originals **byte-identical** after any run (hash before/after). *(Note
   c2patool errors by default if the output file exists, requiring `--force` — a separate general guard; E-2's "under
   any flag" language already anticipates that escape hatch.)*
6. **E-3:** encode → inspect round-trip ⇒ integrity hash **still validates** (catches re-serialization).
7. **E-5:** a non-embeddable format ⇒ sidecar, **original not transcoded**.
8. **E-8 (NEW, both apps):** a batch with ≥1 failed file ⇒ **non-zero exit** + failures enumerated on stderr; a
   fully-skipped idempotent re-run ⇒ **exit 0**, and the two are distinguishable in the journal.
9. **I-1:** the Inspector's output **validates against §4.6.1 and contains no aggregate verdict field** — enforced by
   `additionalProperties: false`, so it cannot be re-added without failing.
10. **I-2:** a file with no OCM ⇒ empty `sources` array; output contains no "clear"/"free"/"unrestricted" language.
11. **I-7 (NEW):** a **test-signed fixture** (trivially produced with stock c2patool) ⇒ `signerDisqualified: true` and
    the disqualifier state; **never** a bare "Signed by".
12. **I-3/I-5 separation (NEW):** `grade` and `checkOutcome` are independently asserted — a `failed` check, a
    `could-not-check`, and a `not-applicable` are **three distinct outputs**, never collapsed.
13. **I-4 (passive):** a fixture with **deliberately conflicting** EXIF vs OCM ⇒ **both rendered, neither ranked,
    neither suppressed**; no equivalence engine present.
14. **I-5:** unreachable `did:web` ⇒ *"could not check"*, **not** `REJECTED`.
15. **I-6 / N1:** the **default** web inspect path makes **zero network requests**; live key re-resolution fires **only**
    on explicit opt-in (automated).

## 8. Rulings that are Pramod's — NOT decided here
- **P-1 — Does OM offer a HOSTED SIGNING SERVICE** (Tier-1 delegated attestation as a service)? The biggest question
  in this brief. It is what most artists will actually want (they have no PKI — the whole reason Tier-1 exists), and
  it makes OM an **attestation authority with real liability**, signing statements about works we did not verify.
  §3.4 keeps the seam open either way; **the business/liability call is yours.**
- **P-2 — Open-source the tools?** My recommendation: **yes** — a standard whose only implementation is the vendor's
  is a vendor format (my own framing in the Amar guarantee). An independently runnable inspector is the C3
  second-implementation path, and it is what makes the open-standard longevity claim *true* rather than aspirational.
- **P-3 — Remote manifests** (§3.6): rejected for v1; revisit only with a deliberate hosting model.
- **P-4 — Branding on the public inspector.** If it carries OM branding, its output reads as *OM's verdict* on
  third-party files — re-importing the vouching problem through the logo. Worth a deliberate decision.
- **P-5 — Order:** Inspector or Encoder first? **My recommendation: INSPECTOR.** It is read-only (cannot damage an
  archive), it is the public trust surface, it is the conformance checker, and **it is the thing that makes the
  Encoder's output checkable by someone other than us.**

## 9. Council review (NOT self-signed, per the brief)
- **OM-CR** — the normative rules, the E-1 refusal, byte-exactness, conformance vectors.
- **OM-QC** — **required**: the Inspector is external-facing public copy, and §4.2's empty state plus §4.3's grade
  language are exactly where honest data gets captioned into a lie. *This is a copy gate, not a nicety.*
- **OM-AR** — the seam: library/CLI/WASM boundaries, the `--signer-path` reconciliation with the locked attestor.
- **OM-M / B-pool** — buildability of §6, and whether S1's byte-exact codec is cleanly separable.
- **OM-D** — the §4.3 three-grade visual language; I-1 and I-3 are ultimately *design* problems, and a designer who
  has not read §4 will reach for a green tick by reflex.
