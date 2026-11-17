import type { Builder } from './builder';
import type { PlayScene } from './PlayScene';

// Reusable beats: each lays geometry at the builder's cursor and records how to get through it. Chapters mix
// these with their own set-pieces. All of them have been played through by the autopilot.

type S = PlayScene;
type Ent = { state: string; x: number; facing: number; body: MatterJS.BodyType; hanging?: boolean };
const E = (s: S, id: string) => s.ent<Ent>(id);

/** broken ground: a run of gaps, steps up and drops (seeded so each chapter's run differs) */
export function brokenGround(B: Builder, n: number, seed: number, o: { stakes?: boolean } = {}) {
  let r = seed;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  for (let i = 0; i < n; i++) {
    const k = rnd();
    if (k < 0.4) B.gap(90 + Math.round(rnd() * 60), Math.round((rnd() - 0.5) * 40), o.stakes && rnd() < 0.5 ? 'stakes' : 'abyss', { far: 160 + Math.round(rnd() * 140) });
    else if (k < 0.65) B.rise(-(40 + Math.round(rnd() * 50)), 140 + Math.round(rnd() * 120));
    else if (k < 0.85) B.drop(60 + Math.round(rnd() * 70), 140 + Math.round(rnd() * 120));
    else B.climbUp(120 + Math.round(rnd() * 30), 180 + Math.round(rnd() * 100));
  }
}

/** a wall too high to climb, and a crate (or cart) to push against it */
export function crateWall(B: Builder, o: { h?: number; kind?: 'crate' | 'cart'; dist?: number } = {}) {
  const h = o.h ?? 200, dist = o.dist ?? 360, kind = o.kind ?? 'crate';
  const id = B.uid('cw');
  const wallX = B.x + dist + 120;
  B.floor(dist + 120, { walk: false });
  B.ent({ type: kind, id, x: B.x - dist + 10 });
  const half = kind === 'cart' ? 39 : 26;
  B.push(id, wallX - half - 1);
  B.hold(10, { dir: -1 }); B.hold(6);
  B.jumpAt(wallX - half * 2 - 40, 1, 12);
  B.go(wallX - half - 4);
  B.jumpAt(wallX - half - 4, 1, 24); B.climb();
  B.y -= h; B.x = wallX;
  B.floor(260);
}

/** a crate jammed against the bank she drops from: pull it out, hop over, push it to the far wall, climb */
export function pullCrate(B: Builder, o: { h?: number } = {}) {
  const h = o.h ?? 205;
  B.y += 120;
  const y0 = B.y, x0 = B.x, w = 640;
  B.floor(w, { walk: false });
  const wallX = x0 + w, id = B.uid('pc');
  B.ent({ type: 'crate', id, x: x0 + 29, y: y0, w: 56 });
  B.go(x0 + 90);
  B.push(id, wallX - 200, true);
  B.hold(8, { dir: -1 });
  B.jumpAt(wallX - 150, -1, 24);
  B.push(id, wallX - 29);
  B.hold(10, { dir: -1 }); B.hold(6);
  B.jumpAt(wallX - 82, 1, 12);
  B.go(wallX - 32);
  B.jumpAt(wallX - 32, 1, 24); B.climb();
  B.x = wallX; B.y = y0 - h;
  B.floor(260);
}

/** a tripwire under a hung log: jump the wire. hidden: it only glints in her light */
export function tripwire(B: Builder, o: { hidden?: boolean; from?: number } = {}) {
  const trip = B.x + 260;
  B.floor(560, { walk: false });
  B.ent({ type: 'swinglog', x: trip - 40, y: B.y - 340, len: 300, trip, from: o.from ?? -1, hidden: o.hidden });
  if (o.hidden) for (let x = B.x - 520; x < B.x; x += 26) B.deco('grass_tall', x, B.y + 3, { depth: 12.3, sx: 0.5 });
  B.jumpAt(trip - 46, 1, 18);
  B.go(B.x - 14);
}

/** falling stones from a crack on a rhythm: pass under each just after it fell */
export function fallingStones(B: Builder, n: number, o: { period?: number; ceil?: boolean } = {}) {
  const x0 = B.x, period = o.period ?? 2400, w = 220 * n + 200;
  B.floor(w, { walk: false });
  if (o.ceil !== false) B.ceil(x0, B.y - 320, w);
  for (let i = 0; i < n; i++) {
    const dx = x0 + 160 + i * 220, off = i * (period / n);
    B.ent({ type: 'dropper', x: dx, y: B.y, ceil: B.y - 320, period, offset: off });
    B.go(dx - 70);
    B.until((s: S) => { const ph = ((s.t + off) % period) / period; return ph > 0.21 && ph < 0.3; }, { max: 400 });
  }
  B.go(x0 + w - 14);
}

