import { Builder } from '../builder';
import { FOREST } from '../themes';
import type { PlayScene } from '../PlayScene';

// Chapter I — The Banyan (बरगद). Dusk in the old forest. She wakes beside the last burning diya and learns
// to walk, jump, catch ledges, push, pull, swing, swim and burn — while something in the trees keeps pace.
// Set-pieces: the rotten vine, the grass fire that drives off the leopard, the leopard chase over the rope bridge.

type S = PlayScene;
const ent = <T>(s: S, id: string) => s.ent<T>(id);
type BodyEnt = { body: MatterJS.BodyType; hanging?: boolean };

export function ch01() {
  const B = new Builder('c01', FOREST, -420, 600);

  // ---- 1. waking: the riverbank. A hidden lamp lies behind her, the "wrong" way.
  B.floor(920);
  B.cp(0, 600);
  B.ent({ type: 'secret', x: -360, y: 600, n: 0 });
  B.ent({ type: 'crows', x: 330, y: 600, n: 4, w: 90 });
  B.hint(-420, 380, '←  →  walk          Space  jump', { touch: '◀ ▶  walk          ▲  jump', linger: 2.5 });

  // ---- 2. first jumps
  B.gap(90, 0, 'abyss', { far: 230 });
  B.rise(-60, 260);
  B.gap(120, 20, 'abyss', { far: 260 });
  B.floor(160);
  B.cp(B.x - 120, B.y);                                                     // lamp 1

  // ---- 3. the first ledge: jump, catch, climb
  B.hint(B.x - 200, B.x + 40, 'Jump at the ledge — she catches the edge.  ↑ to climb', { touch: 'Jump at the ledge — she catches the edge.  ▲ again to climb', linger: 6 });
  B.climbUp(140, 320);
  B.drop(120, 260);
  B.gap(150, -40, 'abyss', { far: 200 });
  B.ent({ type: 'crows', x: B.x - 90, y: B.y, n: 6, w: 140 });
  B.drop(100, 220);
  B.rise(-90, 240);
  B.drop(120, 120);

  // ---- 4. the cart: too high to climb, so push the cart to the wall and climb from it
  const cartWall = B.x + 480;
  B.floor(480, { walk: false });
  B.ent({ type: 'cart', id: 'cart', x: B.x - 330 });
  B.hint(B.x - 480, cartWall, 'Walk into the cart to push it', { linger: 8 });
  B.push('cart', cartWall - 41);
  B.hold(10, { dir: -1 });
  B.hold(6);
  B.jumpAt(cartWall - 92, 1, 12);
  B.go(cartWall - 45);
  B.jumpAt(cartWall - 45, 1, 24); B.climb();
  B.y -= 200; B.x = cartWall;
  B.floor(360);
  B.cp(B.x - 250, B.y);                                                     // lamp 2

  // ---- 5. the vine over the ravine
  B.hint(B.x - 100, B.x + 340, 'Jump to catch the vine.  ← → to swing, Space to let go', { touch: 'Jump to catch the vine.  ◀ ▶ to swing, ▲ to let go', linger: 7 });
  B.vineGap(330, { far: 380 });
  {
    // two vines over one wide ravine: let go of the first as it swings forward, catch the second
    const x0 = B.x, y0 = B.y, w = 620;
    B.ent({ type: 'vine', x: x0 + 150, y: y0 - 360, len: 310, bough: true });
    B.ent({ type: 'vine', x: x0 + 420, y: y0 - 380, len: 410, bough: true, flip: true });
    B.ents.push({ type: 'pit', x: x0, y: y0 + 260, w });
    B.hint(x0 - 100, x0 + w, 'Let go as you swing forward, and catch the next vine', { touch: 'Let go (▲) as you swing forward, and catch the next vine', deaths: 2, linger: 20 });
    B.jumpAt(x0 - 8);
    B.swing(1, (s: S) => s.P.rope.theta > 0.36 && s.P.rope.omega > 0.4);
    B.swing(1, (s: S) => s.P.rope.theta > 0.42 && s.P.rope.omega > 0.3);
    B.x = x0 + w;
    B.floor(320);
    B.cp(B.x - 230, B.y);                                                   // lamp
  }

  // ---- 6. the rotten vine: it creaks, frays and snaps. Below, a crate to climb out with
  {
    const x0 = B.x, y0 = B.y, w = 300;
    B.ent({ type: 'vine', x: x0 + 110, y: y0 - 340, len: 300, bough: true, breaks: 320 });
    B.block(x0, y0 + 180, w);
    B.ent({ type: 'crate', id: 'crate1', x: x0 + 120, y: y0 + 180 });
    B.jumpAt(x0 - 8);
    B.swing(1, () => false);
    B.push('crate1', x0 + w - 27);
    B.hold(10, { dir: -1 }); B.hold(6);
    B.jumpAt(x0 + w - 78, 1, 12);
    B.go(x0 + w - 30);
    B.jumpAt(x0 + w - 30, 1, 24); B.climb();
    B.hint(x0, x0 + w, 'Push the crate to the wall', { linger: 10 });
    B.x = x0 + w; B.y = y0;
    B.floor(320);
    B.cp(B.x - 200, B.y);                                                   // lamp 3
  }

  // ---- 6b. a leopard asleep across the path. An unlit lamp stands just before it: light it, and the
  //          light it can't bear wakes it and drives it off. (Walk up in the dark and it wakes hungry.)
  {
    const x0 = B.x, y0 = B.y;
    B.floor(760, { walk: false });
    B.ent({ type: 'lamp', id: 'leoLamp', x: x0 + 330, y: y0, kind: 'post' });
    B.ent({ type: 'leopard', id: 'sleeper', x: x0 + 420, y: y0, mode: 'sleep', facing: -1, minX: x0 + 330, maxX: x0 + 740 });
    B.hint(x0, x0 + 760, 'Light the lamp — the leopard cannot bear the light', { deaths: 1, linger: 15 });
    B.go(x0 + 326);
    B.act();
    B.until((s: S) => ent<{ state: string }>(s, 'sleeper').state === 'flee' || ent<{ state: string }>(s, 'sleeper').state === 'gone', { max: 400, note: 'leopard woken' });
    B.wait(200);
    B.go(B.x - 14);
    B.cp(B.x - 120, B.y);                                                   // lamp
  }

  // ---- 7. something keeps pace in the trees
  const stalk0 = B.x;
  B.floor(500);
  B.deco('bones', B.x - 260, B.y + 2, { depth: 10.6, sx: 0.5 });
  B.drop(110, 320);
  B.gap(140, 0, 'abyss', { far: 360 });
  B.ent({ type: 'leopard', id: 'stalker', x: stalk0, y: B.y, mode: 'stalk', trigger: stalk0 + 60, stalkTo: B.x - 120, bgY: B.y - 60 });

  // ---- 8. the hay bale on a rope: burn the rope, the bale drops, climb from it
  {
    const wallX = B.x + 420, y0 = B.y;
    B.floor(420, { walk: false });
    B.ent({ type: 'hay', id: 'hay1', x: wallX - 40, y: y0 - 150, hang: 'hayDown', ropeTop: y0 - 280 });
    B.ent({ type: 'burn', kind: 'rope', x: wallX - 130, y: y0, w: 4, h: 4, to: { x: wallX - 60, y: y0 - 280 }, flag: 'hayDown' });
    B.hint(wallX - 420, wallX, 'Stand by the rope and press E — the diya burns it', { touch: 'Stand by the rope and tap the flame', linger: 6 });
    B.go(wallX - 135);
    B.act();
    B.until((s: S) => !ent<BodyEnt>(s, 'hay1').hanging && Math.abs(ent<BodyEnt>(s, 'hay1').body.velocity.y) < 0.05, { note: 'hay down' });
    B.wait(30);
    B.go(wallX - 90);
    B.jumpAt(wallX - 90, 1, 12);
    B.go(wallX - 20);
    B.jumpAt(wallX - 20, 1, 24); B.climb();
    B.x = wallX; B.y = y0 - 210;
    B.floor(380);
    B.cp(B.x - 300, B.y);                                                   // lamp 4
    // an old dead tree drops branches on a rhythm: dust trickles first
    const x1 = B.x;
    B.floor(520, { walk: false });
    B.ent({ type: 'dropper', x: x1 + 170, y: B.y, ceil: B.y - 420, period: 2600, offset: 0 });
    B.ent({ type: 'dropper', x: x1 + 350, y: B.y, ceil: B.y - 420, period: 2600, offset: 1300 });
    B.deco('trunk_near', x1 + 260, B.y + 40, { sx: 0.32, sy: 0.5, depth: 10.2, tint: 0x0b0c0e });
    B.hint(x1, x1 + 520, 'Watch for the dust before the branches fall', { deaths: 1, linger: 30 });
    B.go(x1 + 90);
    B.until((s: S) => (s.t % 2600) / 2600 > 0.22 && (s.t % 2600) / 2600 < 0.3, { max: 400 });
    B.go(x1 + 260);
    B.until((s: S) => ((s.t + 1300) % 2600) / 2600 > 0.22 && ((s.t + 1300) % 2600) / 2600 < 0.3, { max: 400 });
    B.go(x1 + 506);
    B.drop(150, 420);
  }

  // ---- 9. the leopard's ground: the lamp holds it off; a grass fire drives it away and drops a log over the gap
  {
    const y0 = B.y, x0 = B.x;
    B.cp(x0 - 120, y0);                                                     // lamp 5 (its light is a refuge)
    B.floor(820, { walk: false });
    B.ent({ type: 'burn', kind: 'brush', id: 'brush', x: x0 + 60, y: y0, w: 90, h: 62, solid: true });
    for (let x = x0 + 150; x < x0 + 780; x += 70) B.ent({ type: 'burn', kind: 'grass', x, y: y0, w: 70, h: 16, spread: 30 });
    B.ent({ type: 'leopard', id: 'leo1', x: x0 + 520, y: y0, mode: 'territory', minX: x0 + 260, maxX: x0 + 760, flag: 'leoGone', before: 7 });
    const gapX = x0 + 820;
    B.ent({ type: 'burn', kind: 'rope', x: gapX - 18, y: y0, w: 4, h: 4, to: { x: gapX + 60, y: y0 - 250 }, flag: 'logDown', spread: 50 });
    B.ent({ type: 'log', id: 'bridgeLog', x: gapX + 100, y: y0 - 190, w: 270, hang: 'logDown', ropeTop: y0 - 250, fixed: true });
    B.ents.push({ type: 'pit', x: gapX, y: y0 + 260, w: 200 });
    B.hint(x0 - 200, gapX, 'The leopard will not come into the light.  Fire frightens it…', { linger: 14, deaths: 2 });
    B.go(x0 + 40);
    B.act();
    B.until((s: S) => !!s.flags.logDown && !!s.flags[`burnt_${'brush'}`], { note: 'fire done', max: 2400 });
    B.until((s: S) => s.burnables.every((b) => b.state !== 'burning'), { max: 1200 });
    B.go(gapX - 30);
    B.jumpAt(gapX - 30, 1, 12);
    B.go(gapX + 230);
    B.x = gapX + 200;
    B.floor(380);
    B.cp(B.x - 200, B.y);                                                   // lamp 6
  }

  // ---- 10. a breather: fireflies, quiet, and far ahead a boy with a bundle on his shoulder
  B.floor(700);
  B.ent({ type: 'glimpse', x: B.x + 300, y: B.y - 70, at: B.x - 500, sf: 0.82, depth: 4.5, scale: 0.7 });

  // ---- 11. pull: in the hollow below, a crate sits hard against the bank she drops from; drag it out,
  //          hop over it, push it home against the far wall, climb
  {
    B.y += 120;
    const y0 = B.y, x0 = B.x, w = 640;
    B.floor(w, { walk: false });
    const wallX = x0 + w;
    B.ent({ type: 'crate', id: 'crate2', x: x0 + 29, y: y0, w: 56 });
    B.hint(x0, wallX, 'Hold Shift and walk away to pull', { touch: 'Hold ✋ and walk away to pull', linger: 10 });
    B.go(x0 + 90);
    B.push('crate2', wallX - 200, true);
    B.hold(8, { dir: -1 });
    B.jumpAt(wallX - 150, -1, 24);
    B.push('crate2', wallX - 29);
    B.hold(10, { dir: -1 }); B.hold(6);
    B.jumpAt(wallX - 82, 1, 12);
    B.go(wallX - 32);
    B.jumpAt(wallX - 32, 1, 24); B.climb();
    B.x = wallX; B.y = y0 - 205;
    B.floor(300);
    B.cp(B.x - 200, B.y);                                                   // lamp 7
  }

  // ---- 12. a tripwire across the path: the log hung above swings down if it's touched. Jump over it.
  {
    const trip = B.x + 260;
    B.floor(560, { walk: false });
    B.ent({ type: 'swinglog', x: trip - 40, y: B.y - 330, len: 290, trip, from: -1 });
    B.hint(trip - 260, trip + 40, 'A wire across the path…  jump over it', { linger: 9, deaths: 1 });
    B.jumpAt(trip - 46, 1, 18);
    B.go(B.x - 14);
    const trip2 = B.x + 300;
    B.floor(520, { walk: false });
    B.ent({ type: 'swinglog', x: trip2 - 40, y: B.y - 340, len: 300, trip: trip2, from: 1, hidden: true });
    for (let x = B.x - 520; x < B.x; x += 26) B.deco('grass_tall', x, B.y + 3, { depth: 12.3, sx: 0.5, flip: (x / 26) % 2 > 1 });
    B.jumpAt(trip2 - 46, 1, 18);
    B.go(B.x - 14);
    // up the hanging roots: catch one, climb it, and jump to the high ground
    {
      const x0 = B.x, y0 = B.y;
      B.floor(150, { walk: false });
      B.ent({ type: 'vine', x: x0 + 210, y: y0 - 470, len: 420, bough: true });
      B.block(x0 + 340, y0 - 250, 500, 250 + 900, {});
      B.ents.push({ type: 'pit', x: x0 + 150, y: y0 + 300, w: 190 });
      B.hint(x0 - 100, x0 + 340, 'On a vine, ↑ climbs.  Swing and let go onto the high ground', { touch: 'Swing and let go onto the high ground', deaths: 2, linger: 20 });
      B.jumpAt(x0 + 140);
      B.swing(1, (s: S) => s.P.rope.Lg < 200 && s.P.rope.theta > 0.5 && s.P.rope.omega > 0.2, 210);
      B.climb();
      B.x = x0 + 840; B.y = y0 - 250;
      B.cp(B.x - 300, B.y);                                                 // lamp
      B.drop(240, 240);
    }
  }

  // ---- 13. the forest pool: swim across, climb out
  {
    const x0 = B.x, y0 = B.y, w = 380;
    B.ent({ type: 'water', x: x0, y: y0 + 30, w, h: 200 });
    B.block(x0, y0 + 230, w, 600);
    B.hint(x0 - 100, x0 + w, 'Swim across — ← →.  At the far side, jump out', { touch: 'Swim across — ◀ ▶.  At the far side, ▲ to jump out', linger: 8 });
    B.go(x0 + 30);
    B.until((s: S) => s.P.state === 'swim', { dir: 1, max: 200 });
    B.until((s: S) => s.P.x > x0 + w - 30, { dir: 1, max: 900 });
    B.jumpAt(x0 + w - 30, 1, 24);
    B.x = x0 + w; B.y = y0 + 10;
    B.floor(360);
    B.cp(B.x - 200, B.y);                                                   // lamp 8
  }

  // ---- 14. the chase: the leopard comes from behind. Run, and burn the bridge rope as you leave it.
  {
    const y0 = B.y, x0 = B.x;
    B.floor(300);
    B.gap(120, 0, 'abyss', { far: 240 });
    B.rise(-60, 220);
    B.gap(140, 20, 'abyss', { far: 200 });
    const bx = B.x, bw = 320;
    B.ent({ type: 'bridge', x: bx, y: B.y, w: bw, flag: 'bridgeDown' });
    B.ents.push({ type: 'pit', x: bx, y: B.y + 300, w: bw });
    B.ent({ type: 'burn', kind: 'rope', x: bx + bw + 26, y: B.y, w: 4, h: 4, to: { x: bx + bw + 2, y: B.y - 40 }, flag: 'bridgeDown' });
    B.ent({ type: 'leopard', id: 'chaser', x: x0, y: y0, mode: 'chase', trigger: x0 + 60, from: x0 - 520, speed: 192 });
    B.ent({ type: 'cam', x: x0, w: bx + bw - x0 + 200, zoom: 0.86, dy: -20 });
    B.hint(x0, bx + bw + 200, 'Run!  On the far side, burn the bridge rope', { touch: 'Run!  On the far side, tap the flame by the rope', deaths: 1, linger: 60 });
    B.go(bx + bw + 30);
    B.act();
    B.x = bx + bw;
    B.floor(520);
    B.cp(B.x - 300, B.y);                                                   // lamp 9
  }

  // ---- 15. the forest shrine: light its lamp and the flame grows stronger
  {
    B.floor(500);
    const sx = B.x - 220;
    B.ent({ type: 'decor', key: 'shrine', x: sx + 40, y: B.y + 2, scale: 0.6, depth: 9 });
    B.ent({ type: 'lamp', id: 'shrineLamp', x: sx - 30, y: B.y, kind: 'post', flag: 'shrineLit' });
    B.hint(sx - 300, sx + 200, 'Light the shrine lamp', { linger: 6 });
    B.go(sx - 34);
    B.act();
    B.endFlag = 'shrineLit';
    B.floor(300);
  }
  return B.done();
}
