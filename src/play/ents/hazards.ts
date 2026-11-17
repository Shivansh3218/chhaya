import Phaser from 'phaser';
import { sfx } from '../../audio';
import type { PlayScene } from '../PlayScene';
import type { EntDef } from '../types';
import { CAT, Ent, MJ, circHit, rectHit, register, type Light, type MBody } from './base';
import { Log } from './props';

// Hazards, traps and fire.

/** a fatal drop: below y between x and x+w */
class Pit extends Ent {
  update() {
    const P = this.S.P;
    if (P.x > this.x && P.x < this.x + (this.d.w as number) && P.feetY > this.y && !this.S.dead) this.S.die('pit');
  }
}
register('pit', Pit);

/** sharpened bamboo stakes at the bottom of a pit. d: { w } */
class Stakes extends Ent {
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const w = d.w as number;
    const g = S.add.graphics().setDepth(10.5);
    g.fillStyle(0x07080a);
    for (let x = 6; x < w; x += 9 + ((x * 7) % 5)) {
      const h = 26 + ((x * 13) % 17), lean = ((x * 5) % 7) - 3;
      g.fillTriangle(d.x + x - 3, d.y + 40, d.x + x + 3, d.y + 40, d.x + x + lean, d.y + 40 - h);
    }
    g.fillRect(d.x, d.y + 36, w, 300);
  }
  update() {
    const P = this.S.P;
    if (P.x > this.x && P.x < this.x + (this.d.w as number) && P.feetY > this.y + 14 && !this.S.dead) this.S.die('stakes');
  }
}
register('stakes', Stakes);

/** iron spikes / thorns: deadly rect. d: { w, h, up?: true } */
class Spikes extends Ent {
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const w = d.w as number, h = (d.h as number) ?? 18;
    const g = S.add.graphics().setDepth(11);
    g.fillStyle(0x07080a);
    for (let x = 0; x < w; x += 7) g.fillTriangle(d.x + x, d.y, d.x + x + 6, d.y, d.x + x + 3, d.y - h);
  }
  update() {
    if (this.S.dead) return;
    if (rectHit({ x: this.x + 2, y: this.y - ((this.d.h as number) ?? 18) + 4, w: (this.d.w as number) - 4, h: 10 }, this.S.P.bounds)) this.S.die('stakes');
  }
}
register('spikes', Spikes);

// ------------------------------------------------------------------ fire

/** something the diya can set alight. d: { kind: 'hay' | 'brush' | 'rope' | 'web', w, h, solid?: true,
 *  rope: { to: {x, y} } runs from (x, y) up to it, flag?: name set when burnt, spread?: px, before?: cp } */
