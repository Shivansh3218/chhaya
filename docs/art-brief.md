# Chhaya (छाया) — Art Brief

A brief for an illustrator, or for making the art with an image tool and cleaning it up.
The templates are in `public/art/templates/`. Every template is a PNG at the exact size and position the game uses.
Paint over them, keep the shape of the canvas, and your art drops straight into the game.

---

## The game in one paragraph

A small girl carries a clay diya through an Indian forest at dusk on Diwali night, looking for her brother.
It is a quiet, wordless 2D puzzle-platformer.
The world is a world of silhouettes: black shapes against layers of mist and pale grey-gold light.
The **only warm colour in the whole game is her diya and the lamps she lights**.
It should feel hushed, beautiful and a little frightening, never gory.

## Style direction

- **Silhouettes first.** Characters, the ground and everything you can touch are near-black (`#07080a`).
  Shape carries everything: a readable outline at small size matters more than inside detail.
  - Inside detail is allowed as very faint texture: bark, cloth folds, rim light. Keep it subtle.
- **Depth through haze.** Things get paler, softer and bluer-grey with distance.
  - The nearest layers are black and blurred, as if out of focus.
  - The far forest is a soft grey ghost.
- **Light.** A low, hidden sun is behind the canopy, with shafts of pale warm light and drifting mist.
  - It is dusk, not night: the sky is cool slate at the top and warm grey-gold near the horizon.
- **Place.** An Indian forest: banyan (बरगद) trees with aerial roots hanging like curtains, broad leaves, dry grass and clay paths.
  - Later chapters move to a stepwell, a mill and a village during the monsoon.
- **The girl.** About 8 years old, in profile, wearing a knee-length lehenga with a short kurti, with one long braid.
  - Bare feet or chappals; a big, round head (child proportions).
  - She is shown only as a silhouette: no face detail, no glowing eyes.
- **Originality.** Atmospheric silhouette platformers are a genre, and we want to *feel* like the best of them while looking like our own world.
  - Please don't copy or trace any existing game's characters or scenes.
  - If you use an image generator, don't prompt it with another game's or studio's name.

## How the girl works

She is a **live skeleton**: the code moves her body parts every frame (walking, running, climbing, swinging, her braid swaying).
So **no animation frames are needed**. Draw each body part once, in side view, facing right.
The code rotates and places each part.

| File key | Template size | What to draw | Pivot (the joint the part rotates around) |
|---|---|---|---|
| `g_head` | 88 × 80 | Head in profile facing right: round skull, small nose and chin, hair pulled back into a knot. **No braid**; the braid is separate. | centre of the skull (50%, 52.5%) |
| `g_torso` | 48 × 70 | Kurti from shoulders (top) to hips (bottom), narrow child's chest | hip, bottom centre (50%, 100%) |
| `g_skirt` | 104 × 64 | Lehenga: gathered at the waist (top centre), flaring to a soft, uneven hem | waist, top centre (50%, 2%) |
| `g_thigh` | 62 × 19 | Upper leg, drawn **horizontally pointing right**, hip end on the left | centre of the round left end |
| `g_shin` | 56 × 14 | Lower leg, horizontal, knee on the left | centre of the round left end |
| `g_foot` | 28 × 13 | Foot or chappal, heel on the left, toes right | heel (12%, 55%) |
| `g_uarm` | 45 × 12 | Upper arm, horizontal, shoulder on the left (also used for the neck) | centre of the round left end |
| `g_farm` | 42 × 10 | Forearm, horizontal, elbow on the left | centre of the round left end |
| `g_hand` | 15 × 15 | A small hand (fist-like blob) | centre |
| `g_bead` | 16 × 16 | One link of the braid | centre |
| `g_tassel` | 16 × 24 | The braid's end: a tassel or parandi | top centre (50%, 10%) |
| `g_diya` | 40 × 20 | A clay diya with a pinched spout (the flame is added by the game) | (45%, 40%) |

