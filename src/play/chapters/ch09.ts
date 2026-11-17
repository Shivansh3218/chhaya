import type Phaser from 'phaser';
import { Builder } from '../builder';
import { FORT } from '../themes';
import type { PlayScene } from '../PlayScene';
import { burnDrop, pullCrate, tripwire } from '../beats';
import { brokenGround, crateWall, fallingStones, plateGate, windWalk } from '../beats';

// Chapter IX — The Fort (क़िला). The poachers' hold in a ruined hill fort: ramparts, gates, a dungeon under the
// keep where Makdi has followed the smell of the cages, dogs in the courtyard. And in a cage hung over the
// courtyard — the brother. She burns the rope; the cage drops and breaks; he runs for the temple on the hill.

type S = PlayScene;
type Ent = { state: string; x: number; facing: number };
const E = (s: S, id: string) => s.ent<Ent>(id);

export function ch09() {
  const B = new Builder('c09', FORT, -300, 600);

  // ---- 1. up the ruined approach
  B.floor(700);
  B.cp(0, 600);
  B.ent({ type: 'secret', x: -240, y: 600, n: 0 });
  B.ent({ type: 'crows', x: 350, y: 600, n: 6, w: 150 });
  brokenGround(B, 5, 41);
  B.cp(B.x - 120, B.y);                                                     // lamp 1
  plateGate(B);
  B.cp(B.x - 120, B.y, 'wall');                                             // lamp 2

  // ---- 2. the rampart walk: a guard with a blowgun up on the wall. Push the crate before you as cover.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(1300, { walk: false, style: 'stone' });
    B.ent({ type: 'crate', id: 'shield', x: x0 + 80, y: y0, w: 60, h: 70 });
    B.ent({ type: 'poacher', id: 'g1', x: x0 + 1050, y: y0, weapon: 'blowgun', facing: -1, range: 700, flag: 'g1gone', before: 3 });
    B.ent({ type: 'poacher', id: 'g2', x: x0 + 1180, y: y0, weapon: 'sling', facing: -1, range: 760, flag: 'g2gone', before: 3 });
    B.hint(x0, x0 + 1300, 'Keep the crate between you and them', { deaths: 1, linger: 30 });
    B.push('shield', x0 + 1120);
    B.until((s: S) => !!s.flags.g1gone && !!s.flags.g2gone, { dir: 1, max: 600 });
    B.hold(10, { dir: -1 }); B.hold(6);
    B.jumpAt(B.x - 300, 1, 18);
    B.go(B.x - 14);
    B.cp(B.x - 120, B.y, 'wall');                                           // lamp 3
  }

  // ---- 3. the collapsing gallery
  fallingStones(B, 4, { period: 2500 });
  crateWall(B, { h: 195 });
  B.cp(B.x - 120, B.y, 'wall');                                             // lamp 4

  // ---- 4. the dungeon under the keep: Makdi is here. Light the wall lamps; she will not cross the light.
  {
    B.drop(160, 160, { style: 'stone' });
    const x0 = B.x, y0 = B.y, w = 1400;
    B.floor(w, { walk: false, style: 'stone' });
    B.ceil(x0 - 160, y0 - 300, w + 160);
    B.ent({ type: 'dark', x: x0 - 160, w: w + 160, k: 0.85 });
    const lamps = [x0 + 120, x0 + 520, x0 + 920];
    lamps.forEach((lx, i) => B.ent({ type: 'lamp', id: `dl${i}`, x: lx, y: y0, kind: 'wall' }));
    B.ent({ type: 'spider', id: 'sp', x: x0 + 1200, y: y0, mode: 'lurk', wake: 700, speed: 80, patience: 3, ceil: y0 - 700 });
    B.ent({ type: 'shadows', x: x0 + 200, y: y0, w: 1000, n: 5, reach: 120, eyes: 6 });
    B.hint(x0, x0 + w, 'Light each lamp.  The spider will not cross into the light', { deaths: 1, linger: 15 });
    B.go(lamps[0] - 2); B.act();
    B.go(lamps[1] - 2); B.act();
    B.until((s: S) => ['gone', 'retreat'].includes(E(s, 'sp').state) || E(s, 'sp').state === 'lurk' && s.P.x < E(s, 'sp').x - 700, { max: 1500, note: 'spider climbs away' });
    B.go(lamps[2] - 2); B.act();
    B.until((s: S) => ['gone', 'retreat', 'lurk'].includes(E(s, 'sp').state), { max: 1500 });
    B.go(x0 + w - 14);
    B.climbUp(150, 200);
    B.cp(B.x - 120, B.y, 'wall');                                           // lamp 5
  }

  // ---- 4b. the armoury: a stuck crate, a gate, hung sacks
  {
    pullCrate(B, { h: 200 });
    plateGate(B);
    B.cp(B.x - 120, B.y, 'wall');
    burnDrop(B, { kind: 'crate' });
    tripwire(B, { hidden: true });
    B.cp(B.x - 120, B.y, 'wall');
  }

  // ---- 5. the courtyard: the dogs. Up onto the old cannon platform until they tire of it.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(700, { walk: false, style: 'stone' });
    for (let i = 0; i < 3; i++) B.ent({ type: 'jackal', id: `d${i}`, x: x0 + 140 + i * 50, y: y0, wake: x0 + 280, speed: 230, patience: 9, exitDir: -1 });
    B.hint(x0, x0 + 900, 'The dogs!  Up where they can\'t follow', { deaths: 1, linger: 40 });
    B.go(x0 + 680);
    B.climbUp(150, 400, { style: 'stone' });
    B.until((s: S) => [0, 1, 2].every((i) => ['gone', 'leave'].includes(E(s, `d${i}`).state)), { max: 1500, note: 'dogs leave' });
    B.cp(B.x - 200, B.y, 'wall');                                           // lamp 6
  }

  // ---- 6. the cage over the courtyard: the brother. Burn the rope; the cage falls open; he runs for the hill.
  {
    B.drop(150, 200, { style: 'stone' });
    const x0 = B.x, y0 = B.y;
    B.floor(700, { walk: false, style: 'stone' });
    B.ent({ type: 'crate', id: 'cage', key: 'cage_boy', x: x0 + 420, y: y0 - 200, w: 70, h: 80, hang: 'freed', ropeTop: y0 - 420, fixed: true });
    B.ent({ type: 'runner', x: x0 + 470, y: y0, flag: 'freedRun', dir: 1, scale: 0.75, hidden: true });
    B.ent({ type: 'burn', kind: 'rope', x: x0 + 300, y: y0, w: 4, h: 4, to: { x: x0 + 400, y: y0 - 420 }, flag: 'freed' });
    B.ent({ type: 'script', fn: (s: S) => { const c = s.ent<{ hanging: boolean; body: MatterJS.BodyType }>('cage'); if (!c.hanging && Math.abs(c.body.velocity.y) < 0.05 && s.flags.freed && !s.flags.freedRun) { s.flags.freedRun = true; (c as unknown as { img: Phaser.GameObjects.Image }).img.setTexture('cage'); } } });
    B.hint(x0, x0 + 700, 'Burn the rope!', { linger: 10 });
    B.go(x0 + 296); B.act();
    B.until((s: S) => !!s.flags.freedRun, { max: 600, note: 'brother free' });
    B.wait(90);
    B.jumpAt(x0 + 360, 1, 24);
    B.go(x0 + 686);
    B.cp(B.x - 120, B.y, 'wall');                                           // lamp 7
  }

  // ---- 7. out along the high rampart into the wind, after him
  windWalk(B, 3, { period: 4600, gust: 2000, force: 120 });
  B.cp(B.x - 120, B.y);                                                     // lamp 8
  B.floor(500);
  return B.done();
}
