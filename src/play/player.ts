import Phaser from 'phaser';
import { sfx } from '../audio';
import type { RigState } from './girl';
import type { PlayScene } from './PlayScene';
import { CAT, MJ, type MBody, type Prop } from './ents/base';
import type { Vine } from './ents/vine';
import type { Water } from './ents/water';

// The girl's body and controls: a capsule in Matter physics driven kinematically (velocity set every frame),
// with a jump that starts with a short anticipation crouch, ledge catching and climbing, pushing and pulling
// props, swinging on vines and swimming.

export const SPEED = 200, PUSH = 92, PULL = 78, JUMP_V = -548, COYOTE = 110, BUFFER = 140;
export const BODY_W = 16, BODY_H = 46;
export const PREJUMP = 0.045;     // the crouch before take-off (s): physics starts within ~50 ms of the press
export const FATAL_LAND = 1010;   // landing speed that kills (a fall of ~300 px)
const MAX_FALL = 1280;

export type Inp = { dir: number; up: boolean; down: boolean; jumpHeld: boolean; jumpPressed: boolean; grab: boolean; grabPressed: boolean; act: boolean };
export const NO_INPUT: Inp = { dir: 0, up: false, down: false, jumpHeld: false, jumpPressed: false, grab: false, grabPressed: false, act: false };

export type Corner = { x: number; y: number; side: number; body?: MBody };

export class Player {
  body: MBody;
  state: RigState = 'ground';
  facing = 1;
  vx = 0; vy = 0;
  grounded = true; wasGrounded = true;
  lastGround = 0; lastJump = -1e9; jumping = false; dropUntil = 0;
  prevVy = 0; landed = 0;
  preJump = -1;            // >= 0 while crouching for a jump
  airT = 0; jumped = false;
  landLock = 0;
  corner?: Corner;
  climbT = 0; climbFrom = { x: 0, y: 0 };
  vine?: Vine; vineI = 0;
  rope = { theta: 0, omega: 0, Lg: 0, releasedAt: -1e9 };
  water?: Water; swimT = 0; under = 0;
  carrying = true;
  pushing?: Prop;
  standingOn?: MBody;
  /** horizontal push from outside (wind, currents), px/s */
  extVx = 0;
  wvx = 0;
  /** walking is reversed / forced (possession) */
  forcedDir = 0;
  /** knocked off her feet: input ignored until it runs out */
  stunT = 0;

  constructor(public S: PlayScene, x: number, y: number) {
    this.body = S.matter.add.rectangle(x, y - BODY_H / 2 - 1, BODY_W, BODY_H, {
      chamfer: { radius: 5 }, friction: 0, frictionStatic: 0, frictionAir: 0, restitution: 0, label: 'player', ignoreGravity: true,
      collisionFilter: { category: CAT.PLAYER, mask: CAT.GROUND | CAT.PROP | CAT.PLAT },
    }) as MBody;
    MJ.Body.setInertia(this.body, Infinity);
  }

  get x() { return this.body.position.x; }
  get feetY() { return this.body.bounds.max.y; }
  get headY() { return this.body.bounds.min.y; }
  get bounds() { return this.body.bounds; }

  place(x: number, y: number) {
    MJ.Body.setPosition(this.body, { x, y: y - BODY_H / 2 - 1 });
    this.setV(0, 0);
    this.state = 'ground'; this.grounded = this.wasGrounded = true; this.prevVy = 0; this.preJump = -1; this.landLock = 0;
    this.vine = undefined; this.corner = undefined; this.water = undefined; this.body.isSensor = false; this.under = 0;
    this.jumping = false; this.lastJump = -1e9; this.carrying = true; this.extVx = 0; this.forcedDir = 0; this.wvx = 0; this.stunT = 0;
  }

  setV(vx: number, vy: number) { MJ.Body.setVelocity(this.body, { x: vx / 60, y: vy / 60 }); }

  solids() { return this.S.solidBodies(); }

