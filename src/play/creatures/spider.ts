import Phaser from 'phaser';
import { sfx } from '../../audio';
import type { PlayScene } from '../PlayScene';
import type { EntDef } from '../types';
import { circHit, register } from '../ents/base';
import { Bone, RES, Stepper, capsule, clamp, ik, lerp, smooth, tex } from '../kit';
import { Creature } from './base';

// Makdi, the great hollow spider: a heavy body slung between eight long legs. Each leg keeps its foot planted
// and steps (an arc) when its rest spot moves too far ahead; the legs step in two alternating groups, so the
// body is always held up. It rears up (the tell) before it stabs down with a foreleg, and the stabbing leg sticks
// in the earth for a moment (the window). Lamplight and fire stop it; fire drives it back up its thread.

const LEGS = [
  // root offset along the body (forward +), rest foot offset, femur, tibia, near (1) / far (0)
  { r: 12, f: 118, a: 84, b: 96, near: 1 }, { r: 12, f: 134, a: 84, b: 96, near: 0 },
  { r: 5, f: 58, a: 74, b: 84, near: 1 }, { r: 5, f: 74, a: 74, b: 84, near: 0 },
  { r: -3, f: -26, a: 72, b: 80, near: 1 }, { r: -3, f: -12, a: 72, b: 80, near: 0 },
  { r: -9, f: -92, a: 80, b: 92, near: 1 }, { r: -9, f: -78, a: 80, b: 92, near: 0 },
];
const GROUP = [0, 1, 1, 0, 0, 1, 1, 0];
const BODY_H = 74;

