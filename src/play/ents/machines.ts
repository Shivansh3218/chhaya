import Phaser from 'phaser';
import { sfx } from '../../audio';
import type { PlayScene } from '../PlayScene';
import type { EntDef } from '../types';
import { CAT, Ent, MJ, circHit, rectHit, register, type MBody, type Light } from './base';

// Set-piece machinery: a rolling stone set loose, trains, temple bells, lightning.

/** sets a prop rolling when she passes x: d: { target, at, vx, vy? } (the prop crushes her while it moves fast) */
class Roll extends Ent {
  fired = false;
  update() {
    const d = this.d;
    const t = this.S.ent<{ body: MBody } & Ent>(d.target as string);
    if (!this.fired && this.S.P.x > (d.at as number) && t) {
      this.fired = true; sfx.rumble(); sfx.crack(); this.S.shake(0.005);
      MJ.Body.setVelocity(t.body, { x: (d.vx as number) / 60, y: ((d.vy as number) ?? 0) / 60 });
      if (d.spin) MJ.Body.setAngularVelocity(t.body, d.spin as number);
    }
    if (this.fired && t && !this.S.dead) {
      const v = MJ.Body.getVelocity(t.body), sp = Math.hypot(v.x, v.y);
      // keep it rolling (it is heavy and the slope is long)
      if (d.keep && sp < Math.abs(d.vx as number) / 60) MJ.Body.setVelocity(t.body, { x: (d.vx as number) / 60, y: v.y });
      const r = (t.body.bounds.max.x - t.body.bounds.min.x) / 2;
      if (sp > 1.6 && circHit(t.body.position.x, t.body.position.y, r - 2, this.S.P.bounds)) this.S.die('crushed');
      if (Math.random() < 0.05 && sp > 1) sfx.roll();
    }
  }
  reset(cp: number) { if (cp < ((this.d.before as number) ?? 99)) this.fired = false; }
}
register('roll', Roll);

/** a train: a long line of dark wagons that runs along y (the rail top) from `from` to `to`, again every `period` ms.
 *  The whistle and the shaking track come first. You can ride on its roof. d: { from, to, speed, period, offset?, cars, flag?: only runs while set / stopped while set (stopFlag) } */
class Train extends Ent {
  body: MBody; g: Phaser.GameObjects.Graphics; len: number; pos: number; prev = 0; whistled = false; lamp: Phaser.GameObjects.Image;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    this.len = ((d.cars as number) ?? 4) * 130;
    this.pos = -1e6;
    this.body = S.matter.add.rectangle(-99999, 0, this.len, 70, { isStatic: true, label: 'plat', collisionFilter: { category: CAT.PLAT, mask: 0xffff } }) as MBody;
    (this.body as MBody & { plugin: Record<string, unknown> }).plugin = { dx: 0, dy: 0 };
    this.g = S.add.graphics().setDepth(11.3);
    this.lamp = S.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(11.4).setScale(1.4).setVisible(false);
    this.range = 0;
  }
  head(t: number) {
    const d = this.d, from = d.from as number, to = d.to as number, sp = d.speed as number;
    if (d.stopFlag && this.S.flags[d.stopFlag as string]) return null;
    const period = d.period as number, ph = ((t + ((d.offset as number) ?? 0)) % period) / 1000;
    const x = from + Math.sign(to - from) * ph * sp;
    const dist = Math.abs(to - from) + this.len;
    if (ph * sp > dist) return null;
    return x;
  }
  lights(out: Light[]) { if (this.pos > -1e5) out.push({ x: this.pos, y: (this.d.y as number) - 50, r: 260, k: 0.9, warm: true }); }
  update(_dt: number, t: number) {
    const d = this.d, y = d.y as number, dir = Math.sign((d.to as number) - (d.from as number));
    const hx = this.head(t);
    const g = this.g; g.clear();
    // the warning: the whistle a couple of seconds before it comes
    const period = d.period as number, ph = ((t + ((d.offset as number) ?? 0)) % period);
    if (ph > period - 2200 && !this.whistled && Math.abs(this.S.P.x - (d.from as number)) < 2600) { this.whistled = true; sfx.creak(); sfx.shout(); }
    if (ph < period - 2200) this.whistled = false;
    if (ph > period - 1600 && Math.abs(this.S.P.feetY - y) < 40) this.S.shake(0.0008);
    if (hx === null) { MJ.Body.setPosition(this.body, { x: -99999, y: 0 }); this.pos = -1e6; this.lamp.setVisible(false); return; }
    this.pos = hx;
    // only seen (and deadly) between clip0 and clip1: it comes out of a tunnel mouth / cutting wall
    const c0 = (d.clip0 as number) ?? -1e9, c1 = (d.clip1 as number) ?? 1e9;
    const tail = hx - dir * this.len;
    const vis0 = Math.max(c0, Math.min(hx, tail)), vis1 = Math.min(c1, Math.max(hx, tail));
    if (vis1 <= vis0) { MJ.Body.setPosition(this.body, { x: -99999, y: 0 }); this.lamp.setVisible(false); return; }
    const cx = hx - dir * this.len / 2, cy = y - 46;
    const before = this.body.position.x;
    MJ.Body.setPosition(this.body, { x: cx, y: cy });
    const pl = (this.body as MBody & { plugin: { dx: number; dy: number } }).plugin;
    pl.dx = before > -90000 ? cx - before : 0; pl.dy = 0;
    // draw: engine + wagons, wheels
    const x0 = Math.min(hx, hx - dir * this.len);
    g.fillStyle(0x07080a);
    for (let i = 0; i < this.len / 130; i++) {
      const wx = x0 + i * 130;
      if (wx + 130 < vis0 || wx > vis1) continue;
      g.fillRect(wx + 4, y - 82, 122, 66);
      g.fillRect(wx, y - 20, 130, 6);
      for (const k of [22, 104]) { g.fillCircle(wx + k, y - 8, 9); }
    }
    const ex = dir > 0 ? x0 + this.len : x0;
    const headIn = hx >= c0 && hx <= c1;
    if (headIn) g.fillRect(ex - (dir > 0 ? 30 : 0), y - 100, 30, 30); // the chimney end
    this.lamp.setVisible(headIn).setPosition(hx + dir * 4, y - 60);
    if (Math.random() < 0.3) this.S.smoke.emitParticleAt(ex - dir * 10, y - 104);
    if (Math.abs(hx - this.S.P.x) < 900 && Math.random() < 0.06) sfx.rumble();
    // struck by it
    if (!this.S.dead && rectHit({ x: vis0, y: y - 82, w: vis1 - vis0, h: 80 }, this.S.P.bounds) && this.S.P.standingOn !== this.body && this.S.P.feetY > y - 78) this.S.die('crushed');
  }
}
register('train', Train);

