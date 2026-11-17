import Phaser from 'phaser';
import { sfx } from '../../audio';
import type { PlayScene } from '../PlayScene';
import type { EntDef } from '../types';
import { Ent, register } from './base';

// A hanging vine or rope (verlet). Catch it in the air, pump to swing, climb up and down, jump off.
// d: { x, y (anchor), len, breaks?: ms after being caught (a rotten vine), burn?: true (dry, the diya can burn it),
//      kind?: 'vine' | 'rope' | 'web', bough?: true (draw a branch it hangs from), before?: cp index it stays broken after }

export class Vine extends Ent {
  ax: number; ay: number; len: number; n: number; seg: number;
  pts: { x: number; y: number; px: number; py: number }[] = [];
  segs: Phaser.GameObjects.Image[] = [];
  leaves: { img: Phaser.GameObjects.Image; i: number; side: number }[] = [];
  heldAt = -1; holdK = 0; heldX = 0; heldY = 0;
  broken = false; breakAt = 0; caughtT = -1;
  burning = 0;
  fire?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    this.ax = d.x; this.ay = d.y; this.len = (d.len as number) ?? 320;
    this.n = Math.max(8, Math.round(this.len / 17));
    this.seg = this.len / (this.n - 1);
    const kind = (d.kind as string) ?? 'vine';
    for (let i = 0; i < this.n; i++) {
      this.pts.push({ x: this.ax, y: this.ay + i * this.seg, px: this.ax, py: this.ay + i * this.seg });
      if (i > 0) this.segs.push(S.add.image(0, 0, kind === 'web' ? 'web_seg' : 'vine_seg').setOrigin(0.15, 0.5).setScale(0.5).setDepth(11));
      if (kind === 'vine' && i > 1 && i % 2 === 0) this.leaves.push({ img: S.add.image(0, 0, 'vine_leaf').setOrigin(0, 0.5).setScale(0.5).setDepth(11), i, side: i % 4 === 0 ? 1 : -1 });
    }
    // the branch it hangs from: the vine comes off the gnarled middle, where the other aerial roots hang
    if (d.bough) S.add.image(this.ax, this.ay + 2, 'bough').setOrigin(d.flip ? 0.55 : 0.45, 0.495).setScale(0.5).setDepth(11.1).setFlipX(!!d.flip);
    S.vines.push(this);
    this.range = 0;
  }

  catchAt(hx: number, hy: number) {
    if (this.broken) return -1;
    for (let i = 3; i < this.n; i++) {
      const p = this.pts[i];
      if (Math.hypot(p.x - hx, p.y - hy) < 18 || Math.hypot(p.x - hx, p.y - (hy + 14)) < 14) return i;
    }
    return -1;
  }
  grabbed() {
    this.caughtT = this.S.t;
    if (this.d.breaks) { this.breakAt = this.S.t + (this.d.breaks as number); sfx.stretch(); }
  }
  held(gx: number, gy: number, Lg: number) { this.heldAt = Math.min(this.n - 1, Math.round(Lg / this.seg)); this.heldX = gx; this.heldY = gy; }
  released() { this.heldAt = -1; }

  act() {
    if (!this.d.burn || this.broken || this.burning) return false;
    this.burning = 0.01; sfx.ignite();
    return true;
  }
  actSpot() {
    if (!this.d.burn || this.broken || this.burning) return null;
    const p = this.pts[this.n - 1];
    return { x: p.x, y: p.y, r: 46, label: 'burn' };
  }
  lights(out: { x: number; y: number; r: number; k?: number }[]) {
    if (this.burning > 0 && !this.broken) { const p = this.pts[Math.min(this.n - 1, Math.floor(this.n * (1 - this.burning)))]; out.push({ x: p.x, y: p.y, r: 140, k: 0.8 }); }
  }

  reset(cp: number) {
    const before = (this.d.before as number) ?? 99;
    if (cp < before) {
      this.broken = false; this.burning = 0; this.breakAt = 0; this.heldAt = -1;
      this.pts.forEach((p, i) => { p.x = p.px = this.ax; p.y = p.py = this.ay + i * this.seg; });
      for (const s of this.segs) s.setVisible(true).setAlpha(1);
      for (const l of this.leaves) l.img.setVisible(true);
    }
  }

  snap() {
    if (this.broken) return;
    this.broken = true;
    sfx.snap();
    if (this.S.P.vine === this) this.S.P.releaseVine(this.S.t, 0);
    // the lower part falls away
    const fallen = this.segs.slice(2);
    this.S.tweens.add({ targets: fallen, y: '+=380', alpha: 0, angle: '+=40', duration: 1300, ease: 'Quad.in' });
    for (const l of this.leaves) this.S.tweens.add({ targets: l.img, y: '+=380', alpha: 0, duration: 1300, ease: 'Quad.in' });
  }

  update(dt: number) {
    if (this.breakAt && this.S.t > this.breakAt && !this.broken) this.snap();
    if (this.burning > 0 && !this.broken) {
      this.burning += dt / 1.6;
      if (Math.random() < dt * 8) this.S.emberAt(this.pts[Math.min(this.n - 1, Math.floor(this.n * (1 - this.burning)))]);
      if (this.burning >= 1) { this.snap(); this.S.flags[`burnt_${this.id}`] = true; }
    }
    if (this.broken) return;
    const P = this.pts, n = this.n, seg = this.seg;
    let from = 1;
    if (this.heldAt > 0) {
      const k = this.heldAt;
      for (let i = 0; i <= k; i++) {
        const u = i / Math.max(1, k);
        P[i].x = P[i].px = this.ax + (this.heldX - this.ax) * u; P[i].y = P[i].py = this.ay + (this.heldY - this.ay) * u;
      }
      from = k + 1;
    }
    // verlet for the free part
    const g = 900 * dt * dt, wind = (Math.sin(this.S.t * 0.0007 + this.ax) * 6 + this.S.windAt(this.ax) * 40) * dt * dt;
    for (let i = Math.max(1, from); i < n; i++) {
      const p = P[i];
      const vx = (p.x - p.px) * 0.985, vy = (p.y - p.py) * 0.985;
      p.px = p.x; p.py = p.y;
      p.x += vx + wind; p.y += vy + g;
    }
    for (let it = 0; it < 10; it++) {
      for (let i = Math.max(1, from); i < n; i++) {
        const a = P[i - 1], b = P[i];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001, diff = (d - seg) / d;
        if (i === from || i === 1) { b.x -= dx * diff; b.y -= dy * diff; }
        else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
      }
      P[0].x = this.ax; P[0].y = this.ay;
    }
    // nudged by her passing through
    const pb = this.S.P;
    if (pb.state !== 'rope') for (let i = 2; i < n; i++) {
      const p = P[i];
      if (Math.abs(p.x - pb.x) < 9 && p.y > pb.headY && p.y < pb.feetY) p.x += pb.vx * dt * 0.6;
    }
    const thin = (this.d.kind as string) === 'rope' ? 0.75 : (this.d.kind as string) === 'web' ? 0.5 : 1;
    for (let i = 1; i < n; i++) {
      const a = P[i - 1], b = P[i], s = this.segs[i - 1];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      s.setPosition(a.x, a.y).setRotation(Math.atan2(b.y - a.y, b.x - a.x)).setScale(Math.max(0.2, (d + 1.6) / 10) / 2, ((1 - i * 0.012) * thin) / 2);
      if (this.burning > 0) s.setTint(i > n * (1 - this.burning) ? 0x553322 : 0xffffff);
    }
    for (const l of this.leaves) {
      const a = P[l.i - 1], b = P[l.i];
      l.img.setPosition(b.x, b.y).setRotation(Math.atan2(b.y - a.y, b.x - a.x) + l.side * 1.0 + Math.sin(this.S.t * 0.002 + l.i) * 0.15);
    }
  }
}
register('vine', Vine);
