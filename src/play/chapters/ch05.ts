import { Builder } from '../builder';
import { STEPWELL } from '../themes';
import type { PlayScene } from '../PlayScene';
import { brokenGround, fallingStones, plateGate, pullCrate } from '../beats';

// Chapter V — The Stepwell (बावड़ी). The village's great well: flights of steps going down and down, galleries of
// pillars, still black water at the bottom. Stone plates and iron gates, a sluice that floods a chamber, roof
// stones that fall when the dust trickles, shadows in the lower galleries — and the water that rises when the
// old dam inside the well gives way. Story: in the water she sees her brother's reflection; he isn't there.

type S = PlayScene;
type Ent = { state: string; x: number; body?: MatterJS.BodyType; surface?: number };
const E = (s: S, id: string) => s.ent<Ent>(id);

export function ch05() {
  const B = new Builder('c05', STEPWELL, -300, 420);

  // ---- 1. down the steps
  B.floor(600);
  B.cp(0, 420);
  B.ent({ type: 'secret', x: -240, y: 420, n: 0 });
  for (let i = 0; i < 5; i++) B.drop(44, 90);
  B.floor(200);
  B.cp(B.x - 120, B.y);                                                     // lamp 1 (wall)

  // ---- 2. the plate and the gate: the gate rises only while something heavy stands on the plate
  {
    const x0 = B.x, y0 = B.y;
    B.floor(900, { walk: false });
    B.ent({ type: 'crate', id: 'cr1', x: x0 + 120, y: y0 });
    B.ent({ type: 'plate', x: x0 + 430, y: y0, w: 56, flag: 'gate1' });
    B.ent({ type: 'gate', x: x0 + 640, y: y0, h: 150, flag: 'gate1' });
    B.ceil(x0 + 610, y0 - 150, 90);
    B.hint(x0, x0 + 900, 'The gate rises while something heavy stands on the plate', { linger: 15 });
    B.push('cr1', x0 + 458);
    B.hold(10, { dir: -1 }); B.hold(6);
    B.until((s: S) => !!s.flags.gate1, { max: 200 });
    B.jumpAt(x0 + 400, 1, 24);
    B.go(x0 + 886);
    B.cp(B.x - 120, B.y, 'wall');                                           // lamp 2
  }

  // ---- 3. the gallery where the roof is coming down: dust first, then stones
  {
    const x0 = B.x, y0 = B.y, w = 900;
    B.floor(w, { walk: false });
    B.ceil(x0, y0 - 300, w);
    const drops = [x0 + 200, x0 + 420, x0 + 640];
    drops.forEach((dx, i) => B.ent({ type: 'dropper', x: dx, y: y0, ceil: y0 - 300, period: 2400, offset: i * 800 }));
    B.hint(x0, x0 + w, 'Watch for the dust before the stones fall', { deaths: 1, linger: 20 });
    drops.forEach((dx, i) => {
      B.go(dx - 70);
      B.until((s: S) => { const ph = ((s.t + i * 800) % 2400) / 2400; return ph > 0.21 && ph < 0.3; }, { max: 400 });
    });
    B.go(x0 + w - 14);
    B.cp(B.x - 150, B.y, 'wall');                                           // lamp 3
  }

  // ---- 4. the sluice: a lever floods the chamber; the crate floats up with the water; climb from it
  {
    const x0 = B.x, y0 = B.y;
    B.floor(200);
    B.ent({ type: 'lever', x: B.x - 60, y: y0, flag: 'sluice', once: true });
    B.y += 160;
    const cx = B.x, w = 420;
    B.block(cx, y0 + 160, w);
    B.ent({ type: 'water', id: 'cham', x: cx, y: y0 + 150, w, h: 10, rise: { to: y0 - 128, speed: 40, flag: 'sluice' } });
    B.ent({ type: 'crate', id: 'float', x: cx + 200, y: y0 + 160, light: true, w: 60, h: 50 });
    B.block(cx + w, y0 - 150, 400);
    B.hint(x0, cx + w, 'Pull the lever, then ride the water up', { linger: 20 });
    B.act(x0 + 140);
    B.until((s: S) => !!s.flags.sluice, { max: 100 });
    B.go(cx + 80);
    B.until((s: S) => s.P.state === 'swim', { dir: 1, max: 300 });
    B.until((s: S) => (E(s, 'cham').surface ?? 999) < y0 - 120, { dir: 1, max: 1500 });
    B.until((s: S) => s.P.x > cx + w - 30, { dir: 1, max: 600 });
    B.jumpAt(cx + w - 26, 1, 24); B.climb();
    B.x = cx + w + 400; B.y = y0 - 150;
    B.cp(B.x - 250, B.y, 'wall');                                           // lamp 4
  }

  // ---- 5. the lower galleries: dark, and the shadows live here. Light the wall lamps as you go.
  {
    const x0 = B.x, y0 = B.y, w = 1300;
    B.drop(110, 100);
    B.floor(w - 100, { walk: false });
    B.ent({ type: 'dark', x: x0, w: w + 200, k: 0.9 });
    const lamps = [x0 + 300, x0 + 700, x0 + 1100];
    lamps.forEach((lx, i) => B.ent({ type: 'lamp', id: `wl${i}`, x: lx, y: B.y, kind: 'wall' }));
    B.ent({ type: 'shadows', x: x0 + 120, y: B.y, w: 1100, n: 7, reach: 140, eyes: 5, side: 'floor' });
    B.ent({ type: 'shadows', x: x0 + 400, y: B.y - 260, w: 600, n: 3, reach: 160, eyes: 0, side: 'ceiling' });
    B.ceil(x0, B.y - 260, w);
    B.hint(x0, x0 + w, 'The shadows can\'t bear light.  Light the lamps; keep the flame strong', { deaths: 1, linger: 15 });
    for (const lx of lamps) { B.go(lx - 4); B.act(); B.wait(20); }
    B.go(x0 + w - 14);
    B.cp(B.x - 120, B.y, 'wall');                                           // lamp 5
  }

  // ---- 5b. the long stair down to the water: more falling roof, a stuck crate, a gate
  {
    fallingStones(B, 3, { period: 2600 });
    B.cp(B.x - 120, B.y, 'wall');
    pullCrate(B, { h: 200 });
    plateGate(B);
    B.cp(B.x - 120, B.y, 'wall');
    brokenGround(B, 4, 505);
  }

  // ---- 6. the still water at the bottom: a reflection of a boy on the far side — but nobody is there
  {
    const x0 = B.x, y0 = B.y, w = 520;
    B.ent({ type: 'water', x: x0, y: y0 + 30, w, h: 200 });
    B.block(x0, y0 + 230, w, 600);
    B.ent({ type: 'decor', key: 'brother', x: x0 + 380, y: y0 + 32 + 66, scale: 1, depth: 14.55, tint: 0x6a747c, alpha: 0.35, flip: false });
    B.go(x0 + 30);
    B.until((s: S) => s.P.state === 'swim', { dir: 1, max: 200 });
    B.until((s: S) => s.P.x > x0 + w - 30, { dir: 1, max: 900 });
    B.jumpAt(x0 + w - 30, 1, 24);
    B.x = x0 + w; B.y = y0 + 10;
    B.floor(400);
    B.cp(B.x - 200, B.y, 'wall');                                           // lamp 6
  }

  // ---- 7. two plates, one gate: a crate on one, she on the other
  {
    const x0 = B.x, y0 = B.y;
    B.floor(1000, { walk: false });
    B.ent({ type: 'crate', id: 'cr2', x: x0 + 100, y: y0 });
    B.ent({ type: 'plate', x: x0 + 380, y: y0, w: 56, flag: 'pa' });
    B.ent({ type: 'plate', x: x0 + 610, y: y0, w: 56, flag: 'pb' });
    B.ent({ type: 'script', fn: (s: S) => { s.flags.gate2 = !!(s.flags.pa && s.flags.pb); } });
    B.ent({ type: 'gate', x: x0 + 690, y: y0, h: 150, flag: 'gate2', w: 24 });
    B.ceil(x0 + 660, y0 - 150, 90);
    B.hint(x0, x0 + 1000, 'Both plates hold the gate.  Then run before it falls', { linger: 20 });
    B.push('cr2', x0 + 408);
    B.hold(10, { dir: -1 }); B.hold(6);
    B.jumpAt(x0 + 360, 1, 24);
    B.go(x0 + 640);
    B.until((s: S) => !!s.flags.gate2, { max: 200 });
    B.wait(20);
    B.until((s: S) => s.P.x > x0 + 720, { dir: 1, max: 300 });
    B.go(x0 + 986);
    B.cp(B.x - 150, B.y, 'wall');                                           // lamp 7
  }

  // ---- 8. the dam breaks: water floods up the shaft. Climb, climb — don't let it trap you under the roof.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(220);
    const sx = B.x;
    B.ent({ type: 'water', id: 'flood', x: x0 - 100, y: y0 + 60, w: 1100, h: 200, rise: { to: y0 - 640, speed: 36, trigger: sx + 20 }, ceiling: y0 - 640 });
    B.ent({ type: 'trigger', x: sx + 20, fn: (s: S) => { s.shake(0.01); } });
    B.hint(x0, sx + 700, 'Climb!', { deaths: 1, linger: 60 });
    B.climbUp(140, 140);
    B.gap(120, -60, 'none', { far: 140 });
    B.climbUp(140, 140);
    B.gap(110, -40, 'none', { far: 160 });
    B.climbUp(150, 400);
    B.ceil(x0 - 100, y0 - 640, sx - x0 + 200);
    B.cp(B.x - 250, B.y, 'wall');                                           // lamp 8
  }

  // ---- 9. out into the moonlight at the top of the well
  for (let i = 0; i < 4; i++) B.rise(-50, 120);
  B.floor(600);
  return B.done();
}
