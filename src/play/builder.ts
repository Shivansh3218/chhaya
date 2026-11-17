import type { Block, Checkpoint, Cond, EntDef, HintDef, LevelData, Step, Style, Theme } from './types';

// A cursor-based level builder. The cursor (x, y) is the right edge of the ground laid so far and the height of
// its top. Every method lays geometry *and* records how to get through it (steps for the autopilot), so the
// automated playthrough follows the level as it is edited.
//
// Movement envelope (keep the geometry inside it): a running jump clears ~150 px of gap on the level and rises
// ~105 px; with a ledge grab she can catch an edge ~165 px above the floor. Falls longer than ~300 px are fatal.

export const DEEP = 900; // how far down ground blocks reach

export class Builder {
  x: number; y: number;
  blocks: Block[] = [];
  ents: EntDef[] = [];
  checkpoints: Checkpoint[] = [];
  hints: HintDef[] = [];
  steps: Step[] = [];
  cpSteps: number[] = [];
  decor: LevelData['decor'] = [];
  style: Style;
  private n = 0;
  minY: number; maxY: number;
  endFlag?: string;

  constructor(public id: string, public theme: Theme, x = 0, y = 600) {
    this.x = x; this.y = y; this.style = theme.ground;
    this.minY = y; this.maxY = y;
  }

  uid(p: string) { return `${p}${this.n++}`; }
  private track(y: number) { this.minY = Math.min(this.minY, y); this.maxY = Math.max(this.maxY, y); }

  // ------------------------------------------------------------------ ground

  /** a block anywhere (does not move the cursor) */
  block(x: number, y: number, w: number, h = DEEP, o: Partial<Block> = {}) {
    const b: Block = { x, y, w, h, style: o.style ?? this.style, ...o };
    this.blocks.push(b);
    this.track(y);
    return b;
  }

  /** a ceiling whose underside is at `bottom` (it reaches far up, out of frame) */
  ceil(x: number, bottom: number, w: number) { return this.block(x, bottom - 1400, w, 1400, { ceil: true }); }

  /** flat ground of width w at the cursor; walks across it */
  floor(w: number, o: Partial<Block> & { walk?: boolean } = {}) {
    const b = this.block(this.x, this.y, w, o.h ?? DEEP, o);
    this.x += w;
    if (o.walk !== false) this.go(this.x - 14);
    return b;
  }

  /** ground continues at a new height (a step she can hop or walk) without a gap */
  rise(dy: number, w: number, o: Partial<Block> = {}) {
    const up = -dy;
    this.y += dy;
    this.runUp(this.x);
    if (up > 30 && up <= 100) this.steps.push({ k: 'jump', dir: 1, at: this.x - 34, hold: 22 });
    else if (up > 100) { this.steps.push({ k: 'jump', dir: 1, at: this.x - 26, hold: 24 }, { k: 'climb' }); }
    return this.floor(w, o);
  }

  /** a jump is about to be taken near x: a walk that stops at the edge would kill the run-up, so drop it */
  private runUp(x: number) {
    const last = this.steps[this.steps.length - 1];
    if (last && last.k === 'to' && Math.abs(last.x - x) < 40) this.steps.pop();
  }

  /** a gap of width w; the far side is at y + dy. kind: what is in the gap */
  gap(w: number, dy = 0, kind: 'abyss' | 'stakes' | 'water' | 'none' = 'abyss', o: Partial<Block> & { far?: number } = {}) {
    const x0 = this.x;
    const bottom = Math.max(this.y, this.y + dy) + 260;
    if (kind === 'stakes') this.ents.push({ type: 'stakes', x: x0, y: bottom - 40, w });
    if (kind === 'abyss') this.ents.push({ type: 'pit', x: x0, y: bottom, w });
    this.runUp(x0);
    this.x += w;
    this.y += dy;
    const up = -dy;
    const climb = up > 70 || w > 150;
    this.steps.push({ k: 'jump', dir: 1, at: x0 - 10, hold: 24 });
    if (climb) this.steps.push({ k: 'climb' });
    return this.floor(o.far ?? 300, o);
  }

  /** a drop down to y + h, w later (walks off the edge) */
  drop(h: number, w: number, o: Partial<Block> = {}) {
    this.y += h;
    return this.floor(w, o);
  }

  /** a ledge she must climb: a wall of height h (jump, catch the edge, climb) */
  climbUp(h: number, w: number, o: Partial<Block> = {}) {
    this.y -= h;
    this.runUp(this.x);
    this.steps.push({ k: 'jump', dir: 1, at: this.x - 18, hold: 24 }, { k: 'climb' });
    return this.floor(w, o);
  }

  // ------------------------------------------------------------------ things

