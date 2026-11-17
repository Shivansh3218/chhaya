import { Builder } from '../builder';
import { RAILWAY } from '../themes';
import type { PlayScene } from '../PlayScene';
import { burnDrop, pullCrate, tripwire } from '../beats';
import { brokenGround, crateWall, fallingStones } from '../beats';

// Chapter VIII — The Railway (रेलगाड़ी). A night yard and the line across the river. Trains are the giant
// moving danger: the whistle and the shaking track come first. Cross the cuttings between trains, pull a
// signal to hold one, slip past a rifleman among the goods wagons, and on the bridge, hang under the deck while
// the night train goes over. Story: an empty waiting room, a clock, and a child's ticket on the bench.

type S = PlayScene;
type Tr = { pos: number; head: (t: number) => number | null };

export function ch08() {
  const B = new Builder('c08', RAILWAY, -300, 600);
  const trainAway = (id: string, x: number) => (s: S) => { const t = s.ent<Tr>(id); const h = t.head(s.t); return h === null; };

  B.floor(700);
  B.cp(0, 600);
  B.ent({ type: 'secret', x: -240, y: 600, n: 0 });
  brokenGround(B, 4, 88);
  B.cp(B.x - 120, B.y);                                                     // lamp 1

  // ---- 1. the cutting: the line runs through it. Down, across, up — between trains.
  const cutting = (id: string, w: number, period: number, offset: number, stopFlag?: string) => {
    const x0 = B.x, y0 = B.y;
    B.floor(160);
    const cy = y0 + 90;
    B.block(x0 + 160, cy, w, 900, { style: 'iron' });
    B.ent({ type: 'train', id, x: x0 + 160, y: cy, from: x0 - 1600, to: x0 + w + 2000, speed: 900, period, offset, cars: 5, stopFlag, clip0: x0 + 160, clip1: x0 + 160 + w });
    B.hint(x0, x0 + w + 300, 'Listen for the whistle.  Cross between the trains', { deaths: 1, linger: 20 });
    // just after a train has gone through
    if (!stopFlag) B.until((s: S) => { const t = s.ent<{ d: { period: number; offset: number } }>(id); const ph = (s.t + t.d.offset) % t.d.period; return trainAway(id, x0)(s) && ph < t.d.period - 2600; }, { max: 1200, note: 'between trains' });
    B.go(x0 + 170);
    B.go(x0 + 160 + w - 20);
    B.x = x0 + 160 + w; B.y = y0;
    B.jumpAt(B.x - 20, 1, 24); B.climb();
    B.floor(300);
  };
  cutting('tr1', 300, 9000, 0);
  B.cp(B.x - 150, B.y);                                                     // lamp 2
  cutting('tr2', 420, 9500, 2500);
  B.cp(B.x - 150, B.y);                                                     // lamp 3

  // ---- 2. the signal: a wide cutting, too wide to cross between trains. Pull the signal lever to hold them.
  {
    const x0 = B.x;
    B.floor(200);
    B.ent({ type: 'lever', x: B.x - 80, y: B.y, flag: 'signal', once: true });
    B.ent({ type: 'decor', key: 'signal', x: B.x - 40, y: B.y + 2, scale: 0.6, depth: 9 });
    B.act(B.x - 80);
    B.hint(x0, x0 + 1200, 'Pull the signal — the trains will wait', { linger: 15 });
    cutting('tr3', 900, 4000, 0, 'signal');
    B.cp(B.x - 150, B.y);                                                   // lamp 4
  }

  // ---- 3. the waiting room: a bench, a clock that has stopped, a child's ticket
  {
    B.floor(700, { style: 'stone' });
    B.ent({ type: 'shelter', kind: 'roof', x: B.x - 600, y: B.y, w: 420, h: 150 });
    B.deco('plank', B.x - 420, B.y - 22, { sx: 2.4, sy: 0.6, depth: 10.6 });
    B.deco('scarf', B.x - 400, B.y - 26, { sx: 0.3, sy: 0.25, depth: 10.7, tint: 0xd0c8b8 });
    B.ent({ type: 'lamp', x: B.x - 300, y: B.y, kind: 'hang' });
    B.cp(B.x - 120, B.y, 'none');                                           // lamp 5
  }

  // ---- 3b. the yard sidings: buffers, a stuck handcart, wires underfoot
  {
    crateWall(B, { kind: 'cart', h: 190 });
    tripwire(B, { hidden: true });
    pullCrate(B);
    B.cp(B.x - 120, B.y);
    brokenGround(B, 5, 808);
    burnDrop(B, { kind: 'crate' });
    B.cp(B.x - 120, B.y);
  }

  // ---- 4. the goods yard: a rifleman on a wagon. The wagons are cover; run while he reloads.
  {
    const x0 = B.x, y0 = B.y, w = 1500;
    B.floor(w, { walk: false, style: 'rock' });
    const wagons = [x0 + 300, x0 + 700, x0 + 1100];
    wagons.forEach((wx, i) => B.ent({ type: 'crate', id: `wg${i}`, x: wx, y: y0, w: 100, h: 62, fixed: true }));
    B.block(x0 + 1350, y0 - 110, 150, 110, { style: 'iron' });
    B.ent({ type: 'poacher', id: 'rf', x: x0 + 1420, y: y0 - 110, weapon: 'rifle', facing: -1, range: 1200 });
    B.ent({ type: 'dark', x: x0, w, k: 0.45 });
    const safe = (s: S) => ['reload', 'watch', 'lose', 'flee', 'gone'].includes(s.ent<{ state: string }>('rf').state);
    B.hint(x0, x0 + w, 'Behind the wagons.  Run while he reloads', { deaths: 1, linger: 25 });
    B.go(wagons[0] - 66);
    wagons.forEach((wx, i) => {
      B.until(safe, { max: 900 });
      B.jumpAt(wx - 70, 1, 24);
      B.go(i < wagons.length - 1 ? wagons[i + 1] - 70 : x0 + 1330);
    });
    B.jumpAt(x0 + 1330, 1, 24); B.climb();
    B.x = x0 + 1500; B.y = y0 - 110;
    B.floor(200, { style: 'iron' });
    B.drop(110, 200);
    B.cp(B.x - 120, B.y);                                                   // lamp 6
  }

  // ---- 5. the old signal box: the roof is falling in
  fallingStones(B, 3, { period: 2600 });
  crateWall(B, { h: 195 });
  B.cp(B.x - 120, B.y);                                                     // lamp 7

  // ---- 6. the bridge: the night train comes. Drop into the gap in the deck and hang beneath it.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(500, { style: 'iron' });
    const gx = B.x;
    B.ents.push({ type: 'pit', x: gx, y: y0 + 300, w: 80 });
    B.x = gx + 80;
    B.floor(900, { walk: false, style: 'iron' });
    B.ent({ type: 'train', id: 'night', x: x0, y: y0, from: x0 - 2200, to: B.x + 2400, speed: 850, period: 11000, offset: 3000, cars: 6, stopFlag: 'trainDone', clip0: x0 - 40, clip1: B.x + 60 });
    B.ceil(x0 - 300, y0 - 140, 260); // the tunnel mouth it comes out of
    B.ent({ type: 'cam', x: x0, w: 1600, zoom: 0.8, dy: 40 });
    B.hint(x0, gx + 400, 'The train!  Drop into the gap and hang on underneath', { deaths: 1, linger: 30 });
    B.go(gx - 30);
    B.until((s: S) => { const t = s.ent<{ d: { period: number; offset: number } }>('night'); const ph = (s.t + t.d.offset) % t.d.period; return ph > t.d.period - 3000; }, { max: 900, note: 'whistle' });
    B.until((s: S) => s.P.state === 'hang', { dir: 1, max: 200 });
    let seen = false;
    B.until((s: S) => { const t = s.ent<Tr>('night'); if (t.pos > gx + 100) seen = true; return seen && t.head(s.t) === null; }, { max: 1200, note: 'train passed over' });
    B.wait(20);
    B.climb();
    B.ent({ type: 'trigger', x: gx + 300, flag: 'trainDone' });
    B.go(B.x - 14);
    B.cp(B.x - 200, B.y);                                                   // lamp 8
  }
  B.floor(400);
  return B.done();
}