export class Burnable extends Ent {
  state: 'whole' | 'burning' | 'gone' = 'whole';
  burnT = 0;
  body?: MBody;
  gfx: Phaser.GameObjects.Graphics;
  fireFx?: Phaser.GameObjects.Particles.ParticleEmitter;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    this.gfx = S.add.graphics().setDepth(d.kind === 'web' ? 10.8 : 11.5);
    if (d.solid) {
      this.body = S.matter.add.rectangle(d.x + (d.w as number) / 2, d.y - (d.h as number) / 2, d.w as number, d.h as number, {
        isStatic: true, label: 'ground', collisionFilter: { category: CAT.GROUND, mask: 0xffff },
      }) as MBody;
    }
    this.draw();
    S.burnables.push(this);
  }
  get w() { return this.d.w as number; }
  get h() { return this.d.h as number; }
  center() {
    if (this.d.kind === 'rope') { const to = this.d.to as { x: number; y: number }; return { x: (this.x + to.x) / 2, y: (this.y + to.y) / 2 }; }
    return { x: this.x + this.w / 2, y: this.y - this.h / 2 };
  }
  draw() {
    const g = this.gfx, d = this.d, k = this.state === 'burning' ? 1 - this.burnT : 1;
    g.clear();
    if (this.state === 'gone') return;
    const char = this.state === 'burning' ? 0x2a1a10 : 0x07080a;
    g.fillStyle(char).lineStyle(2, char);
    const rnd = new Phaser.Math.RandomDataGenerator([this.id]);
    if (d.kind === 'hay') {
      const hh = this.h * k;
      g.fillRoundedRect(this.x, this.y - hh, this.w, hh, 6);
      g.lineStyle(1, 0x2a2c2e, 0.6);
      for (let i = 0; i < this.w / 4; i++) { const x = this.x + rnd.between(2, this.w - 2); g.lineBetween(x, this.y - hh - rnd.between(0, 5), x + rnd.between(-5, 5), this.y - hh + rnd.between(6, 14)); }
    } else if (d.kind === 'brush') {
      for (let i = 0; i < this.w / 2.5; i++) {
        const x = this.x + rnd.between(0, this.w), h = rnd.between(this.h * 0.5, this.h) * k;
        g.lineStyle(rnd.realInRange(1, 2.4), char);
        g.beginPath(); g.moveTo(x, this.y); g.lineTo(x + rnd.between(-14, 14), this.y - h); g.strokePath();
        // thorns
        if (i % 3 === 0) g.fillTriangle(x + 2, this.y - h * 0.5, x + 7, this.y - h * 0.55, x + 2, this.y - h * 0.45);
      }
    } else if (d.kind === 'grass') {
      for (let i = 0; i < this.w / 2; i++) {
        const x = this.x + rnd.between(0, this.w), h = rnd.between(this.h * 0.4, this.h) * k;
        g.lineStyle(rnd.realInRange(0.8, 1.6), char);
        g.beginPath(); g.moveTo(x, this.y + 1); g.lineTo(x + rnd.between(-5, 5), this.y - h); g.strokePath();
      }
    } else if (d.kind === 'web') {
      g.lineStyle(1, 0xb8c0c8, 0.32 * k);
      const cx = this.x + this.w / 2, cy = this.y - this.h / 2;
      for (let a = 0; a < 12; a++) { const an = (a / 12) * Math.PI * 2; g.lineBetween(cx, cy, cx + Math.cos(an) * this.w * 0.6, cy + Math.sin(an) * this.h * 0.6); }
      for (let r = 8; r < Math.max(this.w, this.h) * 0.6; r += 9) { g.beginPath(); for (let a = 0; a <= 12; a++) { const an = (a / 12) * Math.PI * 2; const px = cx + Math.cos(an) * r * (this.w / Math.max(this.w, this.h)), py = cy + Math.sin(an) * r * (this.h / Math.max(this.w, this.h)); if (a) g.lineTo(px, py); else g.moveTo(px, py); } g.strokePath(); }
    } else if (d.kind === 'rope') {
      const to = d.to as { x: number; y: number };
      const ex = Phaser.Math.Linear(to.x, this.x, k), ey = Phaser.Math.Linear(to.y, this.y, k);
      g.lineStyle(2.2, char); g.lineBetween(to.x, to.y, ex, ey);
      g.fillStyle(0x07080a).fillRect(this.x - 3, this.y - 2, 6, 12); // peg
    }
  }
  actSpot() {
    if (this.state !== 'whole') return null;
    const c = this.d.kind === 'rope' ? { x: this.x, y: this.y } : { x: this.x + this.w / 2, y: this.y - Math.min(this.h, 40) / 2 };
    return { x: c.x, y: c.y, r: this.d.kind === 'rope' ? 40 : Math.max(46, this.w / 2 + 26), label: 'burn' };
  }
  act() { if (this.state !== 'whole') return false; this.ignite(); return true; }
  ignite() {
    if (this.state !== 'whole') return;
    this.state = 'burning'; this.burnT = 0; sfx.ignite();
    const c = this.center();
    this.fireFx = this.S.add.particles(c.x, c.y, 'soft', {
      x: { min: -this.w / 2, max: this.w / 2 }, y: { min: -this.h / 3, max: this.h / 3 },
      speedY: { min: -90, max: -40 }, speedX: { min: -14, max: 14 }, lifespan: { min: 300, max: 800 },
      scale: { start: 0.5, end: 0 }, tint: [0xffb35a, 0xff7a2a, 0xffd28a], blendMode: Phaser.BlendModes.ADD, frequency: 30, alpha: { start: 0.9, end: 0 },
    }).setDepth(12);
    if (this.d.kind === 'rope') this.fireFx.setConfig({ x: 0, y: 0, speedY: { min: -60, max: -20 }, scale: { start: 0.25, end: 0 }, frequency: 50, lifespan: 500, tint: [0xffb35a], blendMode: Phaser.BlendModes.ADD });
  }
  lights(out: Light[]) { if (this.state === 'burning') { const c = this.center(); out.push({ x: c.x, y: c.y, r: this.d.kind === 'rope' ? 120 : 240, k: 1, warm: true }); } }
  reset(cp: number) {
    if (cp < ((this.d.before as number) ?? 99)) {
      this.state = 'whole'; this.burnT = 0; this.fireFx?.destroy(); this.fireFx = undefined;
      if (this.body) MJ.Body.setPosition(this.body, { x: this.x + this.w / 2, y: this.y - this.h / 2 });
      this.draw();
    }
  }
  update(dt: number) {
    if (this.state !== 'burning') return;
    const dur = this.d.kind === 'rope' ? 1.5 : this.d.kind === 'web' ? 1.2 : 2.6;
    this.burnT += dt / dur;
    if (Math.random() < dt * 4) sfx.crackle();
    // the fire is deadly to touch, and spreads
    const c = this.center();
    if (this.d.kind !== 'rope' && rectHit({ x: this.x + 4, y: this.y - this.h, w: this.w - 8, h: this.h }, this.S.P.bounds) && !this.S.dead) this.S.die('burn');
    if (this.burnT > 0.22) for (const b of this.S.burnables) if (b !== this && b.state === 'whole') {
      // ropes catch at their peg; everything else from its middle
      const o = b.d.kind === 'rope' ? { x: b.x, y: b.y - 4 } : b.center();
      const ow = b.d.kind === 'rope' ? 0 : b.w;
      if (Math.hypot(o.x - c.x, (o.y - c.y) * 0.6) < Math.max((this.d.spread as number) ?? 70, (b.d.spread as number) ?? 0) + (ow + this.w) / 2) b.ignite();
    }
    this.S.scareAt(c.x, c.y, 1);
    this.draw();
    if (this.burnT >= 1) {
      this.state = 'gone';
      this.fireFx?.stop(); this.S.time.delayedCall(900, () => { this.fireFx?.destroy(); this.fireFx = undefined; });
      if (this.body) MJ.Body.setPosition(this.body, { x: -99999, y: -99999 });
      if (this.d.flag) this.S.flags[this.d.flag as string] = true;
      this.S.flags[`burnt_${this.id}`] = true;
      this.draw();
    }
  }
}
register('burn', Burnable);

