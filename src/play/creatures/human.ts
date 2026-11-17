import Phaser from 'phaser';
import { sfx } from '../../audio';
import type { PlayScene } from '../PlayScene';
import type { EntDef } from '../types';
import { MJ, register, type Light } from '../ents/base';
import { Bone, RES, capsule, clamp, ik, lerp, smooth, tex } from '../kit';
import { Creature } from './base';

// Poachers (shikari): grown men drawn as live skeletons like the girl — IK legs on a distance-phased gait, IK arms
// that hold and aim a weapon. Slingshot (a lobbed stone), blowgun (a fast dart) or rifle (a long aim, then a shot).
// Each one: sees her (light, nearness, line of sight) → raises the weapon and aims (a visible line that tracks her
// with a lag: the tell) → fires → reloads (the window). Cover blocks the shot. Up close, they run.

type Weapon = 'sling' | 'blowgun' | 'rifle';
const D = { thigh: 21, shin: 21, uarm: 15, farm: 14, torso: 27, hipY: -41 };

export class ManRig {
  b: Record<string, Bone> = {};
  head: Phaser.GameObjects.Image; torso: Phaser.GameObjects.Image; weapon: Phaser.GameObjects.Image; band: Phaser.GameObjects.Graphics;
  phase = 0;
  all: Phaser.GameObjects.GameObject[] = [];
  /** world points after update */
  muzzle = { x: 0, y: 0 }; eye = { x: 0, y: 0 }; handF = { x: 0, y: 0 };
  constructor(scene: Phaser.Scene, depth: number, public weaponKind: Weapon, hat: 'turban' | 'cap' = 'turban') {
    const thigh = capsule(scene, 'm_thigh', D.thigh, 7, 5.2), shin = capsule(scene, 'm_shin', D.shin, 5, 3.6);
    const uarm = capsule(scene, 'm_uarm', D.uarm, 4.6, 3.8), farm = capsule(scene, 'm_farm', D.farm, 3.8, 3);
    const foot = capsule(scene, 'm_foot', 7, 3.4, 2.6);
    tex(scene, 'm_torso', 20, 34, (c) => { // kurta: shoulders to below the hip, flaring a little
      c.beginPath(); c.moveTo(4, 4); c.quadraticCurveTo(10, 0, 16, 4); c.lineTo(18, 24); c.lineTo(19.5, 34); c.lineTo(0.5, 34); c.lineTo(2, 24); c.closePath(); c.fill();
    });
    tex(scene, `m_head_${hat}`, 22, 22, (c) => {
      c.beginPath(); c.arc(10, 12, 6.8, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(15.5, 11); c.lineTo(18.6, 14); c.lineTo(15.5, 15); c.fill(); // nose
      c.beginPath(); c.ellipse(14.5, 16.2, 3.2, 1.3, 0.2, 0, Math.PI * 2); c.fill(); // moustache
      if (hat === 'turban') { c.beginPath(); c.ellipse(9.5, 7.5, 8.5, 5.8, -0.1, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(2, 8); c.quadraticCurveTo(-1, 14, 1.5, 19); c.lineTo(3.5, 12); c.fill(); }
      else { c.beginPath(); c.ellipse(10, 7.5, 7.6, 4, 0, Math.PI, 0); c.fill(); c.fillRect(9, 6, 11, 2); }
    });
    tex(scene, 'w_sling', 12, 14, (c) => { c.lineWidth = 1.6; c.beginPath(); c.moveTo(6, 14); c.lineTo(6, 8); c.lineTo(1.5, 1); c.moveTo(6, 8); c.lineTo(10.5, 1); c.stroke(); });
    tex(scene, 'w_blowgun', 46, 3, (c) => { c.fillRect(0, 0.6, 46, 1.8); c.fillRect(0, 0, 3, 3); });
    tex(scene, 'w_rifle', 50, 9, (c) => {
      c.beginPath(); c.moveTo(0, 3); c.lineTo(14, 2); c.lineTo(16, 4); c.lineTo(50, 3.4); c.lineTo(50, 5); c.lineTo(17, 6.2); c.lineTo(12, 9); c.lineTo(1, 8); c.closePath(); c.fill();
    });
    const mk = (n: string, s: { key: string; ox: number; len: number }, dd: number, far = false) => { const bb = new Bone(scene, s, dd); if (far) bb.img.setTint(0x25282b); this.b[n] = bb; this.all.push(bb.img); };
    mk('thighB', thigh, depth - 0.02, true); mk('shinB', shin, depth - 0.02, true); mk('footB', foot, depth - 0.02, true);
    mk('uarmB', uarm, depth - 0.015, true); mk('farmB', farm, depth - 0.015, true);
    this.torso = scene.add.image(0, 0, 'm_torso').setOrigin(0.5, 0.06).setScale(1 / RES).setDepth(depth);
    mk('thighF', thigh, depth + 0.005); mk('shinF', shin, depth + 0.005); mk('footF', foot, depth + 0.005);
    this.head = scene.add.image(0, 0, `m_head_${hat}`).setScale(1 / RES).setDepth(depth + 0.01).setOrigin(0.45, 0.6);
    this.weapon = scene.add.image(0, 0, `w_${weaponKind}`).setScale(1 / RES).setDepth(depth + 0.015).setOrigin(weaponKind === 'sling' ? 0.5 : 0.04, weaponKind === 'sling' ? 1 : 0.5);
    this.band = scene.add.graphics().setDepth(depth + 0.016);
    mk('uarmF', uarm, depth + 0.02); mk('farmF', farm, depth + 0.02);
    this.all.push(this.torso, this.head, this.weapon, this.band);
  }
  setVisible(v: boolean) { for (const o of this.all) (o as Phaser.GameObjects.Image).setVisible(v); }
  setAlpha(a: number) { for (const o of this.all) (o as Phaser.GameObjects.Image).setAlpha(a); }

  /** aim: radians (0 = straight ahead), draw 0..1 (pull/raise), walk dx, speed, startle */
  update(x: number, gy: number, f: number, o: { dx: number; speed: number; aim: number; raise: number; draw: number; t: number; crouch?: number; fall?: number }) {
    const s01 = clamp(o.speed / 220, 0, 1);
    const A = lerp(6, 15, s01), lift = lerp(3, 9, s01);
    if (o.speed > 3) this.phase += Math.abs(o.dx) / (4 * A);
    const ph = this.phase;
    const fp = (p: number) => { p = ((p % 1) + 1) % 1; if (p < 0.5) return { x: A - (p / 0.5) * 2 * A, y: 0 }; const u = (p - 0.5) / 0.5, e = u * u * (3 - 2 * u); return { x: -A + e * 2 * A, y: -Math.sin(u * Math.PI) * lift }; };
    const w = smooth(clamp(o.speed / 25, 0, 1));
    const a1 = fp(ph), a2 = fp(ph + 0.5);
    const bob = Math.cos(ph * Math.PI * 4) * (0.6 + s01 * 1.4) * w;
    const crouch = o.crouch ?? 0;
    const hip = { x: x + f * (s01 * 2), y: gy + D.hipY + 1 + bob + crouch * 8 };
    const lean = (0.05 + s01 * 0.22) * w + crouch * 0.2 + (o.fall ?? 0);
    const sh = { x: hip.x + f * Math.sin(lean) * D.torso, y: hip.y - Math.cos(lean) * D.torso };
    const fF = { x: x + f * (2 + a1.x * w), y: gy + a1.y * w }, fB = { x: x + f * (-3 + a2.x * w), y: gy + a2.y * w };
    const leg = (th: Bone, sn: Bone, ft: Bone, t: { x: number; y: number }, off: number) => {
      const r = ik(hip.x + f * off, hip.y, t.x, t.y - 2, D.thigh, D.shin, f);
      th.set(hip.x + f * off, hip.y, r.jx, r.jy); sn.set(r.jx, r.jy, r.ex, r.ey); ft.set(r.ex - f * 1, r.ey, r.ex + f * 6, r.ey + 1);
    };
    leg(this.b.thighB, this.b.shinB, this.b.footB, fB, -1.2);
    leg(this.b.thighF, this.b.shinF, this.b.footF, fF, 1.2);
    this.torso.setPosition((hip.x + sh.x) / 2 + f * 0.5, sh.y).setRotation(lean * f).setFlipX(f < 0);
    const neck = { x: sh.x + f * 1.5, y: sh.y - 4 };
    // weapon geometry along the aim
    const ang = o.aim * o.raise + (1 - o.raise) * 1.15; // lowered: pointing at the ground ahead
    const dir = { x: Math.cos(ang) * f, y: Math.sin(ang) };
    const headTilt = o.raise * o.aim * 0.6 + (1 - o.raise) * 0.08;
    this.head.setPosition(neck.x + f * 1.5, neck.y - 6).setRotation(headTilt * f).setFlipX(f < 0);
    this.eye = { x: neck.x + f * 4, y: neck.y - 7 };
    let hF: { x: number; y: number }, hB: { x: number; y: number };
    const shoulder = { x: sh.x, y: sh.y + 2 };
    this.band.clear();
    if (this.weaponKind === 'sling') {
      hF = { x: shoulder.x + dir.x * lerp(14, 26, o.raise), y: shoulder.y + 4 + dir.y * lerp(14, 26, o.raise) - 2 * o.raise };
      const pull = o.draw * 15;
      hB = { x: hF.x - dir.x * (6 + pull), y: hF.y - dir.y * (6 + pull) - 2 };
      this.weapon.setPosition(hF.x, hF.y + 1).setRotation(Math.atan2(dir.y, dir.x) + Math.PI / 2 * f - (f < 0 ? Math.PI : 0) * 0).setFlipX(f < 0);
      this.weapon.setRotation(Math.atan2(dir.y, dir.x) - (f > 0 ? -Math.PI / 2 : Math.PI / 2) - (f < 0 ? Math.PI : 0));
      const tipA = { x: hF.x - 3 * dir.y * f + dir.x * 3, y: hF.y - 3, }, tipB = { x: hF.x + 3 * dir.y * f + dir.x * 3, y: hF.y - 2 };
      this.band.lineStyle(0.8, 0x07080a).lineBetween(tipA.x, tipA.y, hB.x, hB.y).lineBetween(tipB.x, tipB.y, hB.x, hB.y);
      this.muzzle = { x: hF.x + dir.x * 4, y: hF.y - 3 };
    } else if (this.weaponKind === 'blowgun') {
      const mouth = { x: neck.x + f * 6, y: neck.y - 3 };
      const r = o.raise;
      const base = { x: lerp(shoulder.x + f * 4, mouth.x, r), y: lerp(shoulder.y + 10, mouth.y, r) };
      const gdir = r > 0.5 ? dir : { x: f * 0.5, y: 0.86 };
      hF = { x: base.x + gdir.x * 24, y: base.y + gdir.y * 24 }; hB = { x: base.x + gdir.x * 9, y: base.y + gdir.y * 9 };
      this.weapon.setPosition(base.x, base.y).setRotation(Math.atan2(gdir.y, gdir.x)).setFlipY(f < 0);
      this.muzzle = { x: base.x + gdir.x * 46, y: base.y + gdir.y * 46 };
    } else {
      const r = o.raise;
      const butt = { x: lerp(shoulder.x - f * 4, shoulder.x + f * 1, r), y: lerp(shoulder.y + 14, shoulder.y + 2, r) };
      const gdir = r > 0.3 ? dir : { x: f * 0.3, y: -0.95 };
      const gd = { x: lerp(f * 0.3, gdir.x, r), y: lerp(-0.95, gdir.y, r) };
      const n = Math.hypot(gd.x, gd.y); gd.x /= n; gd.y /= n;
      const b0 = r > 0.3 ? butt : { x: shoulder.x + f * 3, y: shoulder.y + 8 }; // shouldered, barrel up, when lowered
      hF = { x: b0.x + gd.x * 22, y: b0.y + gd.y * 22 + 1 }; hB = { x: b0.x + gd.x * 9, y: b0.y + gd.y * 9 + 2 };
      this.weapon.setPosition(b0.x, b0.y).setRotation(Math.atan2(gd.y, gd.x)).setFlipY(f < 0);
      this.muzzle = { x: b0.x + gd.x * 50, y: b0.y + gd.y * 50 };
    }
    const arm = (ua: Bone, fa: Bone, t: { x: number; y: number }, off: number) => {
      const s0 = { x: shoulder.x + f * off, y: shoulder.y };
      const r = ik(s0.x, s0.y, t.x, t.y, D.uarm, D.farm, -f);
      ua.set(s0.x, s0.y, r.jx, r.jy); fa.set(r.jx, r.jy, r.ex, r.ey);
    };
    arm(this.b.uarmB, this.b.farmB, hB, -1);
    arm(this.b.uarmF, this.b.farmF, hF, 1);
    this.handF = hF;
  }
}

type Shot = { x: number; y: number; vx: number; vy: number; g: number; img?: Phaser.GameObjects.Image; life: number; kind: Weapon };

/** d: { weapon: 'sling' | 'blowgun' | 'rifle', facing, range?, minX?, maxX? (patrol), torch?: true, hat?, wake?: x,
 *  flee?: false (stands his ground), flag?: set when he's gone, before? } */
export class Poacher extends Creature {
  rig: ManRig;
  weapon: Weapon;
  aim = 0.2; raise = 0; drawK = 0; vx = 0; crouchK = 0;
  aimLine: Phaser.GameObjects.Graphics;
  shots: Shot[] = [];
  torchGlow?: Phaser.GameObjects.Image; torchFlame?: Phaser.GameObjects.Image; lantern?: Phaser.GameObjects.Image;
  lastSeen = -1e9; tracer: Phaser.GameObjects.Graphics; fallV = 0;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    this.weapon = (d.weapon as Weapon) ?? 'sling';
    this.rig = new ManRig(S, 11.6, this.weapon, (d.hat as 'turban' | 'cap') ?? (this.weapon === 'rifle' ? 'cap' : 'turban'));
    this.aimLine = S.add.graphics().setDepth(12.4);
    this.tracer = S.add.graphics().setDepth(12.45).setBlendMode(Phaser.BlendModes.ADD);
    tex(S, 'stone_shot', 5, 5, (c) => { c.beginPath(); c.arc(2.5, 2.5, 2.2, 0, Math.PI * 2); c.fill(); });
    tex(S, 'dart_shot', 10, 2, (c) => { c.fillRect(0, 0.6, 10, 0.8); c.beginPath(); c.moveTo(0, 0); c.lineTo(3, 1); c.lineTo(0, 2); c.fill(); });
    if (d.torch) {
      this.lantern = S.add.image(0, 0, 'walllamp').setDisplaySize(14, 14).setDepth(11.65);
      this.torchGlow = S.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(11.7).setScale(1.5);
      this.torchFlame = S.add.image(0, 0, 'flame').setBlendMode(Phaser.BlendModes.ADD).setDepth(11.71).setScale(0.6);
    }
    this.reset(S.cp);
  }

  reset(cp: number) {
    const d = this.d;
    for (const s of this.shots) s.img?.destroy();
    this.shots = [];
    if (cp >= ((d.before as number) ?? 99)) { this.set('gone'); this.show(false); return; }
    this.resetTo(d.x, d.y, d.wake !== undefined ? 'wait' : d.minX !== undefined ? 'patrol' : 'watch');
    this.facing = (d.facing as number) ?? -1;
    this.raise = 0; this.drawK = 0; this.vx = 0; this.fallV = 0; this.crouchK = 0; this.show(true);
    if (d.flag) this.S.flags[d.flag as string] = false;
  }
  show(v: boolean) { this.rig.setVisible(v); this.lantern?.setVisible(v); this.torchGlow?.setVisible(v); this.torchFlame?.setVisible(v); this.aimLine.clear(); }

  lights(out: Light[]) {
    if (this.d.torch && this.state !== 'gone') out.push({ x: this.x + this.facing * 60, y: this.y - 30, r: 210, k: 0.9, warm: true });
  }

  /** can he see her? */
  sees() {
    const P = this.S.P, d = this.d;
    if (this.S.dead) return false;
    const dx = P.x - this.x;
    const range = (d.range as number) ?? 520;
    if (Math.abs(dx) > range || Math.abs(P.feetY - this.y) > 260) return false;
    const facingHer = Math.sign(dx) === this.facing;
    const near = Math.abs(dx) < 140;
    const lit = P.carrying || this.S.lightAt(P.x, P.feetY - 24, this.S.lightList().filter((l) => l.r > 150)) > 0.25;
    if (!facingHer && !near) return false;
    if (!lit && !near) return false;
    const eye = this.rig.eye;
    return this.S.lineClear(eye.x, eye.y, P.x, P.feetY - 30) || this.S.lineClear(eye.x, eye.y, P.x, P.headY + 4);
  }

  update(dt: number, t: number) {
    const d = this.d, P = this.S.P;
    this.tick(dt);
    this.updateShots(dt);
    if (this.state === 'gone') return;
    const dxP = this.dxP(), dist = Math.abs(dxP);
    let want = 0, raise = 0, aimT = 0.15;
    const aimTime = this.weapon === 'rifle' ? 1.5 : this.weapon === 'blowgun' ? 0.85 : 1.1;
    const seen = this.sees();
    if (seen) this.lastSeen = t;
    const flee = d.flee !== false;
    switch (this.state) {
      case 'wait': if ((d.wakeLeft ? P.x < (d.wake as number) : P.x > (d.wake as number))) { this.set(d.chase ? 'chase' : 'watch'); if (d.chase) sfx.shout(); } break;
      case 'chase': {
        // runs her down to grab her (no shooting): a shout, then a sprint
        this.facing = Math.sign(dxP) || this.facing; raise = 0;
        want = this.facing * ((d.speed as number) ?? 175);
        if (dist < 18 && Math.abs(P.feetY - this.y) < 40 && !this.S.dead) this.S.die('caught');
        if (this.y > this.S.L.killY - 100) this.set('caught');
        break;
      }
      case 'watch':
        if (Math.random() < dt * 0.15) this.facing = this.d.lookBack ? -this.facing : this.facing;
        if (seen) { this.set('spot'); sfx.shout(); }
        break;
      case 'patrol': {
        want = this.facing * 55;
        const minX = d.minX as number, maxX = d.maxX as number;
        if (this.x > maxX && this.facing > 0) { this.set('turn'); }
        if (this.x < minX && this.facing < 0) { this.set('turn'); }
        if (seen) { this.set('spot'); sfx.shout(); }
        break;
      }
      case 'turn': if (this.stT > 1.2) { this.facing = -this.facing; this.set('patrol'); } if (seen) { this.set('spot'); sfx.shout(); } break;
      case 'spot': this.facing = Math.sign(dxP) || this.facing; raise = smooth(this.stT / 0.35); if (this.stT > 0.35) this.set('aim'); break;
      case 'aim': {
        // the tell: the weapon up and a line that follows her, a little behind
        raise = 1; this.facing = Math.sign(dxP) || this.facing;
        aimT = this.targetAngle();
        this.drawK = Math.min(1, this.stT / aimTime);
        if (this.weapon === 'sling' && Math.random() < dt * 3) sfx.stretch();
        if (!seen && t - this.lastSeen > 700) { this.set('lose'); break; }
        if (this.stT > aimTime) { this.fire(); this.set('reload'); }
        break;
      }
      case 'reload': raise = 0.6; this.drawK = 0; aimT = this.aim; if (this.stT > (this.weapon === 'rifle' ? 1.6 : 1.0)) this.set(seen ? 'aim' : 'lose'); break;
      case 'lose': raise = Math.max(0, 1 - this.stT * 2); if (seen) this.set('aim'); else if (this.stT > 2.2) this.set(d.minX !== undefined ? 'patrol' : 'watch'); break;
      case 'flee': want = this.facing * 230; raise = 0; if (this.stT > 3.5) { this.set('gone'); this.show(false); if (d.flag) this.S.flags[d.flag as string] = true; } break;
      case 'caught': raise = 0; this.crouchK = 1; break;
    }
    if (flee && this.state !== 'chase' && dist < ((d.fleeDist as number) ?? 70) && Math.abs(P.feetY - this.y) < 50 && !['flee', 'gone', 'caught'].includes(this.state)) { this.set('flee'); this.facing = -Math.sign(dxP) || 1; sfx.shout(); }
    if (this.caught && this.state !== 'caught') { this.set('caught'); sfx.shout(); if (d.flag) this.S.flags[d.flag as string] = true; }
    if (this.fear > 0.8 && !['flee', 'gone', 'caught'].includes(this.state) && Math.abs(this.fearX - this.x) < 120) { this.set('flee'); this.facing = Math.sign(this.x - this.fearX) || 1; }
    this.raise += (raise - this.raise) * Math.min(1, dt * 7);
    this.aim += (aimT - this.aim) * Math.min(1, dt * (this.weapon === 'rifle' ? 2.6 : 4)); // a lag: she can outrun the aim
    this.vx += clamp(want - this.vx, -600 * dt, 600 * dt);
    const nx = this.x + this.vx * dt;
    const gy = this.ground(nx, this.y - 30);
    if (this.fallV > 0 || (this.state === 'chase' && gy > this.y + 30)) {
      // he runs straight into the pit
      this.fallV += 1500 * dt; this.y += this.fallV * dt; this.x = nx;
      const g2 = this.ground(this.x, this.y - this.fallV * dt - 2);
      if (this.y >= g2) { this.y = g2; this.fallV = 0; this.set('caught'); sfx.thud(); sfx.shout(); if (d.flag) this.S.flags[d.flag as string] = true; }
    } else if (Math.abs(gy - this.y) < 30) { this.x = nx; this.y = gy; } else { this.vx = 0; if (this.state === 'patrol') this.set('turn'); }
    this.rig.update(this.x, this.y, this.facing, { dx: this.vx * dt, speed: Math.abs(this.vx), aim: this.aim, raise: this.raise, draw: this.drawK, t, crouch: this.crouchK });
    // the aim line
    const g = this.aimLine; g.clear();
    if (this.state === 'aim' && this.raise > 0.6) {
      const m = this.rig.muzzle;
      const dir = { x: Math.cos(this.aim) * this.facing, y: Math.sin(this.aim) };
      let len = 900;
      for (let L = 40; L < 900; L += 40) if (!this.S.lineClear(m.x, m.y, m.x + dir.x * L, m.y + dir.y * L)) { len = L; break; }
      const col = this.weapon === 'rifle' ? 0xd0a090 : 0xc8ccd0;
      g.lineStyle(1, col, 0.08 + 0.3 * this.drawK);
      g.lineBetween(m.x, m.y, m.x + dir.x * len, m.y + dir.y * len);
    }
    if (this.lantern) {
      const hx = this.x - this.facing * 8, hy = this.y - 30;
      this.lantern.setPosition(hx, hy); this.torchGlow!.setPosition(hx, hy - 2).setScale(1.6 + Math.sin(t * 0.02) * 0.05); this.torchFlame!.setPosition(hx, hy - 4);
    }
  }

  targetAngle() {
    const P = this.S.P, m = this.rig.muzzle;
    const tx = P.x + P.vx * (this.weapon === 'sling' ? 0.35 : 0.1), ty = P.feetY - 26;
    const dx = Math.abs(tx - m.x), dy = ty - m.y;
    let a = Math.atan2(dy, dx);
    if (this.weapon === 'sling') a -= Math.min(0.35, dx / 2400); // lob a little
    return clamp(a, -1.1, 1.1);
  }

  fire() {
    const m = this.rig.muzzle, f = this.facing;
    const dir = { x: Math.cos(this.aim) * f, y: Math.sin(this.aim) };
    if (this.weapon === 'sling') {
      sfx.twang();
      this.shots.push({ x: m.x, y: m.y, vx: dir.x * 620, vy: dir.y * 620, g: 520, life: 2.5, kind: 'sling', img: this.S.add.image(m.x, m.y, 'stone_shot').setScale(0.5).setDepth(12.3) });
    } else if (this.weapon === 'blowgun') {
      sfx.whisper();
      this.shots.push({ x: m.x, y: m.y, vx: dir.x * 950, vy: dir.y * 950, g: 60, life: 1.5, kind: 'blowgun', img: this.S.add.image(m.x, m.y, 'dart_shot').setScale(0.5).setDepth(12.3).setRotation(Math.atan2(dir.y, dir.x)) });
    } else {
      sfx.slam(); sfx.crack(); this.S.shake(0.003);
      this.shots.push({ x: m.x, y: m.y, vx: dir.x * 2600, vy: dir.y * 2600, g: 0, life: 0.5, kind: 'rifle' });
      this.S.sparks.explode(4, m.x, m.y);
    }
  }

  updateShots(dt: number) {
    const P = this.S.P;
    this.tracer.clear();
    for (const s of this.shots) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const ox = s.x, oy = s.y;
      // sub-steps so a fast shot can't skip past her
      const n = s.kind === 'rifle' ? 8 : 2;
      for (let k = 0; k < n && s.life > 0; k++) {
        s.vy += s.g * dt / n;
        const nx = s.x + s.vx * dt / n, ny = s.y + s.vy * dt / n;
        const b = P.bounds;
        if (!this.S.dead && nx > b.min.x - 2 && nx < b.max.x + 2 && ny > b.min.y && ny < b.max.y) { this.S.die('shot'); s.life = 0; break; }
        if (!this.S.lineClear(s.x, s.y, nx, ny)) {
          s.life = 0; this.S.dustAt(nx, ny, 3); sfx.pebbleHit();
          // a stone knocks a crate it hits
          for (const p of this.S.props) if (MJ.Query.point([p.body], { x: nx, y: ny }).length) MJ.Body.setVelocity(p.body, { x: s.vx / 600, y: -0.5 });
          break;
        }
        s.x = nx; s.y = ny;
      }
      s.img?.setPosition(s.x, s.y).setRotation(Math.atan2(s.vy, s.vx));
      if (s.kind === 'rifle') this.tracer.lineStyle(1.2, 0xffd8a0, 0.6).lineBetween(ox, oy, s.x, s.y);
      if (s.life <= 0) s.img?.destroy();
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }
}
register('poacher', Poacher);
