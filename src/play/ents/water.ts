import Phaser from 'phaser';
import { sfx } from '../../audio';
import type { PlayScene } from '../PlayScene';
import type { EntDef } from '../types';
import { CAT, Ent, MJ, register } from './base';

// A body of water: she swims at the surface (the diya held high), crates float. Dark, still, with a moving sheen.
// d: { x, y (surface), w, h (depth), current?: px/s, undertow?: [x0, x1] (pulls her under), ceiling?: y (drowns
//      her if the surface rises above it), rise?: { to: y, speed, trigger?: x, flag?: string } (a flood),
//      before?: cp }

export class Water extends Ent {
  surface: number; base: number; w: number; h: number; current: number;
  gfx: Phaser.GameObjects.Graphics;
  sheen: Phaser.GameObjects.TileSprite;
  rising = false;
  ripples: { x: number; t: number; k: number }[] = [];

  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    this.surface = this.base = d.y; this.w = d.w as number; this.h = (d.h as number) ?? 400;
    this.current = (d.current as number) ?? 0;
    this.gfx = S.add.graphics().setDepth(14.5);
    this.sheen = S.add.tileSprite(d.x, d.y, this.w, 6, 'water_sheen').setOrigin(0, 0.5).setDepth(14.6).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    S.waters.push(this);
    this.range = 0;
  }

  contains(x: number, y: number) { return x >= this.x && x <= this.x + this.w && y > this.surface && y < this.base + this.h; }
  pull(x: number) { const u = this.d.undertow as number[] | undefined; return !!u && x > u[0] && x < u[1]; }
  ceilingAbove(_x: number, _headY: number) { const c = this.d.ceiling as number | undefined; return c !== undefined && this.surface < c + 40; }
  splash(x: number, k: number) { this.ripples.push({ x, t: 0, k }); this.S.splashAt(x, this.surface, k); }

  reset(cp: number) {
    const r = this.d.rise as { to: number; speed: number; trigger?: number; flag?: string; before?: number } | undefined;
    if (r && cp < (r.before ?? 99)) { this.surface = this.base; this.rising = false; }
  }

  update(dt: number, t: number) {
    const r = this.d.rise as { to: number; speed: number; trigger?: number; flag?: string } | undefined;
    if (r) {
      if (!this.rising && ((r.trigger !== undefined && this.S.P.x > r.trigger) || (r.flag && this.S.flags[r.flag]))) { this.rising = true; sfx.rumble(); }
      if (this.rising) this.surface = Math.max(r.to, this.surface - r.speed * dt);
    }
    // floating props
    for (const p of this.S.props) {
      const b = p.body;
      if (!p.alive || b.position.x < this.x || b.position.x > this.x + this.w) continue;
      const depth = b.bounds.max.y - this.surface;
      if (depth > 0) {
        const hh = b.bounds.max.y - b.bounds.min.y;
        const sub = Math.min(1, depth / hh);
        const v = MJ.Body.getVelocity(b);
        MJ.Body.setVelocity(b, { x: v.x * 0.97 + this.current / 600, y: v.y * 0.9 - sub * 0.42 });
        MJ.Body.setAngularVelocity(b, b.angularVelocity * 0.9 - b.angle * 0.02);
      }
    }
    void CAT;
    const g = this.gfx;
    g.clear();
    const top = this.surface, bottom = this.base + this.h;
    // dark water: a faint grey sheen under the surface, deepening to black
    const bands = 6;
    for (let i = 0; i < bands; i++) {
      const y0 = top + 3 + i * 14, y1 = i === bands - 1 ? bottom : y0 + 14;
      g.fillStyle(0x0a0d10, 0.55 + i * 0.07).fillRect(this.x, y0, this.w, y1 - y0);
    }
    // the surface: a thin moving line, lifted by ripples
    g.lineStyle(1.5, 0x5a6670, 0.55);
    g.beginPath();
    for (let x = 0; x <= this.w; x += 6) {
      let y = top + Math.sin((this.x + x) * 0.05 + t * 0.002) * 1.0 + Math.sin((this.x + x) * 0.013 - t * 0.0013) * 1.3;
      for (const rp of this.ripples) { const dd = Math.abs(this.x + x - rp.x); y += Math.sin(dd * 0.15 - rp.t * 10) * Math.max(0, 1 - rp.t) * rp.k * 3 * Math.exp(-dd / 90); }
      if (x === 0) g.moveTo(this.x + x, y); else g.lineTo(this.x + x, y);
    }
    g.strokePath();
    g.fillStyle(0x0a0d10, 0.5).fillRect(this.x, top + 1, this.w, 2);
    for (const rp of this.ripples) rp.t += dt;
    this.ripples = this.ripples.filter((rp) => rp.t < 1.2);
    this.sheen.y = top + 1; this.sheen.tilePositionX = t * 0.01 + this.current * t * 0.0005;
    // she disturbs the surface as she swims
    const P = this.S.P;
    if (P.water === this && Math.abs(P.vx) > 30 && Math.random() < dt * 3) this.ripples.push({ x: P.x, t: 0, k: 0.3 });
  }
}
register('water', Water);