/** a fire that just burns (brazier, campfire, burning wreck): light, warmth, deadly to touch. d: { w?, h? , out?: flag that puts it out } */
class Fire extends Ent {
  fx: Phaser.GameObjects.Particles.ParticleEmitter;
  on = true;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const w = (d.w as number) ?? 30;
    this.fx = S.add.particles(d.x, d.y - 6, 'soft', {
      x: { min: -w / 2, max: w / 2 }, speedY: { min: -80, max: -30 }, speedX: { min: -10, max: 10 }, lifespan: { min: 300, max: 700 },
      scale: { start: 0.45, end: 0 }, tint: [0xffb35a, 0xff7a2a, 0xffd28a], blendMode: Phaser.BlendModes.ADD, frequency: 40, alpha: { start: 0.9, end: 0 },
    }).setDepth(12);
    if (d.pot) S.add.image(d.x, d.y, 'brazier').setOrigin(0.5, 0).setDepth(11.4).setScale(0.5);
  }
  lights(out: Light[]) { if (this.on) out.push({ x: this.x, y: this.y - 12, r: 230, k: 1, warm: true }); }
  update() {
    if (this.d.out && this.S.flags[this.d.out as string] && this.on) { this.on = false; this.fx.stop(); sfx.snuff(); }
    if (!this.on) return;
    const w = (this.d.w as number) ?? 30;
    if (!this.d.pot && rectHit({ x: this.x - w / 2, y: this.y - 30, w, h: 30 }, this.S.P.bounds) && !this.S.dead) this.S.die('burn');
    this.S.scareAt(this.x, this.y, 1);
  }
  reset() { if (this.d.out && !this.S.flags[this.d.out as string]) { this.on = true; this.fx.start(); } }
}
register('fire', Fire);

// ------------------------------------------------------------------ traps

/** a log hung on ropes from a branch, released by a tripwire: it swings down through the path.
 *  d: { x (pivot), y (pivot), len, trip: x of the tripwire, from: -1 | 1 (side it swings from), snap?: true (the rope
 *  breaks at the far end and the log drops, e.g. into a pit as a bridge), before?: cp } */
class SwingLog extends Ent {
  theta: number; omega = 0; state: 'held' | 'swing' | 'dropped' = 'held';
  img: Phaser.GameObjects.Image; ropes: Phaser.GameObjects.Graphics; wire: Phaser.GameObjects.Graphics;
  len: number; dropped?: Log;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    this.len = d.len as number;
    this.theta = this.rest();
    this.img = S.add.image(0, 0, 'log').setDisplaySize(170, 40).setDepth(11.3);
    this.ropes = S.add.graphics().setDepth(11.2);
    this.wire = S.add.graphics().setDepth(10.6);
    this.range = 0;
  }
  rest() { return -((this.d.from as number) ?? -1) * -1.25 * -1; }
  pos() { return { x: this.x + Math.sin(this.theta) * this.len, y: this.y + Math.cos(this.theta) * this.len }; }
  reset(cp: number) {
    if (cp < ((this.d.before as number) ?? 99)) { this.state = 'held'; this.theta = ((this.d.from as number) ?? -1) * 1.25; this.omega = 0; this.img.setVisible(true); }
  }
  update(dt: number) {
    const d = this.d, P = this.S.P;
    if (this.state === 'held') {
      this.theta = ((d.from as number) ?? -1) * 1.25;
      if (Math.abs(P.x - (d.trip as number)) < 8 && P.feetY > this.S.groundTop(d.trip as number) - 6) { this.state = 'swing'; sfx.snap(); sfx.creak(); }
    } else if (this.state === 'swing') {
      this.omega += (-(1200 / this.len) * Math.sin(this.theta)) * dt;
      this.omega *= 1 - 0.25 * dt;
      this.theta += this.omega * dt;
      const p = this.pos();
      if (Math.abs(this.omega) > 0.9 && circHit(p.x, p.y, 28, P.bounds) && !this.S.dead) this.S.die('crushed');
      if (Math.abs(this.omega) > 1.2 && Math.random() < dt * 3) sfx.creakSoft();
      if (d.snap && this.theta * ((d.from as number) ?? -1) < -0.55 && this.omega * ((d.from as number) ?? -1) < 0.3) {
        this.state = 'dropped'; sfx.snap();
        this.img.setVisible(false);
        const v = this.omega * this.len;
        this.dropped = new Log(this.S, { type: 'log', id: `${this.id}_log`, x: p.x, y: p.y + 13, w: 170, before: d.before });
        MJ.Body.setVelocity(this.dropped.body, { x: (v * Math.cos(this.theta)) / 60, y: (-v * Math.sin(this.theta)) / 60 });
        this.S.ents.push(this.dropped);
      }
    }
    // draw: two ropes from the branch to the ends of the log
    const p = this.pos();
    this.img.setPosition(p.x, p.y).setRotation(-this.theta * 0.25);
    const g = this.ropes; g.clear();
    if (this.state !== 'dropped') { g.lineStyle(2, 0x07080a); g.lineBetween(this.x - 10, this.y, p.x - 50, p.y - 8); g.lineBetween(this.x + 10, this.y, p.x + 50, p.y - 8); }
    const w = this.wire; w.clear();
    if (this.state === 'held') { const tx = d.trip as number, gy = this.S.groundTop(tx); const vis = d.hidden ? Math.min(0.7, this.S.lightAt(tx, gy - 8) * 2.2) : 0.5; w.lineStyle(1, 0x8a8e92, vis); w.lineBetween(tx - 1, gy - 7, tx + 1, gy - 7); if (!d.hidden) w.fillStyle(0x07080a).fillRect(tx - 14, gy - 12, 3, 12).fillRect(tx + 12, gy - 12, 3, 12); w.lineBetween(tx - 13, gy - 8, tx + 13, gy - 8); }
  }
}
register('swinglog', SwingLog);

