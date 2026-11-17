import Phaser from 'phaser';
import { sfx } from '../../audio';
import type { PlayScene } from '../PlayScene';
import type { EntDef } from '../types';
import { Ent, register } from '../ents/base';
import { Bone, RES, capsule, clamp, ik, lerp, tex } from '../kit';

// Crows (kauwe): a flock that perches, pecks and hops, and bursts into the air when she comes near. In 'attack'
// mode the flock wheels overhead; one at a time a crow caws, hangs with its wings spread (the tell) and dives
// along a straight line at where she stood. A hit knocks her off her feet — fatal near an edge. Cover stops them.

type Crow = {
  x: number; y: number; vx: number; vy: number; f: number;
  st: 'perch' | 'fly' | 'hover' | 'dive' | 'gone'; t: number; flap: number; hop: number; peck: number;
  dive?: { x: number; y: number; tx: number; ty: number };
  bones: { body: Phaser.GameObjects.Image; head: Phaser.GameObjects.Image; tail: Phaser.GameObjects.Image; wIn: Bone; wOut: Phaser.GameObjects.Image; wInB: Bone; wOutB: Phaser.GameObjects.Image; legA: Bone; legB: Bone };
  perchX: number; perchY: number;
};

/** d: { n, w (spread), mode: 'perch' | 'attack', x0?, x1? (attack zone), y? perch line, flag?, before?, scale? } */
export class Crows extends Ent {
  crows: Crow[] = [];
  cool = 0;
  constructor(S: PlayScene, d: EntDef) {
    super(S, d);
    const wIn = capsule(S, 'cr_win', 9, 4, 2.6), leg = capsule(S, 'cr_leg', 4, 1, 0.8);
    tex(S, 'cr_body', 18, 9, (c) => { c.beginPath(); c.ellipse(9, 4.5, 8.5, 4.2, -0.05, 0, Math.PI * 2); c.fill(); });
    tex(S, 'cr_head', 12, 8, (c) => { c.beginPath(); c.arc(4, 4, 3.6, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(6, 2.6); c.lineTo(11.8, 4.4); c.lineTo(6, 5.6); c.fill(); });
    tex(S, 'cr_tail', 10, 6, (c) => { c.beginPath(); c.moveTo(10, 2.4); c.lineTo(0, 0); c.lineTo(1, 3); c.lineTo(0, 6); c.lineTo(10, 3.6); c.fill(); });
    tex(S, 'cr_wout', 16, 7, (c) => { // primaries: a fringed fan
      c.beginPath(); c.moveTo(0, 2); c.lineTo(14, 0); for (let i = 0; i < 5; i++) { c.lineTo(15.5 - i * 1.2, 1.5 + i * 1.2); c.lineTo(13 - i * 1.6, 1.8 + i * 1.1); } c.lineTo(0, 5.5); c.fill();
    });
    const n = (d.n as number) ?? 5, w = (d.w as number) ?? 160;
    const sc = (d.scale as number) ?? 1;
    for (let i = 0; i < n; i++) {
      const dd = 12.2 + i * 0.001;
      const mk = (k: string, ox = 0.5, oy = 0.5) => S.add.image(0, 0, k).setOrigin(ox, oy).setScale(sc / RES).setDepth(dd);
      const px = d.x + (i / Math.max(1, n - 1) - 0.5) * w + ((i * 37) % 13);
      const crow: Crow = {
        x: px, y: d.y, vx: 0, vy: 0, f: i % 2 ? 1 : -1, st: 'perch', t: Math.random() * 3, flap: Math.random() * 6, hop: 0, peck: 0, perchX: px, perchY: d.y,
        bones: {
          wInB: new Bone(S, wIn, dd - 0.0005), wOutB: mk('cr_wout', 0, 0.3).setTint(0x2a2d30),
          legA: new Bone(S, leg, dd - 0.0004), legB: new Bone(S, leg, dd - 0.0004),
          tail: mk('cr_tail', 1, 0.5), body: mk('cr_body'), head: mk('cr_head', 0.35, 0.5),
          wIn: new Bone(S, wIn, dd + 0.0003), wOut: mk('cr_wout', 0, 0.3),
        },
      };
      crow.bones.wInB.img.setTint(0x2a2d30);
      for (const b of [crow.bones.wIn, crow.bones.wInB, crow.bones.legA, crow.bones.legB]) b.img.setScale(sc / RES);
      this.crows.push(crow);
    }
    this.range = 0;
    this.reset(S.cp);
  }

  reset(cp: number) {
    const gone = cp >= ((this.d.before as number) ?? 99);
    for (const c of this.crows) {
      c.st = gone ? 'gone' : 'perch'; c.x = c.perchX; c.y = c.perchY; c.vx = c.vy = 0; c.t = Math.random() * 2;
      this.vis(c, !gone);
    }
    this.cool = 1.5;
  }
  vis(c: Crow, v: boolean) { for (const b of Object.values(c.bones)) ('img' in b ? b.img : b).setVisible(v); }

  update(dt: number, t: number) {
    const d = this.d, P = this.S.P;
    const attack = d.mode === 'attack';
    const inZone = attack && P.x > (d.x0 as number) && P.x < (d.x1 as number) && !this.S.dead;
    this.cool -= dt;
    const covered = this.S.sheltered(P.x, P.feetY - 30, 'rain', 0) || !this.S.lineClear(P.x, P.headY - 4, P.x, P.headY - 160);
    for (const c of this.crows) {
      if (c.st === 'gone') continue;
      c.t += dt;
      const sc = (d.scale as number) ?? 1;
      switch (c.st) {
        case 'perch': {
          // hop and peck; take off when she comes close (or the flock is roused)
          if (c.t > 0.6 + (c.perchX % 7) * 0.2 && Math.random() < dt * 0.8) { c.hop = 1; c.vx = c.f * 40; c.t = 0; }
          if (Math.random() < dt * 0.25) c.f = -c.f;
          c.hop = Math.max(0, c.hop - dt * 4); c.x += c.vx * dt * c.hop; c.vx *= 0.9;
          c.peck = Math.max(0, Math.sin(t * 0.006 + c.perchX) * 1.4 - 0.4);
          const near = Math.abs(P.x - c.x) < 150 && Math.abs(P.feetY - c.y) < 120;
          if (near || inZone || (d.flag && this.S.flags[d.flag as string])) {
            c.st = 'fly'; c.t = 0; c.vy = -260 - Math.random() * 120; c.vx = (Math.sign(c.x - P.x) || 1) * (80 + Math.random() * 120); c.f = Math.sign(c.vx);
            if (Math.random() < 0.5) sfx.yelp(); this.S.flags[`${this.id}_up`] = true;
          }
          break;
        }
        case 'fly': {
          c.flap += dt * 16;
          if (attack && inZone) {
            // wheel overhead
            const cx = P.x + Math.sin(t * 0.001 + c.perchX) * 180, cy = P.feetY - 230 + Math.cos(t * 0.0013 + c.perchX) * 40;
            c.vx += clamp((cx - c.x) * 2 - c.vx, -500 * dt, 500 * dt) ; c.vy += clamp((cy - c.y) * 2 - c.vy, -500 * dt, 500 * dt);
            if (this.cool <= 0 && !covered && Math.random() < dt * 2) {
              c.st = 'hover'; c.t = 0; this.cool = (d.every as number) ?? 2.4; sfx.yelp();
            }
          } else {
            c.vy -= 30 * dt; c.vx *= 1 + dt * 0.3;
            if (c.y < this.S.cameras.main.worldView.y - 200 || c.t > 6) { if (attack) { c.st = 'fly'; } else { c.st = 'gone'; this.vis(c, false); } }
          }
          c.x += c.vx * dt; c.y += c.vy * dt; c.f = Math.sign(c.vx) || c.f;
          break;
        }
        case 'hover': {
          // the tell: hangs in the air facing her, wings wide, then drops
          c.vx *= 0.9; c.vy *= 0.9; c.x += c.vx * dt; c.y += c.vy * dt; c.flap += dt * 6; c.f = Math.sign(P.x - c.x) || c.f;
          if (c.t > 0.55) { c.st = 'dive'; c.t = 0; c.dive = { x: c.x, y: c.y, tx: P.x + P.vx * 0.3, ty: P.feetY - 22 }; sfx.gust(); }
          if (covered) { c.st = 'fly'; }
          break;
        }
        case 'dive': {
          const dv = c.dive!;
          const dx = dv.tx - dv.x, dy = dv.ty - dv.y, L = Math.hypot(dx, dy) || 1;
          c.vx = (dx / L) * 620; c.vy = (dy / L) * 620; c.f = Math.sign(c.vx) || c.f;
          c.x += c.vx * dt; c.y += c.vy * dt;
          const b = P.bounds;
          if (!this.S.dead && c.x > b.min.x - 6 && c.x < b.max.x + 6 && c.y > b.min.y && c.y < b.max.y) { this.S.knock(c.f, 0.45); sfx.yelp(); c.st = 'fly'; c.vy = -300; }
          if (c.y > dv.ty + 30 || c.t > 1.2) { c.st = 'fly'; c.vy = -320; c.vx = c.f * 200; }
          break;
        }
      }
      this.pose(c, sc, t);
    }
  }

  pose(c: Crow, sc: number, t: number) {
    const B = c.bones, f = c.f;
    const flying = c.st !== 'perch';
    const tilt = flying ? clamp(c.vy / 900, -0.5, 0.6) * f : 0;
    B.body.setPosition(c.x, c.y - 6 * sc).setRotation(tilt).setFlipX(f < 0);
    const hx = c.x + f * 8 * sc, hy = c.y - 9 * sc + (c.peck ? c.peck * 5 * sc : 0) + (c.hop ? -Math.sin(c.hop * Math.PI) * 3 : 0);
    B.head.setPosition(hx, hy).setFlipX(f < 0).setRotation(c.peck * 0.8 * f + tilt);
    B.head.setOrigin(f > 0 ? 0.35 : 0.65, 0.5);
    B.tail.setPosition(c.x - f * 7 * sc, c.y - 6 * sc).setFlipX(f < 0).setRotation(tilt + (flying ? 0 : -0.3 * f));
    B.tail.setOrigin(f > 0 ? 1 : 0, 0.5);
    // wings: shoulder → wrist (bone) → primaries (fan). Down-stroke spreads, up-stroke folds at the wrist.
    const sh = { x: c.x + f * 2 * sc, y: c.y - 8 * sc };
    let a: number, fold: number;
    if (c.st === 'perch') { a = 0.25; fold = 1; }
    else if (c.st === 'dive') { a = -0.3; fold = 0.6; }
    else if (c.st === 'hover') { a = -1.1 + Math.sin(c.flap) * 0.25; fold = 0; }
    else { const s = Math.sin(c.flap); a = -0.2 - s * 1.0; fold = s > 0 ? 0.1 : 0.55; }
    const wing = (inner: Bone, outer: Phaser.GameObjects.Image, off: number) => {
      const ang = a + off;
      const wx = sh.x - f * Math.cos(ang) * 9 * sc * 0.6, wy = sh.y + Math.sin(ang) * 9 * sc;
      inner.set(sh.x, sh.y, wx, wy);
      const outA = Math.atan2(wy - sh.y, wx - sh.x) + f * fold * 2.2;
      outer.setPosition(wx, wy).setRotation(outA).setScale(sc / RES * (1 - fold * 0.3), sc / RES);
    };
    wing(B.wInB, B.wOutB, -0.25);
    wing(B.wIn, B.wOut, 0);
    // legs: down when perched, tucked when flying
    const legY = flying ? -4 : 0;
    const lr = ik(c.x - f * 1, c.y - 3 * sc, c.x - f * 1 + (flying ? -f * 4 : 0), c.y + legY, 4 * sc, 4 * sc, -f);
    B.legA.set(c.x - f * 1, c.y - 3 * sc, lr.ex, lr.ey); B.legB.set(c.x + f * 1.5, c.y - 3 * sc, lr.ex + f * 2.5, lr.ey);
    void lerp; void t;
  }
}
register('crows', Crows);