**Tip.** Joints overlap, so paint the round ends of limbs fully: they hide the seams between parts.
Overlay all the templates at their pivots to see how they assemble.

## Backgrounds

All the long layers **must tile horizontally**: the left edge continues seamlessly into the right edge.

| File key | Size | What it is |
|---|---|---|
| `sky` | 1280 × 720 | The sky behind everything: cool slate at the top, warm grey-gold haze low on the right where the sun hides. Doesn't tile. |
| `trees_far2` | 1024 × 720, tiles | The most distant forest: very pale, very soft banyan shapes. Transparent elsewhere. |
| `trees_far` | 1024 × 720, tiles | A nearer forest band: pale grey, a little sharper. |
| `trees_mid` | 1024 × 720, tiles | Mid-distance banyans with curtains of aerial roots: dark grey, slightly soft. This layer gives the strongest sense of place. |
| `fog` | 1024 × 360, tiles | Drifting mist: soft white with mostly low opacity, transparent elsewhere. |
| `shafts_warm` | 1400 × 720 | Light shafts falling diagonally from the top. Added as light, so black means "no light". |
| `fg_roots` | 1024 × 240, tiles | Very near, out-of-focus roots and leaves hanging from the top edge: black and blurred. |
| `fg_ferns` | 1024 × 220, tiles | Very near, out-of-focus ferns and grass along the bottom edge: black and blurred. |
| `ground_fill` | 512 × 512, tiles both ways | Optional texture painted inside all the earth: soil, stones, roots. Very dark, near `#07080a`, detail only in faint greys. |

## Props

| File key | Size | What it is |
|---|---|---|
| `cart_body` | 160 × 80 | A small, old wooden hand-cart bed: planks and side rails. Wheels are separate. |
| `cart_wheel` | 60 × 60 | A spoked wooden wheel (it spins), centred |
| `trunk_mid` | 500 × 1640 | A great banyan trunk rising out of view, flaring into buttress roots at the bottom, with a few aerial roots. Dark grey `#14181b`, slightly soft. |
| `bough` | 1040 × 180 | A long branch reaching in from the left, thinning to the right, with leaf clusters. The vine hangs from about 82% along. |
| `post_lamp` | 48 × 120 | A wooden post with a little shelf for a diya (the checkpoint lamp) |
| `vine_seg` | 24 × 8 | A short piece of vine, horizontal (the vine is built from many of these) |
| `vine_leaf` | 20 × 12 | One leaf on the vine, stem on the left |
| `leaf` | 12 × 8 | A falling leaf |
| `pebble`, `twig` | 16 × 12, 44 × 12 | Loose things she kicks as she runs |

## Delivering the files

- **Format:** PNG with transparency, sRGB.
- **Size:** paint at **1×, 2×, 4× or 8×** the template size. The game scales it down to fit, so 4× is a good working size.
  Keep the **same aspect ratio** and the **same placement inside the canvas** as the template.
- **Testing in the game:**
  1. Put the files in `public/art/` (any sub-folders).
  2. List them in `public/art/manifest.json`, for example:
     ```json
     { "assets": { "g_head": "girl/head.png", "trees_mid": "bg/trees_mid.png" } }
     ```
  3. Reload the game. Open any chapter (`?chapter=c01`). The browser console lists which hand-made files are in use.
     Any key you leave out keeps the generated art, so you can deliver piece by piece.

## Priority (what changes the look most)

1. **The girl's parts.** She's on screen the whole time.
2. **`trees_mid`, `trees_far`, `sky`.** The sense of place.
3. **`trunk_mid`, `bough`, `ground_fill`.**
4. **Foreground layers, fog, props.**

## Rights

The game will be **open source** and also **sold on the Play Store**. Before work starts, agree in writing on one of these:
- **Assignment.** The artist assigns copyright to the project and is credited.
- **Licence.** The artist keeps copyright and grants a licence that allows commercial sale *and* redistribution in a public repository, for example **CC BY 4.0**, with credit.

If you use an image generator, check that its terms allow commercial use and redistribution, and keep a note of the tool and the prompts.