/** stones fall from a crack on a rhythm: dust trickles first (the warning). d: { ceil: y, period: ms, offset?: ms, w?: spread } */
class Dropper extends Ent {
  stones: { x: number; y: number; vy: number; img: Phaser.GameObjects.Image; on: boolean; r: number }[] = [];
  dust: Phaser.GameObjects.Particles.ParticleEmitter;
  phase = -1;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    for (let i = 0; i < 4; i++) this.stones.push({ x: 0, y: 0, vy: 0, img: S.add.image(0, 0, 'rock').setDepth(11.4).setVisible(false), on: false, r: 10 });
    this.dust = S.add.particles(d.x, d.ceil as number, 'soft', { x: { min: -10, max: 10 }, speedY: { min: 40, max: 90 }, lifespan: 1400, scale: { start: 0.12, end: 0.04 }, alpha: { start: 0.5, end: 0 }, tint: 0x9a9690, frequency: 60, emitting: false }).setDepth(11);
    S.add.image(d.x, d.ceil as number, 'crack').setOrigin(0.5, 0).setDepth(10.9).setScale(0.5);
  }
  update(dt: number, t: number) {
    const d = this.d, period = d.period as number;
    const ph = ((t + ((d.offset as number) ?? 0)) % period) / period;
    const warn = ph > 0.62 && ph < 0.86;
    this.dust.emitting = warn;
    if (warn && Math.random() < dt * 2) sfx.scrape();
    if (this.phase < 0.86 && ph >= 0.86) {
      sfx.crack();
      this.stones.forEach((s, i) => { s.on = true; s.x = this.x + (i - 1.5) * 10 + ((i * 7) % 5); s.y = (d.ceil as number) + 4 - i * 26; s.vy = 60; s.r = 9 + (i % 2) * 3; s.img.setVisible(true).setScale(0.5 + (i % 2) * 0.15).setAlpha(1); });
    }
    this.phase = ph;
    for (const s of this.stones) {
      if (!s.on) continue;
      s.vy = Math.min(s.vy + 1700 * dt, 1100); s.y += s.vy * dt;
      s.img.setPosition(s.x, s.y).setRotation(s.y * 0.05);
      if (circHit(s.x, s.y, s.r, this.S.P.bounds) && !this.S.dead) this.S.die('crushed');
      const gy = this.S.groundTop(s.x, s.y - 20);
      if (s.y + s.r > gy) { s.on = false; s.img.setVisible(false); sfx.stone(); this.S.dustAt(s.x, gy - 2, 5); }
    }
  }
}
register('dropper', Dropper);

/** a poacher's noose snare hidden in leaves, on a bent sapling. Stepping in yanks her up by the ankle.
 *  A crate or a creature pushed onto it springs it harmlessly; the diya can burn the cord. d: { flip?: true } */
class Snare extends Ent {
  armed = true; spring = 0;
  g: Phaser.GameObjects.Graphics;
  caught?: 'girl' | 'thing';
  constructor(S: PlayScene, d: EntDef) { super(S, d); this.g = S.add.graphics().setDepth(11.6); }
  actSpot() { return this.armed ? { x: this.x, y: this.y - 6, r: 36, label: 'burn' } : null; }
  act() { if (!this.armed) return false; this.armed = false; this.spring = 0.01; sfx.ignite(); this.S.emberAt({ x: this.x, y: this.y - 4 }); return true; }
  reset(cp: number) { if (cp < ((this.d.before as number) ?? 99)) { this.armed = true; this.spring = 0; this.caught = undefined; } }
  update(dt: number) {
    const P = this.S.P;
    const side = this.d.flip ? -1 : 1;
    if (this.armed) {
      if (Math.abs(P.x - this.x) < 9 && P.grounded && !this.S.dead) {
        this.armed = false; this.spring = 0.01; this.caught = 'girl'; sfx.twang(); sfx.snap();
        this.S.die('snared', { snareX: this.x + side * 70, snareY: this.y - 150 });
      }
      for (const p of this.S.props) if (p.alive && Math.abs(p.body.position.x - this.x) < 18 && p.body.bounds.max.y > this.y - 6) { this.armed = false; this.spring = 0.01; sfx.twang(); }
      for (const c of this.S.creatures) if (Math.abs(c.x - this.x) < 14 && c.onGround?.()) { this.armed = false; this.spring = 0.01; this.caught = 'thing'; sfx.twang(); c.trapped?.('snare'); }
    } else if (this.spring > 0) this.spring = Math.min(1, this.spring + dt * 6);
    // draw: a bent sapling and a cord with a loop hidden in the litter
    const g = this.g; g.clear();
    const bx = this.x + side * 70, by = this.y;
    const k = this.spring;
    const tipX = Phaser.Math.Linear(this.x + side * 6, bx + side * 4, k), tipY = Phaser.Math.Linear(this.y - 26, by - 160, k);
    g.lineStyle(3.2, 0x07080a); g.beginPath(); g.moveTo(bx, by); g.lineTo((bx + tipX) / 2 + side * 14 * (1 - k), (by + tipY) / 2 - 30 * (1 - k)); g.lineTo(tipX, tipY); g.strokePath();
    g.lineStyle(1, 0x07080a); g.lineBetween(tipX, tipY, k > 0.5 ? tipX : this.x, k > 0.5 ? tipY + 40 : this.y - 2);
    if (k === 0) { g.strokeEllipse(this.x, this.y - 1.5, 16, 3); g.fillStyle(0x07080a); for (let i = -3; i <= 3; i++) g.fillEllipse(this.x + i * 4, this.y - 1, 6, 2.4); }
  }
}
register('snare', Snare);

