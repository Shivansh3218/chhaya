import Phaser from 'phaser';
import { sfx } from '../../audio';
import type { PlayScene } from '../PlayScene';
import type { EntDef } from '../types';
import { register, rectHit } from '../ents/base';
import { clamp } from '../kit';
import { Creature } from './base';
import { JACKAL, LEOPARD, QuadRig } from './quad';

// The leopard (baagh) and the jackal pack (siyar). Both fear fire and lamplight; both telegraph before they act.

/** d: { mode: 'stalk' | 'territory' | 'chase' | 'sleep', minX?, maxX?, trigger?: x (appear / wake), from?: x (where it
 *  enters for a chase), speed?, until?: x (a chase ends when she passes it: the leopard stops at the edge),
 *  flag?: set when driven off, exitX?, bgY?: y for the background stalk, before? } */
export class Leopard extends Creature {
  rig: QuadRig;
  vx = 0; vy = 0; air = false; crouchK = 0; airK = 0; jawK = 0; headK = 0; lieK = 0;
  targetX = 0; lastGrowl = 0; seen = false; shown = false;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    this.rig = new QuadRig(S, LEOPARD, 11.8);
    this.reset(S.cp);
  }

  reset(cp: number) {
    const d = this.d;
    if (cp >= ((d.before as number) ?? 99)) { this.set('gone'); this.rig.setVisible(false); return; }
    this.resetTo(d.x, d.y, d.mode === 'chase' || d.mode === 'stalk' ? 'hidden' : d.mode === 'sleep' ? 'sleep' : 'prowl');
    this.vx = this.vy = 0; this.air = false; this.shown = d.mode !== 'chase' && d.mode !== 'stalk';
    this.rig.setVisible(this.shown);
    this.rig.setDepthOffset(11.8); this.rig.setScale(1); this.rig.setTint((d.tint as number) ?? 0xffffff);
    this.lieK = d.mode === 'sleep' ? 1 : 0;
    if (d.flag) this.S.flags[d.flag as string] = false;
  }

  growl() { if (this.S.t - this.lastGrowl > 900) { sfx.growl(); this.lastGrowl = this.S.t; } }

  update(dt: number, t: number) {
    const d = this.d, P = this.S.P;
    this.tick(dt);
    if (this.state === 'gone') return;
    const speedMax = (d.speed as number) ?? 190;
    let want = 0; // desired horizontal speed
    let crouch = 0, jaw = 0, head = 0, lash = 0.15;
    const dxP = this.dxP(), dist = Math.abs(dxP);
    const lit = (x: number) => this.litAt(x, this.y - 30);

    switch (this.state) {
      case 'hidden': {
        if (d.mode === 'stalk' && P.x > (d.trigger as number)) {
          // a shape keeping pace with her, deep in the trees behind
          this.set('stalk'); this.shown = true; this.rig.setVisible(true);
          this.rig.setDepthOffset(5.2); this.rig.setScale(0.7); this.rig.setTint(0x3c4247);
          this.x = P.x - 260; this.y = this.groundStalk();
          sfx.growl();
        } else if (d.mode === 'chase' && P.x > (d.trigger as number)) {
          this.set('chase'); this.shown = true; this.rig.setVisible(true);
          this.x = (d.from as number) ?? P.x - 420; this.y = this.ground(this.x, P.feetY - 200);
          sfx.roar(); this.S.shake(0.003);
        }
        return;
      }
      case 'stalk': {
        // keeps pace in the background, now and then pausing to watch her
        const tx = P.x + Math.sin(t * 0.0004) * 160 - 60;
        want = clamp((tx - this.x) * 1.6, -150, 150);
        head = 0.4;
        if (P.x > (d.stalkTo as number)) { this.set('stalkOut'); }
        break;
      }
      case 'stalkOut': {
        want = 220; head = -0.2;
        if (this.stT > 3) { this.set('gone'); this.rig.setVisible(false); }
        break;
      }
      case 'sleep': {
        this.lieK = 1;
        if (dist < 150 || (d.trigger !== undefined && P.x > (d.trigger as number))) { this.set('notice'); sfx.growl(); }
        break;
      }
      case 'prowl': {
        const minX = (d.minX as number) ?? this.home.x - 200, maxX = (d.maxX as number) ?? this.home.x + 200;
        head = 0.5;
        want = this.facing * 62;
        if ((this.facing > 0 && this.x > maxX) || (this.facing < 0 && this.x < minX)) this.facing = -this.facing;
        if (lit(this.x + this.facing * 60)) this.facing = -this.facing; // never into the light
        if (dist < 230 && !lit(P.x) && Math.abs(P.feetY - this.y) < 60 && P.x > minX - 80 && P.x < maxX + 80) { this.set('notice'); this.facing = Math.sign(dxP) || 1; }
        break;
      }
      case 'notice': {
        head = -0.6; this.facing = Math.sign(dxP) || this.facing; this.lieK = Math.max(0, this.lieK - dt * 3);
        if (this.stT > 0.45) this.set('crouch');
        break;
      }
      case 'crouch': {
        // the tell: belly low, tail lashing, a growl rising
        crouch = Math.min(1, this.stT / 0.35); lash = 1; jaw = 0.4; head = 0.3;
        this.facing = Math.sign(dxP) || this.facing;
        this.growl();
        if (lit(P.x) || Math.abs(P.feetY - this.y) > 70) { this.set('recover'); break; }
        if (this.stT > 0.95) {
          this.set('pounce');
          this.targetX = P.x + P.vx * 0.25;
          const span = clamp(this.targetX - this.x, -260, 260);
          this.vx = span / 0.62; this.vy = -360; this.air = true;
          sfx.roar();
        }
        break;
      }
      case 'pounce': {
        jaw = 0.9; head = -0.2;
        if (!this.air) { this.set('recover'); this.vx = 0; }
        break;
      }
      case 'recover': {
        crouch = Math.max(0, 0.4 - this.stT); head = 0.2;
        if (this.stT > 1.1) { this.set(d.mode === 'chase' ? 'chase' : 'prowl'); this.facing = Math.sign(dxP) || this.facing; }
        break;
      }
      case 'chase': {
        head = -0.1; jaw = 0.3; lash = 0.4;
        this.facing = Math.sign(dxP) || 1;
        want = this.facing * speedMax;
        if (d.until !== undefined && P.x > (d.until as number) && this.x < (d.until as number)) { this.set('balk'); break; }
        if (lit(this.x + this.facing * 70)) { this.set('balk'); break; }
        if (dist < 70 && Math.abs(P.feetY - this.y) < 50 && !this.air) {
          this.set('pounce'); this.vx = this.facing * 320; this.vy = -260; this.air = true; sfx.roar();
        }
        break;
      }
      case 'balk': {
        // stopped at the edge, or by the light: it paces and roars, then slinks off
        jaw = Math.sin(this.stT * 3) > 0.6 ? 0.9 : 0.2; head = -0.5;
        if (this.stT < 0.1) sfx.roar();
        if (!lit(this.x + this.facing * 70) && d.until === undefined && this.stT > 1.5) this.set('chase');
        if (this.stT > 4) this.set('leave');
        break;
      }
      case 'flee': {
        this.facing = Math.sign(this.x - this.fearX) || 1;
        want = this.facing * 260; head = -0.3; jaw = 0.2;
        if (this.stT > 4) { this.set('gone'); this.rig.setVisible(false); }
        break;
      }
      case 'leave': {
        this.facing = (d.exitDir as number) ?? -1;
        want = this.facing * 140;
        if (this.stT > 5) { this.set('gone'); this.rig.setVisible(false); }
        break;
      }
      case 'caught': { jaw = Math.sin(this.stT * 5) > 0 ? 0.8 : 0; head = 0.4; break; }
    }
    // a lamp lit where it stands: it can't bear it and slinks away
    if (['sleep', 'notice', 'crouch', 'prowl', 'recover'].includes(this.state) && this.shown && lit(this.x)) {
      this.fear = 1; this.fearX = this.S.P.x; // it slinks off away from her
    }
    // fire drives it away for good
    if (this.fear > 0.5 && this.state !== 'flee' && this.state !== 'gone' && this.state !== 'stalk' && this.state !== 'hidden' && Math.abs(this.fearX - this.x) < 240) {
      this.set('flee'); sfx.yelp(); if (d.flag) this.S.flags[d.flag as string] = true;
    }
    if (this.caught && this.state !== 'caught') { this.set('caught'); sfx.yelp(); if (d.flag) this.S.flags[d.flag as string] = true; }
    if (this.state === 'caught') want = 0;

    // motion
    if (this.air) {
      this.vy += 1400 * dt;
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      const gy = this.ground(nx, this.y - 30);
      if (this.vy > 0 && ny >= gy) { this.y = gy; this.air = false; this.vy = 0; this.vx *= 0.3; sfx.land(); this.S.dustAt(nx, gy - 2, 6); }
      else this.y = ny;
      this.x = nx;
      if (this.y > this.S.L.killY) { this.set('gone'); this.rig.setVisible(false); }
    } else if (this.state !== 'stalk' && this.state !== 'stalkOut' && this.ground(this.x, this.y - 10) > this.y + 30) {
      this.air = true; this.vy = 0; this.vx *= 0.3; // the ground fell away under it
      if (this.state === 'chase') { sfx.roar(); this.set('falling'); }
    } else {
      const acc = this.state === 'chase' || this.state === 'flee' ? 900 : 500;
      this.vx += clamp(want - this.vx, -acc * dt, acc * dt);
      let nx = this.x + this.vx * dt;
      if (this.state === 'stalk' || this.state === 'stalkOut') this.y = this.groundStalk();
      else {
        const gy = this.ground(nx, this.y - 40);
        if (gy > this.y + 40) {
          // an edge: leap a gap if there is ground within reach, else stop
          let land = -1;
          for (let k = 40; k <= 230; k += 10) { const g2 = this.ground(nx + this.facing * k, this.y - 60); if (Math.abs(g2 - this.y) < 70) { land = k; break; } }
          if (land > 0 && (this.state === 'chase' || this.state === 'flee')) { this.air = true; this.vx = this.facing * Math.max(240, land / 0.6); this.vy = -380; }
          else if (this.state === 'chase') { this.set('balk'); nx = this.x; this.vx = 0; }
          else { this.facing = -this.facing; nx = this.x; this.vx = 0; }
        } else if (gy < this.y - 26) {
          // a step up: jump it when chasing (up to ~110 px), else turn
          if ((this.state === 'chase' || this.state === 'flee') && gy > this.y - 110) { this.air = true; this.vy = -560; this.vx = this.facing * 200; }
          else if (this.state === 'chase') { this.set('balk'); nx = this.x; this.vx = 0; }
          else { nx = this.x; this.vx = 0; this.facing = -this.facing; }
        } else this.y = gy;
      }
      this.x = nx;
    }
    // the bite / the pounce lands on her
    if (!this.S.dead && (this.state === 'pounce' || this.state === 'chase') && this.shown) {
      const body = { x: Math.min(this.rig.hipX, this.rig.headX) - 4, y: this.y - 46, w: Math.abs(this.rig.headX - this.rig.hipX) + 8, h: 42 };
      if (rectHit(body, P.bounds) && P.state !== 'hang' && P.state !== 'climb') this.S.die('mauled');
    }
    if (dist < 400 && this.state === 'prowl' && Math.random() < dt * 0.15) this.growl();
    // pose
    this.crouchK += (crouch - this.crouchK) * Math.min(1, dt * 10);
    this.airK += ((this.air ? 1 : 0) - this.airK) * Math.min(1, dt * 12);
    this.jawK += (jaw - this.jawK) * Math.min(1, dt * 12);
    this.headK += (head - this.headK) * Math.min(1, dt * 5);
    if (this.state !== 'sleep') this.lieK = Math.max(0, this.lieK - dt * 2);
    this.rig.eye.setAlpha(this.S.P && Math.abs(this.dxP()) < 500 ? 0.55 : 0);
    this.rig.update({ x: this.x, gy: this.y, facing: this.facing, dt, t, dx: this.vx * dt, speed: Math.abs(this.vx), crouch: this.crouchK, air: this.airK, vy: this.vy, headDown: this.headK, jaw: this.jawK, lie: this.lieK, tailLash: lash });
  }
  groundStalk() { return (this.d.bgY as number) ?? this.S.P.feetY - 40; }
}
register('leopard', Leopard);