  /** bodies right under her feet */
  groundUnder() {
    const f = { x: this.x, y: this.feetY };
    const hits = MJ.Query.region(this.solids(), { min: { x: f.x - BODY_W / 2 + 2, y: f.y - 1 }, max: { x: f.x + BODY_W / 2 - 2, y: f.y + 2.5 } }) as MBody[];
    return hits.filter((b) => b.label === 'ground' || b.label === 'plat'
      || MJ.Query.point([b], { x: f.x, y: f.y + 2 }).length || MJ.Query.point([b], { x: f.x - 6, y: f.y + 2 }).length || MJ.Query.point([b], { x: f.x + 6, y: f.y + 2 }).length);
  }

  control(inp: Inp, t: number, dt: number) {
    const v = MJ.Body.getVelocity(this.body);
    this.vx = v.x * 60; this.vy = v.y * 60;
    this.landed = 0;
    this.pushing = undefined;
    if (this.forcedDir && (this.state === 'ground' || this.state === 'air')) inp = { ...inp, dir: this.forcedDir };
    if (this.stunT > 0) { this.stunT -= dt; inp = { ...inp, dir: 0, jumpPressed: false, jumpHeld: false, up: false }; }

    if (this.state === 'hang') return this.hang(inp, t);
    if (this.state === 'climb') return this.climb(dt);
    if (this.state === 'rope') return this.swingVine(inp, dt, t);
    if (this.state === 'swim') return this.swim(inp, dt, t);

    const under = this.groundUnder();
    this.grounded = under.length > 0 && this.vy > -30;
    this.standingOn = under[0];
    if (this.grounded && under.every((b) => b.label === 'ground' || b.label === 'plat')) {
      const f = this.feetY;
      const tops = under.map((b) => b.bounds.min.y).filter((tp) => tp > f - 12 && tp <= f + 3);
      if (tops.length) { const top = Math.min(...tops); if (f > top + 0.4) MJ.Body.translate(this.body, { x: 0, y: top - f }); }
    }
    // ride moving platforms
    const plat = under.find((b) => b.label === 'plat') as (MBody & { plugin?: { dx?: number; dy?: number } }) | undefined;
    if (plat?.plugin?.dx || plat?.plugin?.dy) MJ.Body.translate(this.body, { x: plat.plugin.dx ?? 0, y: plat.plugin.dy ?? 0 });
    if (this.grounded) { this.lastGround = t; this.airT = 0; this.jumped = false; } else this.airT += dt;

    // horizontal: firm acceleration, a quick stop, decent air control
    let target = inp.dir * SPEED;
    if (this.landLock > 0) { this.landLock -= dt; target *= 0.35; }
    if (this.preJump >= 0) target *= 0.9;
    const v0 = this.wvx;
    const speeding = Math.abs(target) > Math.abs(v0) && Math.sign(target) === Math.sign(v0 || target);
    const rate = this.grounded ? (speeding ? 1150 + 750 * Math.min(1, Math.abs(v0) / 120) : 2500) : 1150;

    // props: lean into one to push; hold grab beside it and walk away to pull
    let mode: RigState = this.grounded ? 'ground' : 'air';
    if (this.grounded) {
      for (const p of this.S.props) {
        if (!p.alive) continue;
        const cb = p.body.bounds;
        const beside = this.bounds.max.y > cb.min.y + 10 && this.bounds.min.y < cb.max.y - 2;
        if (!beside) continue;
        const gapR = cb.min.x - this.bounds.max.x, gapL = this.bounds.min.x - cb.max.x;
        const touchR = gapR > -4 && gapR < 3, touchL = gapL > -4 && gapL < 3;
        if (!touchR && !touchL) continue;
        const side = touchR ? 1 : -1;
        const pv = MJ.Body.getVelocity(p.body);
        if (inp.grab && inp.dir === -side && p.pull > 0) {
          target = inp.dir * p.pull; mode = 'pull'; this.facing = side;
          MJ.Body.setVelocity(p.body, { x: (inp.dir * p.pull) / 60, y: pv.y });
          this.pushing = p;
          break;
        } else if (inp.dir === side && p.push > 0) {
          target = inp.dir * p.push; mode = 'push';
          MJ.Body.setVelocity(p.body, { x: (inp.dir * p.push) / 60, y: pv.y });
          this.pushing = p;
          break;
        }
      }
    }
    let wvx = v0 + Phaser.Math.Clamp(target - v0, -rate * dt, rate * dt);
    if (mode === 'push' || mode === 'pull') wvx = target;
    // blocked by a wall: don't keep building speed into it
    if (Math.abs(this.vx) < 2 && Math.abs(wvx) > 40 && this.grounded && mode === 'ground' && this.blocked(Math.sign(wvx))) wvx = 0;
    this.wvx = wvx;
    const vx = wvx + this.extVx;
    if (inp.dir !== 0 && mode !== 'pull') this.facing = inp.dir;

    // vertical: gravity with a soft hang at the top of the jump and a faster fall
    let vy = this.vy;
    if (this.grounded && !this.jumping) vy = Math.max(0, Math.min(vy, 60));
    else {
      const g = Math.abs(vy) < 110 ? 840 : vy > 0 ? 1660 : 1400;
      vy = Math.min(vy + g * dt, MAX_FALL);
    }
    if (vy >= 0 || this.grounded) this.jumping = false;
    if (inp.jumpPressed) this.lastJump = t;

    // the jump: a short crouch (anticipation), then take-off
    if (this.preJump < 0 && t - this.lastJump < BUFFER && t - this.lastGround < COYOTE && mode !== 'pull') {
      this.preJump = 0; this.lastJump = -1e9;
    }
    if (this.preJump >= 0) {
      this.preJump += dt;
      if (this.preJump >= PREJUMP || (!this.grounded && t - this.lastGround > COYOTE * 0.6)) {
        vy = JUMP_V * (inp.jumpHeld ? 1 : 0.8); this.jumping = true; this.lastGround = -1e9; this.grounded = false; mode = 'air';
        this.preJump = -1; this.airT = 0; this.jumped = true;
        sfx.jump(); this.S.dustAt(this.x, this.feetY - 2, 3);
      }
    } else if (this.jumping && !inp.jumpHeld && vy < -240) { vy *= 0.62; this.jumping = false; }

    // landing: absorb it (scaled by speed); a fall too far is fatal
    if (this.grounded && !this.wasGrounded && this.prevVy > 150) {
      this.landed = this.prevVy;
      if (this.prevVy > FATAL_LAND) { this.wasGrounded = true; this.setV(0, 0); this.S.die('fall'); return; }
      sfx.land();
      if (this.prevVy > 620) { this.landLock = Math.min(0.32, (this.prevVy - 560) / 1400); this.S.shake(0.002 * (this.prevVy / 900)); }
      this.S.dustAt(this.x, this.feetY - 2, Math.round(3 + this.prevVy / 120));
    }
    this.wasGrounded = this.grounded;
    this.prevVy = vy;
    this.state = mode;
    this.setV(vx, vy);
    this.vx = vx; this.vy = vy;

    if (!this.grounded && t > this.dropUntil) this.tryLedge(inp);
    if (!this.grounded && t - this.rope.releasedAt > 350) this.tryVine();
    this.tryWater();
  }

