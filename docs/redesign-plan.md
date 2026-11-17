# Chhaya — redesign plan

> **Update — ten chapters, as built (new engine).** The seven-chapter plan below grew to ten. Levels are built in
> code with `src/play/builder.ts` instead of Tiled, so each beat also records how to solve it for the automated
> playthroughs. The story is unchanged: a girl crosses the land on Diwali night with the last flame, to find her
> brother and relight the great lamp.
>
> | # | Chapter | Place | Threats and set-pieces | Story beat |
> |---|---|---|---|---|
> | I | The Banyan | forest at dusk | leopard (stalks, sleeps, prowls, chases); vines, rotten vine, cart, hay bale, grass fire, rope bridge | the forest shrine; a boy glimpsed far ahead |
> | II | The Hollow | caves under the banyan | Makdi the giant spider (drops, guards, chases through webs, driven off by fire); shadows; the draft | his red scarf on a thorn |
> | III | The Poachers | forest edge camp | snares, iron jaws, leaf-covered pits, slingshots (crate cover), a chaser turned into his own pit, lantern patrol, dogs, rifleman on a watchtower | two men leading a boy away |
> | IV | The Fields | open farmland | headwind gusts, diving crows, irrigation current, jackal pack scattered by fire, blowgun in the haystacks, the water-lift | the village shrine on the horizon |
> | V | The Stepwell | the village baoli | plates and gates, falling roof, sluice flood, shadows in the galleries, the dam breaking | his reflection in the water — no one there |
> | VI | The Mill | the river mill | crusher hall, riding a crusher shoe, saws and cogs stopped at the race, chain lift, millstone chase | his slingshot in the miller's room |
> | VII | The Monsoon | storm over fields and village | rain (shelter), lightning-memory field, flood river, crows, landslide | footprints filling with rain |
> | VIII | The Railway | night yard and river bridge | trains through cuttings, the signal, rifleman in the goods yard, hanging under the bridge deck | a child's ticket in the waiting room |
> | IX | The Fort | poachers' hill fort | blowgun and sling on the rampart, falling gallery, the spider in the dungeon, dogs in the courtyard | she frees him from a hanging cage; he runs for the temple |
> | X | The Temple | the hill temple | the shadow leopard (lamplight turns it), arms in the tank, the bell tower | she lights the great lamp; he is waiting there |

**Goal.** Turn Chhaya from "a corridor with one obstacle at a time" into a game with:
- living threats,
- surprises,
- puzzles that combine ideas,
- a rhythm of fear and calm.

**Approach.** Take the *techniques* behind LIMBO's level design (see [limbo-level-study.md](limbo-level-study.md)), not its scenes or creatures. Chhaya's identity comes from:
- the girl's **diya** (oil lamp),
- an **Indian setting**,
- a **story about light**.

---

## 1. Premise

> On the night of Diwali, every lamp in the village goes out at once and a shadow spreads over the land. Chhaya, a small girl, finds that her clay diya is the only flame still burning. She carries it through the forest, the old stepwell, the mill, the monsoon and the railway, up to the hill temple, to relight the great lamp and bring the light back.

- **No text, no dialogue.** The story is told through what she passes:
  - dark villages,
  - people frozen as shadows,
  - an older brother who has gone ahead of her and left signs behind.
- **The brother.** He is glimpsed several times, then lost again. The ending reveals what happened to him.
- **Tone.** Eerie, sad and hopeful. Deaths are shown in silhouette and cut quickly to black: **no gore**. This keeps a Play Store rating suitable for families, unlike LIMBO's graphic deaths.

---

## 2. The signature mechanic: the diya

LIMBO's boy has nothing. Chhaya has **a flame**. The flame is a tool, a weakness and a story device at the same time, and it is what makes Chhaya not a LIMBO copy.

