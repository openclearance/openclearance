# Spec addition: a cleaned form for verbatim source text

**Date:** 2026-10-25 · **Target version:** v0.2 (additive; v0.1 FROZEN)

---

## 1. The problem this closes

`rights.sourceApiValue.value` carries the source's licence value exactly as the source returned it.
That is deliberate. It is the manifest's evidence of what the source said, and evidence that has
been edited is no longer evidence.

Source text can contain characters that do not render. The Unicode tag characters (U+E0000 block)
can spell out a whole sentence that no reader sees. A right-to-left override (U+202E) reorders what
a reader sees without changing what a program reads. Zero-width characters split or join words
invisibly. None of these appear on screen, but every one of them is in the string, and a program
that reads the string reads them.

So a value can look like `CC0` to a person and carry a sentence to a language model that is given
the same string. The manifest cannot drop that value, because it is evidence. It also cannot let
the verbatim value be the form that consumers display or pass to a model. Those two requirements
pull in opposite directions, so this proposal gives the manifest two forms of the value: the
verbatim one, unchanged, and a cleaned one defined by a function that anyone can recompute.

## 2. Design principles

1. **The verbatim value does not change.** `value` keeps every character the source sent.
2. **The cleaned form is a function, not a judgement.** `clean()` is defined exactly (section 3),
   so a verifier can recompute it and a consumer never has to trust the producer's version.
3. **clean() only removes characters.** It decodes no HTML, applies no Unicode normalisation and
   changes no whitespace. Removal from a fixed set is idempotent, and every implementation that
   follows the definition gets the same output. Section 3.5 keeps that true for JSON parsers that
   cannot hold an unpaired surrogate.
4. **Nothing is claimed beyond what clean() does.** It removes a fixed set of invisible characters,
   not every invisible character. Visible text passes through unchanged, including any instruction
   written in plain sight, and so do the invisible characters clean() keeps (section 7).

## 3. clean(), normatively

clean(s) is the string s with every code point in the set **R** removed. Nothing else changes.

### 3.1 The removed set R (pinned to Unicode 16.0)

| Code points | What they are |
|---|---|
| U+0000..U+0008, U+000B..U+000C, U+000E..U+001F | C0 controls, except TAB (U+0009), LF (U+000A) and CR (U+000D) |
| U+007F..U+009F | DELETE and the C1 controls |
| U+00AD | Soft hyphen |
| U+034F | Combining grapheme joiner |
| U+061C | Arabic letter mark (bidirectional control) |
| U+115F..U+1160, U+3164, U+FFA0 | Hangul fillers |
| U+17B4..U+17B5 | Khmer inherent vowels (deprecated, invisible) |
| U+200B | Zero-width space |
| U+200E..U+200F | Left-to-right and right-to-left marks |
| U+202A..U+202E | Bidirectional embeddings and overrides |
| U+2060..U+206F | Word joiner, invisible operators, bidirectional isolates, deprecated format characters |
| U+FE00..U+FE0F | Variation selectors 1 to 16 |
| U+FEFF | Zero-width no-break space (byte-order mark) |
| U+FFF0..U+FFF8 | Reserved default-ignorable code points |
| U+FFF9..U+FFFB | Interlinear annotation anchor, separator and terminator |
| U+1BCA0..U+1BCA3 | Shorthand format controls |
| U+1D173..U+1D17A | Musical symbol format controls |
| U+E0000..U+E0FFF | Tag characters, variation selectors 17 to 256, and the reserved rest of the block |
| unpaired surrogates | Code units U+D800..U+DFFF that do not form a pair; they are not characters at all. JSON text can carry them as `\u` escapes (section 3.5). |

**How the set is derived**, for implementers who work from Unicode properties: R is
`Cc` minus {TAB, LF, CR}, union `Default_Ignorable_Code_Point` minus the kept set below, union
U+FFF9..U+FFFB, union unpaired surrogates. Under Unicode 16.0 that derivation gives exactly the
table above. **The table is normative and the derivation is informative**: a later Unicode version
may add default-ignorable code points, and the definition must not change under an implementation
that upgrades its Unicode data. A later spec version can extend the table.

**Pairing is judged on the input.** A surrogate is unpaired when its neighbour in the input string is not its partner. Removal happens in one pass over the input, so removing a character from between two surrogate halves removes both halves too, and never joins them into a new character.

### 3.2 Kept, though default-ignorable

| Code points | Why they stay |
|---|---|
| U+200C, U+200D | Zero-width non-joiner and joiner. They are spelling in Persian, in Indic scripts and in Sinhala, and they build emoji sequences. Removing them changes words. |
| U+180B..U+180F | Mongolian free variation selectors and the Mongolian vowel separator. They select the correct letter forms in Mongolian text. |

