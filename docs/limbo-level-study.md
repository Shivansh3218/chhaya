# LIMBO — level-by-level design study

*A study of LIMBO (Playdead, 2010) as a reference for Chhaya. We take mechanics, pacing and design principles; we do not copy its scenes, creatures, art or story.*

---

## 0. About the sources

- **Research method.** Five research agents worked in parallel: chapters 1–10, 11–20, 21–30 and 31–40, plus one on the reference video and overall design.
- **Main sources** (each chapter cross-checked against at least two where possible):
  - GamerGuides, Portforward and gry-online.pl walkthroughs
  - the IGN 2010 strategy guide
  - the LIMBO fandom wiki, mostly read through its API or search excerpts because direct fetches were blocked
  - Wikipedia
  - Game Developer (formerly Gamasutra) articles, and GDC talks by lead puzzle designer Jeppe Carlsen
  - Designing Sound's interview with sound designer Martin Stig Andersen
- **Reference video.** "Limbo Gameplay Walkthrough – Full Game" by IGN Guides, 1:01:45 long, a clean run with no deaths. Its description has timestamps for chapters 1–38 only. IGN's chapter numbers don't line up 1:1 with the 40-chapter numbering used below.
- **Chapter numbering.** We use the PC/PS3 40-chapter menu. The original Xbox 360 release had 24 chapters. Chapter names are fan labels; the game itself names nothing.
- **Disputed points are marked ⚠.**

**Shape of the game.** About 3–5 hours for a first playthrough, about 1 hour for an expert. The game is structured as four acts plus an ending:

| Act | Chapters | Setting | Main threat |
|---|---|---|---|
| 1 | 1–11 | Forest | A living predator (giant spider) |
| 2 | 12–19 | Forest edge | Hostile children and parasites |
| 3 | 20–31 | City and factory | Machines |
| 4 | 32–39 | Factory | The laws of physics (rotation, gravity) |
| Ending | 40 | Forest again | None: a quiet scene |

The threat moves from organic, to human, to mechanical, to physics itself.

---

## 1. Chapter-by-chapter

### ACT 1 — FOREST: the spider (1–11)