/** a hanging temple bell: touch it (or the diya key) to ring it; sets a flag. d: { flag, once? } */
class Bell extends Ent {
  img: Phaser.GameObjects.Image; swing = 0; rung = false;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    S.add.graphics().setDepth(10.8).lineStyle(1.5, 0x07080a).lineBetween(d.x, d.y - 600, d.x, d.y - 34);
    this.img = S.add.image(d.x, d.y - 34, 'bell').setOrigin(0.5, 0).setDisplaySize(28, 30).setDepth(10.9);
  }
  actSpot() { return { x: this.x, y: this.y - 20, r: 40, label: 'ring' }; }
  act() { this.ring(); return true; }
  ring() { this.swing = 1; sfx.bell(520 + (this.x % 7) * 30, 1); this.rung = true; if (this.d.flag) this.S.flags[this.d.flag as string] = true; }
  reset(cp: number) { if (cp < ((this.d.before as number) ?? 99)) { this.rung = false; } }
  update(dt: number, t: number) {
    const P = this.S.P;
    if (rectHit({ x: this.x - 14, y: this.y - 34, w: 28, h: 30 }, P.bounds) && this.swing < 0.3) this.ring();
    this.swing *= Math.exp(-dt * 0.8);
    this.img.setRotation(Math.sin(t * 0.008) * 0.4 * this.swing);
  }
}
register('bell', Bell);

/** lightning over a stretch: the world goes white for an instant, then the thunder. d: { w, every: ms, dark?: k (pitch dark between flashes) } */
class Lightning extends Ent {
  flash: Phaser.GameObjects.Rectangle; next = 0; k = 0;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    this.flash = S.add.rectangle(0, 0, 1280, 720, 0xdfe6ee, 0).setOrigin(0).setScrollFactor(0).setDepth(19.5).setBlendMode(Phaser.BlendModes.ADD);
    if (d.dark) S.darkZones.push({ x: d.x, w: d.w as number, k: d.dark as number });
    this.range = 0;
  }
  update(dt: number, t: number) {
    const d = this.d, P = this.S.P;
    const inside = P.x > d.x - 200 && P.x < d.x + (d.w as number) + 200;
    if (inside && t > this.next) { this.k = 1; this.next = t + ((d.every as number) ?? 3000) * (0.8 + ((t * 13) % 7) / 17); this.S.time.delayedCall(500, () => sfx.rumble()); }
    this.k = Math.max(0, this.k - dt * 2.4);
    this.flash.setAlpha(this.k * 0.5 * (Math.sin(t * 0.09) > -0.3 ? 1 : 0.4));
    this.S.flashK = Math.max(this.S.flashK, this.k);
  }
}
register('lightning', Lightning);