/** a vine over a gap (or two in a row for a long one) */
export function vines(B: Builder, n: 1 | 2) {
  if (n === 1) { B.vineGap(330, { far: 300 }); return; }
  const x0 = B.x, y0 = B.y, w = 620;
  B.ent({ type: 'vine', x: x0 + 150, y: y0 - 360, len: 310, bough: true });
  B.ent({ type: 'vine', x: x0 + 420, y: y0 - 380, len: 410, bough: true, flip: true });
  B.ents.push({ type: 'pit', x: x0, y: y0 + 260, w });
  B.jumpAt(x0 - 8);
  B.swing(1, (s: S) => s.P.rope.theta > 0.36 && s.P.rope.omega > 0.4);
  B.swing(1, (s: S) => s.P.rope.theta > 0.42 && s.P.rope.omega > 0.3);
  B.x = x0 + w;
  B.floor(300);
}

/** a load hung on a rope over the path: burn the rope, it drops, climb from it */
export function burnDrop(B: Builder, o: { kind?: 'hay' | 'crate' } = {}) {
  const wallX = B.x + 400, y0 = B.y, id = B.uid('bd'), flag = B.uid('drop');
  B.floor(400, { walk: false });
  B.ent({ type: o.kind ?? 'hay', id, x: wallX - 40, y: y0 - 150, hang: flag, ropeTop: y0 - 290 });
  B.ent({ type: 'burn', kind: 'rope', x: wallX - 130, y: y0, w: 4, h: 4, to: { x: wallX - 60, y: y0 - 290 }, flag });
  B.go(wallX - 135);
  B.act();
  B.until((s: S) => !E(s, id).hanging && Math.abs(E(s, id).body.velocity.y) < 0.05, { max: 400 });
  B.wait(30);
  B.go(wallX - 90);
  B.jumpAt(wallX - 90, 1, 12);
  B.go(wallX - 20);
  B.jumpAt(wallX - 20, 1, 24); B.climb();
  B.x = wallX; B.y = y0 - 205;
  B.floor(260);
}

/** a pool to swim, with an optional current against her */
export function pool(B: Builder, w = 420, current = 0) {
  const x0 = B.x, y0 = B.y;
  B.ent({ type: 'water', x: x0, y: y0 + 30, w, h: 200, current });
  B.block(x0, y0 + 230, w, 600);
  B.go(x0 + 30);
  B.until((s: S) => s.P.state === 'swim', { dir: 1, max: 200 });
  B.until((s: S) => s.P.x > x0 + w - 30, { dir: 1, max: 1500 });
  B.jumpAt(x0 + w - 30, 1, 24);
  B.x = x0 + w; B.y = y0 + 10;
  B.floor(300);
}

/** a climb up through hanging roots: catch, climb, swing onto the shelf */
export function rootClimb(B: Builder) {
  const x0 = B.x, y0 = B.y;
  B.floor(120, { walk: false });
  B.ent({ type: 'vine', x: x0 + 200, y: y0 - 480, len: 430, bough: true });
  B.block(x0 + 330, y0 - 230, 300, 230 + 900);
  B.ents.push({ type: 'pit', x: x0 + 120, y: y0 + 300, w: 210 });
  B.jumpAt(x0 + 110);
  B.swing(1, (s: S) => s.P.rope.Lg < 210 && s.P.rope.theta > 0.5 && s.P.rope.omega > 0.2, 200);
  B.climb();
  B.x = x0 + 630; B.y = y0 - 230;
}

/** a crate-and-plate gate */
export function plateGate(B: Builder) {
  const x0 = B.x, y0 = B.y, id = B.uid('pg'), flag = B.uid('gate');
  B.floor(900, { walk: false });
  B.ent({ type: 'crate', id, x: x0 + 120, y: y0 });
  B.ent({ type: 'plate', x: x0 + 430, y: y0, w: 56, flag });
  B.ent({ type: 'gate', x: x0 + 640, y: y0, h: 150, flag });
  B.ceil(x0 + 610, y0 - 150, 90);
  B.push(id, x0 + 458);
  B.hold(10, { dir: -1 }); B.hold(6);
  B.until((s: S) => !!s.flags[flag], { max: 200 });
  B.jumpAt(x0 + 400, 1, 24);
  B.go(x0 + 886);
}

/** shelter-to-shelter against gusts of wind that dim the flame */
export function windWalk(B: Builder, n: number, o: { period?: number; gust?: number; offset?: number; force?: number; dark?: number } = {}) {
  const x0 = B.x, y0 = B.y, w = 330 * n + 300, period = o.period ?? 4600, gust = o.gust ?? 2200, off = o.offset ?? 0;
  B.floor(w, { walk: false });
  B.ent({ type: 'wind', x: x0, y: y0, w, h: 300, dir: -1, period, gust, offset: off, force: o.force ?? 110 });
  if (o.dark) B.ent({ type: 'dark', x: x0, w, k: o.dark });
  const calm = (s: S) => ((s.t + off) % period) > gust + 50 && ((s.t + off) % period) < gust + 400;
  for (let i = 0; i < n; i++) {
    const sx = x0 + 300 + i * 330;
    B.ent({ type: 'shelter', kind: 'wall', x: sx, y: y0, w: 60, h: 120, side: 1 });
    B.until(calm, { max: 700 }); B.go(sx + 36);
  }
  B.until(calm, { max: 700 });
  B.go(x0 + w - 14);
}