### 3.3 Format characters that are not removed

Some format characters are not default-ignorable and render visibly or carry spelling: the Arabic
number signs U+0600..U+0605, U+06DD and U+08E2, the Syriac abbreviation mark U+070F, U+0890..U+0891,
the Kaithi number signs U+110BD and U+110CD, and the Egyptian hieroglyph format controls
U+13430..U+1343F. clean() leaves them alone. The interlinear annotation characters U+FFF9..U+FFFB
are the exception: they can hide annotation text from display, and removing them leaves both the
base text and the annotation visible, which fails safe.

### 3.4 clean() over a JSON value

`value` can hold any JSON value, so clean() extends to JSON:

- a string becomes clean(string);
- an array becomes the array of its cleaned members, in order;
- an object becomes an object whose member names and member values are both cleaned;
- numbers, booleans and null are unchanged.

**If cleaning would give one object two members with the same name**, for example `license` and
`license` followed by U+2063, the result of clean() for the whole value is `null`. A hidden
duplicate name is a strong signal in itself, and choosing either member would silently decide which
reading the consumer sees. With `null`, the consumer sees that no clean reading exists.

### 3.5 Unpaired surrogates in JSON text

JSON text can carry a lone surrogate as a `\uXXXX` escape: RFC 8259 allows it, and I-JSON
(RFC 7493) forbids it. Many JSON parsers cannot hold the result. Some replace it with U+FFFD, which
clean() does not remove, and some reject the whole text. A verifier built on such a parser would
compute a different clean(), or none at all, for a conforming manifest. So:

- Wherever this specification computes clean() or tests a string against R (SC-2, SC-3), an escape
  for a code unit in U+D800..U+DFFF in the manifest's JSON text means that code unit. It never
  means U+FFFD.
- An escape is half of a pair only when a high-surrogate escape (U+D800..U+DBFF) is directly
  followed by a low-surrogate escape (U+DC00..U+DFFF). Every other surrogate escape is unpaired. A
  raw character in the text is never half of a pair, since UTF-8 cannot encode a surrogate. This is
  the pairing rule of section 3.1, read at the level of escapes.
- A verifier whose parser cannot represent unpaired surrogates MUST still reach the result above.
  It removes every unpaired surrogate escape from the JSON text of `value` before decoding, then
  applies clean(). It applies the merge rule of section 3.4 to member names after that removal and
  before its parser resolves duplicate names. A verifier MUST NOT reject a manifest only because
  `value` contains an unpaired surrogate escape.
- In `valueCleaned` and in `ruleContext`, an unpaired surrogate escape is a code point in R, so the
  manifest fails SC-2 or SC-3. A verifier whose parser cannot represent it MUST detect such an
  escape in the JSON text of those fields and reject the manifest; it MUST NOT remove it there.
- U+FFFD written in the text itself, as a character or as an escape, is a visible character and is
  kept.

The conformance harness carries a reference for the escape-level route and checks that it agrees
with clean() of the decoded value.

## 4. Normative rules

- **SC-1 (producer).** In a v0.2 manifest, when `rights.sourceApiValue` is an object, it MUST carry
  `valueCleaned`, equal to clean(`value`).
- **SC-2 (verifier).** A conforming verifier MUST reject a v0.2 manifest whose `valueCleaned` is not
  clean(`value`), compared as JSON values (member order is not significant). Section 3.5 says how
  to read unpaired surrogate escapes.
- **SC-3 (producer prose).** In a v0.2 manifest, `verification.ruleContext` MUST NOT contain any
  code point in R. Where it quotes source text, it quotes clean(text). A conforming verifier MUST
  reject a manifest whose `ruleContext` contains a code point in R.
- **SC-4 (consumer).** A consumer MUST NOT display `value`, or any string inside it, as plain text,
  and MUST NOT pass it to a language model. It uses `valueCleaned`, or clean(`value`) computed
  locally. A forensic view that shows each removed character as a visible escape is not plain-text
  display.
- **SC-5 (consumer, unsigned manifests).** A Tier-0 manifest is not authenticated, so on Tier-0 a
  consumer MUST compute clean(`value`) itself and use that result; it MUST NOT rely on the emitted
  `valueCleaned` alone. The field is a convenience; the function is the guarantee. A consumer that
  finds the two different has found an inconsistent manifest (SC-2).
- **SC-6 (consumer).** A consumer SHOULD treat all source text, cleaned or not, as untrusted data.
  Documentation and interfaces MUST NOT describe `valueCleaned` as "safe" or "sanitised".