  ent<T extends Omit<EntDef, 'x' | 'y'> & { x?: number; y?: number }>(d: T) {
    const e = { x: this.x, y: this.y, ...d } as unknown as EntDef;
    if (!e.id) e.id = this.uid(e.type);
    this.ents.push(e);
    return e;
  }

  /** a lamp checkpoint at the cursor (or at x on the ground at y) */
  cp(x = this.x - 60, y = this.y, lamp: Checkpoint['lamp'] = 'post') {
    this.checkpoints.push({ x, y, lamp });
    this.cpSteps.push(this.steps.length);
  }

  hint(x0: number, x1: number, text: string, o: Partial<HintDef> = {}) { this.hints.push({ x0, x1, text, ...o }); }

  deco(key: string, x: number, y: number, o: Omit<LevelData['decor'][number], 'key' | 'x' | 'y'> = {}) { this.decor.push({ key, x, y, ...o }); }

  /** a gap with a vine hanging over it: catch it, swing, let go over the far side. o.breaks: a rotten vine */
  vineGap(w: number, o: { dy?: number; len?: number; breaks?: number; far?: number; kind?: 'abyss' | 'stakes' | 'none'; release?: number } = {}) {
    const x0 = this.x, vx = x0 + w * 0.45, len = o.len ?? 300;
    const vy = this.y - len - 40;
    this.ent({ type: 'vine', x: vx, y: vy, len, bough: true, breaks: o.breaks });
    const bottom = this.y + 260;
    if ((o.kind ?? 'abyss') === 'abyss') this.ents.push({ type: 'pit', x: x0, y: bottom, w });
    if (o.kind === 'stakes') this.ents.push({ type: 'stakes', x: x0, y: bottom - 40, w });
    this.steps.push({ k: 'jump', dir: 1, at: x0 - 8, hold: 24 });
    this.runUp(x0);
    const rel = o.release ?? 0.42;
    this.swing(1, (s: { P: { rope: { theta: number; omega: number } } }) => s.P.rope.theta > rel && s.P.rope.omega > 0.3);
    this.x += w; this.y += o.dy ?? 0;
    return this.floor(o.far ?? 300);
  }

  // ------------------------------------------------------------------ steps

  go(x: number, o: { grab?: boolean; tol?: number } = {}) { this.steps.push({ k: 'to', x, ...o }); }
  jumpAt(at: number, dir = 1, hold = 24) { this.steps.push({ k: 'jump', dir, at, hold }); }
  climb() { this.steps.push({ k: 'climb' }); }
  wait(f: number) { this.steps.push({ k: 'wait', f }); }
  until(c: Cond, o: Omit<Extract<Step, { k: 'until' }>, 'k' | 'c'> = {}) { this.steps.push({ k: 'until', c, ...o }); }
  act(at?: number) { this.steps.push({ k: 'act', at }); }
  hold(f: number, o: Omit<Extract<Step, { k: 'hold' }>, 'k' | 'f'> = {}) { this.steps.push({ k: 'hold', f, ...o }); }
  push(id: string, x: number, pull = false) { this.steps.push({ k: 'push', id, x, pull }); }
  swing(dir: number, release: Cond, climb = 0) { this.steps.push({ k: 'swing', dir, release, climb }); }
  do(fn: (s: unknown) => void) { this.steps.push({ k: 'do', fn }); }

  // ------------------------------------------------------------------ finish

  done(): LevelData {
    // which faces are exposed (ragged, grabbable): no neighbour covering the corner
    for (const b of this.blocks) {
      if (b.ceil) { b.left = b.left ?? false; b.right = b.right ?? false; b.noGrab = true; }
      const covered = (px: number, py: number) => this.blocks.some((o) => o !== b && px > o.x - 0.5 && px < o.x + o.w + 0.5 && py > o.y - 0.5 && py < o.y + o.h);
      if (b.left === undefined) b.left = !covered(b.x - 2, b.y + 6);
      if (b.right === undefined) b.right = !covered(b.x + b.w + 2, b.y + 6);
    }
    const xs = this.blocks.map((b) => b.x), xe = this.blocks.map((b) => b.x + b.w);
    const minX = Math.min(...xs), maxX = Math.max(...xe);
    const top = this.minY - 700, bottom = this.maxY + 420;
    this.steps.push({ k: 'to', x: this.x + 400 });
    if (this.cpSteps.length) this.cpSteps[0] = 0;
    return {
      id: this.id, theme: this.theme, blocks: this.blocks, checkpoints: this.checkpoints, ents: this.ents, hints: this.hints,
      endX: this.x - 80, endFlag: this.endFlag, killY: this.maxY + 380,
      bounds: { x: minX - 200, y: top, w: maxX - minX + 400, h: bottom - top },
      steps: this.steps, cpSteps: this.cpSteps, decor: this.decor,
    };
  }
}
