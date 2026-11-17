import { Builder } from '../builder';
import { MILL } from '../themes';
import type { PlayScene } from '../PlayScene';
import { burnDrop, pullCrate, tripwire } from '../beats';
import { brokenGround, crateWall, plateGate, pool } from '../beats';

// Chapter VI — The Mill (चक्की). The river mill at the edge of the village, still turning in the dark with no
// one minding it. Iron crusher shoes slam on a rhythm (pass under while they rest; ride one up to the loft), saws
// and cogs that only stop when the water is turned away from the wheel, a lift on a chain, and the great
// millstone breaking loose behind her. Story: in the miller's room, the brother's slingshot on the floor.

type S = PlayScene;

export function ch06() {
  const B = new Builder('c06', MILL, -300, 600);
  const phase = (s: S, period: number, off: number) => ((s.t + off) % period) / period;

  // ---- 1. the mill-race path
  B.floor(700);
  B.cp(0, 600);
  B.ent({ type: 'secret', x: -240, y: 600, n: 0 });
  B.ent({ type: 'gear', x: 300, y: 300, r: 140, speed: 0.4, depth: 4, tint: 0x606060, sf: 0.85 });
  brokenGround(B, 5, 61);
  B.cp(B.x - 120, B.y);                                                     // lamp 1
  pool(B, 380, -20);
  B.cp(B.x - 150, B.y);                                                     // lamp 2

  // ---- 2. the crusher hall: pass under each shoe while it rests high; it creaks and lifts before it drops
  {
    const x0 = B.x, y0 = B.y, period = 2600;
    B.floor(1100, { walk: false, style: 'wood' });
    B.ceil(x0, y0 - 340, 1100);
    const cr = [x0 + 260, x0 + 560, x0 + 860];
    cr.forEach((cx, i) => B.ent({ type: 'crusher', x: cx, y: y0, w: 90, up: y0 - 210, down: y0, period, offset: i * 700 }));
    B.hint(x0, x0 + 1100, 'Run under while the shoe rests high — it lifts a little before it falls', { deaths: 1, linger: 15 });
    cr.forEach((cx, i) => {
      B.go(cx - 40);
      B.until((s: S) => { const p = phase(s, period, i * 700); return p > 0.86 + 0.0 && p < 0.97 || p < 0.05; }, { max: 500 });
      B.until((s: S) => { const p = phase(s, period, i * 700); return p > 0.0 && p < 0.25; }, { max: 300 });
    });
    B.go(x0 + 1086);
    B.cp(B.x - 120, B.y, 'wall');                                           // lamp 3
  }

  // ---- 3. the saw-room: blades in the passage. A lever by the race turns the water from the wheel; all stops.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(1000, { walk: false, style: 'wood' });
    B.ent({ type: 'lever', x: x0 + 160, y: y0, flag: 'millStop', once: true });
    B.ent({ type: 'saw', x: x0 + 460, y: y0 - 30, r: 34, flag: 'millStop' });
    B.ent({ type: 'saw', x: x0 + 700, y: y0 - 60, r: 44, flag: 'millStop' });
    B.ent({ type: 'gear', x: x0 + 600, y: y0 - 260, r: 90, speed: 1.2, depth: 9, flag: 'millStop' });
    B.ent({ type: 'gear', x: x0 + 820, y: y0 - 200, r: 60, speed: -1.8, depth: 9, flag: 'millStop' });
    B.hint(x0, x0 + 1000, 'Stop the wheel first — the lever by the race', { linger: 12, deaths: 1 });
    B.act(x0 + 160);
    B.until((s: S) => !!s.flags.millStop, { max: 60 });
    B.wait(150);
    B.go(x0 + 986);
    // the miller's room, empty; his stove cold; a boy's slingshot on the floor
    B.floor(400, { style: 'wood' });
    B.deco('w_sling', B.x - 200, B.y, { sx: 0.6, depth: 10.7, rot: 1.4, tint: 0x5a1f1a });
    B.cp(B.x - 120, B.y, 'wall');                                           // lamp 4
  }

  // ---- 4. the chain lift: it rises and falls; step on at the bottom, off at the top
  {
    const x0 = B.x, y0 = B.y;
    B.floor(160, { style: 'wood' });
    B.ents.push({ type: 'pit', x: B.x, y: y0 + 300, w: 100 });
    B.ent({ type: 'lift', id: 'lift1', x: B.x + 6, y: y0 - 2, w: 88, h: 12, to: { x: B.x + 6, y: y0 - 252 }, speed: 80, mode: 'loop', pause: 1400, chains: true, key: 'plank' });
    B.block(B.x + 100, y0 - 250, 500, 250 + 900, { style: 'wood' });
    B.hint(x0, B.x + 300, 'Ride the lift up', { linger: 20 });
    B.until((s: S) => { const l = s.ent<{ u: number; dir: number }>('lift1'); return l.u < 0.02; }, { max: 600 });
    B.go(B.x + 50);
    B.until((s: S) => s.P.feetY < y0 - 240, { max: 600 });
    B.go(B.x + 200);
    B.x = B.x + 600; B.y = y0 - 250;
    B.cp(B.x - 300, B.y, 'wall');                                           // lamp 5
  }

  // ---- 5. the loft: ride a crusher shoe up from below
  {
    const x0 = B.x, y0 = B.y, period = 3400;
    B.drop(200, 120, { style: 'wood' });
    const lx = B.x;
    B.block(lx, B.y, 200, 900, { style: 'wood' }); B.x = lx + 300;
    B.ent({ type: 'crusher', id: 'ride', x: lx + 200, y: B.y, w: 100, up: B.y - 230, down: B.y + 60, period, offset: 0, ride: true });
    B.block(lx + 200, B.y + 60, 100);
    B.block(lx + 300, B.y - 330, 400, 330 + 900, { style: 'wood' });
    B.hint(lx, lx + 400, 'Stand on the iron shoe when it rests on the floor — it will lift you', { linger: 20, deaths: 1 });
    const floorY = B.y;
    const shoeY = (s: S) => s.ent<{ body: MatterJS.BodyType }>('ride').body.position.y;
    B.go(lx + 170);
    B.until((s: S) => shoeY(s) > floorY + 29 && phase(s, period, 0) < 0.6, { max: 600, note: 'shoe resting' });
    B.go(lx + 284);
    B.until((s: S) => shoeY(s) < floorY - 230 + 31, { max: 600, note: 'shoe up' });
    B.jumpAt(lx + 284, 1, 24); B.climb();
    B.x = lx + 700; B.y = B.y - 330;
    B.cp(B.x - 250, B.y, 'wall');                                           // lamp 6
    void x0; void y0;
  }

  // ---- 5b. the grain store: sacks hung from the beams, a stuck crate, the mill-race again
  {
    burnDrop(B, { kind: 'crate' });
    B.cp(B.x - 120, B.y);
    pullCrate(B);
    pool(B, 460, -30);
    B.cp(B.x - 150, B.y);
    tripwire(B, { hidden: true });
  }

  // ---- 6. out over the wheel-house roofs
  brokenGround(B, 4, 77);
  crateWall(B, { h: 190 });
  B.cp(B.x - 120, B.y);                                                     // lamp 7
  plateGate(B);
  B.cp(B.x - 120, B.y);                                                     // lamp 8

  // ---- 7. the millstone breaks loose behind her: run. Jump the gaps; it will fall in the last one.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(300);
    // the stone stands on the loft floor above the path; it breaks loose and drops down behind her
    B.block(x0 - 200, y0 - 220, 260, 90, { style: 'wood', noGrab: true });
    B.ent({ type: 'boulder', id: 'stone', x: x0 - 40, y: y0 - 220, r: 58, key: 'millstone' });
    B.ent({ type: 'roll', target: 'stone', at: x0 + 200, vx: 178, keep: true, spin: 0.08 });
    B.ent({ type: 'cam', x: x0, w: 1600, zoom: 0.84, dx: 80 });
    B.hint(x0, x0 + 1600, 'Run!', { deaths: 1, linger: 60 });
    B.floor(400);
    B.gap(90, 0, 'abyss', { far: 360 });
    B.drop(80, 300);
    B.gap(150, 0, 'stakes', { far: 400 });
    B.cp(B.x - 150, B.y);                                                   // lamp 9
  }
  B.floor(500);
  return B.done();
}