/** iron jaws (phanda) on the ground. Stepping on the plate snaps them; she can drag them with grab.
 *  A creature that steps in is held fast (it yelps and stays). d: { } */
class Jaws extends Ent {
  open = true; body: MBody; img: Phaser.GameObjects.Image;
  push = 70; pull = 64; grabbable = false; heavy = false; alive = true;
  home: { x: number; y: number };
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    this.body = S.matter.add.rectangle(d.x, d.y - 4, 40, 8, {
      friction: 0.9, frictionStatic: 1, density: 0.004, label: 'prop', collisionFilter: { category: CAT.PROP, mask: CAT.GROUND | CAT.PLAT | CAT.PROP },
    }) as MBody;
    MJ.Body.setInertia(this.body, Infinity);
    this.home = { x: d.x, y: d.y - 4 };
    this.img = S.add.image(0, 0, 'jaws_open').setDepth(11.5).setScale(0.5);
    S.props.push(this as unknown as import('./base').Prop);
    (this as unknown as { id: string }).id = this.id;
    this.range = 0;
  }
  reset(cp: number) {
    if (cp < ((this.d.before as number) ?? 99)) { this.open = true; MJ.Body.setPosition(this.body, this.home); MJ.Body.setVelocity(this.body, { x: 0, y: 0 }); this.img.setTexture('jaws_open'); }
  }
  snap() { this.open = false; this.img.setTexture('jaws_shut'); sfx.slam(); this.S.shake(0.003); }
  update() {
    const b = this.body;
    this.x = b.position.x; this.y = b.bounds.max.y;
    this.img.setPosition(b.position.x, b.bounds.max.y - 6);
    if (!this.open) return;
    const P = this.S.P;
    if (Math.abs(P.x - b.position.x) < 12 && P.feetY > b.bounds.min.y - 3 && P.feetY < b.bounds.max.y + 4 && !this.S.dead && !this.S.P.pushing) { this.snap(); this.S.die('snared'); }
    for (const c of this.S.creatures) if (Math.abs(c.x - b.position.x) < 16 && c.onGround?.() && c.alive) { this.snap(); c.trapped?.('jaws'); }
    for (const p of this.S.props) if (p !== (this as unknown) && p.alive && Math.abs(p.body.position.x - b.position.x) < 20 && p.body.bounds.max.y > b.bounds.min.y - 4 && p.body.bounds.min.y < b.bounds.max.y) { this.snap(); break; }
  }
}
register('jaws', Jaws);

// ------------------------------------------------------------------ machinery

/** a moving platform (raft, plank, cage, lift). d: { w, h?, to: {x, y} (other end), speed: px/s,
 *  mode: 'loop' | 'flag' | 'ride' (starts when she stands on it) , flag?, pause?: ms at each end, key?: texture } */
export class Lift extends Ent {
  body: MBody; img: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  u = 0; dir = 1; wait = 0; going = false;
  from: { x: number; y: number }; to: { x: number; y: number };
  chains?: Phaser.GameObjects.Graphics;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const w = d.w as number, h = (d.h as number) ?? 14;
    this.from = { x: d.x, y: d.y }; this.to = d.to as { x: number; y: number };
    this.body = S.matter.add.rectangle(d.x + w / 2, d.y + h / 2, w, h, { isStatic: true, label: 'plat', collisionFilter: { category: CAT.PLAT, mask: 0xffff } }) as MBody;
    (this.body as MBody & { plugin: Record<string, unknown> }).plugin = { dx: 0, dy: 0 };
    this.img = d.key ? S.add.image(0, 0, d.key as string).setDisplaySize(w, h + 6).setDepth(10.8) : S.add.rectangle(0, 0, w, h, 0x07080a).setDepth(10.8);
    if (d.chains) this.chains = S.add.graphics().setDepth(10.7);
    this.range = 0;
  }
  reset(cp: number) { if (cp < ((this.d.before as number) ?? 99)) { this.u = 0; this.dir = 1; this.going = false; this.wait = 0; } }
  update(dt: number) {
    const d = this.d, w = d.w as number, h = (d.h as number) ?? 14;
    const len = Math.hypot(this.to.x - this.from.x, this.to.y - this.from.y) || 1;
    const sp = ((d.speed as number) ?? 60) / len;
    let move = false;
    if (d.mode === 'flag') move = !!this.S.flags[d.flag as string];
    else if (d.mode === 'ride') { if (this.S.P.standingOn === this.body) this.going = true; move = this.going; }
    else move = true;
    const before = { x: this.body.position.x, y: this.body.position.y };
    if (move) {
      if (this.wait > 0) this.wait -= dt;
      else {
        this.u += this.dir * sp * dt;
        if (this.u >= 1) { this.u = 1; if (d.mode === 'loop') { this.dir = -1; this.wait = ((d.pause as number) ?? 800) / 1000; sfx.clunk(); } }
        if (this.u <= 0) { this.u = 0; this.dir = 1; this.wait = ((d.pause as number) ?? 800) / 1000; sfx.clunk(); }
      }
    } else if (d.mode === 'flag' && d.back) this.u = Math.max(0, this.u - sp * dt);
    const e = this.u * this.u * (3 - 2 * this.u);
    const x = Phaser.Math.Linear(this.from.x, this.to.x, e) + w / 2, y = Phaser.Math.Linear(this.from.y, this.to.y, e) + h / 2;
    MJ.Body.setPosition(this.body, { x, y });
    const pl = (this.body as MBody & { plugin: { dx: number; dy: number } }).plugin;
    pl.dx = x - before.x; pl.dy = y - before.y;
    // props riding on it come along
    if (pl.dx || pl.dy) for (const p of this.S.props) {
      const b = p.body.bounds;
      if (Math.abs(b.max.y - (y - h / 2)) < 4 && b.max.x > x - w / 2 && b.min.x < x + w / 2) MJ.Body.translate(p.body, { x: pl.dx, y: pl.dy });
    }
    this.img.setPosition(x, y);
    if (this.chains) { this.chains.clear().lineStyle(2, 0x07080a); this.chains.lineBetween(x - w / 2 + 4, y, x - w / 2 + 4, y - 900); this.chains.lineBetween(x + w / 2 - 4, y, x + w / 2 - 4, y - 900); }
  }
}
register('lift', Lift);