  /** knocked by something (a diving crow, a gust, a falling sack) */
  knock(dir: number, stun: number) {
    if (this.state === 'hang' || this.state === 'climb') { this.state = 'air'; this.body.isSensor = false; this.dropUntil = this.S.t + 400; }
    if (this.state === 'rope') this.releaseVine(this.S.t, 0, dir * 120, -80);
    this.state = 'air'; this.grounded = false; this.wasGrounded = false; this.jumping = false; this.jumped = false; this.airT = 0.3;
    this.wvx = dir * 250; this.setV(dir * 250, -300); this.stunT = stun; this.preJump = -1;
    this.S.rig.bump(-30);
  }

  /** a solid right beside her on that side */
  blocked(side: number) {
    const b = this.bounds, x = side > 0 ? b.max.x + 1 : b.min.x - 2;
    return MJ.Query.region(this.solids(), { min: { x, y: b.min.y + 4 }, max: { x: x + 1, y: b.max.y - 6 } }).length > 0;
  }

  /** catch a ledge: moving toward it, near the top of a jump or falling past it */
  tryLedge(inp: Inp) {
    const top = this.headY;
    for (const c of this.S.cornerList()) {
      const edge = this.x + c.side * (BODY_W / 2);
      const toward = inp.dir === c.side || this.vx * c.side > 30 || this.state === 'swim';
      // she'd clear it anyway (still rising, and the top of the jump will carry her feet over): no need to hang
      const apexFeet = this.vy < 0 ? this.feetY - (this.vy * this.vy) / (2 * 1400) : this.feetY;
      if (apexFeet < c.y - 3) continue;
      if (toward && Math.abs(edge - c.x) < 9 && c.y > top - 16 && c.y < top + 22 && this.vy > -300) { this.grabLedge(c); return true; }
    }
    return false;
  }