| # | Name | Obstacles and hazards (in order) | Enemy | Puzzle and solution | New mechanic | Why it works |
|---|---|---|---|---|---|---|
| 1 | Awakening | Log to climb, slope slide, (spike) pit | — | — | Run, jump, climb, slide, first death | Silent, slow opening. Going the "wrong way" (left) hides a secret |
| 2 | Lake passage | Ledge too high to reach, rope descent, gap over a deadly pit or water, lake | — | Pull a crate under the ledge to climb. Ride the boat across | Push/pull, ropes, drowning (the boy can't swim), riding objects | The boat ride is a passive breather |
| 3 | Bear traps | Cliff, vines, two bear traps side by side, a weight hanging from a rope | — | Drag the boat ashore as a step. Pull the traps apart to jump them one at a time. Put a trap under the hanging weight so it cuts the weight off, and the rope lifts you | Bear traps as both hazard and tool | A deadly object turns out to be the key |
| 4 | Deathly rock | A log that sets off a rolling boulder, pool, tree climb, broken trunk, water | — | Step in to trigger the boulder, then retreat. Swing on vines. Knock a trunk into the water and ride it | Traps you set off with your own weight, swinging momentum | The first ambush death |
| 5 | The spider | Spider-leg stabs, then a web | **Giant spider.** Raises a leg (the warning), then stabs where you stood | A bear trap falls from a tree *off-screen* (you hear it land). Lure the stabs onto it to cut off a leg; do it 3 times | First enemy. Its own attack is used against it | Signature boss. The "victory" leads straight to being captured in a cocoon |
| 6 | Cocooned | Gaps, slide, boulder and log trap | (spider, off-screen) | Push the boulder so a log falls into place as a bridge, without standing under it | **Handicap:** you can only hop | Clumsy, fragile movement after the capture |
| 7 | Boulder ride | Rolling boulder over spikes, a body used as a lure (the ground collapses), a rope with a trap rigged to it | Spider chases briefly | Balance on the rolling boulder. Grab the rope and let go at once so the trap falls past you | Balancing on a moving object, deliberate lures | A fake-safe moment: the body is bait |
| 8 | Stumps | Log propped on a stick, stumps that tip, a swinging spiked ball, spike pit | **Fake spider leg** (a puppet) | Timing your way through the traps you set off | Traps built by people | Reveal: someone is behind the "spider". A child runs away |
| 9 | Burning tyres | Uphill water pits, burning tyres, fire, ladders | **Hostile children**, unseen, rolling tyres down the slope | *Retreat* to the pit behind you so the tyre falls in, then rush forward | Fire, ladders, attacks from off-screen | The solution is going backwards |
| 10 | Swinging traps | Two bear traps on ropes swing in from the left and right; a rope is pulled up out of reach | Children (unseen) | Stop exactly where the first swing misses, then dash. Climb the leftover rope | Pendulum traps you set off by approaching | The enemy's trap becomes your ladder |
| 11 | Death of the spider | Water chase, see-saw, boulder held by a stick, spike pit | **Spider chase** | Ride a log. The spider's weight on the see-saw launches you up. Release a boulder onto it while you shelter in a nook. Tear off its last leg and push the body into the spike pit as a bridge | The enemy as counterweight, the enemy's body as a platform | Two children watch and flee, setting up the next act |

**Rhythm of chapters 1–10:** calm (1–2), teaching (3–4), set piece (5), helplessness (6), chase and lure (7), gauntlet and reveal (8), off-screen attacks (9–10). Every set piece is followed by a quiet stretch.

### ACT 2 — FOREST EDGE: the children and parasites (12–19)

| # | Name | Obstacles and hazards | Enemy | Puzzle and solution | New mechanic | Why it works |
|---|---|---|---|---|---|---|
| 12 | Hanging crates | None | — | Bounce on a hanging crate until its rope snaps, then push it to the wall and climb (⚠ sources disagree on what is on the crate) | Repeated jumping as force | Pure breather after the boss |
| 13 | Drowned boys | Deep water, the first crusher trap | A boy runs into the pond and drowns | Stand on a floating body and *wait*: the boy's body becomes the next stepping stone. Drag a body into the crusher pit to set it off safely | Corpses as stepping stones, **waiting as a solution**, setting off a trap with a stand-in weight | A moral shock: the solution is standing on dead peers |
| 14 | Blowdart ambush | Crusher A (raised bump = safe spot), crusher B (raised bump = trigger), spike pit | **Three blowdart hunters** revealed by a camera pan; standing still means death | Turn back, re-cross both crushers using what you learned, and the chasing hunters die in your traps | Ranged human enemies. Two traps that look alike but behave oppositely | **Teach on the way in, test on the way out** |
| 15 | Counterweights | Gears that crush, ropes that pull back up, falling blocks | — | Use the cart as a step. Climb ropes to raise two counterweights, then sprint under both blocks before they drop | Counterweights that hold only for a moment, a "click" sound cue | Pure timing pressure |
| 16 | First brain slug | Slug drops from above, light shafts, ceiling worms | **Brain slug** (parasite) | The slug forces you to walk one way; **light reverses the direction**. Push a crate under a ceiling worm and jump so it eats the slug | **Loss of control**; light as a switch; one hazard cures another | It takes away the most basic freedom |
| 17 | Rain machine | Deep pit (⚠ a lethal black pool, one source only) | A timid creature (not hostile) | Bait the creature with fallen fruit and chase it into a wheel. The wheel runs a machine that makes rain, the pit floods, and a log floats you out | Herding, changing the weather, flooding | A long chain of cause and effect |
| 18 | Flooding chambers | Water you release yourself, a leaky crate, floor hatches | — | Pull levers to raise water and ride crates up. A leaky crate is a raft on a timer. Trap a floating ball under a floor so it lifts | **Water level as a lift you control**; raft on a timer | The tension comes from danger you created |
| 19 | Slug in the waterworks | Swinging slug, light, rising water, pipes | Slug | Let the slug catch you **on purpose**, steer with light, outrun rising water on a floating pipe, then remove the slug under a ceiling growth | Two learned systems layered together | Deliberately exposing yourself to a hazard |

**Rhythm:** boss (11), calm, eerie calm, ambush, timing, disorientation, calm, long systemic puzzle, layered pressure. Danger peaks never come back-to-back.

### ACT 3 — CITY and FACTORY: machines (20–31)

| # | Name | Obstacles and hazards | Enemy | Puzzle and solution | New mechanic | Why it works |
|---|---|---|---|---|---|---|
| 20 | Rooftops | Gaps between roofs, roof slide, drainpipe climb, a gutter tearing loose | — | Traversal | New biome | Act break |
| 21 | Electric letters | Giant neon sign whose letters kill when lit; the H blinks on a cycle; the O swings; the L rotates; the arrow collapses (⚠ 20 or 21) | — | Time the crossing for the H's dark phase. Swing on a cable to a power box and **cut the power**, then cross the dead sign | Hazards that cycle on and off; **fix the source, not the symptom**; crumbling one-time platforms | You cross the same structure twice: first live, then dead |
| 22 | Down the glass | Skylight that cracks in two hits, hanging lights that collapse behind you, a scaffold that topples | Slug | Use a wheeled ladder as a launch. Chain jumps across collapsing lights. Lower yourself slowly on a hose | Breakable glass | Falling into a new world |
| 23 | Saw for the zombie | A button sends a saw rolling along the floor; a claw drops a crate after a delay; swinging platforms | Slug (still on you) | Walk *slowly* so the delayed crate lands in front of you, then use it to jump the saw. Pump a hanging platform like a swing | Delayed consequences; forced movement where you control speed, not direction | You can't stop, so you manage your pace |
| 24 | Upward elevation | Lift, see-saw, rope on a winch | — | Use the lift as a counterweight on the see-saw. Use a lever to lower a rope over a crate | Lift as a movable weight | A calm thinking room |
| 25 | Impassable saw | An advancing saw, then a dark cave | — | Press two buttons about 4–5 s apart so the claws' crates stack, then climb the stack over the saw. Navigate the dark by the sound of water | **Deadline on a physics puzzle**; sound-only navigation | The secret level's entrance is hidden here |
| 26 | The bug | — | A giant fly that is skittish, not hostile | Approach slowly. When it takes off, grab its leg and it carries you up | **How fast you approach matters** | A creature used as transport |
| 27 | Factory world | Tyre dispenser, hanging trolleys, a door that opens briefly on each hit, a giant cog, electrified floor with a swinging chain | — | Keep the hanging platforms under the rolling tyre. Its bounces on a pressure plate open a door for a moment, so time a crate push through it. Ride the cog's teeth. Swing the chain across the live floor | Escorting an object; a giant rotating cog as an elevator | The first big "machine toy" room |
| 28 | Shifted industry | Live rail, a room that rotates, magnet floor, timed gate, saws | — | Push a gear to rotate the whole room. Lock a metal crate with the magnet. Ride a sliding crate past electrified floor and saws | **Rotating rooms**, magnets | The world turns around you |
| 29 | Boulder by gravity | Rotating room releases a boulder, a gate that shuts | Slug | Leap before the gate shuts or the boulder crushes you. The goal (the sister) is glimpsed, then a slug forces you away | A room that recycles an earlier threat | Story shown through gameplay: the goal is shown, then taken away |
| 30 | Dangerous conveyors | Conveyor belts into crushers (one strikes about every 3 s) | Slug | Run through the crushers between strikes. **Ride a crusher up** as an elevator. Ceiling growths remove the slug | The hazard becomes the vehicle | The most intense chapter of the act |
| 31 | Perilous rail | Minecart rides, a saw cutting through your platform, a ride in the dark, a rail that goes live | — | The cart you ride is also what presses the switch that powers the rail. Race your own vehicle across before it re-powers | **Your ride arms the trap** | Racing your own tool |

### ACT 4 — PHYSICS: rotation and gravity (32–39)

| # | Name | Obstacles and hazards | Enemy | Puzzle and solution | New mechanic | Why it works |
|---|---|---|---|---|---|---|
| 32 | Dark rotation | A rotating room lit by one swinging lamp; changing slopes; live floor and wall | — | **Wait** for the right angle. Push a crate against the live wall | Whole-level rotation in darkness | You can't see, and the ground shifts |
| 33 | Machine guns | Horizontal turret, a turret sweeping the ceiling (a beam aims, then fires), timed gravity buttons | **Turrets** | Stand on one turret and step into the other's beam, so it destroys the turret under you. Ride crates on a timed anti-gravity field | Turning one hazard onto another; anti-gravity | Standing in the line of fire is the answer |
| 34 | Gravitational changes | A turret shoots a rope, which drops a crate; a sliding wall; gravity for crates only | Turrets | Use the dropped crate as a shield on the elevator. Push a crate ahead as cover. Time a gravity flip with the wall | Danger hands you the puzzle parts | Hazards as a supply of tools |
| 35 | Magnetized blocks | — | — | Flip gravity and catch one block on the magnetic ceiling while the other stays on the floor, making a staircase | Magnet plus gravity timing | A calm logic breather |
| 36 | Levitated swing | Zip-line trolley over spikes, sloped roof | — | Flip gravity to **call the trolley toward you**, restore it, and ride. Hit a gravity panel mid-air to run up the wall | Walking on walls | |
| 37 | Side of the world | A saw chasing you up a wall; the sign from ch 21 again, lying sideways and blinking | — | Hit gravity switches in mid-air so you land inside the safe part of the letter | Callback to an earlier landmark | The broken world is shown through a familiar object |
| 38 | Timed gravity | A machine flips gravity on its own rhythm, **announced by a sound**; turrets; saws | Turrets | Learn the rhythm and jump into gaps just before each flip | Gravity on a rhythm you don't control | You read the timing by ear |
| 39 | Final glass | Saw, glass pane | — | One trick shot: jump about 2 s before the flip, rebound off a panel, pass under the saw and break the glass | — | A finale built around "breaking free" |
| 40 | End | — | — | Wake in the forest, walk to the girl, cut to black | — | Quiet, ambiguous ending with no gameplay |

**Secret level.** Smashing all 10 hidden eggs opens a gate in a dark cave. The level is near-total darkness, played by sound, and remixes old hazards (turrets, slug, saws, burning tyres). It exits back into chapter 34.

---

## 2. Catalogue of mechanics, hazards and enemies

| Category | Items (chapter of first appearance) |
|---|---|
| **Controls** | Only left/right, jump, and *one* grab button (push, pull, hang, climb). No text, no tutorial, no HUD |
| **Static hazards** | Spike pits (1), deadly falls (2), drowning (2, the boy cannot swim), fire (9), electrified floors and rails (27, 28, 31) |
| **Traps** | Bear traps (3; movable, also used as tools), boulders (4, 6, 7), propped logs (8), pendulum and swinging traps (8, 10), crushers (13, 14, 30), blades and gears (15), buzzsaws (23, 25, 31, 37, 38) |
| **Living enemies** | Giant spider (5–11; telegraphed stabs, chases), hostile children (9–14; roll fires, set traps, blowdarts, always flee or stay out of reach), brain slugs (16, 19, 22, 23, 29, 30; forced walking) |
| **Neutral creatures** | Timid creature you herd (17), giant fly you ride (26) |
| **Machines** | Boat (2), carts (2, 15), lifts and counterweights (15, 24), cogs (27), conveyors (30), minecart (31), turrets (33, 34, 38), magnets (28, 35), gravity switches (33–39), rotating rooms (28, 29, 32) |
| **Water** | Boat, floating logs and bodies (2, 4, 13); rising water you control (17–19); raft on a timer (18) |
| **Light and sound** | Light reverses slug control (16); darkness with sound cues (25, 32, secret level); a sound before each gravity flip (38) |
| **Collectibles** | 10 hidden eggs placed off the main path (wrong direction, above, before triggering a machine), plus an achievement for finishing with 5 or fewer deaths |

---

## 3. Design principles

Sources: lead puzzle designer Carlsen (GDC talks), director Jensen, sound designer Andersen, and critics.

1. **"Trial and death."**
   - Dying is expected, shocking and almost free, because checkpoints are only seconds back.
   - A gruesome death clearly says "this idea is wrong".
2. **Design as "worst enemy, then best friend."**
   - Build the most devious version of a puzzle first.
   - Then add visual and audio clues until it is fair.
3. **Once understood, execution must be easy.**
   - If the right idea fails on execution, players abandon it.
   - Wrong ideas must look clearly wrong.
4. **Teach a verb before testing it.**
   - The boat is pulled as a step before any puzzle relies on pulling.
   - The boy's arms reach toward anything grabbable, a cue given through animation instead of text.
5. **Manage attention.**
   - In the spider fight, testers stared at the bear trap, so it was moved off-screen and announced by sound.
6. **Never repeat; recombine.**
   - Each mechanic appears in fresh combinations.
   - Late chapters change one variable at a time: gravity goes from triggered, to crates only, to magnets, to automatic, to the final trick shot.
7. **Rhythm.**
   - Tension and calm alternate, and danger peaks are never back-to-back.
   - Set pieces break up runs of puzzles, and act changes come with a new biome.
8. **Moments of surprise.**
   - Fake-safe lures, fake victories, ambushes revealed by the camera.
   - Retreating can be the answer.
   - A familiar sight comes back in a new form (the puppet spider leg, the sideways sign).
9. **Sound carries the game.**
   - There is no music score, only ambience. Danger is heard before it is seen.
   - Footsteps get quieter the longer you run, and timing cues are given by sound.
10. **Playtesting.**
    - About 150 first-time testers were each used only once, watched silently.
    - Clues were added wherever testers got stuck. About 70% of the content made was cut.

**Criticisms to avoid in our game:**
- Deaths you can only foresee by dying first.
- Having to replay after you've already solved the puzzle in your head.
- Unclear controls on machines.
- Long reflex sections hiding inside thinking puzzles.

---

## 4. What this means for Chhaya (gap analysis)

**Already in Chhaya:**
- Pits and stakes, crates you push, a falling-log trap, lifts and plank ferries
- A pressure plate and gate, falling stones, swimming
- Rising water with a chain, a spike rack, floating crates
- A water wheel, crushers, the millstone chase
- Checkpoints and hints

**Missing — the main reasons it feels monotonous:**

1. **No living antagonist.** Nothing hunts, watches, ambushes or flees. LIMBO's acts 1–2 run on the spider and the children.
2. **One verb.** We can only push. LIMBO has **grab**: pull, hang, swing on ropes and vines, and drag hazards around as tools.
3. **No enemies used against themselves.** No luring attacks onto traps, no using an enemy's weight or body.
4. **No loss of control or handicap states.** Nothing like being cocooned or controlled by a parasite.
5. **No hazards that cycle on and off,** and no "cut the power at its source" puzzles.
6. **Little misdirection.** No fake-safe lures, fake victories, retreat-as-solution, look-alike traps, or "teach on the way in, test on the way out".
7. **No systemic chains.** Nothing like bait leading to a machine, then weather, then a flood, then a floating log.
8. **Too much repetition.** Each mechanic appears once, in isolation, at one difficulty. LIMBO teaches, then twists, then combines.
9. **No secrets or collectibles,** and no story beat shown through gameplay.

**Original Indian-setting equivalents we could build:**

| LIMBO idea | Original Chhaya version |
|---|---|
| A predator that hunts you | A leopard or a monstrous banyan creature |
| Hunters with ranged attacks | Village poachers with slingshots and catapults, who flee when you approach |
| A parasite that takes control | A possessing spirit |
| Cycling deadly lights | Temple lamps or bells |
| A monsoon act | Lightning reveals the traps; floods |
| Breaking free at the end | The final dawn and the meaning of the diya |
