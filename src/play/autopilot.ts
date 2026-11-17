import type { PlayScene } from './PlayScene';
import { NO_INPUT, type Inp } from './player';
import type { Step } from './types';

// Plays a level from the steps its builder recorded (dev testing only). On a death it rewinds to the steps of
// the checkpoint she restarts from, so the run reports every death but still tries to finish.

export class Autopilot {
  i = 0; f = 0; phase = 0;
  cpStep: number[] = [0];
  log: string[] = [];
  done = false;
  private airborne = false;
  private hopping = false;
  private stuckF = 0; private lastX = 0;

  constructor(public S: PlayScene, public steps: Step[], cp = 0, cpSteps: number[] = []) {
    this.i = cpSteps[cp] ?? 0;
    this.cpStep = cpSteps.slice();
  }

  private next(note = '') {
    if (note) this.log.push(`${this.i}:${note}`);
    this.i++; this.f = 0; this.phase = 0; this.airborne = false; this.stuckF = 0;
    if (this.i >= this.steps.length) this.done = true;
  }

  onCheckpoint(cp: number) { if (this.cpStep[cp] === undefined) this.cpStep[cp] = this.i; }
  onRespawn(cp: number) {
    let k = cp;
    while (k > 0 && this.cpStep[k] === undefined) k--;
    this.i = this.cpStep[k] ?? 0; this.f = 0; this.phase = 0; this.airborne = false; this.done = false;
  }

  input(): Inp {
    const S = this.S, P = S.P;
    const inp: Inp = { ...NO_INPUT };
    if (S.dead || S.ended || this.done) return inp;
    const st = this.steps[this.i];
    if (!st) { this.done = true; return inp; }
    this.f++;
    // stuck detector (not for waits)
    if (st.k !== 'wait' && st.k !== 'until' && st.k !== 'hold') {
      if (Math.abs(P.x - this.lastX) < 0.3 && P.state !== 'rope') this.stuckF++; else this.stuckF = 0;
      this.lastX = P.x;
      if (this.stuckF > 300) { this.log.push(`${this.i}:STUCK ${st.k} at x=${P.x.toFixed(0)} y=${P.feetY.toFixed(0)} state=${P.state}`); this.next(); return inp; }
    }
    switch (st.k) {
      case 'to': {
        const dx = st.x - P.x;
        if (Math.abs(dx) < (st.tol ?? 6) && (P.grounded || P.state === 'swim' || P.state === 'push' || P.state === 'pull')) { this.next(); break; }
        if (P.state === 'hang') { inp.up = true; break; }
        inp.dir = Math.sign(dx); inp.grab = !!st.grab; inp.up = !!st.up;
        // coast the last few pixels instead of overshooting
        if (Math.abs(dx) < 16 && Math.sign(P.vx) === Math.sign(dx) && Math.abs(P.vx) > 50) inp.dir = 0;
        if (this.f > 60 && Math.abs(dx) < 12 && P.grounded) { this.next(); break; }
        break;
      }
      case 'jump': {
        const at = st.at ?? P.x;
        if (this.phase === 0) {
          if (P.state === 'hang') { inp.up = true; break; }
          if (st.dir * (at - P.x) > 1) { inp.dir = st.dir; break; }
          if (!P.grounded && P.state !== 'swim') { inp.dir = st.dir; if (this.f > 240) this.next('jump: never grounded'); break; }
          this.phase = 1; this.f = 0;
        }
        if (this.phase === 1) {
          inp.dir = st.dir; inp.jumpHeld = this.f <= (st.hold ?? 24);
          if (!P.grounded) this.airborne = true;
          if (this.airborne && (P.grounded || P.state === 'hang' || P.state === 'rope' || P.state === 'swim')) { this.next(); break; }
          if (this.f > 300) this.next('jump timeout');
        }
        break;
      }
      case 'climb': {
        if (P.state === 'hang') { inp.up = true; this.phase = 1; break; }
        if (P.state === 'climb') { this.phase = 1; break; }
        if (this.phase === 1 && P.grounded) { this.next(); break; }
        if (this.f > 90) this.next(this.phase ? '' : 'climb: was not hanging');
        break;
      }
      case 'wait': if (this.f >= st.f) this.next(); break;
      case 'until': {
        if (st.c(S)) { this.next(); break; }
        inp.dir = st.dir ?? 0; inp.grab = !!st.grab; inp.up = !!st.up; inp.down = !!st.down; inp.jumpHeld = !!st.jump;
        if (this.f > (st.max ?? 1800)) this.next(`until timeout ${st.note ?? ''}`);
        break;
      }
      case 'act': {
        if (st.at !== undefined && Math.abs(st.at - P.x) > 5 && this.phase === 0) { inp.dir = Math.sign(st.at - P.x); break; }
        if (this.phase === 0) { this.phase = 1; inp.act = true; break; }
        this.next();
        break;
      }
      case 'hold': {
        inp.dir = st.dir ?? 0; inp.grab = !!st.grab; inp.up = !!st.up; inp.down = !!st.down; inp.jumpHeld = !!st.jump;
        if (this.f >= st.f) this.next();
        break;
      }
      case 'push': {
        const e = S.byId.get(st.id) as unknown as { body: MatterJS.BodyType } | undefined;
        if (!e) { this.next(`push: no ${st.id}`); break; }
        const ox = e.body.position.x;
        const want = Math.sign(st.x - ox);
        if (Math.abs(st.x - ox) < 4 || want === 0) { this.next(); break; }
        const b = e.body.bounds;
        if (P.standingOn === e.body) { inp.dir = -want; break; } // on top of it: step off the back
        if (!st.pull) {
          // get behind it, then push
          const behind = want > 0 ? b.min.x - 9 : b.max.x + 9;
          if (P.state !== 'push' && Math.abs(P.x - behind) > 3 && Math.sign(behind - P.x) !== want) {
            // on the wrong side: walk round it, hopping over if it's in the way
            inp.dir = Math.sign(behind - P.x);
            const halfW = (b.max.x - b.min.x) / 2 + 12, cx = (b.max.x + b.min.x) / 2;
            if (P.grounded && Math.abs(P.x - cx) < halfW + 6 && !this.hopping) { this.hopping = true; inp.jumpHeld = true; }
            else if (this.hopping) { inp.jumpHeld = !P.grounded || this.f % 30 < 20; if (P.grounded && Math.abs(P.x - cx) > halfW + 6) this.hopping = false; }
            break;
          }
          this.hopping = false;
          inp.dir = want;
        } else {
          const front = want > 0 ? b.max.x + 9 : b.min.x - 9;
          if (P.state !== 'pull' && Math.abs(P.x - front) > 2) { inp.dir = Math.sign(front - P.x); break; }
          inp.grab = true; inp.dir = want;
        }
        if (this.f > 1500) this.next(`push timeout ${st.id} at ${ox.toFixed(0)}`);
        break;
      }
      case 'swing': {
        if (P.state !== 'rope') { if (this.phase === 1) { if (P.grounded || P.state === 'hang' || P.state === 'swim') this.next(); else inp.dir = st.dir; break; } if (this.f > 120) this.next('swing: not on a vine'); break; }
        this.phase = 1;
        if (st.climb && this.f < st.climb) { inp.up = true; break; }
        const om = P.rope.omega;
        inp.dir = om === 0 ? st.dir : Math.sign(om); // pump with the swing
        if (st.release(S)) { inp.jumpHeld = true; inp.dir = st.dir; }
        if (this.f > 1500) this.next('swing timeout');
        break;
      }
      case 'do': st.fn(S); this.next(); break;
    }
    return inp;
  }
}