/** one jackal of a pack. d: { wake?: x, minX?, maxX?, speed?, flag?, before? } */
export class Jackal extends Creature {
  rig: QuadRig;
  vx = 0; vy = 0; air = false; airK = 0; jawK = 0; headK = 0; lieK = 1; lastBark = 0; jumpTries = 0;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    this.rig = new QuadRig(S, JACKAL, 11.7);
    this.reset(S.cp);
  }
  reset(cp: number) {
    const d = this.d;
    if (cp >= ((d.before as number) ?? 99)) { this.set('gone'); this.rig.setVisible(false); return; }
    this.resetTo(d.x, d.y, 'sleep'); this.vx = this.vy = 0; this.air = false; this.lieK = 1; this.jumpTries = 0;
    this.rig.setVisible(true);
  }
  bark() { if (this.S.t - this.lastBark > 700 + Math.random() * 700) { sfx.yelp(); this.lastBark = this.S.t; } }
  update(dt: number, t: number) {
    const d = this.d, P = this.S.P;
    this.tick(dt);
    if (this.state === 'gone') return;
    const dxP = this.dxP(), dist = Math.abs(dxP);
    let want = 0, jaw = 0, head = 0;
    const lit = (x: number) => this.litAt(x, this.y - 20);
    switch (this.state) {
      case 'sleep':
        this.lieK = 1; head = 0.8;
        if (this.fear > 0.5) { this.set('flee'); sfx.yelp(); break; } // smoke and flame wake it running
        if ((d.wake !== undefined && P.x > (d.wake as number)) || (dist < 200 && d.wake === undefined)) { this.set('alert'); this.bark(); }
        break;
      case 'alert':
        this.lieK = 0; head = -0.7; this.facing = Math.sign(dxP) || 1;
        if (this.stT > 0.5 + (this.id.length % 3) * 0.12) this.set('chase');
        break;
      case 'chase': {
        this.facing = Math.sign(dxP) || this.facing;
        want = this.facing * ((d.speed as number) ?? 235);
        head = 0.1; jaw = 0.35;
        if (lit(this.x + this.facing * 40)) { this.set('bay'); break; }
        const up = this.y - P.feetY;
        if (dist < 26 && Math.abs(up) < 30 && P.state !== 'hang' && P.state !== 'climb' && !this.S.dead) this.S.die('mauled');
        if (dist < 60 && up > 40) this.set('bay'); // she's above: leap at her, then bay
        if (Math.random() < dt * 1.2) this.bark();
        break;
      }
      case 'bay': {
        // can't reach her: circle, leap at the wall, bark
        jaw = Math.sin(this.stT * 8) > 0.2 ? 0.8 : 0; head = -0.6;
        this.facing = Math.sign(dxP) || this.facing;
        want = Math.sin(this.stT * 1.7 + this.home.x) * 70;
        if (dist > 60 && !lit(this.x + this.facing * 40)) want = this.facing * 120;
        if (lit(this.x + this.facing * 30)) want = -this.facing * 60;
        this.bark();
        if (!this.air && dist < 50 && this.y - P.feetY > 40 && this.jumpTries < 4 && Math.random() < dt * 1.5) { this.air = true; this.vy = -420; this.vx = this.facing * 60; this.jumpTries++; }
        const up = this.y - P.feetY;
        if (up < 30 && dist > 60 && !lit(this.x + this.facing * 40) && this.stT > 1) this.set('chase');
        if (dist < 24 && Math.abs(up) < 34 && !this.S.dead && P.state !== 'hang' && P.state !== 'climb') this.S.die('mauled');
        if (this.stT > ((d.patience as number) ?? 14)) this.set('leave');
        break;
      }
      case 'leave': want = ((d.exitDir as number) ?? -1) * 200; this.facing = Math.sign(want); if (this.stT > 4) { this.set('gone'); this.rig.setVisible(false); } break;
      case 'flee': this.facing = Math.sign(this.x - this.fearX) || 1; want = this.facing * 260; if (this.stT > 3) { this.set('gone'); this.rig.setVisible(false); } break;
      case 'caught': jaw = Math.sin(this.stT * 6) > 0 ? 0.7 : 0; head = 0.5; if (Math.random() < dt) sfx.yelp(); break;
    }
    if (this.fear > 0.6 && this.state !== 'flee' && this.state !== 'caught' && this.state !== 'sleep' && Math.abs(this.fearX - this.x) < 160) { this.set('flee'); sfx.yelp(); }
    if (this.caught && this.state !== 'caught') this.set('caught');
    // motion (same ground rules as the leopard, but they can't climb or leap far)
    if (this.air) {
      this.vy += 1500 * dt;
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      const gy = this.ground(nx, this.y - 20);
      if (this.vy > 0 && ny >= gy) { this.y = gy; this.air = false; this.vy = 0; } else this.y = ny;
      this.x = nx;
      if (this.y > this.S.L.killY) { this.set('gone'); this.rig.setVisible(false); }
    } else {
      this.vx += clamp(want - this.vx, -1100 * dt, 1100 * dt);
      let nx = this.x + this.vx * dt;
      const gy = this.ground(nx, this.y - 30);
      if (gy > this.y + 30) {
        let land = -1;
        for (let k = 30; k <= 140; k += 10) { const g2 = this.ground(nx + this.facing * k, this.y - 40); if (Math.abs(g2 - this.y) < 40) { land = k; break; } }
        if (land > 0 && this.state === 'chase') { this.air = true; this.vx = this.facing * Math.max(220, land / 0.5); this.vy = -330; }
        else if (gy - this.y < 120 && this.state === 'chase') { this.air = true; this.vx = this.facing * 150; this.vy = -100; }
        else { nx = this.x; this.vx = 0; if (this.state === 'chase') this.set('bay'); }
      } else if (gy < this.y - 22) { nx = this.x; this.vx = 0; if (this.state === 'chase') this.set('bay'); }
      else this.y = gy;
      this.x = nx;
    }
    this.airK += ((this.air ? 1 : 0) - this.airK) * Math.min(1, dt * 12);
    this.jawK += (jaw - this.jawK) * Math.min(1, dt * 14);
    this.headK += (head - this.headK) * Math.min(1, dt * 6);
    if (this.state !== 'sleep') this.lieK = Math.max(0, this.lieK - dt * 3);
    this.rig.eye.setAlpha(dist < 400 ? 0.5 : 0);
    this.rig.update({ x: this.x, gy: this.y, facing: this.facing, dt, t, dx: this.vx * dt, speed: Math.abs(this.vx), air: this.airK, vy: this.vy, headDown: this.headK, jaw: this.jawK, lie: this.lieK, tailLash: this.state === 'bay' ? 0.6 : 0.1 });
  }
}
register('jackal', Jackal);
void Phaser;