/** a gate (portcullis/door) that rises while a flag is set. d: { h, w?, flag, key? } */
class Gate extends Ent {
  body: MBody; img: Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite; open = 0;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const w = (d.w as number) ?? 24, h = d.h as number;
    this.body = S.matter.add.rectangle(d.x + w / 2, d.y - h / 2, w, h, { isStatic: true, label: 'ground', collisionFilter: { category: CAT.GROUND, mask: 0xffff } }) as MBody;
    this.img = S.add.tileSprite(d.x, d.y - h, w * 2, h * 2, 'gatebars2').setOrigin(0).setScale(0.5).setDepth(10.9);
    this.range = 0;
  }
  update(dt: number) {
    const d = this.d, h = d.h as number, w = (d.w as number) ?? 24;
    const want = this.S.flags[d.flag as string] ? 1 : 0;
    const prev = this.open;
    this.open = Phaser.Math.Clamp(this.open + Math.sign(want - this.open) * dt * (want ? 0.9 : 0.75), 0, 1);
    if (prev !== this.open && Math.random() < dt * 8) sfx.grind();
    if (prev > 0.02 && this.open <= 0.02) { sfx.slam(); this.S.shake(0.004); }
    const lift = this.open * (h - 6);
    MJ.Body.setPosition(this.body, { x: d.x + w / 2, y: d.y - h / 2 - lift });
    this.img.setPosition(d.x, d.y - h - lift);
    // closing on her is fatal
    if (want === 0 && this.open > 0.05 && rectHit({ x: d.x, y: d.y - lift - 8, w, h: 8 }, this.S.P.bounds) && !this.S.dead) this.S.die('crushed');
  }
}
register('gate', Gate);

/** a stone pressure plate: holds a flag while she or something heavy stands on it. d: { w?, flag } */
class Plate extends Ent {
  img: Phaser.GameObjects.Rectangle; down = 0;
  constructor(S: PlayScene, d: EntDef) { super(S, d); this.img = S.add.rectangle(d.x, d.y, (d.w as number) ?? 50, 6, 0x0d0f11).setOrigin(0, 1).setDepth(10.6); this.range = 0; }
  update(dt: number) {
    const d = this.d, w = (d.w as number) ?? 50;
    const r = { x: d.x, y: d.y - 10, w, h: 14 };
    let on = rectHit(r, this.S.P.bounds) && this.S.P.grounded;
    for (const p of this.S.props) if (p.alive && p.heavy && rectHit(r, p.body.bounds)) on = true;
    if (on && !this.S.flags[d.flag as string]) sfx.clunk();
    this.S.flags[d.flag as string] = on;
    this.down += ((on ? 1 : 0) - this.down) * Math.min(1, dt * 12);
    this.img.y = d.y + this.down * 4;
  }
}
register('plate', Plate);

/** a lever: the diya key or grab pulls it, toggling (or setting) a flag. d: { flag, once?: true } */
class Lever extends Ent {
  arm: Phaser.GameObjects.Rectangle; on = false;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    S.add.rectangle(d.x, d.y, 18, 8, 0x07080a).setOrigin(0.5, 1).setDepth(10.7);
    this.arm = S.add.rectangle(d.x, d.y - 6, 4, 30, 0x07080a).setOrigin(0.5, 1).setDepth(10.7).setRotation(-0.5);
    this.range = 0;
  }
  actSpot() { return this.d.once && this.on ? null : { x: this.x, y: this.y - 20, r: 34, label: 'pull' }; }
  act() { this.on = this.d.once ? true : !this.on; this.S.flags[this.d.flag as string] = this.on; sfx.clunk(); return true; }
  reset(cp: number) { if (cp < ((this.d.before as number) ?? 99)) { this.on = false; this.S.flags[this.d.flag as string] = false; } }
  update(dt: number) {
    if (this.S.input && this.S.lastInp.grabPressed && Math.abs(this.S.P.x - this.x) < 26 && Math.abs(this.S.P.feetY - this.y) < 30 && !(this.d.once && this.on)) this.act();
    this.arm.rotation += ((this.on ? 0.5 : -0.5) - this.arm.rotation) * Math.min(1, dt * 10);
  }
}
register('lever', Lever);

