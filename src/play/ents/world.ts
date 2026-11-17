import Phaser from 'phaser';
import { sfx } from '../../audio';
import type { PlayScene } from '../PlayScene';
import type { EntDef } from '../types';
import { Ent, register, type Light } from './base';

// Lamps, triggers, scripted set-pieces, camera and darkness zones, weather, secrets and story glimpses.

/** a lamp. Checkpoint lamps are made by the scene; others can be lit with the diya to hold shadows back.
 *  d: { kind: 'post' | 'wall' | 'hang', cp?: index, lit?: true, flag?: set when lit } */
export class Lamp extends Ent {
  lit = false;
  glow: Phaser.GameObjects.Image; flame: Phaser.GameObjects.Image;
  fx: number; fy: number;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const kind = (d.kind as string) ?? 'post';
    if (kind === 'post') { S.add.image(d.x, d.y + 2, 'post_lamp').setOrigin(0.5, 1).setDisplaySize(24, 60).setDepth(9); this.fx = d.x + 3; this.fy = d.y - 57; }
    else if (kind === 'wall') { S.add.image(d.x, d.y - 70, 'walllamp').setDisplaySize(30, 30).setDepth(9); this.fx = d.x + 7; this.fy = d.y - 80; }
    else { const g = S.add.graphics().setDepth(9); g.lineStyle(1.5, 0x07080a).lineBetween(d.x, d.y - 400, d.x, d.y - 86); S.add.image(d.x, d.y - 76, 'walllamp').setDisplaySize(26, 26).setDepth(9).setFlipX(true); this.fx = d.x - 2; this.fy = d.y - 88; }
    this.glow = S.add.image(this.fx, this.fy + 3, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(9.5).setScale(0.9).setAlpha(0);
    this.flame = S.add.image(this.fx, this.fy, 'flame').setBlendMode(Phaser.BlendModes.ADD).setDepth(9.6).setScale(0.7).setAlpha(0);
    if (d.lit) this.light(true);
    S.lamps.push(this);
  }
  light(quiet = false) {
    if (this.lit) return;
    this.lit = true;
    this.S.tweens.add({ targets: [this.glow, this.flame], alpha: 1, duration: quiet ? 10 : 900 });
    if (!quiet) sfx.lampLit();
    if (this.d.flag) this.S.flags[this.d.flag as string] = true;
  }
  actSpot() { return this.lit || this.d.cp !== undefined ? null : { x: this.fx, y: this.fy + 20, r: 50, label: 'light' }; }
  act() { if (this.lit) return false; this.light(); return true; }
  lights(out: Light[]) { if (this.lit) out.push({ x: this.fx, y: this.fy, r: 190, k: 1, warm: true }); }
  reset(cp: number) {
    if (this.d.cp === undefined && !this.d.lit && cp < ((this.d.before as number) ?? 99) && this.lit && !(this.d.on && this.S.flags[this.d.on as string])) { this.lit = false; this.glow.setAlpha(0); this.flame.setAlpha(0); if (this.d.flag) this.S.flags[this.d.flag as string] = false; }
  }
  update(_dt: number, t: number) {
    if (!this.lit && this.d.on && this.S.flags[this.d.on as string]) this.light();
    if (!this.lit) return;
    const f = 1 + Math.sin(t * 0.013 + this.x) * 0.05;
    this.glow.setScale(0.9 * f); this.flame.setScale(0.7 * f);
  }
}
register('lamp', Lamp);

/** runs fn once when she passes x (going right, or `left: true`). d: { fn?(S), flag?, w? (a band), sound?, once? } */
class Trigger extends Ent {
  fired = false;
  update() {
    const P = this.S.P, d = this.d;
    if (this.fired) return;
    const inBand = d.w ? P.x > d.x && P.x < d.x + (d.w as number) : d.left ? P.x < d.x : P.x > d.x;
    const yOk = d.yMax === undefined || P.feetY < (d.yMax as number);
    if (inBand && yOk && !this.S.dead) {
      this.fired = true;
      if (d.flag) this.S.flags[d.flag as string] = true;
      (d.fn as ((S: PlayScene) => void) | undefined)?.(this.S);
    }
  }
  reset(cp: number) { if (cp < ((this.d.before as number) ?? 99)) { this.fired = false; if (this.d.flag) this.S.flags[this.d.flag as string] = false; } }
}
register('trigger', Trigger);

