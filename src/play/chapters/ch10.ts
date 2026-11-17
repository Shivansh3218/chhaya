import { Builder } from '../builder';
import { TEMPLE } from '../themes';
import type { PlayScene } from '../PlayScene';
import { crateWall, fallingStones, plateGate, pullCrate } from '../beats';
import { brokenGround, pool, rootClimb, vines, windWalk } from '../beats';

// Chapter X — The Temple (मंदिर). The hill temple above the village, where the great lamp has gone out. The
// shadow has gathered here: a leopard made of it prowls the terraces (only lamplight turns it), arms reach from
// the walls of the tank, and the tower must be climbed floor by floor, ringing each bell to light a ring of
// lamps against the dark. At the top: the great lamp — and her brother, waiting, who could not light it alone.

type S = PlayScene;
type Ent = { state: string; x: number };
const E = (s: S, id: string) => s.ent<Ent>(id);

export function ch10() {
  const B = new Builder('c10', TEMPLE, -300, 700);

  // ---- 1. the steps up the hill
  B.floor(600, { style: 'stone' });
  B.cp(0, 700);
  B.ent({ type: 'secret', x: -240, y: 700, n: 0 });
  for (let i = 0; i < 6; i++) B.rise(-45, 140, { style: 'stone' });
  B.ent({ type: 'glimpse', x: B.x + 300, y: B.y - 200, at: B.x - 300, sf: 0.86, depth: 4.5, scale: 0.65 });
  brokenGround(B, 4, 23, { stakes: true });
  B.cp(B.x - 120, B.y);                                                     // lamp 1

  // ---- 2. the shadow leopard on the first terrace: light the terrace lamps; it can't bear them
  {
    const x0 = B.x, y0 = B.y;
    B.floor(1400, { walk: false, style: 'stone' });
    B.ent({ type: 'dark', x: x0 - 100, w: 1600, k: 0.55 });
    const lamps = [x0 + 200, x0 + 640, x0 + 1080];
    lamps.forEach((lx, i) => B.ent({ type: 'lamp', id: `tl${i}`, x: lx, y: y0, kind: 'post' }));
    B.ent({ type: 'leopard', id: 'shade', x: x0 + 500, y: y0, mode: 'territory', minX: x0 + 260, maxX: x0 + 1300, tint: 0x15171a });
    B.hint(x0, x0 + 1400, 'It is made of shadow.  Only lamplight turns it', { deaths: 1, linger: 15 });
    B.go(lamps[0] - 2); B.act();
    B.until((s: S) => ['flee', 'gone', 'prowl'].includes(E(s, 'shade').state) && Math.abs(E(s, 'shade').x - s.P.x) > 260 || E(s, 'shade').state === 'gone', { max: 900 });
    B.go(lamps[1] - 2); B.act();
    B.until((s: S) => E(s, 'shade').state === 'gone' || E(s, 'shade').x > s.P.x + 320 || E(s, 'shade').state === 'flee', { max: 900 });
    B.go(lamps[2] - 2); B.act();
    B.until((s: S) => E(s, 'shade').state === 'gone', { max: 900, note: 'shade gone' });
    B.go(x0 + 1386);
    B.cp(B.x - 120, B.y);                                                   // lamp 2
  }

  // ---- 3. the temple tank: arms reach from its walls; keep the flame high
  {
    B.drop(60, 80, { style: 'stone' });
    const x0 = B.x;
    B.ent({ type: 'shadows', x: x0 + 60, y: B.y + 225, w: 400, n: 3, reach: 130, eyes: 0 });
    pool(B, 520);
    B.ent({ type: 'shadows', x: x0 + 530, y: B.y - 10, w: 200, n: 2, reach: 90, eyes: 2 });
    B.cp(B.x - 150, B.y);                                                   // lamp 3
  }

  // ---- 4. the gardens: roots and vines grown over the old walls
  vines(B, 2);
  rootClimb(B);
  B.cp(B.x - 200, B.y);                                                     // lamp 4
  windWalk(B, 2, { period: 4800, gust: 2000, force: 110, dark: 0.4 });
  B.cp(B.x - 120, B.y);                                                     // lamp 5

  // ---- 4b. the temple courtyards: gates, a stuck crate, falling stones from the old gopuram
  {
    plateGate(B);
    B.cp(B.x - 120, B.y, 'wall');
    pullCrate(B, { h: 200 });
    fallingStones(B, 3, { period: 2600 });
    B.cp(B.x - 120, B.y, 'wall');
    crateWall(B, { h: 195 });
    brokenGround(B, 4, 1010);
  }

  // ---- 5. the tower: climb floor by floor; on each floor a bell — ring it and a ring of lamps lights
  {
    const x0 = B.x;
    B.ent({ type: 'dark', x: x0 - 200, w: 2600, k: 0.75 });
    for (let f = 0; f < 4; f++) {
      const flag = `bell${f}`;
      B.floor(200, { style: 'stone' });
      B.ent({ type: 'bell', x: B.x - 100, y: B.y, flag });
      for (let k = 0; k < 2; k++) B.ent({ type: 'lamp', x: B.x - 180 + k * 160, y: B.y, kind: 'wall', on: flag });
      B.ent({ type: 'shadows', x: B.x - 200, y: B.y, w: 200, n: 2, reach: 100, eyes: 1, side: 'floor' });
      B.act(B.x - 102);
      B.climbUp(140, 140, { style: 'stone' });
      if (f % 2 === 1) B.cp(B.x - 80, B.y, 'wall');                        // lamps 6, 7
    }
    B.ceil(x0 - 100, B.y - 260, B.x - x0 + 100);
  }

  // ---- 6. the roof of the tower: the great lamp. He is there.
  {
    B.floor(700, { style: 'stone' });
    const gx = B.x - 260;
    B.ent({ type: 'decor', key: 'shrine', x: gx + 40, y: B.y + 2, scale: 1.1, depth: 9 });
    B.ent({ type: 'lamp', id: 'great', x: gx - 60, y: B.y, kind: 'post', flag: 'greatLit' });
    B.ent({ type: 'runner', x: gx + 160, y: B.y, flag: 'neverRuns', scale: 0.75, depth: 11.2 });
    B.ent({ type: 'script', fn: (s: S) => { if (s.flags.greatLit && !s.flags.__dawn) { s.flags.__dawn = true; s.shake(0.003); } } });
    B.hint(gx - 300, gx + 200, 'Light the great lamp', { linger: 6 });
    B.go(gx - 64); B.act();
    B.endFlag = 'greatLit';
    B.floor(300, { style: 'stone' });
  }
  return B.done();
}