/** an iron crusher shoe: rests up, creaks, slams down once per period. Ride its top. d: { w, up: y, down: y (floor), period, offset? } */
class Crusher extends Ent {
  body: MBody; img: Phaser.GameObjects.Image; beam: Phaser.GameObjects.Rectangle; last = 0;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const w = d.w as number;
    this.body = S.matter.add.rectangle(d.x + w / 2, (d.up as number) - 30, w, 60, { isStatic: true, label: 'plat', collisionFilter: { category: CAT.PLAT, mask: 0xffff } }) as MBody;
    (this.body as MBody & { plugin: Record<string, unknown> }).plugin = { dx: 0, dy: 0 };
    this.img = S.add.image(0, 0, 'crusher').setDisplaySize(w + 4, 64).setDepth(11);
    this.beam = S.add.rectangle(d.x + w / 2, 0, 14, 1200, 0x07080a).setOrigin(0.5, 1).setDepth(10.9);
  }
  yAt(t: number) {
    const d = this.d, period = d.period as number;
    const ph = ((t + ((d.offset as number) ?? 0)) % period) / period;
    const up = d.up as number, down = (d.down as number) - 60;
    if (d.ride) { // a long rest on the floor (step on), a slow lift, a long rest up (step off)
      if (ph < 0.35) return up;
      if (ph < 0.42) return Phaser.Math.Linear(up, down, ((ph - 0.35) / 0.07) ** 2);
      if (ph < 0.75) return down;
      return Phaser.Math.Linear(down, up, Math.min(1, (ph - 0.75) / 0.2));
    }
    if (ph < 0.55) return up - Math.sin((ph / 0.55) * Math.PI) * 0;
    if (ph < 0.7) return up - Math.sin(((ph - 0.55) / 0.15) * Math.PI * 0.5) * 18; // the creaking lift: a tell
    if (ph < 0.76) return Phaser.Math.Linear(up - 18, down, ((ph - 0.7) / 0.06) ** 2);
    if (ph < 0.82) return down;
    return Phaser.Math.Linear(down, up, (ph - 0.82) / 0.18);
  }
  update(_dt: number, t: number) {
    const d = this.d, w = d.w as number;
    const y = this.yAt(t), prev = this.body.position.y + 0;
    const cy = y + 30;
    MJ.Body.setPosition(this.body, { x: d.x + w / 2, y: cy });
    const pl = (this.body as MBody & { plugin: { dx: number; dy: number } }).plugin; pl.dx = 0; pl.dy = cy - prev;
    this.img.setPosition(d.x + w / 2, cy);
    this.beam.y = y + 2;
    const down = (d.down as number) - 60;
    if (this.last < down - 2 && y >= down - 0.5) { sfx.slam(); this.S.shake(0.006); this.S.dustAt(d.x + w / 2, d.down as number, 10); }
    if (y > this.last + 0.5 && y < down) { // slamming down: her under it?
      if (rectHit({ x: d.x + 3, y: y + 40, w: w - 6, h: 40 }, this.S.P.bounds) && this.S.P.feetY > y + 60 && !this.S.dead) this.S.die('crushed');
    }
    if (Math.abs(y - (d.up as number)) > 2 && Math.abs(y - (d.up as number)) < 20 && Math.random() < 0.08) sfx.creakSoft();
    this.last = y;
  }
}
register('crusher', Crusher);

/** a turning cog (background decoration, or deadly teeth if `deadly`). d: { r, speed, depth?, deadly? } */
class Gear extends Ent {
  img: Phaser.GameObjects.Image;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const r = d.r as number;
    this.img = S.add.image(d.x, d.y, 'gear').setDisplaySize(r * 2, r * 2).setDepth((d.depth as number) ?? 9).setTint((d.tint as number) ?? 0xffffff);
    if (d.sf) this.img.setScrollFactor(d.sf as number);
  }
  update(dt: number) {
    const on = this.d.flag ? !this.S.flags[this.d.flag as string] : true;
    if (on) this.img.rotation += ((this.d.speed as number) ?? 0.5) * dt;
    if (this.d.deadly && on && circHit(this.x, this.y, (this.d.r as number) * 0.92, this.S.P.bounds) && !this.S.dead) this.S.die('crushed');
  }
}
register('gear', Gear);

/** a circular saw / spinning blade in a mill. d: { r, flag?: stops it } */
class Saw extends Ent {
  img: Phaser.GameObjects.Image; spin = 1;
  constructor(S: PlayScene, d: EntDef) { super(S, d); this.img = S.add.image(d.x, d.y, 'sawblade').setDisplaySize((d.r as number) * 2, (d.r as number) * 2).setDepth(11.1); }
  update(dt: number) {
    const on = this.d.flag ? !this.S.flags[this.d.flag as string] : true;
    this.spin += ((on ? 1 : 0) - this.spin) * dt * 0.8;
    this.img.rotation += this.spin * 14 * dt;
    if (this.spin > 0.3 && Math.random() < dt * 4) sfx.grind();
    if (this.spin > 0.3 && circHit(this.x, this.y, (this.d.r as number) * 0.9, this.S.P.bounds) && !this.S.dead) this.S.die('crushed');
  }
}
register('saw', Saw);

/** a rope bridge: planks you can walk on, sagging ropes, that fall when its flag is set (its anchor rope burnt).
 *  d: { w, flag, sag? } — the deck is at y, from x to x + w */
