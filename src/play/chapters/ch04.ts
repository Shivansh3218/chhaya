import { Builder } from '../builder';
import { FIELDS } from '../themes';
import type { PlayScene } from '../PlayScene';
import { brokenGround, burnDrop, crateWall, pullCrate, tripwire } from '../beats';

// Chapter IV — The Fields (खेत). Out of the forest onto open farmland under a low sky. Nothing to hide behind:
// the wind tears at the flame (shelter behind walls and stacks while it gusts), crows wheel and dive in the open
// (stay under roofs), a jackal pack sleeps in the stubble (a grass fire drives them off), an irrigation channel
// runs against her, and an old water-lift carries her up to the road to the village.

type S = PlayScene;
type Ent = { state: string; x: number; body?: MatterJS.BodyType };
const E = (s: S, id: string) => s.ent<Ent>(id);

export function ch04() {
  const B = new Builder('c04', FIELDS, -300, 600);

  // ---- 1. the last trees, then open ground
  B.floor(800);
  B.cp(0, 600);
  B.ent({ type: 'secret', x: -240, y: 600, n: 0 });
  B.gap(120, 0, 'abyss', { far: 300 });
  B.rise(-70, 300);
  B.cp(B.x - 150, B.y);                                                     // lamp 1

  // ---- 2. the wind: gusts from ahead push her back and dim the flame. Shelter behind the walls while it blows.
  {
    const x0 = B.x, y0 = B.y, w = 1500;
    B.floor(w, { walk: false });
    B.ent({ type: 'wind', x: x0, y: y0, w, h: 300, dir: -1, period: 4600, gust: 2200, force: 110 });
    const shel = [x0 + 300, x0 + 650, x0 + 1000, x0 + 1300];
    for (const sx of shel) B.ent({ type: 'shelter', kind: 'wall', x: sx, y: y0, w: 60, h: 120, side: 1 });
    B.hint(x0, x0 + w, 'Wait behind the walls while the wind blows — it will put the flame out', { deaths: 1, linger: 14 });
    const calm = (s: S) => (s.t % 4600) > 2250 && (s.t % 4600) < 2600;
    for (const sx of shel) { B.until(calm, { max: 700 }); B.go(sx + 36); }
    B.until(calm, { max: 700 });
    B.go(x0 + w - 14);
    B.cp(B.x - 120, B.y);                                                   // lamp 2
  }

  // ---- 3. the crows: over the open stubble they dive. Keep under the roofs; cross when one has just dived.
  {
    const x0 = B.x, y0 = B.y, w = 1500;
    B.floor(w, { walk: false });
    B.ent({ type: 'crows', id: 'crw', x: x0 + 200, y: y0, n: 6, w: 160, mode: 'attack', x0: x0 + 60, x1: x0 + w - 60, every: 2.2 });
    const roofs = [x0 + 330, x0 + 760, x0 + 1180];
    for (const rx of roofs) B.ent({ type: 'shelter', kind: 'roof', x: rx, y: y0, w: 110, h: 110 });
    B.ent({ type: 'cam', x: x0, w, zoom: 0.84, dy: -40 });
    B.hint(x0, x0 + w, 'The crows dive at anything in the open.  Shelter under the roofs', { deaths: 1, linger: 14 });
    for (const rx of roofs) B.go(rx + 55);
    B.go(x0 + w - 14);
    B.cp(B.x - 120, B.y);                                                   // lamp 3
  }

  // ---- 3b. the old threshing ground and the farmhouse ruins
  {
    tripwire(B);
    crateWall(B, { kind: 'cart', h: 190 });
    brokenGround(B, 5, 404);
    burnDrop(B);
    B.cp(B.x - 120, B.y);
    pullCrate(B);
    B.cp(B.x - 120, B.y);
  }

  // ---- 4. the irrigation channel: the current runs against her. Swim hard, climb out on the far bank.
  {
    const x0 = B.x, y0 = B.y, w = 560;
    B.drop(80, 100);
    const cx = B.x;
    B.ent({ type: 'water', x: cx, y: B.y + 30, w, h: 220, current: -38 });
    B.block(cx, B.y + 250, w, 600);
    B.hint(cx - 100, cx + w, 'Swim against the current', { linger: 20 });
    B.go(cx + 30);
    B.until((s: S) => s.P.state === 'swim', { dir: 1, max: 200 });
    B.until((s: S) => s.P.x > cx + w - 30, { dir: 1, max: 1500 });
    B.jumpAt(cx + w - 30, 1, 24);
    B.x = cx + w; B.y = B.y + 10;
    B.floor(300);
    B.cp(B.x - 150, B.y);                                                   // lamp 4
    void x0; void y0;
  }

  // ---- 5. the pack in the stubble: asleep across the path. A strip of dry grass lies before them — burn it.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(1100, { walk: false });
    for (let i = 0; i < 4; i++) B.ent({ type: 'burn', kind: 'grass', x: x0 + 200 + i * 70, y: y0, w: 70, h: 20, spread: 30 });
    for (let i = 0; i < 4; i++) B.ent({ type: 'jackal', id: `jk${i}`, x: x0 + 520 + i * 45, y: y0, wake: x0 + 330, speed: 235, patience: 12, exitDir: 1 });
    B.hint(x0, x0 + 1100, 'Dry grass… the pack fears fire', { deaths: 1, linger: 15 });
    B.go(x0 + 180);
    B.act();
    B.until((s: S) => [0, 1, 2, 3].every((i) => ['gone', 'flee', 'sleep'].includes(E(s, `jk${i}`).state)) && s.burnables.every((b) => b.state !== 'burning'), { max: 1500, note: 'pack gone' });
    B.until((s: S) => [0, 1, 2, 3].every((i) => ['gone', 'flee'].includes(E(s, `jk${i}`).state)), { dir: 1, max: 900, note: 'wake and scare the rest' });
    B.go(x0 + 1086);
    B.cp(B.x - 150, B.y);                                                   // lamp 5
  }

  // ---- 6. the haystack yard: a lantern-man with a blowgun on a cart track. Haystacks for cover; up close he runs.
  {
    const x0 = B.x, y0 = B.y, w = 1300;
    B.floor(w, { walk: false });
    const stacks = [x0 + 260, x0 + 620, x0 + 960];
    stacks.forEach((sx, i) => B.ent({ type: 'hay', id: `hy${i}`, x: sx, y: y0, w: 64, h: 66, fixed: true }));
    B.ent({ type: 'poacher', id: 'blow', x: x0 + 1200, y: y0, weapon: 'blowgun', facing: -1, range: 620, torch: true, fleeDist: 200 });
    B.ent({ type: 'dark', x: x0, w, k: 0.5 });
    const safe = (s: S) => ['reload', 'watch', 'lose', 'flee', 'gone'].includes(E(s, 'blow').state);
    B.go(stacks[0] - 48);
    stacks.forEach((sx, i) => {
      B.until(safe, { max: 900 });
      B.jumpAt(sx - 48, 1, 24);
      B.go(i < stacks.length - 1 ? stacks[i + 1] - 48 : x0 + w - 14);
    });
    B.hint(x0, x0 + w, 'Wait for the dart, then run to the next stack', { deaths: 1, linger: 25 });
    B.cp(B.x - 120, B.y);                                                   // lamp 6
  }

  // ---- 7. the old water-lift: step on the bucket platform and it carries her up to the road
  {
    const x0 = B.x, y0 = B.y;
    B.floor(300);
    B.ents.push({ type: 'pit', x: B.x, y: y0 + 280, w: 90 });
    B.ent({ type: 'lift', x: B.x + 5, y: y0 - 4, w: 80, h: 12, to: { x: B.x + 5, y: y0 - 214 }, speed: 70, mode: 'ride', chains: true });
    B.ent({ type: 'gear', x: B.x + 45, y: y0 - 280, r: 60, speed: 0.6, depth: 9 });
    B.block(B.x + 90, y0 - 210, 500);
    B.hint(B.x - 200, B.x + 200, 'Step onto the bucket-board', { linger: 15 });
    B.jumpAt(B.x - 30, 1, 10);
    B.go(B.x + 45);
    B.until((s: S) => s.P.feetY < y0 - 200, { max: 600 });
    B.go(B.x + 140);
    B.x = B.x + 590; B.y = y0 - 210;
    B.cp(B.x - 300, B.y);                                                   // lamp 7
    void x0;
  }

  // ---- 8. the road to the village, wind again, and a last field of crows
  {
    const x0 = B.x, y0 = B.y;
    B.floor(900, { walk: false });
    B.ent({ type: 'wind', x: x0, y: y0, w: 900, h: 300, dir: -1, period: 5200, gust: 1800, offset: 900, force: 120 });
    const shel = [x0 + 260, x0 + 600];
    for (const sx of shel) B.ent({ type: 'shelter', kind: 'wall', x: sx, y: y0, w: 60, h: 120, side: 1 });
    const calm = (s: S) => ((s.t + 900) % 5200) > 1850 && ((s.t + 900) % 5200) < 2300;
    for (const sx of shel) { B.until(calm, { max: 700 }); B.go(sx + 36); }
    B.until(calm, { max: 700 });
    B.go(x0 + 886);
    B.gap(150, 30, 'abyss', { far: 300 });
    B.ent({ type: 'decor', key: 'shrine', x: B.x + 200, y: B.y + 2, scale: 0.8, depth: 5, tint: 0x3a3e42, sf: 0.88 });
    B.ent({ type: 'glimpse', x: B.x + 300, y: B.y - 60, at: B.x - 200, sf: 0.84, depth: 4.5, scale: 0.65 });
    B.floor(600);
  }
  return B.done();
}
