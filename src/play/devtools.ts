import type Phaser from 'phaser';
import type { PlayScene } from './PlayScene';

// Dev-only test harness (see docs/dev-testing.md). In the page console:
//   await chh.play('c01')            start a chapter with the game loop under manual control
//   chh.step(600)                    advance 600 frames of logic;  chh.render(10) logic + drawing
//   await chh.shot('name')           save a screenshot through scripts/dev/shot-server.cjs
//   await chh.auto('c01', { cp: 0 }) play the chapter with the autopilot; returns { finished, deaths, ... }

type G = Phaser.Game & { step: (t: number, d: number) => void };

export function installDevtools(game: Phaser.Game) {
  const g = game as G;
  let T = performance.now();
  let manual = false;
  const S = () => game.scene.getScene('play') as PlayScene;
  const take = () => { if (!manual) { game.loop.sleep(); manual = true; T = performance.now(); } };
  const tick = (draw: boolean) => { T += 16.667; if (draw) g.step(T, 16.667); else game.scene.update(T, 16.667); };
  const api = {
    S,
    step(n = 1) { take(); for (let i = 0; i < n; i++) tick(false); return S()?.P?.x; },
    render(n = 1) { take(); for (let i = 0; i < n; i++) tick(true); },
    release() { manual = false; game.loop.wake(); },
    async play(chapter: string, cp = 0, auto = false) {
      const sc = game.scene;
      // let boot finish loading and making textures first
      take();
      // the pane may be hidden (no animation frames): step the loop by hand while assets load
      for (let k = 0; k < 600 && (!(sc.isActive('menu') || sc.isActive('play')) || !game.textures.exists('crate')); k++) { await new Promise((r) => setTimeout(r, 30)); for (let i = 0; i < 4; i++) tick(true); }
      if (sc.isActive('play')) sc.stop('play');
      for (const k of ['menu', 'boot']) if (sc.isActive(k)) sc.stop(k);
      sc.start('play', { chapter, cp, auto });
      for (let k = 0; k < 60 && !(sc.isActive('play') && S()?.P); k++) { await new Promise((r) => setTimeout(r, 50)); tick(true); }
      for (let i = 0; i < 5; i++) tick(true);
      return S();
    },
    shot(name: string) {
      take();
      const p = new Promise<string>((res) => game.renderer.snapshot((img) => {
        const c = document.createElement('canvas');
        const im = img as HTMLImageElement;
        c.width = im.width; c.height = im.height; c.getContext('2d')!.drawImage(im, 0, 0);
        fetch('http://127.0.0.1:5199/', { method: 'POST', body: JSON.stringify({ name, data: c.toDataURL('image/png') }) }).then((r) => r.text()).then(res).catch((e) => res(String(e)));
      }));
      tick(true);
      return p;
    },
    /** autopilot playthrough; screenshots every `shotEvery` frames if given */
    async auto(chapter: string, o: { cp?: number; max?: number; shotEvery?: number; prefix?: string; draw?: boolean } = {}) {
      const s = await api.play(chapter, o.cp ?? 0, true);
      const max = o.max ?? 60 * 60 * 15;
      const deaths: string[] = [];
      let lastDeath = false, f = 0, shots = 0;
      const t0 = performance.now();
      for (; f < max; f++) {
        const draw = !!o.draw || (o.shotEvery !== undefined && f % o.shotEvery === 0);
        if (o.shotEvery !== undefined && f % o.shotEvery === 0 && f > 0) { await api.shot(`${o.prefix ?? chapter}_${String(shots++).padStart(3, '0')}`); }
        else tick(draw);
        const sc = S();
        if (sc.dead && !lastDeath) deaths.push(`${sc.deathKind}@${sc.P.x.toFixed(0)},${sc.P.feetY.toFixed(0)} cp${sc.cp} step${sc.auto?.i}`);
        lastDeath = sc.dead;
        if (sc.flags.__finished) break;
        if (sc.auto?.done && !sc.ended) { deaths.push('autopilot ran out of steps'); break; }
        if (deaths.length > 25) break;
        if (f % 600 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      const sc = S();
      return {
        finished: !!sc.flags.__finished, deaths, frames: f, gameSeconds: Math.round(f / 60), wallMs: Math.round(performance.now() - t0),
        x: Math.round(sc.P.x), y: Math.round(sc.P.feetY), cp: sc.cp, of: sc.L.checkpoints.length, step: sc.auto?.i, steps: sc.L.steps.length, log: sc.auto?.log,
      };
    },
  };
  (window as unknown as { chh: typeof api }).chh = api;
}