  grabLedge(c: Corner) {
    this.corner = c;
    this.state = 'hang';
    this.facing = c.side;
    this.water = undefined;
    MJ.Body.setPosition(this.body, { x: c.x - c.side * (BODY_W / 2 + 1), y: c.y + 52 - BODY_H / 2 });
    this.setV(0, 0); this.wvx = 0;
    this.S.rig.bump(40);
    sfx.creakSoft();
  }

  hang(inp: Inp, t: number) {
    const c = this.corner!;
    if (c.body) { // a corner on a prop: follow it
      const b = c.body.bounds;
      c.x = c.side > 0 ? b.min.x : b.max.x; c.y = b.min.y;
    }
    MJ.Body.setPosition(this.body, { x: c.x - c.side * (BODY_W / 2 + 1), y: c.y + 52 - BODY_H / 2 });
    this.setV(0, 0);
    if (inp.up || inp.dir === c.side || inp.jumpPressed) {
      this.state = 'climb'; this.climbT = 0;
      this.climbFrom = { x: this.x, y: this.body.position.y };
      this.body.isSensor = true;
      sfx.step();
    } else if (inp.down || inp.dir === -c.side || inp.grabPressed) {
      this.state = 'air'; this.dropUntil = t + 300; this.wasGrounded = false; this.airT = 0.3; this.jumped = false;
    }
  }

  climb(dt: number) {
    const c = this.corner!;
    this.climbT = Math.min(1, this.climbT + dt / 0.8);
    const p = this.climbT;
    const sm = (q: number) => { q = Phaser.Math.Clamp(q, 0, 1); return q * q * (3 - 2 * q); };
    const endX = c.x + c.side * 11, endY = c.y - BODY_H / 2;
    const x = Phaser.Math.Linear(this.climbFrom.x, endX, sm((p - 0.35) / 0.55));
    const y = Phaser.Math.Linear(this.climbFrom.y, endY, sm(p / 0.6));
    MJ.Body.setPosition(this.body, { x, y });
    this.setV(0, 0);
    if (p >= 1) {
      this.body.isSensor = false;
      this.state = 'ground'; this.grounded = this.wasGrounded = true; this.prevVy = 0;
      sfx.step();
    }
  }

  // ------------------------------------------------------------------ vines

  tryVine() {
    const hx = this.x + this.facing * 2, hy = this.feetY - 50;
    for (const v of this.S.vines) {
      const i = v.catchAt(hx, hy);
      if (i < 0) continue;
      const r = this.rope;
      this.vine = v; this.vineI = i;
      r.Lg = Math.max(70, i * v.seg);
      r.theta = Math.atan2(hx - v.ax, hy - v.ay);
      r.omega = (this.vx * Math.cos(r.theta) - this.vy * Math.sin(r.theta)) / r.Lg;
      this.state = 'rope';
      this.body.isSensor = true;
      v.grabbed();
      sfx.creakSoft();
      return;
    }
  }

  swingVine(inp: Inp, dt: number, t: number) {
    const v = this.vine!, r = this.rope;
    if (!v || v.broken) { this.releaseVine(t, 0); return; }
    const pump = inp.dir === 0 ? 0 : inp.dir * (Math.sign(r.omega || inp.dir) === inp.dir ? 2.3 : 1.2);
    r.omega += (-(1400 / r.Lg) * Math.sin(r.theta) + pump) * dt;
    r.omega *= 1 - 0.12 * dt;
    r.theta = Phaser.Math.Clamp(r.theta + r.omega * dt, -1.3, 1.3);
    if (inp.up) r.Lg = Math.max(80, r.Lg - 70 * dt);
    if (inp.down) r.Lg = Math.min(v.len - 10, r.Lg + 90 * dt);
    if (inp.dir !== 0) this.facing = inp.dir;
    const gx = v.ax + Math.sin(r.theta) * r.Lg, gy = v.ay + Math.cos(r.theta) * r.Lg;
    const phi = -r.theta, hx = this.facing * 1, hy = -52;
    const fx = gx - (hx * Math.cos(phi) - hy * Math.sin(phi)), fy = gy - (hx * Math.sin(phi) + hy * Math.cos(phi));
    MJ.Body.setPosition(this.body, { x: fx, y: fy - BODY_H / 2 });
    this.setV(0, 0);
    v.held(gx, gy, r.Lg);
    if (Math.abs(r.omega) > 1.6 && Math.random() < dt * 2) sfx.creakSoft();
    if (inp.jumpPressed || inp.grabPressed) {
      const tv = r.Lg * r.omega;
      this.releaseVine(t, inp.grabPressed && !inp.jumpPressed ? 0 : 110, tv * Math.cos(r.theta), -tv * Math.sin(r.theta));
      sfx.jump();
    }
  }

