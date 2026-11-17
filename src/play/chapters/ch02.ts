import { Builder } from '../builder';
import { HOLLOW } from '../themes';
import type { PlayScene } from '../PlayScene';

// Chapter II — The Hollow (खोह). Under the oldest banyan the roots make caves, and the caves are strung with
// webs. The thing that lives here is Makdi, a spider bigger than a bullock cart. Her flame is the only defence:
// webs burn, lamps hold the spider back, the shadows in the roots fear the light — and a cold draft keeps
// trying to put the flame out. Story: the brother's red scarf, caught on a thorn.

type S = PlayScene;
type Ent = { state: string; x: number; body?: MatterJS.BodyType; hanging?: boolean };
const E = (s: S, id: string) => s.ent<Ent>(id);

export function ch02() {
  const B = new Builder('c02', HOLLOW, -300, 560);
  const web = (x: number, y: number, sc = 0.9, sf = 0.92, alpha = 0.45) => B.deco('web_big', x, y, { sx: sc, sf, depth: 5, tint: 0x8a9096, alpha, oy: 0.5 });

  // ---- 1. down into the roots
  B.floor(700);
  B.cp(0, 560);
  B.ent({ type: 'secret', x: -240, y: 560, n: 0 });
  web(300, 300); web(900, 260, 1.2, 0.9, 0.35);
  B.drop(110, 300);
  B.gap(120, 30, 'abyss', { far: 260 });
  B.drop(130, 340);
  B.cp(B.x - 200, B.y);                                                      // lamp 1

  // ---- 2. the first web: it bars a low passage between roots. The diya burns it away.
  {
    const x0 = B.x;
    B.floor(520, { walk: false });
    B.ceil(x0 + 140, B.y - 136, 260);              // the root overhang above the passage
    B.ent({ type: 'burn', kind: 'web', id: 'web1', x: x0 + 200, y: B.y, w: 60, h: 136, solid: true });
    B.hint(x0, x0 + 520, 'Webs burn.  Hold the diya to it — E', { touch: 'Webs burn.  Tap the flame beside it', linger: 8 });
    B.go(x0 + 186);
    B.act();
    B.until((s: S) => !!s.flags.burnt_web1, { max: 300 });
    B.go(B.x - 14);
    web(x0 + 450, B.y - 220, 0.8);
  }

  // ---- 3. the cocoons, and something red caught on a thorn
  {
    B.floor(600);
    B.deco('cocoon', B.x - 480, B.y - 170, { sx: 0.9, depth: 9, oy: 0, tint: 0xb0b4b8 });
    B.deco('cocoon', B.x - 420, B.y - 210, { sx: 0.6, depth: 9, oy: 0, tint: 0xb0b4b8 });
    B.ent({ type: 'burn', kind: 'brush', x: B.x - 200, y: B.y, w: 50, h: 30 });
    B.deco('scarf', B.x - 178, B.y - 22, { sx: 0.6, depth: 11.6, oy: 0.5 });
    B.cp(B.x - 120, B.y);                                                    // lamp 2
  }

  // ---- 4. Makdi drops from the dark ahead. An unlit lamp stands beside her: light it and wait in its glow.
  {
    const x0 = B.x, y0 = B.y;
    B.floor(900, { walk: false });
    B.ent({ type: 'lamp', id: 'lampA', x: x0 + 120, y: y0, kind: 'post' });
    B.ent({ type: 'spider', id: 'sp1', x: x0 + 560, y: y0, mode: 'drop', trigger: x0 + 60, dropX: x0 + 560, ceil: y0 - 520, patience: 3.5, speed: 110 });
    B.hint(x0, x0 + 900, 'Light the lamp.  It will not come into the light', { deaths: 1, linger: 12 });
    B.go(x0 + 118);
    B.act();
    B.until((s: S) => E(s, 'sp1').state === 'gone', { max: 1500, note: 'spider gives up' });
    B.go(B.x - 14);
    web(x0 + 500, y0 - 300, 1.3, 0.94, 0.5);
    B.cp(B.x - 150, B.y);                                                    // lamp 3
  }

  // ---- 5. the draft: a cold wind out of the deep roots dims the flame, and the shadows reach when it's low.
  //          Move in the calm, shelter behind the root walls while it blows.
  {
    const x0 = B.x, y0 = B.y, w = 1100;
    B.floor(w, { walk: false });
    B.ent({ type: 'dark', x: x0, w, k: 0.82, fade: 260 });
    B.ent({ type: 'wind', x: x0, y: y0, w, h: 300, dir: -1, period: 4200, gust: 2000, offset: 0, force: 60 });
    const shel = [x0 + 260, x0 + 560, x0 + 860];
    for (const sx of shel) B.ent({ type: 'shelter', kind: 'wall', x: sx, y: y0, w: 60, h: 110, side: 1 });
    B.ent({ type: 'shadows', x: x0 + 100, y: y0, w: 900, n: 6, reach: 150, eyes: 4 });
    B.hint(x0, x0 + w, 'The draft dims the flame — shelter behind the roots while it blows', { deaths: 1, linger: 14 });
    const calm = (s: S) => (s.t % 4200) > 2050 && (s.t % 4200) < 2400;
    for (const sx of shel) { B.until(calm, { max: 600 }); B.go(sx + 40); }
    B.until(calm, { max: 600 });
    B.go(x0 + w - 14);
    B.cp(B.x - 120, B.y);                                                    // lamp 4
  }

  // ---- 6. over the web chasm on old strands
  B.hint(B.x - 60, B.x + 360, 'Swing on the strands', { linger: 15 });
  {
    const x0 = B.x, y0 = B.y, w = 340;
    B.ent({ type: 'vine', x: x0 + 150, y: y0 - 360, len: 320, kind: 'web' });
    B.ents.push({ type: 'pit', x: x0, y: y0 + 260, w });
    B.jumpAt(x0 - 8);
    B.swing(1, (s: S) => s.P.rope.theta > 0.42 && s.P.rope.omega > 0.3);
    web(x0 + 170, y0 - 200, 1.1, 0.95, 0.4);
    B.x = x0 + w;
    B.floor(320);
  }
  // a log trussed in web over the next gap: burn the web and it drops across
  {
    const x0 = B.x, y0 = B.y;
    B.floor(160, { walk: false });
    const gx = x0 + 160;
    B.ent({ type: 'burn', kind: 'rope', id: 'logweb', x: gx - 22, y: y0, w: 4, h: 4, to: { x: gx + 40, y: y0 - 260 }, flag: 'log2' });
    B.ent({ type: 'log', id: 'log2', x: gx + 100, y: y0 - 200, w: 270, hang: 'log2', ropeTop: y0 - 270, fixed: true });
    B.ents.push({ type: 'pit', x: gx, y: y0 + 260, w: 200 });
    B.go(gx - 26);
    B.act();
    B.until((s: S) => !E(s, 'log2').hanging && Math.abs(E(s, 'log2').body!.velocity.y) < 0.05, { max: 400 });
    B.wait(30);
    B.jumpAt(gx - 26, 1, 12);
    B.go(gx + 230);
    B.x = gx + 200;
    B.floor(360);
    B.cp(B.x - 200, B.y);                                                    // lamp 5
  }

  // ---- 7. the trussed crate: burn the strands and it falls; climb from it
  {
    const wallX = B.x + 360, y0 = B.y;
    B.floor(360, { walk: false });
    B.ent({ type: 'crate', id: 'crateW', x: wallX - 40, y: y0 - 170, hang: 'crateDown', ropeTop: y0 - 320 });
    B.ent({ type: 'burn', kind: 'rope', x: wallX - 120, y: y0, w: 4, h: 4, to: { x: wallX - 40, y: y0 - 320 }, flag: 'crateDown' });
    B.go(wallX - 125);
    B.act();
    B.until((s: S) => !E(s, 'crateW').hanging && Math.abs(E(s, 'crateW').body!.velocity.y) < 0.05, { max: 400 });
    B.wait(30);
    B.go(wallX - 80);
    B.jumpAt(wallX - 80, 1, 12);
    B.go(wallX - 20);
    B.jumpAt(wallX - 20, 1, 24); B.climb();
    B.x = wallX; B.y = y0 - 200;
    B.floor(300);
    B.cp(B.x - 200, B.y);                                                    // lamp 6
    B.drop(200, 200);
  }

  // ---- 8. the web tunnel: Makdi comes down behind her. Run; burn each web as you reach it —
  //          the burning web holds the spider back a moment. At the end, climb out of its reach.
  {
    const x0 = B.x, y0 = B.y, w = 1300;
    B.floor(w, { walk: false });
    B.ceil(x0 + 140, y0 - 160, w - 260);            // the tunnel roof of roots
    B.ent({ type: 'dark', x: x0, w, k: 0.6 });
    const webs = [x0 + 420, x0 + 760, x0 + 1060];
    webs.forEach((wx, i) => B.ent({ type: 'burn', kind: 'web', id: `tw${i}`, x: wx, y: y0, w: 50, h: 150, solid: true }));
    B.ent({ type: 'spider', id: 'sp2', x: x0, y: y0, mode: 'drop', trigger: x0 + 220, dropX: x0 - 60, ceil: y0 - 560, speed: 150, fleeBy: 'backoff' });
    B.ent({ type: 'cam', x: x0, w: w + 200, zoom: 0.88 });
    B.hint(x0, x0 + w, 'Don\'t stop!  Burn the webs as you reach them', { touch: 'Don\'t stop!  Tap the flame at each web', deaths: 1, linger: 60 });
    webs.forEach((wx, i) => { B.go(wx - 14); B.act(); B.until((s: S) => !!s.flags[`burnt_tw${i}`], { max: 200 }); });
    B.climbUp(150, 400);
    B.cp(B.x - 300, B.y);                                                    // lamp 7
  }

  // ---- 9. a breather in the roots: water drips, the shadows sleep
  {
    B.floor(500);
    B.ent({ type: 'shadows', x: B.x - 420, y: B.y, w: 300, n: 2, reach: 90, eyes: 2 });
    B.drop(120, 300);
    // the black pool: swim it; the arms beneath can't bear the flame held high
    const x0 = B.x, y0 = B.y, w = 420;
    B.ent({ type: 'water', x: x0, y: y0 + 30, w, h: 200 });
    B.block(x0, y0 + 230, w, 600);
    B.ent({ type: 'shadows', x: x0 + 40, y: y0 + 228, w: w - 80, n: 3, reach: 120, eyes: 0 });
    B.go(x0 + 30);
    B.until((s: S) => s.P.state === 'swim', { dir: 1, max: 200 });
    B.until((s: S) => s.P.x > x0 + w - 30, { dir: 1, max: 900 });
    B.jumpAt(x0 + w - 30, 1, 24);
    B.x = x0 + w; B.y = y0 + 10;
    B.floor(300);
    B.cp(B.x - 150, B.y);                                                    // lamp 8
  }

  // ---- 10. a long climb up through the roots: catch, climb, swing to the next shelf
  {
    const x0 = B.x, y0 = B.y;
    B.floor(120, { walk: false });
    B.ent({ type: 'vine', x: x0 + 200, y: y0 - 480, len: 430, bough: true });
    B.block(x0 + 330, y0 - 230, 300, 230 + 900);
    B.ents.push({ type: 'pit', x: x0 + 120, y: y0 + 300, w: 210 });
    B.jumpAt(x0 + 110);
    B.swing(1, (s: S) => s.P.rope.Lg < 210 && s.P.rope.theta > 0.5 && s.P.rope.omega > 0.2, 200);
    B.climb();
    B.x = x0 + 630; B.y = y0 - 230;
    B.climbUp(140, 300);
    B.cp(B.x - 200, B.y);                                                    // lamp 9
    B.drop(150, 260);
    B.gap(140, 20, 'stakes', { far: 300 });
  }

  // ---- 11. the nest: a lamp-lit ledge, and below it Makdi's ground. Lure her onto the dry grass, then burn it.
  {
    const x0 = B.x, y0 = B.y;
    B.cp(x0 - 140, y0);                                                      // lamp 10 (a refuge)
    B.floor(1100, { walk: false });
    const gx0 = x0 + 260, gw = 70, n = 5;
    for (let i = 0; i < n; i++) B.ent({ type: 'burn', kind: 'grass', x: gx0 + i * gw, y: y0, w: gw, h: 18, spread: 30 });
    B.ent({ type: 'spider', id: 'sp3', x: x0 + 900, y: y0, mode: 'lurk', wake: 700, speed: 85, flag: 'spiderGone', ceil: y0 - 600 });
    B.ent({ type: 'cam', x: x0 - 100, w: 1300, zoom: 0.84, dy: -30 });
    for (const wx of [x0 + 700, x0 + 1000]) web(wx, y0 - 260, 1.4, 0.97, 0.6);
    B.hint(x0, x0 + 1100, 'Let it come onto the dry grass… then burn the grass', { deaths: 1, linger: 20 });
    B.go(gx0 - 22);
    B.until((s: S) => E(s, 'sp3').state !== 'lurk' && E(s, 'sp3').x < gx0 + n * gw - 30, { max: 1500, note: 'spider on the grass' });
    B.act();
    B.until((s: S) => !!s.flags.spiderGone, { max: 600, note: 'spider gone' });
    B.until((s: S) => s.burnables.every((b) => b.state !== 'burning'), { max: 900 });
    B.go(B.x - 14);
    B.cp(B.x - 200, B.y);                                                    // lamp 11
  }

  // ---- 12. up and out of the hollow, into the night air
  {
    B.climbUp(130, 260);
    B.gap(160, -30, 'abyss', { far: 260 });
    B.climbUp(150, 300);
    B.ent({ type: 'glimpse', x: B.x + 260, y: B.y - 40, at: B.x - 260, sf: 0.85, depth: 4.5, scale: 0.7 });
    B.floor(500);
  }
  return B.done();
}
