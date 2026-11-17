import { Builder } from '../builder';
import { CAMP } from '../themes';
import type { PlayScene } from '../PlayScene';

// Chapter III — The Poachers (शिकारी). The forest edge, where men set snares and iron jaws and keep animals in
// cages. She learns their traps on the way in and turns one against them on the way out. Slingshots on the
// path (push a crate as cover), a lantern patrol in the camp (move when he looks away), the dogs (get up high),
// and a rifleman on a watchtower over the stubble field (run between haystacks while he reloads).
// Story: far ahead, two men lead a boy away by the arm.

type S = PlayScene;
type Ent = { state: string; x: number; facing: number; body?: MatterJS.BodyType };
const E = (s: S, id: string) => s.ent<Ent>(id);

export function ch03() {
  const B = new Builder('c03', CAMP, -300, 600);

  // ---- 1. the edge of the forest: cages hang from a branch, crows on the path
  B.floor(800);
  B.cp(0, 600);
  B.ent({ type: 'secret', x: -230, y: 600, n: 0 });
  B.ent({ type: 'decor', key: 'cage', x: 260, y: 430, scale: 0.55, depth: 9, flip: false });
  B.ent({ type: 'decor', key: 'cage', x: 340, y: 450, scale: 0.45, depth: 9 });
  B.ent({ type: 'crows', x: 420, y: 600, n: 5, w: 120 });
  B.gap(110, 0, 'abyss', { far: 300 });

  // ---- 2. a noose snare in the leaves: jump it (or burn its cord)
  {
    const x0 = B.x;
    B.floor(520, { walk: false });
    B.ent({ type: 'snare', x: x0 + 260, y: B.y });
    B.hint(x0, x0 + 520, 'A snare on the path.  Jump over the loop — or burn its cord', { touch: 'A snare on the path.  Jump over the loop — or burn its cord', linger: 8, deaths: 1 });
    B.jumpAt(x0 + 214, 1, 18);
    B.go(B.x - 14);
    B.cp(B.x - 150, B.y);                                                   // lamp 1
  }

  // ---- 3. iron jaws in a low root tunnel: no room to jump. Push the crate in ahead of you to spring them.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(900, { walk: false });
    B.ent({ type: 'crate', id: 'cr3', x: x0 + 120, y: y0, w: 52 });
    B.ceil(x0 + 260, y0 - 90, 460);
    B.ent({ type: 'jaws', id: 'jaws1', x: x0 + 480, y: y0 });
    B.hint(x0, x0 + 760, 'Iron jaws in the tunnel.  Let the crate find them first', { deaths: 1, linger: 14 });
    B.push('cr3', x0 + 860);
    B.hold(10, { dir: -1 }); B.hold(6);
    B.jumpAt(x0 + 800, 1, 14);
    B.x = x0 + 900;
    B.drop(90, 300);
  }

  // ---- 4. two patches of leaves. One hides a pit of stakes — its cover is laid with snapped twigs.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(220);
    B.ent({ type: 'decor', key: 'leaves', x: B.x - 110, y: y0 + 4, scale: 0.6, depth: 10.7 });
    const px = B.x;
    B.ent({ type: 'cover', id: 'cov1', x: px, y: y0, w: 110 });
    B.ent({ type: 'stakes', x: px, y: y0 + 120, w: 110 });
    B.block(px, y0 + 160, 110);
    B.hint(x0, px + 400, 'Snapped twigs on the leaves…  something is under them', { deaths: 1, linger: 20 });
    B.jumpAt(px - 20, 1, 22);
    B.x = px + 110;
    B.floor(400);
    B.cp(B.x - 200, B.y);                                                   // lamp 2
  }

  // ---- 5. the slingshots: two men on the path ahead. Push the crate before you as cover; up close they run.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(1300, { walk: false });
    B.ent({ type: 'crate', id: 'shield', x: x0 + 80, y: y0, w: 60, h: 70 });
    B.ent({ type: 'poacher', id: 'pA', x: x0 + 1000, y: y0, weapon: 'sling', facing: -1, range: 700, flag: 'pAgone', before: 3 });
    B.ent({ type: 'poacher', id: 'pB', x: x0 + 1120, y: y0, weapon: 'sling', facing: -1, range: 760, flag: 'pBgone', before: 3 });
    B.ent({ type: 'cam', x: x0, w: 1300, zoom: 0.82, dy: -20 });
    B.hint(x0, x0 + 1300, 'Keep the crate between you and them', { deaths: 1, linger: 30 });
    B.push('shield', x0 + 1080);
    B.until((s: S) => !!s.flags.pAgone && !!s.flags.pBgone, { dir: 1, max: 600 });
    B.hold(10, { dir: -1 }); B.hold(6);
    B.jumpAt(B.x - 300, 1, 18);
    B.go(B.x - 14);
    B.cp(B.x - 120, B.y);                                                   // lamp 3
  }

  // ---- 6. turned against them: a third man comes running. Run back over the pit you learned — he won't see it.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(380);
    const px = B.x;
    B.ent({ type: 'cover', id: 'cov2', x: px, y: y0, w: 120 });
    B.ent({ type: 'stakes', x: px, y: y0 + 140, w: 120, soft: true });
    B.block(px, y0 + 180, 120);
    B.x = px + 120;
    B.floor(900, { walk: false });
    B.ent({ type: 'poacher', id: 'runner', x: B.x - 60, y: y0, weapon: 'sling', facing: -1, wake: px + 380, chase: true, speed: 172, flag: 'runnerDown', before: 4 });
    B.hint(x0, B.x, 'Run back — over the twigs he cannot see', { deaths: 1, linger: 60 });
    B.jumpAt(px - 20, 1, 24);
    B.go(px + 400);
    B.jumpAt(px + 136, -1, 24);
    B.go(px - 120);
    B.until((s: S) => !!s.flags.runnerDown, { max: 600, note: 'runner in the pit' });
    B.wait(60);
    B.jumpAt(px - 20, 1, 22);
    B.go(B.x - 14);
    B.cp(B.x - 200, B.y);                                                   // lamp 4
    void x0;
  }

  // ---- 7. a breather: an empty cage with its door torn open, and far ahead two men lead a boy away
  {
    B.floor(700);
    B.ent({ type: 'decor', key: 'cage', x: B.x - 420, y: B.y + 2, scale: 0.6, depth: 9.5 });
    B.ent({ type: 'glimpse', x: B.x + 200, y: B.y - 80, at: B.x - 500, sf: 0.8, depth: 4.5, scale: 0.65 });
    B.drop(120, 260);
    B.gap(140, 0, 'stakes', { far: 300 });
  }

  // ---- 8. the camp: a man with a lantern walks his round. Crates and carts are cover; move when he looks away.
  {
    const x0 = B.x, y0 = B.y, w = 1400;
    B.floor(w, { walk: false });
    B.ent({ type: 'dark', x: x0, w, k: 0.55 });
    B.ent({ type: 'decor', key: 'hut', x: x0 + 700, y: y0 + 4, scale: 0.9, depth: 5, tint: 0x30353a, sf: 0.9 });
    B.ent({ type: 'fire', x: x0 + 1180, y: y0, w: 40, pot: true });
    const covers = [x0 + 260, x0 + 620, x0 + 980];
    covers.forEach((cx, i) => B.ent({ type: 'crate', id: `cc${i}`, x: cx, y: y0, w: 64, h: 70, fixed: true }));
    B.ent({ type: 'poacher', id: 'guard', x: x0 + 800, y: y0, weapon: 'sling', facing: -1, minX: x0 + 420, maxX: x0 + 1250, torch: true, range: 520 });
    B.hint(x0, x0 + w, 'His lantern and your flame give you away.  Move when he turns his back', { deaths: 1, linger: 25 });
    const away = (s: S) => E(s, 'guard').facing > 0 && E(s, 'guard').state === 'patrol';
    B.go(covers[0] - 44);
    B.until(away, { max: 1500 }); B.jumpAt(covers[0] - 44, 1, 24); B.go(covers[1] - 44);
    B.until(away, { max: 1500 }); B.jumpAt(covers[1] - 44, 1, 24); B.go(covers[2] - 44);
    B.until((s: S) => E(s, 'guard').facing < 0 && E(s, 'guard').x < covers[2] - 120, { max: 1200 });
    B.jumpAt(covers[2] - 44, 1, 24);
    B.go(x0 + w - 14);
    B.cp(B.x - 120, B.y);                                                   // lamp 5
  }

  // ---- 9. the dogs: they wake as she passes their post. Get up high and wait until they tire of baying.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(700, { walk: false });
    for (let i = 0; i < 3; i++) B.ent({ type: 'jackal', id: `dog${i}`, x: x0 + 120 + i * 50, y: y0, wake: x0 + 260, speed: 230, patience: 10, exitDir: -1 });
    B.ent({ type: 'decor', key: 'cage', x: x0 + 140, y: y0 + 2, scale: 0.5, depth: 9.3 });
    B.hint(x0, x0 + 900, 'The dogs!  Climb where they cannot follow', { deaths: 1, linger: 40 });
    B.go(x0 + 680);
    B.climbUp(150, 520);
    B.until((s: S) => [0, 1, 2].every((i) => ['gone', 'leave'].includes(E(s, `dog${i}`).state)), { max: 1500, note: 'dogs leave' });
    B.cp(B.x - 300, B.y);                                                   // lamp 6
    B.drop(150, 200);
  }

  // ---- 10. the stubble field under the watchtower: a rifleman. Run between the haystacks while he reloads.
  {
    const x0 = B.x, y0 = B.y, w = 1400;
    B.floor(w, { walk: false });
    const stacks = [x0 + 200, x0 + 520, x0 + 840, x0 + 1160];
    stacks.forEach((sx, i) => B.ent({ type: 'hay', id: `st${i}`, x: sx, y: y0, w: 74, h: 84, fixed: true }));
    B.ent({ type: 'poacher', id: 'rifle', x: x0 + 1500, y: y0 - 130, weapon: 'rifle', facing: -1, range: 1300 });
    B.ent({ type: 'cam', x: x0, w: w + 300, zoom: 0.78, dy: -40 });
    B.hint(x0, x0 + w, 'Wait behind the hay until he fires — then run while he reloads', { deaths: 1, linger: 25 });
    const safe = (s: S) => ['reload', 'watch', 'lose'].includes(E(s, 'rifle').state);
    B.go(stacks[0] - 54);
    stacks.forEach((sx, i) => {
      B.until(safe, { max: 900 });
      B.jumpAt(sx - 54, 1, 24);
      B.go(i < stacks.length - 1 ? stacks[i + 1] - 54 : x0 + 1380);
    });
    B.climbUp(130, 200);
    B.floor(300);
    B.cp(B.x - 150, B.y);                                                   // lamp 7
  }

  // ---- 11. out of the poachers' land
  B.drop(120, 300);
  B.gap(150, 0, 'abyss', { far: 260 });
  B.floor(400);
  return B.done();
}
