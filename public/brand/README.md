# openclearance brand

The mark is a checkmark in a rounded square, ink-blue (`#1f3a5f`, the site
accent) with an off-white check (`#faf8f3`). It reads as "cleared".

## Assets
- `../favicon.svg` : browser favicon (rounded ink-blue square + white check).
- `mark.svg` : the canonical mark, for inline reuse (header lockup, docs).
- `avatar.svg` : full-bleed variant (no rounded corners) for the GitHub org avatar; platforms round it themselves.
- `../og.png` (1200x630) : social card.
- `openclearance-avatar-512.png` : rasterised avatar to upload as the GitHub org avatar (GitHub does not accept SVG).

## Regenerating the PNGs
The local ImageMagick build has no `rsvg` binary, so it cannot rasterise the
stroked SVG path. The PNGs are drawn directly with ImageMagick MVG instead
(equivalent geometry, reliable). Re-run from the repo root:

```sh
# org avatar (512)
magick -size 512x512 xc:'#1f3a5f' -fill none -stroke '#faf8f3' -strokewidth 42 \
  -draw "stroke-linecap round stroke-linejoin round polyline 150,264 216,330 378,168" \
  public/brand/openclearance-avatar-512.png

# social card (1200x630) — MONO/SANS are system font files
MONO='/System/Library/Fonts/Supplemental/Andale Mono.ttf'
SANS='/System/Library/Fonts/Helvetica.ttc'
magick -size 1200x630 xc:'#1f3a5f' \
  -fill '#faf8f3' -draw "roundrectangle 100,150 250,300 26,26" \
  -fill none -stroke '#1f3a5f' -strokewidth 14 -draw "stroke-linecap round stroke-linejoin round polyline 140,228 165,253 228,188" \
  -stroke none \
  -font "$MONO" -fill '#faf8f3' -pointsize 78 -annotate +100+410 'openclearance' \
  -font "$SANS" -fill '#aebfd2' -pointsize 32 -annotate +102+462 'A portable, verifiable rights-clearance standard.' \
  -font "$MONO" -fill '#7d93b0' -pointsize 26 -annotate +102+552 'openclearance.org' \
  public/og.png
```