| Diya rule | Gameplay use |
|---|---|
| Light keeps **shadow creatures** back; they only attack beyond the glow | A safe circle that moves with her. Some puzzles need it to be bigger or smaller |
| **Wind and rain** dim the flame, and it can go out | She must shelter: behind walls, under roofs, with her back to the wind. If the flame goes out, she dies |
| She can **light lamps** on walls | Each lit lamp is a **checkpoint**, which replaces the invisible ones. Lit lamps also hold shadows away and light up the area |
| She can **burn** dry rope, vines, hay and cloth | Cut a rope bridge, free a hanging weight, start a grass fire to block a predator, burn a path through brambles |
| **Light reverses possession** (see §3) | Steer a possessed Chhaya with lamp light and sunbeams |
| **She can set the diya down** and pick it up again (new button) | She can leave her light behind to keep shadows away from a spot, at the cost of walking into the dark herself |

Not every chapter uses all of these. Each chapter teaches one or two diya rules.

---

## 3. New verbs and systems

### 3.1 Controls

| Control | Use |
|---|---|
| ← → | Move |
| Jump | Jump |
| **Grab** (hold) | Push, pull, drag, hang, climb, swing |
| **Lamp** (tap) | Set the diya down or pick it up; light a lamp or something flammable |

On touch screens: two action buttons on the right side, Jump and Grab/Lamp.

### 3.2 Movement and object systems

1. **Pull and drag.** Today we can only push. Add dragging crates, snares, bodies and logs.
2. **Ropes, vines and chains.**
   - Hang from them, climb up and down, and swing with real pendulum momentum.
   - Ropes can **break or burn**, and some move: winches, pulleys, ropes rigged to traps.