## 5. The field

```json
"sourceApiValue": {
  "type": ["object", "null"],
  "required": ["field", "value", "valueCleaned"],
  "additionalProperties": false,
  "properties": {
    "field": { "type": "string", "minLength": 1 },
    "value": {},
    "valueCleaned": {}
  }
}
```

The schema carries the full descriptions. `valueCleaned` has no JSON type constraint because it
mirrors `value`, which has none; SC-2 is what binds it. The JSON-LD context maps `valueCleaned` to
`https://openclearance.org/v0.2/vocab#valueCleaned`, in the v0.2 vocabulary, next to `value`, which
keeps its v0.1 term.

Example, from the conformance vectors (escapes shown as they appear in the JSON):

```json
"sourceApiValue": {
  "field": "rights_statement",
  "value": "CC0\u200B\u202E\uDB40\uDC49\uDB40\uDC67 ... \u202C",
  "valueCleaned": "CC0"
}
```

The tag characters in `value` spell out an instruction. `valueCleaned` is the text a reader sees.

## 6. Why ruleContext gets a constraint and not a second cleaned field

`ruleContext` is the producer's own prose, for example `rights_statement='CC0' => cc0`. It is not
evidence: the evidence of what the source said is `sourceApiValue.value`, which keeps every
character. A producer that writes prose controls what goes into it, so the right rule is that it
writes clean prose (SC-3). A cleaned twin of `ruleContext` would add a field that can only ever
equal its sibling, and would leave the uncleaned prose in the manifest for a consumer to pick up by
mistake.

## 7. What clean() does not do

clean() removes the code points in R and nothing else. Stated precisely, so nobody overclaims it:

- **Visible instructions survive.** Text written in plain sight, in any script, passes through.
  Nothing in this proposal detects instructions or judges content.
- **Kept invisible characters survive, in any number.** ZWNJ, ZWJ and U+180B..U+180F (section 3.2)
  stay wherever they occur, including in long runs. Seven code points that survive in any order are
  enough to encode hidden data, so a consumer SHOULD NOT treat `valueCleaned` as free of invisible
  content. Section 11 asks whether to keep them only in context.
- **Some characters that may not render are not removed.** Private-use characters (U+E000..U+F8FF,
  U+F0000..U+FFFFD and U+100000..U+10FFFD), the noncharacters (U+FDD0..U+FDEF and the last two code
  points of every plane, such as U+FFFE and U+FFFF), the line and paragraph separators U+2028 and
  U+2029, the braille pattern blank U+2800 and the object replacement character U+FFFC are not in
  R. Private use matters most: depending on the font it renders as nothing or as a box, and it can
  carry arbitrary data. None of these is default-ignorable, so leaving them follows from the
  definition. Removing any of them would be a separate decision (section 11).
- **Look-alike characters survive.** A Cyrillic letter that looks like a Latin one is visible and
  is kept. Confusable detection is a separate problem with a separate answer.
- **Markup is not decoded.** `&lt;` stays `&lt;`. A consumer that renders HTML has its own escaping
  duty.
- **No normalisation.** Composed and decomposed forms stay as they were. Comparing strings across
  normalisation forms remains the consumer's job.
- **It proves nothing about the source.** On an unsigned manifest, `value` is what the producer says
  the source sent. clean() makes that text inspectable; it does not authenticate it.

Removal has small display costs, accepted on purpose: a soft hyphen loses a hyphenation hint, a
left-to-right or right-to-left mark loses its effect on mixed-direction display, and a variation
selector loses the glyph variant it selected while its base character stays.

## 8. Scope boundaries

- **v0.1 cannot carry the field.** v0.1 is frozen, and its `sourceApiValue` is closed. Nothing here
  edits v0.1. A consumer rule for v0.1 manifests (SC-4 and SC-6 applied to a manifest without
  `valueCleaned`) needs the published-version errata path, and is not decided by this proposal.
- **Other verbatim text.** Implementations that keep other verbatim source text outside the
  manifest, in their own records or interfaces, can apply the same clean() by reference. This
  proposal defines the function so that one definition serves them all.

## 9. Conformance vectors

