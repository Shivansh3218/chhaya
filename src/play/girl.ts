import Phaser from 'phaser';

// The girl as a live skeleton: every frame her pose is computed (gait by distance travelled so feet never slide,
// IK for arms and legs, springs for weight and landing, a verlet braid, a lagging lehenga) and drawn with
// smooth, pre-rendered body parts. Units are world pixels; local space has her feet at (0, 0), facing +x, up is -y.

const INK = '#07080a';
const RES = 4; // body-part textures are drawn at 4x and shown at 1/4 for clean edges

export const DIM = {
  thigh: 11.2, shin: 11, uarm: 8.4, farm: 8.2,
  hipY: -21.5, neck: 15.5, headR: 7.8, shoulderDrop: 1.6,
};

/** two-bone IK in a plane: the middle joint for a reachable target; bend = +1 bends the joint toward +x when the chain points down */
function ik(ax: number, ay: number, tx: number, ty: number, l1: number, l2: number, bend: number) {
  let dx = tx - ax, dy = ty - ay;
  let d = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.001;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  if (d < 0.001) d = 0.001;
  const a = Math.acos(Phaser.Math.Clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ang = Math.atan2(dy, dx) - bend * a;
  return { jx: ax + Math.cos(ang) * l1, jy: ay + Math.sin(ang) * l1, ex: ax + dx, ey: ay + dy };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => { t = Phaser.Math.Clamp(t, 0, 1); return t * t * (3 - 2 * t); };

/** one stride of one foot (phase 0..1): planted and sliding back (exactly with her motion), then lifted and swung forward */
function footPath(ph: number, A: number, lift: number) {
  ph = ((ph % 1) + 1) % 1;
  if (ph < 0.5) return { x: A - (ph / 0.5) * 2 * A, y: 0, planted: true };
  const u = (ph - 0.5) / 0.5, e = u * u * (3 - 2 * u);
  return { x: -A + e * 2 * A, y: -Math.sin(u * Math.PI) * lift * (1 - 0.25 * u), planted: false };
}

export function makeGirlTextures(scene: Phaser.Scene) {
  const tex = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return; // already made, or replaced by hand-made art
    const t = scene.textures.createCanvas(key, Math.ceil(w * RES), Math.ceil(h * RES))!;
    const c = t.getContext();
    c.scale(RES, RES);
    c.fillStyle = INK; c.strokeStyle = INK;
    draw(c);
    t.refresh();
  };
  // a limb: a tapered capsule from (r1, h/2) to (r1 + len, h/2)
  const capsule = (key: string, len: number, w1: number, w2: number) => {
    const r1 = w1 / 2, r2 = w2 / 2, H = Math.max(w1, w2);
    tex(key, len + r1 + r2, H, (c) => {
      const y = H / 2;
      c.beginPath();
      c.arc(r1, y, r1, Math.PI / 2, Math.PI * 1.5);
      c.lineTo(r1 + len, y - r2);
      c.arc(r1 + len, y, r2, -Math.PI / 2, Math.PI / 2);
      c.closePath();
      c.fill();
    });
  };
  capsule('g_thigh', DIM.thigh, 4.6, 3.6);
  capsule('g_shin', DIM.shin, 3.5, 2.5);
  capsule('g_uarm', DIM.uarm, 2.9, 2.4);
  capsule('g_farm', DIM.farm, 2.4, 2.0);
  // a small foot / chappal, heel at the left
  tex('g_foot', 7, 3.2, (c) => {
    c.beginPath(); c.moveTo(0.4, 1.0); c.quadraticCurveTo(0.2, 3.1, 2, 3.1); c.lineTo(6.2, 3.1); c.quadraticCurveTo(7, 2.4, 5.6, 1.4); c.quadraticCurveTo(3, 0.2, 0.4, 1.0); c.fill();
  });
  // torso: hip (bottom) to shoulders (top); a child's narrow chest, a kurti that widens at the hip
  tex('g_torso', 12, DIM.neck + 2, (c) => {
    const h = DIM.neck + 2;
    c.beginPath();
    c.moveTo(1.6, h); c.quadraticCurveTo(1.4, h * 0.55, 2.8, 2.4); c.quadraticCurveTo(6, 0.4, 9.2, 2.4);
    c.quadraticCurveTo(10.6, h * 0.55, 10.4, h); c.closePath(); c.fill();
  });
  // head in profile (facing right): round skull, small nose, hair pulled back into a knot
  tex('g_head', 22, 20, (c) => {
    const cx = 11, cy = 10.5, r = DIM.headR;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(cx + r - 0.6, cy - 0.6); c.quadraticCurveTo(cx + r + 1.9, cy + 1.1, cx + r - 0.3, cy + 2.2); c.fill(); // nose
    c.beginPath(); c.moveTo(cx + r - 1.2, cy + 3.2); c.quadraticCurveTo(cx + r + 0.4, cy + 4.6, cx + r - 2.2, cy + 5.6); c.fill(); // chin
    c.beginPath(); c.arc(cx - r + 0.8, cy - 2.6, 3.3, 0, Math.PI * 2); c.fill(); // hair knot
    c.beginPath(); c.arc(cx + 1.5, cy - r + 1.4, 3.2, Math.PI, 0); c.fill(); // fringe line
  });
  // lehenga: gathered at the waist, flaring to a soft, uneven hem (top centre is the waist)
  tex('g_skirt', 26, 16, (c) => {
    c.beginPath(); c.moveTo(9, 0); c.lineTo(17, 0);
    c.quadraticCurveTo(21, 7, 25.2, 14.2);
    c.quadraticCurveTo(22, 15.8, 19, 15); c.quadraticCurveTo(16, 16.2, 13, 15.2); c.quadraticCurveTo(10, 16.2, 7, 15); c.quadraticCurveTo(4, 15.8, 0.8, 14.2);
    c.quadraticCurveTo(5, 7, 9, 0); c.fill();
  });
  tex('g_bead', 4, 4, (c) => { c.beginPath(); c.arc(2, 2, 1.8, 0, Math.PI * 2); c.fill(); });
  tex('g_tassel', 4, 6, (c) => { c.beginPath(); c.moveTo(2, 0); c.lineTo(3.6, 5.6); c.lineTo(0.4, 5.6); c.closePath(); c.fill(); });
  tex('g_hand', 3.6, 3.6, (c) => { c.beginPath(); c.arc(1.8, 1.8, 1.5, 0, Math.PI * 2); c.fill(); });
  // the diya: a little clay lamp with a pinched spout
  tex('g_diya', 10, 5, (c) => {
    c.beginPath(); c.moveTo(0.6, 1.4); c.quadraticCurveTo(3, 5.4, 6.4, 3.6); c.lineTo(9.6, 1.6); c.lineTo(6.2, 1.4); c.closePath(); c.fill();
  });
}

export type RigState = 'ground' | 'air' | 'push' | 'pull' | 'hang' | 'climb' | 'rope' | 'swim' | 'dead';

export interface RigInput {
  state: RigState;
  vx: number; vy: number;     // world velocity, px/s
  dx: number;                 // world distance moved this frame (x)
  facing: number;             // +1 / -1
  dt: number; time: number;
  climbT?: number;            // 0..1 through a ledge climb
  ropeAngle?: number;         // radians, rope direction from vertical
  ropeOmega?: number;
  carrying: boolean;          // diya in hand
  landed?: number;            // landing speed this frame (px/s), 0 if none
  crouch?: number;            // 0..1 jump anticipation
  airT?: number;              // seconds since take-off (or since leaving the ground)
  jumped?: boolean;           // this airborne spell began with a jump (not a walk-off)
  deadT?: number;             // seconds since death
  swimT?: number;             // stroke clock while swimming
  ropeKind?: 'vine' | 'ledge';
}

type S = Phaser.GameObjects.Image;

export class GirlRig {
  root: Phaser.GameObjects.Container;
  private parts: Record<string, S> = {};
  private braid: S[] = [];
  private braidPts: { x: number; y: number; px: number; py: number }[] = [];
  phase = 0;
  private hipSpring = 0; private hipVel = 0;   // landing / weight compression (px, + = lower)
  private skirtA = 0; private skirtV = 0;      // hem lag (radians)
  private lean = 0;
  private walkW = 0;                            // 0 idle .. 1 moving
  private airW = 0;
  private turn = 0; private shownFacing = 1;
  private prevVx = 0;
  private landK = 0;
  /** world position of the diya flame, after draw */
  flameX = 0; flameY = 0;
  /** feet that touched down this frame (for footstep sounds) */
  stepped = false;

  constructor(private scene: Phaser.Scene, depth: number) {
    makeGirlTextures(scene);
    const img = (key: string, ox: number, oy: number) => scene.add.image(0, 0, key).setOrigin(ox, oy).setScale(1 / RES);
    const o = (len: number, w1: number, w2: number) => (w1 / 2) / (len + w1 / 2 + w2 / 2);
    // draw order (profile): far leg, far arm, braid, torso, skirt, near leg, head, near arm + diya
    const order: [string, S][] = [
      ['thighB', img('g_thigh', o(DIM.thigh, 4.6, 3.6), 0.5)], ['shinB', img('g_shin', o(DIM.shin, 3.5, 2.5), 0.5)], ['footB', img('g_foot', 0.12, 0.55)],
      ['uarmB', img('g_uarm', o(DIM.uarm, 2.9, 2.4), 0.5)], ['farmB', img('g_farm', o(DIM.farm, 2.4, 2.0), 0.5)], ['handB', img('g_hand', 0.5, 0.5)],
    ];
    for (let i = 0; i < 7; i++) this.braid.push(img(i === 6 ? 'g_tassel' : 'g_bead', 0.5, i === 6 ? 0.1 : 0.5));
    order.push(
      ['torso', img('g_torso', 0.5, 1)], ['skirt', img('g_skirt', 0.5, 0.02)],
      ['thighF', img('g_thigh', o(DIM.thigh, 4.6, 3.6), 0.5)], ['shinF', img('g_shin', o(DIM.shin, 3.5, 2.5), 0.5)], ['footF', img('g_foot', 0.12, 0.55)],
      ['neck', img('g_uarm', o(DIM.uarm, 2.9, 2.4), 0.5)], ['head', img('g_head', 0.5, 0.525)],
      ['uarmF', img('g_uarm', o(DIM.uarm, 2.9, 2.4), 0.5)], ['farmF', img('g_farm', o(DIM.farm, 2.4, 2.0), 0.5)], ['handF', img('g_hand', 0.5, 0.5)],
      ['diya', img('g_diya', 0.45, 0.4)],
    );
    const list: S[] = [];
    for (const [k, s] of order) {
      this.parts[k] = s;
      list.push(s);
      if (k === 'handB') list.push(...this.braid);
    }
    this.root = scene.add.container(0, 0, list).setDepth(depth);
    for (let i = 0; i < 7; i++) this.braidPts.push({ x: 0, y: 0, px: 0, py: 0 });
    this.braidInit = false;
  }
  private braidInit = false;

  /** place her: (x, y) = feet in world space */
  update(x: number, y: number, inp: RigInput) {
    const dt = Math.min(inp.dt, 0.05);
    const P = this.parts;
    const st = inp.state;
    const speed = Math.abs(inp.vx);
    const s01 = Phaser.Math.Clamp(speed / 210, 0, 1);
    const k = (rate: number) => 1 - Math.exp(-rate * dt);

    // weights
    const moving = (st === 'ground' || st === 'push' || st === 'pull') && speed > 6;
    this.walkW += ((moving ? 1 : 0) - this.walkW) * k(10);
    this.airW += ((st === 'air' ? 1 : 0) - this.airW) * k(st === 'air' ? 14 : 22);

    // stride length grows with speed; phase advances with distance → planted feet never slide
    const A = st === 'push' || st === 'pull' ? 4.2 : lerp(4.6, 10.5, s01);
    const lift = st === 'push' || st === 'pull' ? 2.4 : lerp(3.0, 8.5, s01);
    if (moving) {
      const before = this.phase;
      this.phase += Math.abs(inp.dx) / (4 * A);
      // a foot plants at phase 0 and 0.5
      this.stepped = Math.floor(before * 2) !== Math.floor(this.phase * 2);
    } else this.stepped = false;
    const ph = this.phase;

    // springs: landing compresses the hips; acceleration swings the hem
    if (inp.landed) this.hipVel += Math.min(inp.landed, 1000) * 0.05;
    const accel = (inp.vx - this.prevVx) / Math.max(dt, 0.001);
    this.prevVx = inp.vx;
    this.hipVel += (-260 * this.hipSpring - 20 * this.hipVel) * dt;
    this.hipSpring = Phaser.Math.Clamp(this.hipSpring + this.hipVel * dt, -3, 7);
    this.skirtV += (-140 * (this.skirtA - Phaser.Math.Clamp(inp.vx * inp.facing * 0.0012 + accel * inp.facing * 0.00008, -0.4, 0.4)) - 9 * this.skirtV) * dt;
    this.skirtA += this.skirtV * dt;

    // turning: she passes through a narrow, front-on moment
    if (inp.facing !== this.shownFacing) { this.shownFacing = inp.facing; this.turn = 1; }
    this.turn = Math.max(0, this.turn - dt * 7.5);

    // ---- the pose (local, facing +x) ----
    let hipX = 0, hipY = DIM.hipY;
    let torsoA = 0;                 // + leans forward
    let headA = 0;
    let fF = { x: 2, y: 0 }, fB = { x: -2, y: 0 }; // foot targets
    let hF = { x: 7, y: -24 }, hB = { x: -3, y: -21 }; // hand targets (front holds the diya)
    let footAngF = 0, footAngB = 0;
    let rootRot = 0;
    const t = inp.time / 1000;

    // idle: breathing, a slow weight shift
    const breath = Math.sin(t * 2.1);
    const idle = {
      hipX: Math.sin(t * 0.45) * 0.6, hipY: DIM.hipY + 0.6 + breath * 0.25,
      torso: -0.03 + breath * 0.015, fF: { x: 3.2, y: 0 }, fB: { x: -2.8, y: 0 },
      hF: { x: 7.2, y: -24.5 + breath * 0.4 }, hB: { x: -2.2, y: -20.6 + breath * 0.3 }, head: -0.04 + Math.sin(t * 0.7) * 0.03,
    };
    // gait
    const a1 = footPath(ph, A, lift), a2 = footPath(ph + 0.5, A, lift);
    const bob = Math.cos(ph * Math.PI * 4); // lowest at each contact
    const gait = {
      hipX: 0.6 + s01 * 1.4,
      hipY: DIM.hipY + 0.9 + s01 * 1.9 + bob * (0.5 + 1.3 * s01),
      torso: 0.06 + s01 * 0.2,
      fF: { x: a1.x, y: a1.y }, fB: { x: a2.x, y: a2.y },
      hF: { x: 7.6 + s01 * 1.5, y: -25 + Math.sin(ph * Math.PI * 2) * 0.8 - s01 * 1.2 },
      hB: { x: -Math.sin(ph * Math.PI * 2) * (3 + 6 * s01) - 1, y: -20.5 + Math.abs(Math.sin(ph * Math.PI * 2)) * (0.5 + 2 * s01) - s01 * 1.5 },
      head: -0.04 - s01 * 0.08 + bob * 0.02,
    };
    const w = smooth(this.walkW);
    hipX = lerp(idle.hipX, gait.hipX, w); hipY = lerp(idle.hipY, gait.hipY, w);
    torsoA = lerp(idle.torso, gait.torso, w); headA = lerp(idle.head, gait.head, w);
    fF = { x: lerp(idle.fF.x, gait.fF.x, w), y: lerp(idle.fF.y, gait.fF.y, w) };
    fB = { x: lerp(idle.fB.x, gait.fB.x, w), y: lerp(idle.fB.y, gait.fB.y, w) };
    hF = { x: lerp(idle.hF.x, gait.hF.x, w), y: lerp(idle.hF.y, gait.hF.y, w) };
    hB = { x: lerp(idle.hB.x, gait.hB.x, w), y: lerp(idle.hB.y, gait.hB.y, w) };
    footAngF = a1.planted ? 0 : -0.25 * w; footAngB = a2.planted ? 0 : -0.25 * w;

    if (st === 'push') {
      // leaning hard into it, both hands on the load at chest height, feet behind
      torsoA = 0.42; headA = -0.25; hipX = -1.5; hipY = DIM.hipY + 2.2 + bob * 0.4;
      fF = { x: a1.x - 4.5, y: a1.y }; fB = { x: a2.x - 4.5, y: a2.y };
      hB = { x: 11, y: -27 }; hF = { x: 10, y: -31 };
    } else if (st === 'pull') {
      torsoA = -0.32; headA = 0.1; hipX = -2; hipY = DIM.hipY + 2.4;
      fF = { x: a1.x - 1, y: a1.y }; fB = { x: a2.x - 3, y: a2.y };
      hB = { x: 11, y: -24 }; hF = { x: 6, y: -27 };
    }

    // anticipation: a quick crouch before take-off (arms swing back, knees bend, feet stay planted)
    const cr = smooth(inp.crouch ?? 0);
    if (cr > 0.001) {
      hipY += 5.5 * cr; hipX -= 0.6 * cr; torsoA += 0.34 * cr; headA -= 0.14 * cr;
      hF = { x: lerp(hF.x, 4, cr), y: lerp(hF.y, -19.5, cr) }; hB = { x: lerp(hB.x, -8.5, cr), y: lerp(hB.y, -16, cr) };
      fF = { x: lerp(fF.x, 3.4, cr), y: fF.y * (1 - cr) }; fB = { x: lerp(fB.x, -2.6, cr), y: fB.y * (1 - cr) };
      footAngF *= 1 - cr; footAngB *= 1 - cr;
    }

    // air: extension at take-off, a tuck at the top, legs reaching for the ground on the way down
    if (this.airW > 0.01) {
      const at = inp.airT ?? 1;
      const ext = inp.jumped ? 1 - smooth(at / 0.17) : 0;
      const fall = Phaser.Math.Clamp((inp.vy - 40) / 420, 0, 1);
      const tuckK = inp.jumped ? 1 : 0.35;
      const T = { // tuck
        hipY: DIM.hipY + 1.2, torso: 0.2 + s01 * 0.08, head: -0.06,
        fF: { x: 6 * tuckK + 1, y: -9.5 * tuckK }, fB: { x: -1.5 * tuckK - 1, y: -7 * tuckK }, aF: -0.35, aB: 0.25,
        hF: { x: 9, y: -27.5 }, hB: { x: -7.5, y: -28.5 },
      };
      const R = { // reach down
        hipY: DIM.hipY + 0.3, torso: 0.04, head: 0.04,
        fF: { x: 4.5 + s01 * 1.5, y: 0.6 }, fB: { x: -3 - s01, y: -4 }, aF: -0.2, aB: 0.45,
        hF: { x: 9.5, y: -29.5 }, hB: { x: -6, y: -33.5 },
      };
      const E = { // take-off extension: legs straight, toes pointed, the free arm swung up
        hipY: DIM.hipY - 0.8, torso: 0.14, head: -0.1,
        fF: { x: -0.5, y: 0.6 }, fB: { x: -4, y: -0.6 }, aF: 0.95, aB: 1.05,
        hF: { x: 9.5, y: -31 }, hB: { x: 5, y: -38.5 },
      };
      const mix = <K extends keyof typeof T>(k: K, a: typeof T, b: typeof T, t: number) => {
        const va = a[k] as unknown, vb = b[k] as unknown;
        if (typeof va === 'number') return lerp(va, vb as number, t);
        const pa = va as { x: number; y: number }, pb = vb as { x: number; y: number };
        return { x: lerp(pa.x, pb.x, t), y: lerp(pa.y, pb.y, t) };
      };
      const pose = (t1: typeof T, t2: typeof T, t: number) => {
        const o = {} as typeof T;
        for (const k of Object.keys(t1) as (keyof typeof T)[]) (o as Record<string, unknown>)[k] = mix(k, t1, t2, t);
        return o;
      };
      let air = pose(T, R, smooth(fall));
      air = pose(air, E, ext);
      const a = smooth(this.airW);
      hipY = lerp(hipY, air.hipY, a); torsoA = lerp(torsoA, air.torso, a); headA = lerp(headA, air.head, a);
      fF = { x: lerp(fF.x, air.fF.x, a), y: lerp(fF.y, air.fF.y, a) };
      fB = { x: lerp(fB.x, air.fB.x, a), y: lerp(fB.y, air.fB.y, a) };
      hF = { x: lerp(hF.x, air.hF.x, a), y: lerp(hF.y, air.hF.y, a) };
      hB = { x: lerp(hB.x, air.hB.x, a), y: lerp(hB.y, air.hB.y, a) };
      footAngF = lerp(footAngF, air.aF, a); footAngB = lerp(footAngB, air.aB, a);
    }

    // landing: the knees and back take the impact, deeper for a harder fall; hands reach down for balance
    if (inp.landed && inp.landed > 260) this.landK = Math.max(this.landK, Phaser.Math.Clamp((inp.landed - 220) / 650, 0.15, 1));
    this.landK = Math.max(0, this.landK - dt * (1.1 + (1 - this.landK) * 2.2));
    const lk = smooth(this.landK) * (st === 'ground' ? 1 : 0);
    if (lk > 0.001) {
      hipY += 7 * lk; torsoA += 0.42 * lk; headA -= 0.16 * lk;
      hB = { x: lerp(hB.x, 4, lk), y: lerp(hB.y, -11, lk) }; hF = { x: lerp(hF.x, 9.5, lk), y: lerp(hF.y, -17, lk) };
      fF = { x: lerp(fF.x, 4.2, lk * 0.6), y: fF.y * (1 - lk) }; fB = { x: lerp(fB.x, -3.4, lk * 0.6), y: fB.y * (1 - lk) };
    }

    // stopping hard: the front foot braces and she leans back over it
    if (st === 'ground' && this.lean < -0.05) { fF = { x: fF.x + 2.5 * w, y: fF.y }; hipX -= 1.2 * w; }

    if (st === 'hang') {
      // hanging from a ledge by the back hand (the diya hand stays free), legs dangling, swaying a little
      const sw = Math.sin(t * 2.4) * 1.2;
      hipX = -1 + sw * 0.4; hipY = DIM.hipY; torsoA = -0.05; headA = 0.15;
      hB = { x: 8, y: -51 }; hF = { x: 7, y: -30 };
      fF = { x: 1.5 + sw, y: 1.5 }; fB = { x: -1.5 + sw, y: 0.5 };
      footAngF = 0.6; footAngB = 0.6;
    } else if (st === 'climb') {
      // pull up → a knee onto the ledge → stand
      const c = inp.climbT ?? 0;
      const p1 = smooth(c / 0.45), p2 = smooth((c - 0.4) / 0.35), p3 = smooth((c - 0.7) / 0.3);
      hipX = lerp(-1, 2, p1); hipY = lerp(DIM.hipY, DIM.hipY + 6, p1);
      hipY = lerp(hipY, DIM.hipY + 4, p2); hipY = lerp(hipY, DIM.hipY + 0.6, p3);
      torsoA = lerp(-0.05, 0.75, p1); torsoA = lerp(torsoA, 0.35, p2); torsoA = lerp(torsoA, 0.02, p3);
      headA = lerp(0.15, -0.3, p1); headA = lerp(headA, -0.05, p3);
      hB = { x: lerp(8, 6, p1), y: lerp(-51, -24, p1) }; hB = { x: lerp(hB.x, -3, p3), y: lerp(hB.y, -21, p3) };
      hF = { x: lerp(7, 9, p1), y: lerp(-30, -27, p1) }; hF = { x: lerp(hF.x, 7.2, p3), y: lerp(hF.y, -24.5, p3) };
      fF = { x: lerp(1.5, 5, p1), y: lerp(1, -9, p1) }; fF = { x: lerp(fF.x, 3, p2), y: lerp(fF.y, 0, p2) };
      fB = { x: lerp(-1.5, -4, p1), y: lerp(0, 2, p1) }; fB = { x: lerp(fB.x, -2.8, p3), y: lerp(fB.y, 0, p3) };
      footAngF = lerp(0.6, 0, p2); footAngB = lerp(0.6, 0, p3);
    } else if (st === 'rope') {
      // both hands on the vine above her head; her body trails the swing
      const om = inp.ropeOmega ?? 0;
      rootRot = -(inp.ropeAngle ?? 0) * inp.facing;
      hipX = -om * 1.2 * inp.facing; hipY = DIM.hipY; torsoA = -0.05 - om * 0.1 * inp.facing; headA = 0.1;
      hB = { x: 1, y: -52 }; hF = { x: 1.5, y: -47 };
      const trail = -om * 3 * inp.facing;
      fF = { x: 2.5 + trail, y: -1 - Math.abs(om) * 1.5 }; fB = { x: -1 + trail * 1.2, y: 0.5 };
      footAngF = 0.5; footAngB = 0.6;
    } else if (st === 'swim') {
      // lying along the surface: a flutter kick, the free arm stroking, the diya held up out of the water
      const sw = inp.swimT ?? t;
      const moveK = Phaser.Math.Clamp(speed / 100, 0.25, 1);
      rootRot = 1.12 + Math.sin(sw * 2.2) * 0.04;
      hipX = 0; hipY = DIM.hipY; torsoA = 0.05; headA = -0.95;
      fF = { x: Math.sin(sw * 9) * 3 * moveK, y: 1 }; fB = { x: -Math.sin(sw * 9) * 3 * moveK - 1, y: 0 };
      footAngF = 0.9; footAngB = 0.9;
      hB = { x: Math.cos(sw * 3.6) * 9, y: -27 + Math.sin(sw * 3.6) * 7 };
      hF = { x: 12, y: -40 };
    } else if (st === 'dead') {
      // she crumples: knees give, she folds forward, the arms fall slack
      const d = inp.deadT ?? 0;
      const c1 = smooth(d / 0.35), c2 = smooth((d - 0.25) / 0.45);
      hipY = lerp(DIM.hipY + 0.6, -9, c1); hipY = lerp(hipY, -5.5, c2);
      hipX = lerp(0, -2, c1);
      torsoA = lerp(0.1, 0.9, c1); torsoA = lerp(torsoA, 1.32, c2);
      headA = lerp(0, 0.5, c1);
      fF = { x: lerp(3, 4, c1), y: 0 }; fB = { x: lerp(-3, -7, c1), y: 0 };
      footAngF = 0; footAngB = lerp(0, 0.8, c1);
      hF = { x: lerp(8, 13, c2), y: lerp(-20, -4, c1) }; hB = { x: lerp(-2, 11, c2), y: lerp(-18, -3, c1) };
      rootRot = lerp(0, 0.12, c2);
    }

    hipY += this.hipSpring;
    // lean into acceleration and speed (whole body, pivoting at the feet)
    const leanT = st === 'ground' ? Phaser.Math.Clamp(accel * inp.facing / 9000, -0.12, 0.12) : 0;
    this.lean += (leanT - this.lean) * k(8);

    // ---- solve the skeleton ----
    const hip = { x: hipX, y: hipY };
    const shoulder = { x: hip.x + Math.sin(torsoA) * DIM.neck, y: hip.y - Math.cos(torsoA) * DIM.neck + DIM.shoulderDrop };
    const neck = { x: hip.x + Math.sin(torsoA) * (DIM.neck + 1.5), y: hip.y - Math.cos(torsoA) * (DIM.neck + 1.5) };
    const headC = { x: neck.x + Math.sin(torsoA + headA) * 6.4 + 0.6, y: neck.y - Math.cos(torsoA + headA) * 6.4 };

    const legOff = 1.1;
    const lB = ik(hip.x - legOff, hip.y, fB.x - 1, fB.y, DIM.thigh, DIM.shin, 1);
    const lF = ik(hip.x + legOff, hip.y, fF.x + 1, fF.y, DIM.thigh, DIM.shin, 1);
    const sB = { x: shoulder.x - 0.8, y: shoulder.y + 0.5 }, sF = { x: shoulder.x + 0.8, y: shoulder.y + 0.6 };
    const aB = ik(sB.x, sB.y, hB.x, hB.y, DIM.uarm, DIM.farm, -1);
    const aF = ik(sF.x, sF.y, hF.x, hF.y, DIM.uarm, DIM.farm, -1);

    const setBone = (s: S, ax: number, ay: number, bx: number, by: number) => s.setPosition(ax, ay).setRotation(Math.atan2(by - ay, bx - ax));
    setBone(P.thighB, hip.x - legOff, hip.y, lB.jx, lB.jy); setBone(P.shinB, lB.jx, lB.jy, lB.ex, lB.ey);
    P.footB.setPosition(lB.ex - 1, lB.ey - 0.3).setRotation(footAngB);
    setBone(P.thighF, hip.x + legOff, hip.y, lF.jx, lF.jy); setBone(P.shinF, lF.jx, lF.jy, lF.ex, lF.ey);
    P.footF.setPosition(lF.ex - 1, lF.ey - 0.3).setRotation(footAngF);
    setBone(P.uarmB, sB.x, sB.y, aB.jx, aB.jy); setBone(P.farmB, aB.jx, aB.jy, aB.ex, aB.ey); P.handB.setPosition(aB.ex, aB.ey);
    setBone(P.uarmF, sF.x, sF.y, aF.jx, aF.jy); setBone(P.farmF, aF.jx, aF.jy, aF.ex, aF.ey); P.handF.setPosition(aF.ex, aF.ey);
    P.torso.setPosition(hip.x, hip.y + 1.2).setRotation(torsoA);
    const waist = { x: hip.x + Math.sin(torsoA) * 4.5, y: hip.y + 1 - Math.cos(torsoA) * 4.5 };
    const flare = 1 + s01 * 0.12 + Math.max(0, -inp.vy) * 0.0001 + (st === 'air' && inp.vy > 0 ? 0.12 : 0);
    P.skirt.setPosition(waist.x, waist.y).setRotation(this.skirtA + torsoA * 0.35).setScale(flare / RES, 1 / RES);
    P.head.setPosition(headC.x, headC.y).setRotation(torsoA + headA);
    setBone(P.neck, shoulder.x + 0.4, shoulder.y + 1, headC.x - 0.4, headC.y);
    P.diya.setVisible(inp.carrying).setPosition(aF.ex + 0.5, aF.ey - 0.6).setRotation(-this.lean * 0.5 - rootRot * 0.6);

    // place the whole figure; the turn squeezes her through a front-on moment
    const squeeze = 1 - Math.sin(this.turn * Math.PI) * 0.55;
    this.root.setPosition(x, y).setScale(inp.facing * squeeze, 1);
    this.root.setRotation((this.lean + rootRot) * inp.facing * (st === 'rope' ? 1 : 1));

    // ---- the braid: verlet, pinned behind the head, in world space ----
    const toWorld = (lx: number, ly: number) => {
      const c = Math.cos(this.root.rotation), s = Math.sin(this.root.rotation);
      const sx = lx * this.root.scaleX;
      return { x: x + sx * c - ly * s, y: y + sx * s + ly * c };
    };
    const ha = torsoA + headA;
    const pin = toWorld(headC.x - Math.cos(ha) * 6 + Math.sin(ha) * 1.5, headC.y + Math.sin(ha) * 1.5 + 1);
    const bp = this.braidPts;
    if (!this.braidInit) { for (let i = 0; i < bp.length; i++) { bp[i].x = bp[i].px = pin.x - i * 0.5 * inp.facing; bp[i].y = bp[i].py = pin.y + i * 2.2; } this.braidInit = true; }
    const g = 2400 * dt * dt;
    for (let i = 1; i < bp.length; i++) {
      const p = bp[i];
      const vx = (p.x - p.px) * 0.86, vy = (p.y - p.py) * 0.86;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + g;
    }
    bp[0].x = pin.x; bp[0].y = pin.y;
    const seg = 2.3;
    for (let it = 0; it < 4; it++) {
      for (let i = 1; i < bp.length; i++) {
        const a = bp[i - 1], b = bp[i];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001, diff = (d - seg) / d;
        if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; }
        else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
      }
      bp[0].x = pin.x; bp[0].y = pin.y;
    }
    // draw the braid in the container's local space
    const inv = (wx: number, wy: number) => {
      const dx = wx - x, dy = wy - y, c = Math.cos(-this.root.rotation), s = Math.sin(-this.root.rotation);
      return { x: (dx * c - dy * s) / this.root.scaleX, y: dx * s + dy * c };
    };
    for (let i = 0; i < this.braid.length; i++) {
      const p = inv(bp[i].x, bp[i].y);
      const sc = (1 - i * 0.06) / RES;
      this.braid[i].setPosition(p.x, p.y).setScale(i === 6 ? 1 / RES : sc * 1.15, i === 6 ? 1 / RES : sc * 1.15);
      if (i === 6) { const q = inv(bp[5].x, bp[5].y); this.braid[i].setRotation(Math.atan2(p.y - q.y, p.x - q.x) - Math.PI / 2); }
    }

    // where the flame sits (world)
    const fw = toWorld(aF.ex + 3.2, aF.ey - 2.4);
    this.flameX = fw.x; this.flameY = fw.y;
  }

  bump(v: number) { this.hipVel += v; }
  setVisible(v: boolean) { this.root.setVisible(v); return this; }
  setAlpha(a: number) { this.root.setAlpha(a); return this; }
}