3. **Ladders.** Climb up and down; they can be pushed or rolled.
4. **Hazards that work as tools.**
   - **Phanda** (poachers' snare), draggable like a bear trap.
   - **Deadfall** logs, falling sharpened bamboo, pits hidden under leaves.

### 3.3 Enemy framework

Every enemy follows the same three steps:
1. **Telegraph:** sound plus a visible tell.
2. **Act.**
3. **Recover:** a window for the player.

| Enemy | Behaviour | How you beat it |
|---|---|---|
| **The leopard (Baagh)** | Stalks in the background layer first. Crouches and growls before it pounces. Fears fire | Fire, its own pounce aimed into a trap, a collapsing bridge |
| **Poachers (shikari)** | Slingshots: an aim line appears, then the stone flies. Torches with light cones. They set snares. Up close they always run away | Cover, staying out of torch light, leading them back through traps the player has already learned |
| **Shadow creatures (chhayas)** | Live in the dark and close in when her light shrinks | Light: lamps, fire, the diya |
| **Possessing spirit (bhoot)** | Takes over her walking so she can only go one way. Light reverses the direction | Temple bells or holy water (the "cure" spots) |
| **Machines** | Crushers, saws, wheels, trains, signals that cycle on and off | Timing, cutting the power, using the machine as a vehicle |

### 3.4 Rule-based systems

- **On/off cycles:** temple lamps, signals, lightning.
- **Power and source:** stop the water wheel and every machine it drives stops.
- **Delayed triggers:** sacks of grain dropped from a chute, train timetables.
- **Chain reactions:** for example, burn a rope → a bell falls → a shadow creature flees → a door opens.
- **Water:** rising and falling levels, currents, floating objects.
- **Weather:** wind, rain and lightning.

### 3.5 Presentation

- **Sound tells you what's coming.** Every lethal thing has a sound before you can see it: a growl, the creak of a slingshot, a train whistle, a rumble.
- **Camera cues:** zooms and pans reveal an ambush at the moment the player commits. The camera also pulls back for set pieces.

### 3.6 Collectibles and secrets

- **Hidden diyas:** 12 unlit lamps hidden off the main path:
  - in the "wrong" direction,
  - up high,
  - before a machine is started.
- Lighting all 12 opens a **secret chapter**: a pitch-dark level played by sound.
- There is also an achievement for finishing with few deaths.

---

## 4. Chapters

**Length.** Each chapter takes **12–18 minutes** on a first playthrough, about 2 hours in total. That is twice today's total length, mostly from new content rather than longer corridors.

**Shape of every chapter:**
- teach one new thing safely;
- twist it;
- combine it with something already learned;
- a set piece;
- a breather;
- a reveal or story beat.

**Pacing.** Danger peaks are never back-to-back.

### Ch I — **The Banyan** (बरगद): forest at dusk

- **Teaches:** jump, pull, vine swing, ladder; lamp checkpoints; burning rope.
- **Threat:** the leopard.

| # | Beat | What happens |
|---|---|---|
| 1 | Calm | She wakes by the riverbank holding the last diya. Walk, jump, gap. A shortcut to the left hides a secret lamp |
| 2 | Teach "pull" | A cart wheel blocks a ledge. Pull it back to climb |
| 3 | Teach lamps | She lights the first wall lamp (checkpoint). The warm light shows the lamp's purpose |
| 4 | Teach "swing" | A vine over a ravine. She builds swing momentum |
| 5 | Twist | The next vine is rotten and snaps. Hint: frayed fibres and a creak. Use a fallen log as a bridge instead |
| 6 | Foreshadowing | Eyes in the background layer; a growl. Deer carcass drag marks |
| 7 | Teach "burn" | A hanging bundle of hay blocks the path. Hold the diya to the rope and the bundle drops as a step |
| 8 | Set piece: **leopard stalks** | It shadows her in the background, then appears in front. Crouch → pounce warning. Retreat into a lamp's circle, because it won't enter the light |
| 9 | Puzzle under threat | Dry grass between her and the leopard. She burns the grass to make a wall of fire, and the leopard retreats. The fire also burns a rope holding a log, which becomes the way forward |
| 10 | Breather | A quiet walk; fireflies; first glimpse of the **brother** far ahead, carrying something |
| 11 | Set piece: **leopard chase** | Run across a rope bridge. Burn the anchor rope behind you so the bridge falls with the leopard on it. Hold too long and she falls too |
| 12 | End | The forest shrine. Light its lamp and the chapter's flame grows stronger |

### Ch II — **The Poachers** (शिकारी): the forest edge and a poachers' camp

- **Teaches:** cover, light cones (stealth), snares as tools.
- **Twist:** teach a trap on the way in, then use it against them on the way out.

| # | Beat | What happens |
|---|---|---|
| 1 | Calm, then dread | Snared animals hang in cages. A caged monkey watches her |
| 2 | Teach snares | A phanda (snare) on the path. Drag it aside to pass, or lure something into it |
| 3 | Look-alike traps | Two leaf-covered patches: one is a hidden pit, the other is solid. The difference is a small sign (scattered twigs). This punishes running on autopilot |
| 4 | **Ambush** | The camera pans to reveal two poachers on a ledge. An aim line appears, then a stone flies. She hides behind a crate and pushes it forward as moving cover |
| 5 | Retreat as the answer | They chase her. Run *back* through the trap path from beat 3 so the poachers fall into the pit. She learned it on the way in; now she uses it on the way out |
| 6 | Breather | Free the caged monkey: burn the rope on the cage. It climbs away |
| 7 | Chain reaction | Later, the monkey throws down fruit, which knocks a lantern off a post, which sets the camp's hay on fire, which drives off a guard dog |
| 8 | Teach stealth | The poachers' camp at night. Their torches cast light cones; stay in the dark. But **her diya gives her away**, so she sets it down in a hiding spot, crosses in the dark, then comes back for it |
| 9 | Combination | Stealth plus shadow creatures. In the dark, shadows creep toward her; in the light, the poachers see her. She has to pick her moments |
| 10 | Set piece: **escape on a log flume** | Ride a timber chute down the hill while a poacher shoots. Duck under branches |
| 11 | Story | The brother's red scarf is caught on a thorn bush. He was taken this way |

### Ch III — **The Stepwell** (बावड़ी): the abandoned baoli (rework of today's chapter)

- **Teaches:** possession (the bhoot), sunlight versus moonlight, water you control yourself.
- **Keeps** today's best parts: the plate and gate, the rising water, the floating crate.

| # | Beat | What happens |
|---|---|---|
| 1 | Calm | Down the steps. Echoes; the sound of water dripping |
| 2 | Plate and gate (existing) | Upgraded with a twist: **two plates**. One opens the gate; the other floods the hall (a look-alike) |
| 3 | Teach possession | A pale spirit drops onto her and she walks on her own. Moonbeams reverse her direction. To cure it, ring a hanging temple bell |
| 4 | Combination | While possessed, steer through the falling stones (existing) using the beams of moonlight |
| 5 | Breather | A silent hall of carved idols. A secret lamp sits behind a column |
| 6 | Water you control | Levers open sluices. Raise the water to float a crate up, lower it to uncover a passage. Get the order wrong and the exit drowns |
| 7 | **Deliberate exposure** | To reach a high bell, she must let the spirit take her on purpose, because only possessed walking crosses the slippery moss ledge |
| 8 | Set piece: **the drowned well** | Rising water (existing) plus spikes, now with the shadow creatures in the dark water. Her diya must stay above the surface |
| 9 | Story | Under the water she sees the brother's reflection, but he isn't there. |

### Ch IV — **The Mill** (चक्की): the river mill at dusk (rework of today's chapter)

- **Teaches:** machines, power at the source, hazards used as vehicles.
- **Keeps** the water wheel, the crushers and the millstone chase.

| # | Beat | What happens |
|---|---|---|
| 1 | The wheel (existing) | Ride the paddles across the current |
| 2 | **Fix the source** | The crusher hall is impassable. Find the sluice gate outside and divert the river. The wheel slows, and so do all the crushers. Then the sluice slips back, so it's a race |
| 3 | Delayed consequences | Grain sacks drop from a chute a few seconds after a lever is pulled. Time the lever so a sack lands as a step in front of the crusher |
| 4 | Hazard as vehicle | Ride a crusher's rising shoe up to a high loft |
| 5 | Escort | A rolling barrel has to reach a pressure plate without falling into gaps. She moves platforms under it |
| 6 | Breather | The miller's empty room: a cold stove, a child's toy, the brother's slingshot |
| 7 | Set piece: **millstone chase** (existing) | Now longer: a collapsing floor and a rope swing in the middle |
| 8 | Ending of the act | Out into the yard at nightfall. Clouds gather and the wind rises |

### Ch V — **The Monsoon** (बरसात): fields, river and a ruined village in a storm (new)

- **Teaches:** weather.
  - Rain dims the diya, so she must shelter.
  - **Lightning** briefly reveals a pitch-dark level; the player has to remember the layout.
  - The flood rises and falls.

| # | Beat | What happens |
|---|---|---|
| 1 | Teach shelter | The first rain. The flame shrinks. Duck under roofs and trees. A meter isn't needed: the size of the flame is the meter |
| 2 | Wind | Gusts come in pulses (a sound plus leaves blowing past). Walk only between gusts, or hide behind a wall |
| 3 | **Lightning memory** | A dark field crossed by planks over flooded pits. Each flash shows the path for half a second |
| 4 | The river in flood | Floating debris as stepping stones, logs that roll, a current pulling her |
| 5 | Breather | A dry cowshed. Calm, the sound of rain, a lamp to light |
| 6 | Cycling hazard | A brass temple bell on a pole draws lightning in a rhythm. Pass between strikes |
| 7 | Set piece: **landslide** | The hill gives way. Run downhill as the mud slides, with collapsing huts |
| 8 | Story | She finds her brother's footprints filling with water, heading for the railway |

### Ch VI — **The Railway** (रेलगाड़ी): a night railway yard and bridge (new)

- **Teaches:** trains as giant moving hazards, signals that cycle on and off, carriages to climb, handcarts.

| # | Beat | What happens |
|---|---|---|
| 1 | Teach trains | A goods train passes; the track shakes; the whistle comes first. Cross between passes |
| 2 | Signals | Red and green signal arms control when trains come. Switch a signal to hold a train |
| 3 | Points (switches) | Throw track points to send a runaway wagon into a buffer, breaking open a wall |
| 4 | Handcart | Pump a handcart along a branch line. A train is coming on the same track, so throw the points in time |
| 5 | Breather | An empty waiting room; a clock; the brother's ticket |
| 6 | Combination | A turntable rotates a section of track and the platform with it. This is our version of a rotating room |
| 7 | Set piece: **the bridge** | Cross a river bridge on foot while a train comes. Climb down under the girders, hang from them, and climb back up after it passes |

### Ch VII — **The Temple** (मंदिर): the hill temple, finale (new)

- **Teaches:** the **mirror tank**. Diving into the temple's water tank turns the world upside down, and you walk in the reflection, our version of LIMBO's gravity.
  - Things that are open in the reflection are closed above, and the other way round.
- **Finale:** climb the temple tower while the shadow gathers. Light the great lamp.

| # | Beat | What happens |
|---|---|---|
| 1 | Calm | The stairs up the hill. Quiet; all the lamps the player lit along the way are shown below as a map of their journey |
| 2 | Teach the mirror | A wall blocks the path above. Dive into the tank, walk in the reflection world, and surface beyond the wall |
| 3 | Twist | In the reflection, hazards flip too: a fire above becomes water below |
| 4 | Combination | Use both worlds to move a crate: push it in one world, and it is moved in the other |
| 5 | Callback | The leopard from Chapter I comes back, but made of shadow. Use the temple lamps to herd it |
| 6 | Set piece: **the tower** | Climb the bell tower as shadow creatures rise. Ring each bell to light a ring of lamps |
| 7 | Ending | She lights the great lamp. The light spreads down the hill and across every place she passed. Then a quiet scene: the brother is found [the reveal is still to be decided] |

### Secret chapter — **The Dark** (अंधेरा)

- **Unlock:** light all 12 hidden diyas.
- A pitch-dark remix of hazards from every chapter, played by sound alone.

---

## 5. Rules for designing every level

1. **Teach → twist → combine.** No mechanic appears only once.
2. **Every lethal thing gives a warning:** a sound plus a visible tell, before it kills.
3. **A wrong idea should look clearly wrong; a right idea should be easy to carry out.**
4. **Checkpoints are never more than about 20 seconds of replay apart.**
5. **Never two danger peaks back-to-back.** Put a breather after every set piece.
6. **One surprise per chapter:** a fake-safe lure, an ambush, retreating as the answer, or a fake victory.
7. **One story beat per chapter, shown through gameplay.** No text.
8. **Hints stay** (useful for testing and for younger players). They appear automatically after repeated deaths.

---

## 6. Build plan

### Phase 0 — tooling (≈1 session)

- *(Superseded: levels are now built in code with `src/play/builder.ts`.)* **Move level authoring to the free Tiled map editor.** Levels are drawn visually and exported as JSON, which the game loads.
  - Today every coordinate is typed by hand, which is why levels came out simple and corridor-like.
  - With Tiled, rich levels become practical: many objects, layered backgrounds, triggers.
- A **debug mode**:
  - teleport to any checkpoint,
  - show hitboxes and triggers,
  - slow motion.

### Phase 1 — core verbs (2–3 sessions)

- Grab: pull and drag; ropes and vines with pendulum swing; ladders.
- The diya: flame size, wind and rain dimming it, lighting lamps as checkpoints, burning ropes and hay, setting it down and picking it up.
- Two-button touch controls.

### Phase 2 — enemies (2–3 sessions)

Built on the shared telegraph → act → recover framework:
1. Leopard
2. Poachers (aim lines, light cones, fleeing when approached)
3. Shadow creatures
4. Possessing spirit

### Phase 3 — chapters I and II (3–4 sessions)

- Build both chapters from the beat sheets above.
- **Stop and playtest with real people.**
  - Watch silently and note where they get stuck.
  - Adjust the warnings and clues.

### Phase 4 — chapters III and IV rework (2–3 sessions)

Fold the new verbs into today's stepwell and mill.

### Phase 5 — chapters V to VII plus the secret chapter (5–6 sessions)

Weather, trains, the mirror tank, the finale.

### Phase 6 — release polish

- Recorded sound effects to replace the synthesised ones.
- A small music theme for menus and the ending only (bansuri).
- Android build, store assets, closed testing.

**Release suggestion:**
- Ship chapters I–II first as the **free part**.
- Then a one-time purchase unlocks III–VII.
- This also means a first Play Store version is possible after Phase 3.

---

## 7. Decisions needed

1. **Premise:** the Diwali night / last-flame story, with the brother.
2. **Violence level:** silhouette, non-gory deaths, aiming for a family-friendly rating.
3. **Seven chapters** at roughly 2 hours total, or fewer chapters, each longer.
4. **Adopting the Tiled level editor** (strongly recommended).
5. Whether to **keep swimming**. Today she can swim; LIMBO's boy drowns. Keeping it is a deliberate difference from LIMBO, and the monsoon chapter makes good use of it.