/** a bespoke set-piece in chapter code. d: { init?(S, me), fn(S, dt, t, me), reset?(S, cp, me), lights?(S, out, me), always?: true } */
class Script extends Ent {
  mem: Record<string, unknown> = {};
  constructor(S: PlayScene, d: EntDef) { super(S, d); (d.init as ((S: PlayScene, m: Record<string, unknown>) => void) | undefined)?.(S, this.mem); if (d.always !== false) this.range = 0; }
  update(dt: number, t: number) { (this.d.fn as (S: PlayScene, dt: number, t: number, m: Record<string, unknown>) => void)(this.S, dt, t, this.mem); }
  reset(cp: number) { (this.d.reset as ((S: PlayScene, cp: number, m: Record<string, unknown>) => void) | undefined)?.(this.S, cp, this.mem); }
  lights(out: Light[]) { (this.d.lights as ((S: PlayScene, out: Light[], m: Record<string, unknown>) => void) | undefined)?.(this.S, out, this.mem); }
  act() { return (this.d.act as ((S: PlayScene, m: Record<string, unknown>) => boolean) | undefined)?.(this.S, this.mem) ?? false; }
  actSpot() { return (this.d.spot as ((S: PlayScene, m: Record<string, unknown>) => { x: number; y: number; r: number } | null) | undefined)?.(this.S, this.mem) ?? null; }
}
register('script', Script);

/** camera framing over a stretch: zoom (relative to normal), dy (look up/down), dx. d: { w, zoom?, dy?, dx? } */
class CamZone extends Ent {
  constructor(S: PlayScene, d: EntDef) { super(S, d); S.camZones.push(d as unknown as { x: number; w: number; zoom?: number; dy?: number; dx?: number; lock?: number }); }
  update() { /* read by the camera */ }
}
register('cam', CamZone);

/** darkness over a stretch: d: { w, k: 0..1, fade?: px } */
class DarkZone extends Ent {
  constructor(S: PlayScene, d: EntDef) { super(S, d); S.darkZones.push(d as unknown as { x: number; w: number; k: number; fade?: number }); }
  update() { /* read by the scene */ }
}
register('dark', DarkZone);

/** gusts of wind over a stretch: push her, bend the grass, dim the flame. d: { w, dir: 1 | -1, period, gust, offset?, force? } */
class Wind extends Ent {
  gusting = false; k = 0;
  leaves: Phaser.GameObjects.Particles.ParticleEmitter;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    this.leaves = S.add.particles(0, 0, 'leaf', { lifespan: 2400, speedX: { min: 300, max: 520 }, speedY: { min: -40, max: 60 }, rotate: { start: 0, end: 720 }, frequency: 50, emitting: false, scale: { min: 0.5, max: 1 } }).setDepth(12.6);
    this.range = 0;
  }
  update(dt: number, t: number) {
    const d = this.d, P = this.S.P;
    const ph = ((t + ((d.offset as number) ?? 0)) % (d.period as number));
    const g = ph < (d.gust as number);
    if (g && !this.gusting && Math.abs(P.x - this.x - (d.w as number) / 2) < (d.w as number) / 2 + 600) sfx.gust();
    this.gusting = g;
    this.k += ((g ? 1 : 0) - this.k) * Math.min(1, dt * (g ? 3 : 5));
    const inside = P.x > d.x && P.x < d.x + (d.w as number);
    const cam = this.S.cameras.main.worldView;
    this.leaves.emitting = g && cam.right > d.x && cam.x < d.x + (d.w as number);
    const dir = d.dir as number;
    this.leaves.setConfig({ lifespan: 2400, speedX: { min: 300 * dir, max: 520 * dir }, speedY: { min: -40, max: 60 }, rotate: { start: 0, end: 720 }, frequency: 50, scale: { min: 0.5, max: 1 } } as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig);
    this.leaves.setPosition(dir > 0 ? cam.x - 40 : cam.right + 40, cam.y + cam.height / 2);
    (this.leaves as unknown as { setEmitZone: (z: unknown) => void }).setEmitZone({ type: 'random', source: new Phaser.Geom.Rectangle(0, -cam.height / 2, 10, cam.height) });
    if (inside && !this.S.sheltered(P.x, P.feetY - 20, 'wind', dir)) {
      this.S.windNow = dir * this.k;
      if (P.state === 'ground' || P.state === 'air' || P.state === 'push') P.extVx += dir * this.k * ((d.force as number) ?? 120) * (P.grounded ? 1 : 0.7);
      this.S.dimFlame(this.k * 0.55 * dt);
    }
  }
}
register('wind', Wind);

