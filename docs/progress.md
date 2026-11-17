# Build log — the new engine and the ten chapters

Running log for the long build (newest at the bottom of each section).

## Done

### Art
- Processed and installed the 17 waiting images (`python scripts/art/process.py`): `g_torso`, `post_lamp`, `cart_body`, `crate`, `log`, `millstone`, `gear`, `walllamp`, `sky2`, `arch_far`, `arch_mid`, `fg_rubble`, `sky3`, `hills_far`, `fields_far`, `mill_mid`, `fg_reeds`. Listed in `public/art/manifest.json` and `public/art/gen/CREDITS.md`.

### Engine (`src/play/`)
- `PlayScene.ts`: the game. Matter physics, chapter built from code, entities, light and darkness overlay, camera zones, checkpoints (lamps), death and respawn, pause menu, hints, end of chapter. Title screen and chapter select in `MenuScene.ts`. Boot goes to the menu; `?chapter=c01&cp=3` jumps straight in.
- `player.ts`: controller. Jump with a 45 ms anticipation crouch (physics starts within ~50 ms), variable height, coyote time and buffering; landing absorbs impact (scaled by speed) and falls over ~300 px are fatal; ledge catch and climb (also on crates); push and pull any prop; vine swing and climb; swimming; knock-back.
- `girl.ts`: the girl's live skeleton. New: anticipation crouch, take-off extension (toes pointed, arm swung up), tuck at the apex, legs reaching on the way down, landing crouch scaled by fall speed, braced stop, swimming stroke with the diya held high, and the crumple death (she folds, dissolves into shadow, the diya goes out).
- `builder.ts`: cursor-based level builder. Every beat lays geometry and records the steps to solve it, so the autopilot follows the level as it changes. `terrain.ts` draws ground in streamed chunks (earth, stone, brick, wood, iron).
- `autopilot.ts` + `devtools.ts`: automated playthroughs (`chh.auto('c01')`), screenshots (`chh.shot`), start from any checkpoint.
- Entities: crates, carts, logs, hay bales, boulders (push/pull, float, hang on ropes); vines (rotten, burnable); water (swim, currents, undertow, floods, drowning); fire (rope, hay, brush, grass, web; spreads); stakes, pits, spikes, swinging-log tripwires (visible or hidden in grass), falling stones, snares, iron jaws, lifts, gates, pressure plates, levers, crushers, gears, saws, wind, rain, shelter, lamps, secrets, brother glimpses, rope bridges, camera and darkness zones, scripted set-pieces.
- Creatures, all jointed and procedurally animated: leopard and jackals (`quad.ts`: digitigrade IK legs, spine flex, verlet tail, opening jaw, eye-shine), the giant spider (`spider.ts`: eight IK legs planting and stepping in alternating groups, rear-up tell, stab), poachers (`human.ts`: IK gait and arms; slingshot, blowgun, rifle; aim line that tracks with lag; projectiles stopped by cover), crows (`crows.ts`: two-segment flapping wings, perch, scatter, dive), shadows (`shadows.ts`: jointed arms that reach from the dark and recoil from light).

### Chapters (all on the new engine; `src/play/chapters/ch01..ch10.ts`)
| # | Chapter | Lamps | Highlights |
|---|---|---|---|
| I | The Banyan | 13 | vines, double vine, rotten vine, cart, sleeping leopard and a lamp, stalker, hay bale, falling branches, grass fire, pulling, tripwires, pool, root climb, leopard chase over the burning bridge, shrine |
| II | The Hollow | 12 | webs, the spider drops and waits at the lamp's edge, the draft and the shadows, web strands, the web tunnel chase, the black pool, the grass-fire trap that drives the spider off |
| III | The Poachers | 8 | snare, iron jaws sprung by a crate, twig-covered pits, slingshots behind a pushed crate, the chaser in his own pit, the lantern patrol, the dogs, the rifleman on the watchtower |
| IV | The Fields | 10 | headwind, diving crows, threshing ground, irrigation current, jackal pack and the grass fire, blowgun in the haystacks, the water-lift |
| V | The Stepwell | 11 | plate and gate, falling roof, sluice flood, shadows in the galleries, two plates, the dam breaking |
| VI | The Mill | 12 | crusher hall, saws stopped at the race, chain lift, riding a crusher shoe, grain store, millstone chase |
| VII | The Monsoon | 10 | rain and roofs, lightning field, cowshed, wind, flood river, orchard vines, crows, landslide |
| VIII | The Railway | 11 | trains through cuttings, the signal, sidings, rifleman in the goods yard, signal box, hanging under the bridge |
| IX | The Fort | 11 | rampart guards, falling gallery, armoury, the spider in the dungeon, dogs, the brother freed from the cage |
| X | The Temple | 10 | the shadow leopard and the terrace lamps, the temple tank, gardens, courtyards, the bell tower, the great lamp |

### Also done
- The old Arcade engine and the Tiled pipeline are retired (deleted `GameScene`, `verbs`, `enemies`, `SliceScene`, `levels/tiled`, `chapters.ts`, `export-levels`, `public/levels`).
- Menu: Continue, New Game, chapter select (locked until the previous chapter is finished; `?unlock` for testing), hints, sound, effects. Pause menu with retry, chapters and main menu. Saves per lamp. Dev test levels stay out of menus and saves.
- `npx tsc --noEmit -p .` clean; `npm run build` passes.

## Next
- **Length.** Autopilot times are 108–154 s per chapter. A first-time player takes several times longer (deaths, reading the place, waiting for timings), but the shorter chapters (V, VI, X) may still fall under 8 minutes. Add one or two more set-pieces to each.
- **Art.** Creatures, traps and machinery are drawn procedurally (jointed rigs). New generated art (trains, temple tower, fort walls, enemy textures) has not been made yet; per-chapter backdrops reuse the forest, stepwell and mill layers.
- Possession spirit and ladders from the old plan are not built.
- Chapter IX: one intermittent death under the falling stones in the autopilot run (it retries and finishes).
- Real-device check of touch controls and performance on Android.

## Test results (autopilot, full chapter from the first lamp)
| Chapter | Finished | Deaths | Autopilot time |
|---|---|---|---|
| I | yes | 0 | 152 s |
| II | yes | 0 | 125 s |
| III | yes | 0 | 154 s |
| IV | yes | 0 | 127 s |
| V | yes | 0 | 108 s |
| VI | yes | 0 | 115 s |
| VII | yes | 0 | 144 s |
| VIII | yes | 0 | 126 s |
| IX | yes | 1 | 140 s |
| X | yes | 0 | 124 s |