class Bridge extends Ent {
  body: MBody; planks: Phaser.GameObjects.Image[] = []; ropes: Phaser.GameObjects.Graphics; down = false;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const w = d.w as number;
    this.body = S.matter.add.rectangle(d.x + w / 2, d.y + 4, w, 8, { isStatic: true, label: 'ground', collisionFilter: { category: CAT.GROUND, mask: 0xffff } }) as MBody;
    for (let x = 0; x < w; x += 16) this.planks.push(S.add.image(d.x + x + 8, d.y + 3, 'plank').setDisplaySize(15, 6).setDepth(10.9).setRotation(((x * 7) % 5 - 2) * 0.02));
    this.ropes = S.add.graphics().setDepth(10.95);
    this.range = 0;
    this.draw(0);
  }
  draw(t: number) {
    const d = this.d, w = d.w as number, g = this.ropes;
    g.clear(); if (this.down) return;
    g.lineStyle(1.6, 0x07080a);
    const sway = Math.sin(t * 0.002) * 1.5;
    g.beginPath(); g.moveTo(d.x, d.y - 34);
    for (let i = 1; i <= 12; i++) { const u = i / 12; g.lineTo(d.x + u * w, d.y - 34 + Math.sin(u * Math.PI) * 14 + sway); }
    g.strokePath();
    for (let x = 16; x < w; x += 32) { const u = x / w; g.lineBetween(d.x + x, d.y, d.x + x, d.y - 34 + Math.sin(u * Math.PI) * 14 + sway); }
    g.fillStyle(0x07080a); g.fillRect(d.x - 4, d.y - 40, 6, 40); g.fillRect(d.x + w - 2, d.y - 40, 6, 40);
  }
  reset(cp: number) {
    if (cp < ((this.d.before as number) ?? 99)) {
      this.down = false;
      MJ.Body.setPosition(this.body, { x: this.d.x + (this.d.w as number) / 2, y: this.d.y + 4 });
      this.planks.forEach((p, i) => { this.S.tweens.killTweensOf(p); p.setPosition(this.d.x + i * 16 + 8, this.d.y + 3).setAlpha(1).setRotation(0); });
    }
  }
  update(_dt: number, t: number) {
    if (!this.down && this.S.flags[this.d.flag as string]) {
      this.down = true; sfx.snap(); sfx.creak();
      MJ.Body.setPosition(this.body, { x: -99999, y: -99999 });
      this.planks.forEach((p, i) => this.S.tweens.add({ targets: p, y: p.y + 500 + i * 6, x: p.x + (i - this.planks.length / 2) * 3, rotation: (Math.random() - 0.5) * 4, alpha: 0, duration: 1100 + i * 30, delay: i * 25, ease: 'Quad.in' }));
    }
    this.draw(t);
  }
}
register('bridge', Bridge);

/** leaf litter laid over a pit: it looks like ground and holds until something steps on it. A few snapped twigs
 *  give it away. d: { w, twigs?: true (the tell; default true) } — put stakes or a pit under it */
class Cover extends Ent {
  body: MBody; g: Phaser.GameObjects.Graphics; broken = false; stepT = 0;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const w = d.w as number;
    this.body = S.matter.add.rectangle(d.x + w / 2, d.y + 3, w, 6, { isStatic: true, label: 'ground', collisionFilter: { category: CAT.GROUND, mask: 0xffff } }) as MBody;
    this.g = S.add.graphics().setDepth(10.7);
    this.draw();
    this.range = 0;
  }
  draw() {
    const g = this.g, d = this.d, w = d.w as number;
    g.clear(); if (this.broken) return;
    const rnd = new Phaser.Math.RandomDataGenerator([this.id]);
    g.fillStyle(0x07080a);
    g.fillRect(d.x - 2, d.y - 1, w + 4, 5);
    for (let i = 0; i < w / 3; i++) g.fillEllipse(d.x + rnd.between(0, w), d.y - rnd.between(0, 3), rnd.between(4, 9), rnd.between(2, 4));
    for (let x = 2; x < w; x += rnd.between(2, 5)) { const h = rnd.between(2, 7); g.fillTriangle(d.x + x - 0.6, d.y, d.x + x + 0.6, d.y, d.x + x + rnd.between(-2, 2), d.y - h); }
    if (d.twigs !== false) { // the tell: pale snapped twigs laid crosswise
      g.lineStyle(1.2, 0x8a8a80, 0.55);
      for (let i = 0; i < 4; i++) { const x = d.x + w * (0.2 + i * 0.2); g.lineBetween(x - 7, d.y - 3, x + 7, d.y - 1 - (i % 2) * 3); }
    }
  }
  collapse() {
    if (this.broken) return;
    this.broken = true; sfx.snap(); sfx.crack();
    MJ.Body.setPosition(this.body, { x: -99999, y: -99999 });
    this.S.dustAt(this.d.x + (this.d.w as number) / 2, this.d.y, 10);
    this.draw();
  }
  reset(cp: number) {
    if (cp < ((this.d.before as number) ?? 99)) { this.broken = false; this.stepT = 0; MJ.Body.setPosition(this.body, { x: this.d.x + (this.d.w as number) / 2, y: this.d.y + 3 }); this.draw(); }
  }
  update(dt: number) {
    if (this.broken) return;
    const d = this.d, w = d.w as number, P = this.S.P;
    let on = P.x > d.x && P.x < d.x + w && Math.abs(P.feetY - d.y) < 4 && P.grounded;
    for (const c of this.S.creatures) if (c.alive && c.x > d.x + 6 && c.x < d.x + w - 6 && Math.abs(c.y - d.y) < 6) { on = true; }
    for (const p of this.S.props) if (p.alive && p.body.position.x > d.x && p.body.position.x < d.x + w && Math.abs(p.body.bounds.max.y - d.y) < 4) on = true;
    if (on) { this.stepT += dt; if (this.stepT > 0.12) this.collapse(); }
  }
}
register('cover', Cover);
