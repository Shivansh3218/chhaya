# Generated art: provenance

These images were generated with **FLUX.1 [schnell]** by Black Forest Labs, through the public Hugging Face Space
`black-forest-labs/FLUX.1-schnell`.

- **Licence:** the model weights are released under **Apache-2.0**, which allows commercial use.
- **Ownership:** the generated images carry no restrictions from the model licence.
- **Generated:** 2026-11-16.
- **Cleanup:** each image was post-processed in the browser.
  - Silhouette layers: the white background was turned into transparency and the shapes were tinted.
  - All layers were resized to the template, and the long layers were made to tile horizontally with a soft blur.
  - The sky was desaturated.

| File | Seed | Prompt (abridged) |
|---|---|---|
| `trees_mid.png` | 23 | 2D game background, wide panorama of giant banyan trees, twisted trunks, curtains of aerial roots, dark silhouettes on white |
| `trees_far.png` | 37 | distant Indian forest of banyan and peepal trees with aerial roots, silhouettes on white |
| `trees_far2.png` | 31 | a row of banyan trees in the middle distance with aerial roots, silhouettes on white (cropped, paled and blurred for the farthest layer) |
| `fg_roots.png` | 47 | hanging vines, aerial roots and leaves from the top edge, silhouettes on white |
| `trunk_mid.png` | 59 | a single huge banyan trunk rising out of view, buttress roots, silhouette on white |
| `sky.png` | 43 | empty misty dusk sky over a forest, hazy light low on the right (cropped to remove the horizon) |

The full prompts are in `scripts/art/flux-jobs.json`; regenerate with `node scripts/art/gen-flux.mjs <outDir> scripts/art/flux-jobs.json`. None of the prompts names an existing game, studio or artist.

## Images from the TAAFT Image Generator

These were made with the free **TAAFT Image Generator** (theresanaiforthat.com/@taaft/image-generator), signed in to the project owner's account, on 2026-11-16.
The tool states: *"Generated content is 100% free to use, including commercial use."*
The same cleanup applied: white background turned to transparency; each image fitted to its template; the ferns made to tile; the soil darkened and made to tile both ways.

| File | Prompt (abridged) |
|---|---|
| `g_head.png` | minimalist black silhouette icon: side profile of a cartoon character head facing right, round head, small nose, hair tied in a bun |
| `g_skirt.png` | black silhouette icon of a flared knee-length Indian lehenga skirt seen from the side, wavy hem |
| `g_diya.png` | black silhouette icon of a small clay diya oil lamp from the side, pinched spout on the right |
| `cart_wheel.png` | black silhouette icon of an old wooden cart wheel, eight spokes, front view |
| `fg_ferns.png` | ferns, tall wild grass and small plants along the bottom edge, black silhouettes on white |
| `bough.png` | one long thick horizontal tree branch entering from the left, thinning to a leafy tip |
| `ground_fill.png` | seamless texture of very dark forest soil, buried stones and thin roots |

### Second batch (TAAFT Image Generator, 2026-11-16)

Same source and licence as above (TAAFT Image Generator, free for commercial use). Processed with
`python scripts/art/process.py` (white background to transparency, tinted to the layer colour, fitted to the
template, long layers made to tile with a cross-fade and blurred for depth of field; skies desaturated and darkened).

