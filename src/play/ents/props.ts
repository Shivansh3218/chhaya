import Phaser from 'phaser';
import { sfx } from '../../audio';
import type { PlayScene } from '../PlayScene';
import type { EntDef } from '../types';
import { CAT, Ent, MJ, register, type MBody, type Prop } from './base';

// Rigid bodies she can push, pull, climb on, float and drop: crates, carts, logs, barrels, boulders.

abstract class Body extends Ent implements Prop {
  body!: MBody;
  push = 92; pull = 78; grabbable = true; heavy = true; alive = true;
  img!: Phaser.GameObjects.Image;
  home = { x: 0, y: 0, a: 0 };
  lastV = 0;
  constructor(S: PlayScene, d: EntDef) { super(S, d); this.range = 0; }
  ropeG?: Phaser.GameObjects.Graphics;
  hanging = false;
  protected init(body: MBody) {
    this.body = body;
    this.home = { x: body.position.x, y: body.position.y, a: body.angle };
    this.S.props.push(this);
    (body as MBody & { plugin: Record<string, unknown> }).plugin = { ent: this };
    if (this.d.hang) { this.hanging = true; MJ.Body.setStatic(body, true); this.ropeG = this.S.add.graphics().setDepth(10.9); }
  }
  /** hung on ropes until d.hang (a flag) is set */
  hangUpdate() {
    if (!this.hanging) return;
    const b = this.body;
    const g = this.ropeG!; g.clear(); g.lineStyle(2, 0x07080a);
    const top = (this.d.ropeTop as number) ?? b.position.y - 300;
    const w = (b.bounds.max.x - b.bounds.min.x) * 0.35;
    g.lineBetween(b.position.x - w, b.bounds.min.y, b.position.x - w * 0.3, top); g.lineBetween(b.position.x + w, b.bounds.min.y, b.position.x + w * 0.3, top);
    if (this.S.flags[this.d.hang as string]) { this.hanging = false; g.clear(); MJ.Body.setStatic(b, false); sfx.snap(); }
  }
  reset(cp: number) {
    const before = (this.d.before as number) ?? 99;
    if (cp < before) {
      this.alive = true;
      if (this.d.hang) { this.hanging = true; MJ.Body.setStatic(this.body, false); }
      MJ.Body.setStatic(this.body, false);
      MJ.Body.setPosition(this.body, { x: this.home.x, y: this.home.y });
      MJ.Body.setAngle(this.body, this.home.a);
      MJ.Body.setVelocity(this.body, { x: 0, y: 0 });
      MJ.Body.setAngularVelocity(this.body, 0);
      this.img.setVisible(true).setAlpha(1);
      if (this.d.hang) MJ.Body.setStatic(this.body, true);
    } else if (this.d.solved) {
      const s = this.d.solved as { x: number; y: number; a?: number };
      MJ.Body.setPosition(this.body, { x: s.x, y: s.y });
      MJ.Body.setAngle(this.body, s.a ?? 0);
      MJ.Body.setVelocity(this.body, { x: 0, y: 0 });
    }
  }
  update() {
    this.hangUpdate();
    const b = this.body;
    this.img.setPosition(b.position.x, b.position.y).setRotation(b.angle);
    this.x = b.position.x; this.y = b.position.y;
    const v = MJ.Body.getVelocity(b);
    // a thud when it lands
    if (this.lastV > 5 && v.y < 1 && Math.abs(v.y - this.lastV) > 4) { sfx.thud(); this.S.dustAt(b.position.x, b.bounds.max.y - 2, 6); this.S.shake(0.0025); }
    this.lastV = v.y;
    if (b.position.y > this.S.L.killY + 200 && this.alive) { this.alive = false; MJ.Body.setStatic(b, true); this.img.setVisible(false); }
  }
}

/** a wooden crate. d: { w?, h?, light?: true (floats high, pushes fast), heavy?: false } */
export class Crate extends Body {
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const w = (d.w as number) ?? 52, h = (d.h as number) ?? w;
    const body = S.matter.add.rectangle(d.x, d.y - h / 2, w, h, {
      chamfer: { radius: 3 }, friction: 0.5, frictionStatic: 0.6, frictionAir: 0.01, density: d.light ? 0.0012 : 0.003, label: 'prop',
      collisionFilter: { category: CAT.PROP, mask: CAT.GROUND | CAT.PLAYER | CAT.PROP | CAT.STONE | CAT.PLAT },
    }) as MBody;
    MJ.Body.setInertia(body, body.inertia * 6);
    this.img = S.add.image(0, 0, (d.key as string) ?? 'crate').setDisplaySize(w + 2, h + 2).setDepth(11);
    if (d.light) this.push = 120;
    if (d.fixed) { this.push = 0; this.pull = 0; }
    this.heavy = d.heavy !== false;
    this.init(body);
  }
}
register('crate', Crate);

