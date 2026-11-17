import Phaser from 'phaser';
import { sfx } from '../../audio';
import type { PlayScene } from '../PlayScene';
import type { EntDef } from '../types';
import { Ent, register } from '../ents/base';
import { Chain, ChainView, RES, clamp, tex } from '../kit';

// Chhaya, the shadows: long jointed arms that live in the dark, rooted in the ground or a wall. They writhe where
// they lie; when she comes within reach and the light at her is weak, an arm rises and reaches, fingers opening.
// Light burns them back: they recoil from her diya's glow, from lamps and from fire. Pale eyes blink in the dark.

type Arm = { rx: number; ry: number; chain: Chain; view: ChainView; hand: Phaser.GameObjects.Image; tip: { x: number; y: number }; reach: number; k: number; seed: number };

/** d: { w (the stretch they root along), n (arms), reach (px), side?: 'floor' | 'wall-left' | 'wall-right' | 'ceiling',
 *  eyes?: n, before?, minLight?: how much light keeps them off (0.18) } */
export class Shadows extends Ent {
  arms: Arm[] = [];
  eyes: { img: Phaser.GameObjects.Image; t: number; x: number; y: number }[] = [];
  smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  lastHiss = 0;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    tex(S, 'sh_seg', 10, 6, (c) => { c.beginPath(); c.arc(3, 3, 3, 0, Math.PI * 2); c.arc(7, 3, 3, 0, Math.PI * 2); c.fill(); c.fillRect(3, 0, 4, 6); }, '#020203');
    tex(S, 'sh_hand', 20, 14, (c) => { // a palm and four long fingers, slightly curled
      c.beginPath(); c.ellipse(5, 7, 5, 4, 0, 0, Math.PI * 2); c.fill();
      c.lineWidth = 1.4; c.lineCap = 'round';
      for (let i = 0; i < 4; i++) { const y = 3.5 + i * 2.4; c.beginPath(); c.moveTo(8, y); c.quadraticCurveTo(14, y - 1 + i * 0.4, 19, y + 1.5 + i * 0.6); c.stroke(); }
      c.beginPath(); c.moveTo(5, 10); c.quadraticCurveTo(8, 13.5, 11, 13); c.stroke();
    }, '#020203');
    tex(S, 'sh_eyes', 10, 4, (c) => { c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(2, 2, 1.6, 1.1, 0, 0, Math.PI * 2); c.ellipse(8, 2, 1.6, 1.1, 0, 0, Math.PI * 2); c.fill(); }, '#ffffff');
    const n = (d.n as number) ?? 3, w = (d.w as number) ?? 200, reach = (d.reach as number) ?? 130;
    const side = (d.side as string) ?? 'floor';
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1);
      let rx = d.x + u * w, ry = d.y;
      if (side === 'wall-left' || side === 'wall-right') { rx = d.x; ry = d.y - u * w; }
      if (side === 'ceiling') { ry = d.y; }
      const segs = Math.round(reach / 9);
      const chain = new Chain(segs, 9, rx, ry, 0.82, 0);
      chain.reset(rx, ry, side === 'wall-left' ? 1 : side === 'wall-right' ? -1 : 0.2, side === 'ceiling' ? 1 : -0.2);
      const view = new ChainView(S, segs, 'sh_seg', 11.9, 1.5, 0.55, 10);
      view.setAlpha(0.94);
      const hand = S.add.image(rx, ry, 'sh_hand').setOrigin(0.15, 0.5).setScale(1 / RES * 1.6).setDepth(11.95).setAlpha(0.95);
      this.arms.push({ rx, ry, chain, view, hand, tip: { x: rx, y: ry }, reach, k: 0, seed: i * 1.7 + d.x * 0.01 });
    }
    for (let i = 0; i < ((d.eyes as number) ?? 2); i++) {
      const ex = d.x + ((i + 0.5) / ((d.eyes as number) ?? 2)) * w, ey = d.y - 30 - ((i * 23) % 40);
      this.eyes.push({ img: S.add.image(ex, ey, 'sh_eyes').setScale(0.5).setDepth(10.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0), t: Math.random() * 5, x: ex, y: ey });
    }
    this.smoke = S.add.particles(0, 0, 'soft', { speedY: { min: -20, max: -6 }, speedX: { min: -8, max: 8 }, lifespan: 1400, scale: { start: 0.18, end: 0.5 }, alpha: { start: 0.4, end: 0 }, tint: 0x020203, emitting: false }).setDepth(11.8);
    this.range = 900;
  }

  reset() { for (const a of this.arms) { a.k = 0; a.chain.reset(a.rx, a.ry, 0.2, -0.2); } }

  update(dt: number, t: number) {
    const d = this.d, P = this.S.P;
    if (this.S.cp >= ((d.before as number) ?? 99)) return;
    const lights = this.S.lightList();
    const minLight = (d.minLight as number) ?? 0.12;
    const target = { x: P.x, y: P.feetY - 24 };
    for (const a of this.arms) {
      const toHer = Math.hypot(target.x - a.rx, target.y - a.ry);
      const litHer = this.S.lightAt(target.x, target.y, lights);
      const litTip = this.S.lightAt(a.tip.x, a.tip.y, lights);
      const wantReach = !this.S.dead && toHer < a.reach * 1.1 && litHer < minLight + 0.15;
      a.k += ((wantReach ? 1 : 0) - a.k) * Math.min(1, dt * (wantReach ? 2.2 : 4));
      if (litTip > minLight + 0.1) { a.k = Math.max(0, a.k - dt * 5); if (Math.random() < dt * 6) this.smoke.emitParticleAt(a.tip.x, a.tip.y); if (this.S.t - this.lastHiss > 1500 && a.k > 0.2) { sfx.whisper(); this.lastHiss = this.S.t; } }
      // the tip: lying and writhing at rest, rising toward her when it reaches
      const wr = Math.sin(t * 0.0021 + a.seed) * 18, wr2 = Math.cos(t * 0.0017 + a.seed * 2) * 10;
      const side = (d.side as string) ?? 'floor';
      const rest = side === 'ceiling' ? { x: a.rx + wr, y: a.ry + 30 + wr2 } : side === 'wall-left' ? { x: a.rx + 30 + wr2, y: a.ry + wr } : side === 'wall-right' ? { x: a.rx - 30 - wr2, y: a.ry + wr } : { x: a.rx + wr + 20, y: a.ry - 6 - Math.abs(wr2) * 0.4 };
      const dx = target.x - a.rx, dy = target.y - a.ry, L = Math.hypot(dx, dy) || 1;
      const lim = Math.min(L, a.reach * 0.95);
      const reachP = { x: a.rx + (dx / L) * lim, y: a.ry + (dy / L) * lim };
      const tx = rest.x + (reachP.x - rest.x) * a.k, ty = rest.y + (reachP.y - rest.y) * a.k;
      a.tip.x += (tx - a.tip.x) * Math.min(1, dt * 6); a.tip.y += (ty - a.tip.y) * Math.min(1, dt * 6);
      // the arm follows the hand (pinned at both ends, sagging between)
      a.chain.gravity = 120;
      a.chain.step(dt, a.rx, a.ry, 6, (i) => ({ x: Math.sin(t * 0.004 + i * 0.7 + a.seed) * 260, y: -200 * (1 - a.k) }), a.tip);
      a.view.draw(a.chain.pts);
      const pts = a.chain.pts, n = pts.length;
      const ang = Math.atan2(pts[n - 1].y - pts[n - 2].y, pts[n - 1].x - pts[n - 2].x);
      a.hand.setPosition(a.tip.x, a.tip.y).setRotation(ang).setScale((1 / RES) * (1.3 + a.k * 0.5), (1 / RES) * (1.3 + a.k * 0.5) * (Math.cos(ang) < 0 ? -1 : 1));
      // a touch is death
      const b = P.bounds;
      if (!this.S.dead && a.k > 0.6 && a.tip.x > b.min.x - 4 && a.tip.x < b.max.x + 4 && a.tip.y > b.min.y && a.tip.y < b.max.y + 2) this.S.die('shadow');
      if (Math.random() < dt * 1.5) this.smoke.emitParticleAt(a.rx + (Math.random() - 0.5) * 20, a.ry);
    }
    // eyes in the dark: they blink, and close in the light
    for (const e of this.eyes) {
      e.t += dt;
      const lit = this.S.lightAt(e.x, e.y, lights);
      const blink = (e.t % 4.5) < 0.12;
      const near = Math.abs(P.x - e.x) < 600;
      e.img.setAlpha(near && !blink && lit < 0.1 ? 0.55 : Math.max(0, e.img.alpha - dt * 3));
    }
    void clamp;
  }
}
register('shadows', Shadows);
