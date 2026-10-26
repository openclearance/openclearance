# Spec addition: provenance source markup (source strings carry it, interpretation strings never do)

**Date:** 2026-10-26 · **Target version:** v0.2 (additive; v0.1 frozen) · **Status:** draft
**Builds on:** the provenance block for v0.2 (proposal in preparation, not yet published). Rule numbers here
continue that proposal's (P-1 to P-10): this document clarifies its P-7 and adds P-11.
**Vectors:** `provenance-source-markup-2026-10-26.vectors.json`, checked by `npm run conformance` (section 10).

---

## 1. The question this settles

Institutions publish provenance as HTML. The markup is not decoration. In a sample of 2,140 provenance records
from two sources, gathered by one producer:

- 67 records carry markup in the provenance text itself: links, block markup around per-step footnotes, and
  HTML comments.
- A link's target can be the citation. One record links the archived letters that document its chain, and
  stripping the markup would delete the source's evidence for its own chain.
- Character references appear 89 times (`&nbsp;` 86, `&amp;` 3), each ended by `;`.
- One source publishes provenance as structured data whose string values hold HTML.

The provenance block's P-7 says the source's provenance text is carried "exactly as published. Never normalised,
re-punctuated, or tidied." That is right and does not change. But P-7 does not say what the text *is* when it holds
markup, and the two readings lead to opposite failures:

- Read it as text to be cleaned, and a producer strips the links, which deletes citations.
- Read it as the source's string, and a consumer that places it in a page as HTML runs the source's markup in the
  consumer's page.

This proposal takes the second reading for the producer and adds the two duties that make it safe: a consumer never
uses a source string as markup, and every string the producer writes itself is text.

## 2. What it builds on

The provenance block carries:

- `sourceRecord.raw`: the source institution's provenance record, verbatim. Authoritative (P-7).
- `sourceRecord.caveat`: the source's own hedge about its record, verbatim, where one is published (P-6).
- `chain[]`: an optional structured interpretation of `raw`, with strings such as `holder.name`,
  `holder.location`, a gap entry's `note`, and an adverse finding's `summary`, `scope.regions[]` and
  `scope.cases[]`. Where `chain[]` and `raw` disagree, `raw` wins (P-7).

`raw` and `caveat` are **source strings**. Every other string in the block is an **interpretation string**: the
producer wrote it, even when it copied the words.

## 3. Normative rules

### P-7 (clarified): a source string is carried as published, and it is never markup for the consumer