/** rain over a stretch: dims the flame unless she shelters. d: { w, k?: strength } */
class Rain extends Ent {
  constructor(S: PlayScene, d: EntDef) { super(S, d); S.rainZones.push(d as unknown as { x: number; w: number; k?: number }); this.range = 0; }
  update(dt: number) {
    const P = this.S.P, d = this.d;
    if (P.x > d.x && P.x < d.x + (d.w as number) && !this.S.sheltered(P.x, P.feetY - 30, 'rain', 0) && P.carrying) this.S.dimFlame(((d.k as number) ?? 0.22) * dt);
  }
}
register('rain', Rain);

/** cover from rain and wind. kind 'roof' (thatch on posts over the rect) or 'wall' (stands at its `side`). d: { w, h, kind, side? } */
class Shelter extends Ent {
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    S.shelters.push(d as unknown as { x: number; y: number; w: number; h: number; kind: string; side?: number });
    const g = S.add.graphics().setDepth(11.6);
    g.fillStyle(0x07080a);
    const w = d.w as number, h = d.h as number;
    if (d.kind === 'roof') {
      g.fillRect(d.x + 4, d.y - h, 5, h); g.fillRect(d.x + w - 9, d.y - h, 5, h);
      g.beginPath(); g.moveTo(d.x - 18, d.y - h + 6); g.lineTo(d.x + w / 2, d.y - h - 30); g.lineTo(d.x + w + 18, d.y - h + 6); g.closePath(); g.fillPath();
      for (let x = d.x - 16; x < d.x + w + 16; x += 5) g.fillTriangle(x, d.y - h + 4, x + 4, d.y - h + 4, x + 2, d.y - h + 12 + ((x * 7) % 6));
    } else if (d.kind === 'wall') {
      const sx = (d.side as number) > 0 ? d.x + w - 26 : d.x;
      g.fillRect(sx, d.y - h, 26, h);
      for (let y = d.y - h; y < d.y; y += 18) g.fillRect(sx - 2, y, 30, 2);
    }
    this.range = 1;
  }
  update() { /* read by the scene */ }
}
register('shelter', Shelter);

/** a hidden clay lamp off the main path: touching it lights it (remembered in the save). d: { n: index in chapter } */
class Secret extends Ent {
  lit = false; glow: Phaser.GameObjects.Image; flame: Phaser.GameObjects.Image;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    S.add.image(d.x, d.y, 'g_diya').setDisplaySize(12, 6).setOrigin(0.5, 1).setDepth(10.8);
    this.glow = S.add.image(d.x, d.y - 6, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(10.9).setScale(0.5).setAlpha(0);
    this.flame = S.add.image(d.x + 2, d.y - 7, 'flame').setBlendMode(Phaser.BlendModes.ADD).setDepth(10.95).setScale(0.45).setAlpha(0);
    if (S.save.secrets.includes(this.key())) this.lightUp(true);
  }
  key() { return `${this.S.L.id}-${this.d.n ?? 0}`; }
  lightUp(quiet: boolean) {
    this.lit = true;
    this.S.tweens.add({ targets: [this.glow, this.flame], alpha: 1, duration: quiet ? 10 : 1200 });
    if (!quiet) { sfx.lampLit(); if (!this.S.save.secrets.includes(this.key())) { this.S.save.secrets.push(this.key()); this.S.persist(); } }
  }
  lights(out: Light[]) { if (this.lit) out.push({ x: this.x, y: this.y - 8, r: 90, k: 0.7, warm: true }); }
  update() {
    if (!this.lit && Math.abs(this.S.P.x - this.x) < 16 && Math.abs(this.S.P.feetY - this.y) < 30) this.lightUp(false);
  }
}
register('secret', Secret);