export class Spider extends Creature {
  feet: Stepper[] = [];
  bones: { fem: Bone; tib: Bone; tar: Bone }[] = [];
  ceph: Phaser.GameObjects.Image; abd: Phaser.GameObjects.Image; eyes: Phaser.GameObjects.Image;
  thread: Phaser.GameObjects.Graphics;
  vx = 0; by = 0; bodyY = 0; rearK = 0; stabK = 0; stabX = 0; stabY = 0; stuck = 0; hangK = 0; anchorY = 0;
  lastHiss = 0; bob = 0; waitT = 0;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const fem = capsule(S, 'sp_fem', 80, 6.5, 4.8), tib = capsule(S, 'sp_tib', 90, 4.6, 2.2), tar = capsule(S, 'sp_tar', 16, 2.2, 1.2);
    tex(S, 'sp_ceph', 40, 28, (c) => {
      c.beginPath(); c.ellipse(20, 15, 18, 11.5, 0, 0, Math.PI * 2); c.fill();
      // bristles along the back
      for (let i = 0; i < 14; i++) { const a = Math.PI + (i / 13) * Math.PI; const x = 20 + Math.cos(a) * 17, y = 15 + Math.sin(a) * 11; c.beginPath(); c.moveTo(x - 1, y); c.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); c.lineTo(x + 1, y); c.fill(); }
      // fangs (chelicerae) at the front
      c.beginPath(); c.moveTo(34, 18); c.quadraticCurveTo(41, 22, 37, 28); c.quadraticCurveTo(36, 22, 32, 21); c.fill();
    });
    tex(S, 'sp_abd', 66, 54, (c) => {
      c.beginPath(); c.ellipse(32, 28, 30, 24, -0.15, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 26; i++) { const a = Math.PI * 0.9 + (i / 25) * Math.PI * 1.2; const x = 32 + Math.cos(a) * 29, y = 28 + Math.sin(a) * 23; c.beginPath(); c.moveTo(x - 1.2, y); c.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); c.lineTo(x + 1.2, y); c.fill(); }
      // a faint pale chevron down the back: our spider's mark
      c.strokeStyle = 'rgba(140,146,150,0.28)'; c.lineWidth = 1.4;
      for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(14 + k * 9, 14 + k * 1.5); c.lineTo(19 + k * 9, 22); c.lineTo(14 + k * 9, 30 - k * 1.5); c.stroke(); }
    });
    tex(S, 'sp_eyes', 10, 6, (c) => { c.fillStyle = '#ffffff'; for (const [x, y, r] of [[2, 3, 1.2], [5, 2, 1.4], [8, 3, 1.1], [4, 5, 0.8], [7, 5, 0.8]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); } }, '#ffffff');
    this.thread = S.add.graphics().setDepth(11.4);
    const depth = 11.5;
    for (let i = 0; i < 8; i++) {
      const L = LEGS[i], dd = L.near ? depth + 0.02 : depth - 0.02;
      const b = { fem: new Bone(S, fem, dd), tib: new Bone(S, tib, dd), tar: new Bone(S, tar, dd) };
      if (!L.near) for (const k of [b.fem, b.tib, b.tar]) k.img.setTint(0x262a2e);
      this.bones.push(b);
      this.feet.push(new Stepper(0, 0, 0.16, 18));
    }
    this.abd = S.add.image(0, 0, 'sp_abd').setScale(1 / RES).setDepth(depth);
    this.ceph = S.add.image(0, 0, 'sp_ceph').setScale(1 / RES).setDepth(depth + 0.01);
    this.eyes = S.add.image(0, 0, 'sp_eyes').setScale(1 / RES * 1.2).setDepth(depth + 0.015).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6);
    this.reset(S.cp);
  }

  all() { return [this.abd, this.ceph, this.eyes, ...this.bones.flatMap((b) => [b.fem.img, b.tib.img, b.tar.img])]; }
  show(v: boolean) { for (const o of this.all()) o.setVisible(v); this.thread.setVisible(v); }

  reset(cp: number) {
    const d = this.d;
    if (cp >= ((d.before as number) ?? 99) || (d.gone && this.S.flags[d.gone as string])) { this.set('gone'); this.show(false); return; }
    const mode = (d.mode as string) ?? 'hunt';
    this.resetTo(d.x, d.y, mode === 'drop' ? 'above' : mode === 'lurk' ? 'lurk' : 'guard');
    this.anchorY = (d.ceil as number) ?? d.y - 500;
    this.hangK = mode === 'drop' ? 1 : 0;
    this.bodyY = mode === 'drop' ? this.anchorY : d.y - BODY_H;
    this.vx = 0; this.rearK = 0; this.stabK = 0; this.stuck = 0; this.waitT = 0;
    this.show(mode !== 'drop');
    this.placeFeet();
    if (d.flag) this.S.flags[d.flag as string] = false;
  }

  placeFeet() {
    const f = this.facing;
    this.feet.forEach((ft, i) => { const x = this.x + f * LEGS[i].f; ft.place(x, this.ground(x, this.y - 80)); });
  }

  hiss() { if (this.S.t - this.lastHiss > 1200) { sfx.whisper(); sfx.scrape(); this.lastHiss = this.S.t; } }

  update(dt: number, t: number) {
    const d = this.d, P = this.S.P;
    this.tick(dt);
    if (this.state === 'gone') return;
    const dxP = this.dxP(), dist = Math.abs(dxP);
    let want = 0, rear = 0;
    const lit = (x: number) => this.litAt(x, this.y - 40, 0.2);
    switch (this.state) {
      case 'above':
        if (P.x > (d.trigger as number)) { this.set('descend'); this.show(true); sfx.creak(); this.x = (d.dropX as number) ?? this.x; }
        return;
      case 'descend': {
        // down its thread, legs drawn in, turning slowly
        this.bodyY = Math.min(this.y - BODY_H, this.bodyY + 240 * dt);
        this.hangK = 1 - smooth((this.bodyY - (this.y - BODY_H - 120)) / 120);
        if (this.bodyY >= this.y - BODY_H) { this.hangK = 0; this.set('guard'); this.placeFeet(); sfx.thud(); this.S.shake(0.004); this.S.dustAt(this.x, this.y, 10); }
        break;
      }
      case 'lurk': // waits in the dark until she comes near
        if (dist < ((d.wake as number) ?? 320)) { this.set('guard'); this.hiss(); }
        break;
      case 'guard': {
        const minX = (d.minX as number) ?? -1e9, maxX = (d.maxX as number) ?? 1e9;
        this.facing = Math.sign(dxP) || this.facing;
        if (dist > 130) want = this.facing * ((d.speed as number) ?? 95);
        if (this.x + want * dt < minX || this.x + want * dt > maxX) want = 0;
        const blocked = lit(this.x + this.facing * 120) || lit(P.x) || this.y - P.feetY > 100;
        if (blocked) { want = 0; this.hiss(); this.waitT += dt; } else this.waitT = Math.max(0, this.waitT - dt);
        // kept at bay by the light long enough, it gives up and climbs away
        if (d.patience !== undefined && this.waitT > (d.patience as number)) { this.set('retreat'); this.anchorY = (d.ceil as number) ?? this.y - 500; if (d.flag) this.S.flags[d.flag as string] = true; break; }
        if (dist < 150 && Math.abs(P.feetY - this.y) < 80 && !lit(P.x)) { this.set('rear'); this.hiss(); }
        break;
      }
      case 'backoff': {
        // stung by fire: it scuttles back, then comes on again
        this.facing = Math.sign(dxP) || this.facing;
        want = -this.facing * 160;
        if (this.stT > 1.8) this.set('guard');
        break;
      }
      case 'rear': {
        // the tell: forelegs lifted high, the body tilts back
        rear = smooth(this.stT / 0.4);
        this.facing = Math.sign(dxP) || this.facing;
        if (this.stT > 0.75) { this.set('stab'); this.stabX = P.x + P.vx * 0.12; this.stabY = this.ground(this.stabX, P.feetY - 60); sfx.crack(); }
        if (lit(P.x)) this.set('guard');
        break;
      }
      case 'stab': {
        rear = 1 - smooth(this.stT / 0.12);
        this.stabK = smooth(this.stT / 0.1);
        if (this.stT > 0.1 && this.stuck === 0) { this.stuck = 0.01; sfx.thud(); this.S.shake(0.004); this.S.dustAt(this.stabX, this.stabY, 6); }
        if (this.stT > 0.75) { this.set('recover'); this.stuck = 0; }
        break;
      }
      case 'recover':
        this.stabK = Math.max(0, 1 - this.stT * 3);
        if (this.stT > 0.5) this.set('guard');
        break;
      case 'retreat': {
        // back up its thread, legs gathering in
        this.hangK = Math.min(1, this.hangK + dt * 2.5);
        this.bodyY -= 200 * dt * this.hangK;
        if (this.bodyY < this.anchorY) { this.set('gone'); this.show(false); }
        break;
      }
      case 'flee': {
        this.facing = Math.sign(this.x - this.fearX) || 1;
        want = this.facing * 180;
        if (this.stT > 3.5) { this.set('gone'); this.show(false); }
        break;
      }
    }
    if (this.fear > 0.6 && ['guard', 'rear', 'stab', 'recover', 'lurk'].includes(this.state)) {
      const onFire = Math.abs(this.fearX - this.x) < 90;
      if (d.fleeBy === 'backoff' && !onFire) { this.set('backoff'); sfx.whisper(); }
      else { this.set(d.fleeBy === 'walk' ? 'flee' : 'retreat'); sfx.whisper(); this.anchorY = (d.ceil as number) ?? this.y - 500; if (d.flag) this.S.flags[d.flag as string] = true; }
    }
    // body motion
    this.vx += clamp(want - this.vx, -400 * dt, 400 * dt);
    if (this.state === 'guard' || this.state === 'flee' || this.state === 'backoff') {
      const nx = this.x + this.vx * dt;
      const gy = this.ground(nx, this.y - 60);
      if (Math.abs(gy - this.y) < 60) { this.x = nx; this.y = gy; } else this.vx = 0;
    }
    const standing = this.state !== 'descend' && this.state !== 'retreat' && this.state !== 'above' && this.state !== 'gone';
    this.rearK += (rear - this.rearK) * Math.min(1, dt * 14);
    this.bob += dt * (1 + Math.abs(this.vx) / 60);
    if (standing) this.bodyY = lerp(this.bodyY, this.y - BODY_H - this.rearK * 20 + Math.sin(this.bob * 5) * 1.5, Math.min(1, dt * 8));
    this.pose(dt, standing);
    // the stab is deadly at the tip; walking into its legs or body is too
    if (!this.S.dead && this.state === 'stab' && this.stT > 0.04 && circHit(this.stabX, this.stabY - 8, 14, P.bounds)) this.S.die('stabbed');
    if (!this.S.dead && standing && circHit(this.x, this.bodyY, 34, P.bounds)) this.S.die('stabbed');
    if (this.state === 'guard' && Math.random() < dt * 0.4 && dist < 500) this.hiss();
    void t;
  }

  pose(dt: number, standing: boolean) {
    const f = this.facing;
    const bx = this.x, by = this.bodyY;
    const tilt = -this.rearK * 0.35 * f + clamp(this.vx / 900, -0.08, 0.08);
    this.ceph.setPosition(bx + f * 14, by).setRotation(tilt).setFlipX(f < 0);
    this.abd.setPosition(bx - f * 30, by - 10 - this.rearK * 6).setRotation(tilt * 0.6 + Math.sin(this.bob * 3) * 0.02).setFlipX(f < 0);
    this.eyes.setPosition(bx + f * 28, by - 6);
    const thr = this.thread; thr.clear();
    if (!standing || this.hangK > 0) { thr.lineStyle(1, 0xc0c6cc, 0.4); thr.lineBetween(bx - f * 30, this.anchorY - 600, bx - f * 30, by - 22); }
    // which group may step: the group whose feet are furthest from home, if the other group is planted
    const need = this.feet.map((ft, i) => Math.abs(ft.foot.x - (bx + f * LEGS[i].f)));
    const groupPlanted = [0, 1].map((g) => this.feet.every((ft, i) => GROUP[i] !== g || ft.planted));
    const gScore = [0, 1].map((g) => Math.max(...need.filter((_, i) => GROUP[i] === g)));
    const stepG = gScore[0] >= gScore[1] ? 0 : 1;
    for (let i = 0; i < 8; i++) {
      const L = LEGS[i], ft = this.feet[i];
      const root = { x: bx + f * L.r * (L.near ? 1 : 0.9), y: by + 4 };
      let target: { x: number; y: number };
      if (!standing || this.hangK > 0.01) {
        // legs gathered around the body
        const k = this.hangK;
        const gx = bx + f * L.f * 0.35, gy = by + 26 + (i % 2) * 6;
        if (!standing) ft.place(gx, gy);
        target = { x: lerp(ft.foot.x, gx, k), y: lerp(ft.foot.y, gy, k) };
      } else {
        const home = bx + f * L.f + this.vx * 0.22;
        if (ft.planted && Math.abs(ft.foot.x - home) > 34 && (groupPlanted[1 - GROUP[i]] && GROUP[i] === stepG || Math.abs(ft.foot.x - home) > 80)) {
          ft.stepTo(home + Math.sign(this.vx || f) * 10, this.ground(home, this.y - 90), 0.15, 16);
          if (Math.random() < 0.3) sfx.pebbleHit();
        }
        ft.update(dt);
        target = { ...ft.foot };
        // forelegs: lifted when rearing, one stabs
        if (i < 2 && this.rearK > 0.01) target = { x: lerp(target.x, bx + f * (L.f * 0.55), this.rearK), y: lerp(target.y, by - 60 - (i ? 10 : 0), this.rearK) };
        if (i === 0 && (this.state === 'stab' || this.state === 'recover')) target = { x: lerp(target.x, this.stabX, this.stabK), y: lerp(target.y, this.stabY, this.stabK) };
      }
      // the knee rides high above the body: pick the bend that puts it up
      const A = ik(root.x, root.y, target.x, target.y - 10, L.a, L.b, 1), B = ik(root.x, root.y, target.x, target.y - 10, L.a, L.b, -1);
      const r = A.jy < B.jy ? A : B;
      const b = this.bones[i];
      b.fem.set(root.x, root.y, r.jx, r.jy, true); b.tib.set(r.jx, r.jy, r.ex, r.ey, true); b.tar.set(r.ex, r.ey, target.x + f * 2, target.y);
    }
  }
}
register('spider', Spider);