**Producer.** A source string is the source's string as published, code point for code point, with its markup and
character references in place. A producer **MUST NOT** strip, decode, escape or otherwise rewrite it. JSON escaping
in the serialised document is not rewriting: the string compared is the parsed JSON value. (The bytes of the
document are the envelope's concern, through its integrity hash; this rule is about the value.)

**Consumer.** A source string is source content. A consumer **MUST NOT** insert a source string into a document as
markup. It shows the string as text, escaped for wherever it is placed, or it shows the string's text form
(section 4).

A consumer that parses a source string with an HTML parser and renders a sanitised result is rendering its own
interpretation of the source. This proposal does not define one, and the manifest vouches for none.

### P-11 (new): an interpretation string is text, never markup

An interpretation string **MUST NOT** contain a `<` followed by an ASCII letter, `/`, `!` or `?`. A manifest with
one is **non-conforming**.

Those four characters are exactly where the HTML tokenizer leaves text: after a `<`, a letter starts a tag, `/` an
end tag, `!` a comment or declaration, and `?` a processing instruction. A `<` followed by anything else, or by
nothing, is read as the character `<`. So a string that passes holds no tag, comment or declaration when read as
HTML. It is still text, and a consumer escapes it like any other text for the place it puts it.

The rule needs nothing outside the manifest, so a verifier checks it directly. As a JSON Schema pattern
(ECMA-262), for each interpretation string in the block's schema:

```json
{ "type": "string", "pattern": "^(?:[^<]|<(?![A-Za-z/!?]))*$" }
```

`5 < 6`, `<3`, `a <= b` and a trailing `<` pass. `<a href=x>`, `</div>`, `<!--` and an unclosed `<b` fail.

**Derivation.** Where a producer takes an interpretation string from a source string that is HTML, it **MUST** take
it from the text form of that string (section 4). The text form passes the check by construction. Because it is
specified, two producers given the same source derive the same text, which the provenance block's determinism rule
requires.

## 4. The text form of an HTML source string

### 4.1 Definition

```text
strip(s):   repeat until s no longer changes:
              1. remove comments: each "<!--" through the first "-->" after it.
                 An "<!--" with no "-->" after it is left to step 2.
              2. one pass, left to right: at each "<" followed by an ASCII letter, "/", "!" or "?",
                 remove through the next ">"; if there is no later ">", remove the "<" alone.

decode(s):  decode character references once, as the HTML standard decodes them in text.

textForm(s) = strip(decode(strip(s)))
```

**Decoding** follows the HTML standard's character reference rules for text content:

- Named references come from the HTML named character reference table, including the legacy names that HTML accepts
  without a final `;` (so `&copy 1920` decodes, and `&notit;` decodes its longest legacy prefix to `¬it;`).
- Numeric references decode with the standard's replacements: zero, a surrogate or a value above U+10FFFF becomes
  U+FFFD, and 0x80 to 0x9F map through the standard's table.
- An `&` that starts no reference stays as it is (`A&D Gallery`).

Common platforms ship a decoder for these rules (Python's `html.unescape`, the `entities` package for JavaScript).
They can differ at the edges: `html.unescape` drops references to most control characters and to noncharacters,
which HTML keeps. The vectors include those cases, so the difference fails a test instead of passing silently.

### 4.2 Why each step is there

- **Comments before tags.** A comment can hold a `>`. Removed as a tag, `A<!-- x > y -->B` would leave `A y -->B`.
  Removed as a comment, it leaves `AB`.
- **Repeat to a fixed point.** Removing one tag can join text into another: one pass over `<<b>b>x` leaves `<b>x`.
  A fixed number of passes is not enough, since each level of nesting needs one more.
- **An unclosed tag loses only its `<`.** The text after it is kept (`Sale <lot 12]: Paris` gives
  `Sale lot 12]: Paris`). Without the `<`, nothing in it can open markup.
- **Decode in the middle, then strip again.** Escaped markup is markup once decoded: `&lt;b&gt;bold&lt;/b&gt;` gives
  `bold`. An escaped `<` that is text stays text: `5 &lt; 6` gives `5 < 6`.
- **Decode once.** `&amp;lt;b&amp;gt;` is the text `&lt;b&gt;`, and decoding it a second time would change real text
  into markup and delete it.

### 4.3 Properties

- Deterministic, and linear per pass. The number of passes grows with nesting depth.
- Its output always passes the P-11 check.
- A string with no markup opener and no `&` is its own text form. Whitespace is never touched: the text form removes
  markup and decodes references, nothing else. A control character that a reference produces is kept, as HTML keeps
  it.
- It is **not** idempotent, and must not be applied to its own output. It is a function from HTML to text, and
  applying it again would read the text as HTML (`&lt;b&gt;` is text, and as HTML it is a tag). A verifier therefore
  checks P-11 on an interpretation string. It does not re-derive the string.

### 4.4 What the text form loses

- **Link targets.** `(<a href="https://example.org/letters/11251">letter of 1892</a>)` gives `(letter of 1892)`.
  The target survives only in `raw`, which is one reason `raw` is required and authoritative.
- **Boundaries between blocks.** A removed tag leaves nothing, so `End of note.</div><div>Next note.` gives
  `End of note.Next note.` (open question 1).

## 5. Vectors

`provenance-source-markup-2026-10-26.vectors.json` holds:

- `textForm`: 37 pairs of a source string and its text form. Each covers one step or one edge of decoding, and
  each has a `shows` note saying what it tests.
- `check`: 14 interpretation strings with the verdict `text` or `markup`.
- `interpretationTextPattern`: the P-11 pattern from section 3.

Every `<`, `>` and `&` in the file is written as a JSON escape (`<`, `>`, `&`), so the file holds no
literal markup. Decode the JSON to get the strings.

`npm run conformance` (section 10) checks that:

- the file has no literal `<`, `>` or `&`;
- every text form vector holds, and every expected text passes the check;
- every check vector holds, and the schema pattern agrees with the check on every vector;
- over 20,000 generated markup-shaped strings, every text form passes the check, a string with no markup and no
  reference is its own text form, and the pattern agrees with the check.

## 6. Open questions

1. **Tags that separate words.** Removing `</div><div>` or `<br>` joins the text either side. In the sample, 6 of
   53 block boundaries sit between two non-space characters, so the text form runs two sentences together. The
   alternative is to replace a fixed list of block and line-break elements with a space. That needs an element list,
   which goes stale as HTML adds elements, and it costs the property that removal adds nothing. The draft keeps
   removal. A consumer showing a whole source string can show it as escaped text instead.
2. **How deep to decode.** The draft decodes once. The sample holds no doubly escaped markup (no `&amp;lt;`), so
   nothing measured needs a second decode. A source that does escape twice is better described than guessed at
   (question 3): a second decode cannot tell a doubly escaped tag from text that discusses one.
3. **Declaring what a source string is.** The text form applies to a source string that is HTML, and the manifest
   does not say whether `raw` is HTML, plain text, or structured data with HTML in its string values (one source in
   the sample publishes the last). Decoding changes a plain-text `raw` that contains a literal `&amp;`. One option is
   a `sourceRecord.rawMarkup` member (`html`, `text`, and a structured form whose string values are HTML), with the
   text form applied per string value for structured data. It stays out of the normative core for now, because P-7
   and P-11 are safe whatever `raw` is. The declaration would make the derivation checkable from the manifest alone.

## 7. Versioning and conformance

Additive within v0.2. Nothing changes under v0.1, and the provenance block is not yet published under v0.2, so no
published URI changes. When the provenance block is published, its schema would give every interpretation string the
P-11 pattern, and these vectors would move beside its other conformance material under `public/v0.2/`.