  releaseVine(t: number, kick: number, vx = 0, vy = 0) {
    this.vine?.released();
    this.vine = undefined;
    this.rope.releasedAt = t;
    this.state = 'air'; this.body.isSensor = false; this.wasGrounded = false; this.airT = 0.2; this.jumped = kick > 0;
    this.setV(vx, vy - kick);
    this.wvx = vx;
    this.jumping = false;
  }

  // ------------------------------------------------------------------ water

  tryWater() {
    if (this.state === 'hang' || this.state === 'climb') return;
    const w = this.S.waterAt(this.x, this.feetY);
    if (!w) return;
    if (this.feetY > w.surface + 30 && this.state !== 'swim') {
      this.state = 'swim'; this.water = w; this.swimT = 0;
      if (this.vy > 120) { sfx.splash(Math.min(1.5, this.vy / 500)); w.splash(this.x, Math.min(1.6, this.vy / 400)); }
      this.jumping = false;
    }
  }

  swim(inp: Inp, dt: number, t: number) {
    const w = this.water!;
    this.swimT += dt * (0.6 + Math.abs(this.vx) / 120);
    const targetFeet = w.surface + 34;
    // a slow, floaty horizontal stroke; buoyancy brings her back to the surface
    // her own stroke, plus the current's drift
    const stroke = this.wvx + Phaser.Math.Clamp(inp.dir * 108 - this.wvx, -260 * dt, 260 * dt);
    const vx = stroke + w.current;
    let vy = this.vy + (targetFeet - this.feetY) * 22 * dt - this.vy * 3.2 * dt;
    if (w.pull(this.x)) vy += 260 * dt * 3; // undertow
    if (inp.dir) this.facing = inp.dir;
    this.setV(vx + this.extVx, vy);
    this.vx = vx; this.vy = vy; this.wvx = stroke;
    // under the surface?
    if (this.headY > w.surface + 2) this.under += dt; else this.under = Math.max(0, this.under - dt * 2);
    if (this.under > 1.6 || w.ceilingAbove(this.x, this.headY)) { this.S.die('drown'); return; }
    if (Math.random() < dt * 2.2 && Math.abs(vx) > 30) sfx.paddle();
    // out of the water: walk out where it's shallow, hop out, or catch an edge
    if (this.feetY < w.surface + 18 || !this.S.waterAt(this.x, this.feetY)) { this.state = 'air'; this.water = undefined; this.airT = 0.2; return; }
    if (this.groundUnder().length && this.feetY < w.surface + 40) { this.state = 'ground'; this.water = undefined; return; }
    if (inp.jumpPressed) {
      this.state = 'air'; this.water = undefined; this.wasGrounded = false; this.jumping = true; this.jumped = true; this.airT = 0;
      this.setV(vx * 1.2, -470); this.wvx = vx * 1.2; sfx.splash(0.6); w.splash(this.x, 0.7);
      return;
    }
    if (this.tryLedgeSwim(inp)) return;
    void t;
  }

  tryLedgeSwim(inp: Inp) {
    const top = this.headY;
    for (const c of this.S.cornerList()) {
      const edge = this.x + c.side * (BODY_W / 2);
      if ((inp.dir === c.side) && Math.abs(edge - c.x) < 12 && c.y > top - 26 && c.y < top + 30) { this.grabLedge(c); return true; }
    }
    return false;
  }
}