/** the brother, glimpsed: a small figure that appears (far, dim) when she passes x and walks away. d: { at: x trigger, sf?: scroll factor, dir? } */
class Glimpse extends Ent {
  shown = false; fig?: Phaser.GameObjects.Container;
  update(dt: number) {
    const d = this.d;
    if (!this.shown && this.S.P.x > (d.at as number)) {
      this.shown = true;
      const sf = (d.sf as number) ?? 0.8;
      const s = (d.scale as number) ?? 0.8;
      const fig = this.S.add.container(d.x, d.y).setDepth((d.depth as number) ?? 5).setScrollFactor(sf, 1).setAlpha(0).setScale(s);
      // a boy, a little taller than her, a bundle on his shoulder (simple rigid silhouette, walking bob)
      const tint = (d.tint as number) ?? 0x3a4046;
      const body = this.S.add.image(0, -30, 'brother').setTint(tint);
      fig.add(body);
      this.fig = fig;
      this.S.tweens.add({ targets: fig, alpha: (d.alpha as number) ?? 0.85, duration: 900 });
      this.S.tweens.add({ targets: fig, x: d.x + ((d.dir as number) ?? 1) * 380, duration: 9000, ease: 'Linear' });
      this.S.tweens.add({ targets: body, y: -32, duration: 260, yoyo: true, repeat: -1 });
      this.S.tweens.add({ targets: fig, alpha: 0, delay: 6500, duration: 2200 });
      sfx.whisper();
    }
    void dt;
  }
}
register('glimpse', Glimpse);

/** a silent background figure: frozen villagers, shrines, carts — drawn from a texture. d: { key, sf?, scale?, tint?, depth? } */
class Prop2 extends Ent {
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const img = S.add.image(d.x, d.y, d.key as string).setOrigin(0.5, 1).setDepth((d.depth as number) ?? 9).setScale((d.scale as number) ?? 0.5);
    if (d.sf) img.setScrollFactor(d.sf as number, 1);
    if (d.tint) img.setTint(d.tint as number);
    if (d.flip) img.setFlipX(true);
    if (d.alpha) img.setAlpha(d.alpha as number);
  }
  update() { /* still */ }
}
register('decor', Prop2);

/** a figure that waits, then runs off when its flag is set. d: { key, flag, dir, scale?, tint? } */
class Runner extends Ent {
  img: Phaser.GameObjects.Image; gone = false; bob = 0;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    this.img = S.add.image(d.x, d.y, (d.key as string) ?? 'brother').setOrigin(0.5, 1).setScale((d.scale as number) ?? 0.75).setDepth((d.depth as number) ?? 11.2).setTint((d.tint as number) ?? 0x0a0b0c);
    this.range = 0;
  }
  update(dt: number) {
    if (!this.S.flags[this.d.flag as string]) { this.img.x = this.x; this.img.setVisible(!this.d.hidden); return; }
    this.img.setVisible(!this.gone);
    if (this.gone) return;
    this.bob += dt * 12;
    this.img.x += ((this.d.dir as number) ?? 1) * 230 * dt;
    this.img.y = this.y - Math.abs(Math.sin(this.bob)) * 3;
    if (Math.abs(this.img.x - this.x) > 1400) { this.gone = true; this.img.setVisible(false); }
  }
  reset() { if (!this.S.flags[this.d.flag as string]) { this.gone = false; this.img.setVisible(true).setPosition(this.x, this.y); } }
}
register('runner', Runner);