| File | Subject (the exact prompts were not recorded) |
|---|---|
| `g_torso.png` | black silhouette icon of a small sleeveless kurta top, side view |
| `post_lamp.png` | black silhouette of a thin wooden post with a small clay oil lamp on a bracket |
| `cart_body.png` | black silhouette of an old wooden hand cart with side rails (wheels cropped off) |
| `crate.png` | dark old wooden crate with cross braces, plain white background |
| `log.png` | a fallen tree log with broken twigs, side view, white background |
| `millstone.png` | an old stone millstone with a square eye, front view (shadow cropped) |
| `gear.png` | an old wooden cog wheel with eight spokes, front view |
| `walllamp.png` | black silhouette of a wall bracket holding a small oil lamp |
| `sky2.png` | looking up from the bottom of an ancient stepwell at a moonlit sky |
| `sky3.png` | misty dusk sky over open grassland, low sun on the horizon |
| `arch_far.png` | distant arcade of stone arches, flat silhouette on white |
| `arch_mid.png` | ruined stone pillars and arches with steps, silhouette on white |
| `fg_rubble.png` | heap of broken carved stone blocks along the bottom edge, white background |
| `hills_far.png` | low rolling hills, flat dark silhouette on white |
| `fields_far.png` | flat farmland with haystacks and lone trees on the horizon, silhouette on white |
| `mill_mid.png` | village water mill with a big wheel and huts, silhouette on white |
| `fg_reeds.png` | tall reeds and grass along the bottom edge, black silhouettes on white |

### Banyan forest (TAAFT Image Generator, 2026-11-17)

Same source and licence (TAAFT Image Generator, free for commercial use). The generator returned full misty
scenes; `python scripts/art/process.py` turns their luminance into alpha, so the fog becomes see-through and each
image keeps its own depth. Layers fade out at the top, tile horizontally and are blurred by distance.

| File | Raw image | Prompt (as entered) |
|---|---|---|
| `trees_mid.png` | `banyan_far.png` | wide panorama of a distant misty Indian banyan forest, many huge spreading banyan trees with curtains of hanging aerial roots and pillar roots, flat soft grey silhouettes on a pure white background, no ground, no sky detail, minimal, 2D game background layer |
| `trees_far2.png` | `banyan_far2.png` | a row of very distant huge Indian banyan trees in thick fog, wide spreading flat crowns and long curtains of hanging aerial roots, tiny in the frame, pale grey silhouettes on a pure white background, no ground detail, 2D game far background layer |
| `trees_far.png` | `banyan_mist.png` | a misty Indian banyan forest in the middle distance, several large banyan trees side by side with thick pillar roots and hanging aerial root curtains, soft grey silhouettes fading into fog, pure white background, 2D game background layer, side view |
| `fg_roots.png` | `banyan_roots.png` (canopy fringe only) | dense curtains of long hanging banyan aerial roots and thin dangling vines hanging down from the top edge of the image, a few leaves, black silhouettes on a pure white background, empty lower half, 2D game foreground layer — the hanging root strands themselves are drawn procedurally by `process.py` |
| `banyan_near.png`, `banyan_fg.png` | `banyan_trunk.png` | one enormous ancient banyan trunk filling the frame from bottom to top, many aerial roots fused into it, huge buttress roots spreading at the base, a few hanging roots, black silhouette on a pure white background, side view |

### Second banyan layer, the vine bough, the monsoon fields (TAAFT Image Generator, 2026-11-17)

Same source and licence. Processed with `python scripts/art/process.py trees_mid2 bough fields_mid`.

| File | Raw image | Prompt (as entered) |
|---|---|---|
| `trees_mid2.png` | `banyan_mid2.png` | an ancient Indian banyan grove in morning fog, one colossal banyan tree on the right with a wide low crown and dozens of thick prop roots standing like pillars, a fallen trunk on the left, curtains of thin aerial roots, soft grey tones fading into white mist, side view, 2D game background |
| `bough.png` | `bough2.png` | one long gnarled horizontal banyan tree branch entering from the left edge, thick and twisted at the left tapering to thin twigs on the right, clusters of leaves along it, a few thin aerial roots hanging down from it, black silhouette on a pure white background, isolated, side view |
| `fields_mid.png` | `fields_mid.png` | flat open Indian farmland at dusk in rain mist, a few lone trees with round crowns scattered far apart, low hedgerows and field bunds, a small hut, gentle hills far behind, grey silhouettes fading into white mist, wide panorama, side view, 2D game background |