/** a bale of hay: light, soft, and it burns. d: { w?, h? } */
export class Hay extends Body {
  burning = 0; fx?: Phaser.GameObjects.Particles.ParticleEmitter;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const w = (d.w as number) ?? 66, h = (d.h as number) ?? 54;
    const body = S.matter.add.rectangle(d.x, d.y - h / 2, w, h, {
      chamfer: { radius: 8 }, friction: 0.8, frictionStatic: 0.9, frictionAir: 0.02, density: 0.0016, label: 'prop',
      collisionFilter: { category: CAT.PROP, mask: CAT.GROUND | CAT.PLAYER | CAT.PROP | CAT.STONE | CAT.PLAT },
    }) as MBody;
    MJ.Body.setInertia(body, body.inertia * 8);
    this.img = S.add.image(0, 0, 'hay').setDisplaySize(w + 6, h + 6).setDepth(11);
    this.push = d.fixed ? 0 : 80; this.pull = d.fixed ? 0 : 78; this.heavy = true;
    this.init(body);
  }
}
register('hay', Hay);

/** a hand cart on two wheels: rolls freely */
export class Cart extends Body {
  wheels: Phaser.GameObjects.Image[] = [];
  wheelA = 0;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const body = S.matter.add.rectangle(d.x, d.y - 26, 78, 50, {
      chamfer: { radius: 4 }, friction: 0.02, frictionStatic: 0.05, frictionAir: 0.01, density: 0.004, label: 'prop',
      collisionFilter: { category: CAT.PROP, mask: CAT.GROUND | CAT.PLAYER | CAT.PROP | CAT.PLAT },
    }) as MBody;
    this.img = S.add.image(0, 0, 'cart_body').setDisplaySize(80, 40).setDepth(11);
    for (let i = 0; i < 2; i++) this.wheels.push(S.add.image(0, 0, 'cart_wheel').setDisplaySize(30, 30).setDepth(11.2));
    this.init(body);
  }
  update() {
    super.update();
    const c = this.body;
    this.img.setPosition(c.position.x, c.position.y - 6);
    const v = MJ.Body.getVelocity(c);
    this.wheelA += (v.x * 60 * this.S.dt) / 13;
    const cos = Math.cos(c.angle), sin = Math.sin(c.angle);
    [-22, 22].forEach((ox, i) => this.wheels[i].setPosition(c.position.x + ox * cos - 14 * sin, c.position.y + ox * sin + 14 * cos).setRotation(this.wheelA).setVisible(this.img.visible));
    if (Math.abs(v.x) > 0.4 && Math.random() < this.S.dt * 5) sfx.creakSoft();
  }
}
register('cart', Cart);

/** a fallen log: long and heavy; push it to bridge a gap or let it float. d: { w?: length } */
export class Log extends Body {
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const w = (d.w as number) ?? 200, h = (d.h as number) ?? 26;
    const body = S.matter.add.rectangle(d.x, d.y - h / 2, w, h, {
      chamfer: { radius: h / 2 - 1 }, friction: 0.7, frictionStatic: 0.9, frictionAir: 0.01, density: 0.0018, label: 'prop',
      collisionFilter: { category: CAT.PROP, mask: CAT.GROUND | CAT.PLAYER | CAT.PROP | CAT.STONE | CAT.PLAT },
    }) as MBody;
    MJ.Body.setInertia(body, body.inertia * 3);
    this.img = S.add.image(0, 0, 'log').setDisplaySize(w * 1.06, h * 2.2).setDepth(11);
    this.push = d.fixed ? 0 : 70; this.pull = d.fixed ? 0 : 60;
    this.init(body);
  }
  update() { super.update(); this.img.setPosition(this.body.position.x, this.body.position.y - 4 * Math.cos(this.body.angle)); }
}
register('log', Log);

/** a round boulder or millstone that rolls. d: { r, key?: 'millstone' | 'boulder' } */
export class Boulder extends Body {
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const r = (d.r as number) ?? 30;
    const body = S.matter.add.circle(d.x, d.y - r, r, {
      friction: 0.9, frictionStatic: 1, frictionAir: 0.004, density: 0.004, restitution: 0.1, label: 'prop',
      collisionFilter: { category: CAT.PROP, mask: CAT.GROUND | CAT.PLAYER | CAT.PROP | CAT.STONE | CAT.PLAT },
    }) as MBody;
    this.img = S.add.image(0, 0, (d.key as string) ?? 'millstone').setDisplaySize(r * 2.05, r * 2.05).setDepth(11);
    this.push = 60; this.pull = 0; this.grabbable = false;
    this.init(body);
  }
}
register('boulder', Boulder);
