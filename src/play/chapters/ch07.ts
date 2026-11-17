import { Builder } from '../builder';
import { MONSOON } from '../themes';
import type { PlayScene } from '../PlayScene';
import { pullCrate, vines } from '../beats';
import { brokenGround, crateWall, pool, windWalk } from '../beats';

// Chapter VII — The Monsoon (बरसात). The storm breaks over the fields and the ruined village. Rain beats the
// flame down (run from roof to roof and let it grow back), lightning shows a pitch-dark field for an instant
// (remember the path), the river is in flood (swim against it), and at the end the hill gives way: boulders
// come down the slope behind her. Story: footprints filling with water, heading for the railway.

type S = PlayScene;

export function ch07() {
  const B = new Builder('c07', MONSOON, -300, 600);

  // ---- 1. the first rain: the flame shrinks under it. Roof to roof, wait until it grows again.
  B.floor(600);
  B.cp(0, 600);
  B.ent({ type: 'secret', x: -240, y: 600, n: 0 });
  {
    const x0 = B.x, y0 = B.y, w = 1800;
    B.floor(w, { walk: false });
    B.ent({ type: 'rain', x: x0 - 100, w: w + 60, k: 0.34 });
    const roofs = [x0 + 260, x0 + 700, x0 + 1140, x0 + 1560];
    for (const rx of roofs) B.ent({ type: 'shelter', kind: 'roof', x: rx, y: y0, w: 120, h: 110 });
    B.ent({ type: 'decor', key: 'hut', x: x0 + 900, y: y0 + 4, scale: 0.8, depth: 5, tint: 0x2c3034, sf: 0.88 });
    B.hint(x0, x0 + w, 'The rain beats the flame down.  Shelter until it grows again', { deaths: 1, linger: 10 });
    for (const rx of roofs) { B.go(rx + 60); B.until((s: S) => s.flameK > 0.97, { max: 400 }); }
    B.go(x0 + w - 14);
    B.cp(B.x - 120, B.y);                                                   // lamp 1
  }
  brokenGround(B, 4, 17);

  // ---- 2. lightning over the dark field: planks over flooded pits. Each flash shows the way for an instant.
  {
    const x0 = B.x, y0 = B.y;
    B.ent({ type: 'lightning', x: x0, w: 1600, every: 2600, dark: 0.96 });
    B.ent({ type: 'rain', x: x0, w: 1600, k: 0.05 });
    B.floor(200);
    B.gap(130, 0, 'abyss', { far: 120 });
    B.gap(140, 20, 'abyss', { far: 110 });
    B.gap(120, -30, 'abyss', { far: 140 });
    B.gap(150, 10, 'abyss', { far: 120 });
    B.gap(130, 0, 'abyss', { far: 300 });
    B.hint(x0, B.x, 'Wait for the lightning — and remember the path', { deaths: 2, linger: 25 });
    B.cp(B.x - 150, B.y);                                                   // lamp 2
  }

  // ---- 3. the dry cowshed: a breather and a lamp to light
  {
    B.floor(500);
    B.ent({ type: 'shelter', kind: 'roof', x: B.x - 400, y: B.y, w: 300, h: 130 });
    B.ent({ type: 'lamp', x: B.x - 260, y: B.y, kind: 'post' });
    B.act(B.x - 262);
    windWalk(B, 3, { period: 4400, gust: 2000, force: 120 });
    B.cp(B.x - 120, B.y);                                                   // lamp 3
  }

  // ---- 4. the river in flood: the current drags her back
  B.drop(60, 120);
  pool(B, 700, -45);
  B.cp(B.x - 150, B.y);                                                     // lamp 4

  // ---- 4b. the flooded orchard: vines over the torrent, a hay-cart, a stuck crate
  {
    vines(B, 2);
    B.cp(B.x - 150, B.y);
    crateWall(B, { kind: 'cart', h: 190 });
    pullCrate(B);
    B.cp(B.x - 120, B.y);
    windWalk(B, 2, { period: 4400, gust: 1900, force: 120 });
  }

  // ---- 5. the drowned village: crows shelter in the rafters; they dive at anything that moves in the open
  {
    const x0 = B.x, y0 = B.y, w = 1300;
    B.floor(w, { walk: false });
    B.ent({ type: 'rain', x: x0, w, k: 0.1 });
    B.ent({ type: 'crows', x: x0 + 200, y: y0, n: 5, w: 140, mode: 'attack', x0: x0 + 60, x1: x0 + w - 60, every: 2.4 });
    for (const rx of [x0 + 380, x0 + 820]) B.ent({ type: 'shelter', kind: 'roof', x: rx, y: y0, w: 120, h: 110 });
    B.go(x0 + w - 14);
    crateWall(B, { h: 195 });
    B.cp(B.x - 120, B.y);                                                   // lamp 5
  }

  // ---- 6. footprints in the mud, filling with rain — a boy's, heading for the railway
  {
    B.floor(600);
    for (let i = 0; i < 6; i++) B.deco('leaves', B.x - 520 + i * 70, B.y + 3, { sx: 0.12, sy: 0.4, depth: 10.7, tint: 0x30363c });
    B.ent({ type: 'glimpse', x: B.x + 260, y: B.y - 60, at: B.x - 250, sf: 0.85, depth: 4.5, scale: 0.65 });
    brokenGround(B, 3, 29);
    B.cp(B.x - 120, B.y);                                                   // lamp 6
  }

  // ---- 7. the landslide: the hill gives way. Boulders come down behind her — run, and don't stop.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(300);
    B.block(x0 - 260, y0 - 260, 300, 120, { noGrab: true });
    B.ent({ type: 'boulder', id: 'b1', x: x0 - 120, y: y0 - 260, r: 40, key: 'rock' });
    B.ent({ type: 'boulder', id: 'b2', x: x0 - 200, y: y0 - 260, r: 30, key: 'rock' });
    B.ent({ type: 'roll', target: 'b1', at: x0 + 160, vx: 182, keep: true, spin: 0.1 });
    B.ent({ type: 'roll', target: 'b2', at: x0 + 260, vx: 182, keep: true, spin: 0.12 });
    B.ent({ type: 'trigger', x: x0 + 150, fn: (s: S) => s.shake(0.01) });
    B.ent({ type: 'cam', x: x0, w: 1700, zoom: 0.84, dx: 80 });
    B.ent({ type: 'rain', x: x0, w: 1700, k: 0.08 });
    B.hint(x0, x0 + 1700, 'The hill is coming down — run!', { deaths: 1, linger: 60 });
    B.floor(300);
    B.gap(100, 0, 'abyss', { far: 260 });
    B.drop(90, 300);
    B.gap(120, 0, 'abyss', { far: 200 });
    B.gap(160, 0, 'stakes', { far: 400 });
    B.cp(B.x - 150, B.y);                                                   // lamp 7
  }
  B.floor(500);
  return B.done();
}