| Vector | Expected |
|---|---|
| `rights-source-text-cleaned.json` | Valid. A tag-character instruction behind an override and a zero-width space in `value`; `valueCleaned` is `CC0`. |
| `rights-source-text-joiner-kept.json` | Valid. Persian text with a ZWNJ and a leading byte-order mark; the ZWNJ stays, the mark goes. |
| `rights-source-text-key-collision.json` | Valid. Two member names that clean to one; `valueCleaned` is `null`. |
| `rights-source-text-proto-member.json` | Valid. `value` holds a member named `__proto__`, and `valueCleaned` keeps it as a member. |
| `rights-source-text-proto-merge.json` | Valid. `__proto__` and `__proto__` followed by U+200B clean to one name; `valueCleaned` is `null`. |
| `rights-source-text-lone-surrogate.json` | Valid. `value` ends in an unpaired high surrogate, as a string cut inside an emoji does; `valueCleaned` drops it. |
| `negative/rights-source-text-uncleaned.json` | Rejected (SC-2): `valueCleaned` still contains U+202E. |
| `negative/rights-source-text-altered.json` | Rejected (SC-2): `valueCleaned` changes visible text. |
| `negative/rights-source-text-collision-merged.json` | Rejected (SC-2): a merge resolved to one member instead of `null`. |
| `negative/rights-source-text-surrogates-joined.json` | Rejected (SC-2): `value` holds two surrogate halves split by a zero-width space, and `valueCleaned` joins them into one emoji. clean() removes all three. |
| `negative/rights-source-text-surrogate-replaced.json` | Rejected (SC-2): `valueCleaned` has U+FFFD where `value` has an unpaired surrogate (section 3.5). |
| `negative/rights-rulecontext-invisible.json` | Rejected (SC-3): `ruleContext` contains U+202E. |
| `negative/rights-source-text-missing-cleaned.json` | Schema-invalid: `sourceApiValue` without `valueCleaned`. |

The harness also checks clean() itself: the literal set equals its Unicode 16.0 derivation, clean()
is idempotent, TAB, LF, CR, ZWNJ, ZWJ and the Mongolian selectors and vowel separator survive, unpaired surrogates do
not, removing a character between two surrogate halves never joins them, markup and whitespace are untouched, a member-name merge at any depth gives `null`, a member named
`__proto__` stays a member, and removing unpaired surrogate escapes before decoding agrees with
clean() of the decoded value. The derivation cross-check runs under Unicode 16.0 and any later
version, so a later version that adds default-ignorable code points fails it and prompts the
decision in section 11. Under an older version it cannot run: it is reported as skipped rather than
passed, and it fails the run under CI. Every
existing v0.2 example with a `sourceApiValue` now carries `valueCleaned`.

## 10. Versioning

v0.2 is not yet published, so the field is added to the v0.2 schema in place and is required from
the start. No published document changes. v0.1 is untouched.

## 11. Open questions

1. **Variation selectors** (U+FE00..U+FE0F and U+E0100..U+E01EF). Removed by default. The cost:
   emoji lose their presentation selector, and ideographic variation sequences in names lose the
   selected glyph variant. The base characters stay in both cases. Keeping them would leave a
   channel of up to 256 invisible values per position. The reference engine's open input-cleaning
   change (open-museum-mcp #202) currently keeps variation selectors, while this draft removes them.
   One decision covers both: either they end up the same, or the reason they differ is stated.
2. **Zero-width space, word joiner and byte-order mark** (U+200B, U+2060, U+FEFF). Removed by
   default. The cost: some sources use U+200B as a line-break hint in scripts written without
   spaces, such as Thai, Lao, Khmer and Burmese; removing it loses break opportunities, not letters.
3. **Subdivision flags.** The flags of England, Scotland and Wales are tag-character sequences, so
   clean() reduces each to a plain black flag. Keeping exactly those sequences would need clean() to
   recognise whole sequences rather than single code points, which makes it harder to implement
   identically everywhere. Removed by default.
4. **Unicode upgrades.** The table is pinned to Unicode 16.0. A later spec version decides whether to
   extend it when Unicode adds default-ignorable code points.
5. **Keeping ZWNJ, ZWJ and the Mongolian characters only in context.** They are kept wherever they
   occur (section 7). A remove-only, deterministic alternative would keep them only in context: no
   kept character directly after another kept character, the Mongolian selectors and vowel
   separator only after a Mongolian letter, and ZWNJ and ZWJ only between two characters that clean()
   does not remove. That closes most of the channel, at the cost of a definition that looks at
   neighbours. Not decided.
6. **Unpaired surrogates at the producer.** Section 3.5 puts the work on verifiers. The alternative
   is to require producers to emit I-JSON, so that no manifest carries an unpaired surrogate escape
   at all. Every JSON parser could then read every manifest, but `value` would no longer be exactly
   what the source sent when the source sent an unpaired surrogate or a noncharacter, both of which
   I-JSON forbids. Not decided.
7. **Private-use characters.** Not removed (section 7). Removing them closes a data channel, and
   also removes legitimate private-use text, such as characters for scripts Unicode does not yet
   encode. Not decided.
