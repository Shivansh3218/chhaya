import Phaser from 'phaser';
import { Bone, Chain, ChainView, RES, capsule, clamp, ik, lerp, smooth, tex } from '../kit';

// A four-legged skeleton (leopard, jackal, dog): spine between hip and shoulder, digitigrade hind legs
// (hip → knee → hock → paw), fore legs (shoulder → elbow → wrist → paw), neck, head with an opening jaw and a
// verlet tail. Gaits are phased by distance travelled so planted paws never slide; a gallop flexes the spine.

export interface QuadSpec {
  key: string;
  spine: number; hipH: number; shH: number;
  thigh: number; shin: number; meta: number;
  uarm: number; farm: number;
  body: number; neck: number;
  head: (c: CanvasRenderingContext2D) => void; headW: number; headH: number;
  jaw: (c: CanvasRenderingContext2D) => void; jawW: number; jawH: number;
  tailN: number; tailSeg: number; tailW: number; tailCurl: number;
  legW: number;
  belly?: number; chest?: number;
}

export interface QuadPose {
  x: number; gy: number; facing: number; dt: number; t: number;
  dx: number;          // distance moved this frame (x)
  speed: number;       // px/s
  crouch?: number;     // 0..1 body low, hind gathered
  air?: number;        // 0..1 legs stretched (leap)
  vy?: number;
  headDown?: number;   // -1 (head up, alert) .. 1 (nose to the ground)
  jaw?: number;        // 0..1 mouth open
  lie?: number;        // 0..1 lying down
  tailLash?: number;
  rear?: number;       // 0..1 rears up (fore legs off the ground)
  alpha?: number;
}

const FAR = 0x24272a;

export class QuadRig {
  parts: Record<string, Bone> = {};
  torso: Bone; chestImg: Phaser.GameObjects.Image; haunch: Phaser.GameObjects.Image;
  head: Phaser.GameObjects.Image; jaw: Phaser.GameObjects.Image; eye: Phaser.GameObjects.Image;
  tail: Chain; tailView: ChainView;
  phase = 0;
  bob = 0;
  all: Phaser.GameObjects.GameObject[] = [];
  private init = false;
  /** world positions after update (for hit tests) */
  headX = 0; headY = 0; hipX = 0; hipY = 0; shX = 0; shY = 0;

  constructor(scene: Phaser.Scene, public sp: QuadSpec, public depth: number) {
    const k = sp.key;
    const lw = sp.legW;
    const thigh = capsule(scene, `${k}_thigh`, sp.thigh, lw * 1.8, lw * 1.1);
    const shin = capsule(scene, `${k}_shin`, sp.shin, lw * 1.0, lw * 0.75);
    const meta = capsule(scene, `${k}_meta`, sp.meta, lw * 0.8, lw * 0.75);
    const uarm = capsule(scene, `${k}_uarm`, sp.uarm, lw * 1.6, lw * 1.0);
    const farm = capsule(scene, `${k}_farm`, sp.farm, lw * 0.95, lw * 0.8);
    const neck = capsule(scene, `${k}_neck`, sp.neck, sp.body * 0.62, sp.body * 0.42);
    const body = capsule(scene, `${k}_torso`, sp.spine, sp.body, sp.body * (sp.chest ?? 1.05));
    tex(scene, `${k}_paw`, lw * 1.5, lw * 0.9, (c) => { c.beginPath(); c.ellipse(lw * 0.75, lw * 0.45, lw * 0.75, lw * 0.45, 0, 0, Math.PI * 2); c.fill(); });
    tex(scene, `${k}_head`, sp.headW, sp.headH, sp.head);
    tex(scene, `${k}_jaw`, sp.jawW, sp.jawH, sp.jaw);
    tex(scene, `${k}_blob`, 20, 20, (c) => { c.beginPath(); c.arc(10, 10, 10, 0, Math.PI * 2); c.fill(); });
    tex(scene, 'eyeshine', 4, 4, (c) => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(2, 2, 1.4, 0, Math.PI * 2); c.fill(); }, '#ffffff');
    tex(scene, `${k}_tseg`, 10, 4, (c) => { c.beginPath(); c.arc(2, 2, 2, 0, Math.PI * 2); c.arc(8, 2, 2, 0, Math.PI * 2); c.fill(); c.fillRect(2, 0, 6, 4); });
    const d = depth;
    const mk = (name: string, spec: { key: string; ox: number; len: number }, dd: number) => { const b = new Bone(scene, spec, dd); this.parts[name] = b; this.all.push(b.img); return b; };
    // far legs (slightly lighter: further into the fog)
    mk('hThighB', thigh, d - 0.03); mk('hShinB', shin, d - 0.03); mk('hMetaB', meta, d - 0.03);
    mk('fUarmB', uarm, d - 0.03); mk('fFarmB', farm, d - 0.03);
    for (const n of ['hThighB', 'hShinB', 'hMetaB', 'fUarmB', 'fFarmB']) this.parts[n].img.setTint(FAR);
    this.tail = new Chain(sp.tailN, sp.tailSeg, 0, 0, 0.86, 300);
    this.tailView = new ChainView(scene, sp.tailN, `${k}_tseg`, d - 0.02, sp.tailW, sp.tailW * 0.55, 10);
    this.all.push(...this.tailView.segs);
    this.torso = mk('torso', body, d);
    this.haunch = scene.add.image(0, 0, `${k}_blob`).setDepth(d);
    this.chestImg = scene.add.image(0, 0, `${k}_blob`).setDepth(d);
    this.all.push(this.haunch, this.chestImg);
    mk('hThighF', thigh, d + 0.01); mk('hShinF', shin, d + 0.01); mk('hMetaF', meta, d + 0.01);
    mk('neck', neck, d + 0.015);
    mk('fUarmF', uarm, d + 0.02); mk('fFarmF', farm, d + 0.02);
    this.jaw = scene.add.image(0, 0, `${k}_jaw`).setScale(1 / RES).setDepth(d + 0.025).setOrigin(0.15, 0.3);
    this.head = scene.add.image(0, 0, `${k}_head`).setScale(1 / RES).setDepth(d + 0.03).setOrigin(0.3, 0.55);
    this.eye = scene.add.image(0, 0, 'eyeshine').setDepth(d + 0.04).setScale(0.35).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.all.push(this.jaw, this.head, this.eye);
    this.paws = [0, 1, 2, 3].map((i) => { const im = scene.add.image(0, 0, `${k}_paw`).setScale(1 / RES).setDepth(i % 2 ? d + 0.02 : d - 0.03); if (i % 2 === 0) im.setTint(FAR); this.all.push(im); return im; });
  }
  paws: Phaser.GameObjects.Image[];

  setVisible(v: boolean) { for (const o of this.all) (o as Phaser.GameObjects.Image).setVisible(v); }
  setAlpha(a: number) { for (const o of this.all) (o as Phaser.GameObjects.Image).setAlpha(a); }
  setDepthOffset(base: number) { for (const o of this.all) { const im = o as Phaser.GameObjects.Image; im.setDepth(im.depth - this.depth + base); } this.depth = base; }
  setTint(t: number) { for (const o of this.all) (o as Phaser.GameObjects.Image).setTint(t); }
  setScale(s: number) { this.scaleK = s; }
  scaleK = 1;
  destroy() { for (const o of this.all) o.destroy(); }

  /** foot path for one leg: planted (sliding back with the body) then swung forward */
  private foot(ph: number, A: number, lift: number, duty: number) {
    ph = ((ph % 1) + 1) % 1;
    if (ph < duty) return { x: A - (ph / duty) * 2 * A, y: 0 };
    const u = (ph - duty) / (1 - duty), e = u * u * (3 - 2 * u);
    return { x: -A + e * 2 * A, y: -Math.sin(u * Math.PI) * lift };
  }

  update(p: QuadPose) {
    const sp = this.sp, f = p.facing, s = this.scaleK;
    const run = clamp((p.speed - 90) / 140, 0, 1);       // 0 walk .. 1 gallop
    const sp01 = clamp(p.speed / 220, 0, 1);
    const stride = lerp(sp.spine * 0.16, sp.spine * 0.36, sp01) * s;
    if (p.speed > 4) this.phase += Math.abs(p.dx) / (4 * Math.max(4, stride));
    const ph = this.phase;
    const crouch = p.crouch ?? 0, air = p.air ?? 0, lie = p.lie ?? 0, rear = p.rear ?? 0;
    // the spine: bob, flex while galloping, crouch, lie down, rear up
    const flex = Math.sin(ph * Math.PI * 2) * run;
    const bob = (Math.cos(ph * Math.PI * 4) * 0.8 * (1 - run) + Math.sin(ph * Math.PI * 2) * 2.2 * run) * s * (1 - air);
    let hipH = (sp.hipH - crouch * sp.hipH * 0.38 - lie * sp.hipH * 0.62) * s;
    let shH = (sp.shH - crouch * sp.shH * 0.45 - lie * sp.shH * 0.6) * s;
    shH += rear * sp.spine * 0.7 * s;
    const spineL = sp.spine * (1 + flex * 0.08 + air * 0.08 - crouch * 0.05) * s;
    const hip = { x: p.x - f * spineL / 2, y: p.gy - hipH + bob + flex * 1.5 * s };
    const sh = { x: p.x + f * spineL / 2, y: p.gy - shH + bob - flex * 1.5 * s };
    if (rear) { hip.x += f * rear * spineL * 0.15; sh.x -= f * rear * spineL * 0.25; }
    // legs
    const duty = lerp(0.62, 0.4, run);
    const A = stride, lift = lerp(3, 9, sp01) * s;
    const offs = run > 0.5 ? [0, 0.1, 0.55, 0.62] : [0, 0.5, 0.25, 0.75]; // hind B, hind F, fore B, fore F
    const legsXs = [hip.x, hip.x, sh.x, sh.x];
    const tgt: { x: number; y: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const fp = this.foot(ph + offs[i], A, lift, duty);
      const w = smooth(clamp(p.speed / 30, 0, 1));
      let x = legsXs[i] + f * (i < 2 ? -2 * s : 2 * s) + f * fp.x * w;
      let y = p.gy + fp.y * w;
      if (air) { // stretched: fore legs reach forward, hind legs trail back (or tuck while rising)
        const rising = (p.vy ?? 0) < 0;
        const ex = i < 2 ? -f * (rising ? sp.thigh * 0.9 : sp.thigh * 0.4) * s : f * sp.uarm * (rising ? 1.1 : 0.9) * s;
        const ey = i < 2 ? (rising ? -2 : 4) * s : (rising ? -6 : 2) * s;
        x = lerp(x, legsXs[i] + ex, air); y = lerp(y, (i < 2 ? hip.y : sh.y) + (i < 2 ? sp.hipH * 0.75 : sp.shH * 0.7) * s + ey, air);
      }
      if (crouch && i < 2) x += f * crouch * sp.spine * 0.12 * s;  // hind feet gathered under
      if (lie) { x = lerp(x, legsXs[i] + f * (i < 2 ? sp.spine * 0.25 : sp.spine * 0.35) * s, lie); y = lerp(y, p.gy, lie); }
      if (rear && i >= 2) { x = lerp(x, sh.x + f * sp.uarm * 0.8 * s, rear); y = lerp(y, sh.y + sp.uarm * 0.9 * s, rear); }
      tgt.push({ x, y });
    }
    const P = this.parts;
    const hind = (thigh: Bone, shin: Bone, metaB: Bone, paw: Phaser.GameObjects.Image, t: { x: number; y: number }) => {
      const hock = { x: t.x - f * sp.meta * 0.3 * s, y: t.y - sp.meta * 0.92 * s };
      const r = ik(hip.x, hip.y, hock.x, hock.y, sp.thigh * s, sp.shin * s, -f);
      thigh.set(hip.x, hip.y, r.jx, r.jy); shin.set(r.jx, r.jy, r.ex, r.ey); metaB.set(r.ex, r.ey, t.x, t.y);
      paw.setPosition(t.x + f * sp.legW * 0.4 * s, t.y - sp.legW * 0.3 * s);
    };
    const fore = (uarm: Bone, farm: Bone, paw: Phaser.GameObjects.Image, t: { x: number; y: number }) => {
      const r = ik(sh.x, sh.y + 2 * s, t.x, t.y - sp.legW * 0.5 * s, sp.uarm * s, sp.farm * s, f);
      uarm.set(sh.x, sh.y + 2 * s, r.jx, r.jy); farm.set(r.jx, r.jy, r.ex, r.ey);
      paw.setPosition(t.x + f * sp.legW * 0.5 * s, t.y - sp.legW * 0.3 * s);
    };
    hind(P.hThighB, P.hShinB, P.hMetaB, this.paws[0], tgt[0]);
    hind(P.hThighF, P.hShinF, P.hMetaF, this.paws[1], tgt[1]);
    fore(P.fUarmB, P.fFarmB, this.paws[2], tgt[2]);
    fore(P.fUarmF, P.fFarmF, this.paws[3], tgt[3]);
    for (const b of Object.values(P)) b.img.setScale((1 / RES) * s, (1 / RES) * s);
    for (const im of this.paws) im.setScale((1 / RES) * s).setFlipX(f < 0);
    // body
    this.torso.set(hip.x - f * sp.body * 0.3 * s, hip.y - 1 * s, sh.x + f * sp.body * 0.2 * s, sh.y, true);
    this.torso.img.setScale(this.torso.img.scaleX, (1 / RES) * s);
    this.haunch.setPosition(hip.x, hip.y + 1 * s);
    this.haunch.setDisplaySize(sp.body * 1.25 * s, sp.body * 1.2 * s);
    this.chestImg.setPosition(sh.x, sh.y + sp.body * 0.12 * s).setDisplaySize(sp.body * 1.1 * s * (sp.chest ?? 1), sp.body * 1.25 * s * (sp.chest ?? 1));
    // neck & head: head lowered when stalking, raised when alert
    const hd = clamp(p.headDown ?? 0, -1, 1);
    const neckA = -0.75 + hd * 0.95 - rear * 0.4; // angle above horizontal (negative = up)
    const nx = sh.x + f * Math.cos(neckA) * sp.neck * s, ny = sh.y + Math.sin(neckA) * sp.neck * s - 2 * s;
    this.parts.neck.set(sh.x, sh.y - 1 * s, nx, ny);
    this.parts.neck.img.setScale((1 / RES) * s);
    const headA = (hd * 0.5 + flex * 0.05) * f;
    this.head.setPosition(nx, ny).setRotation(headA).setFlipX(f < 0).setScale((1 / RES) * s);
    this.head.setOrigin(f > 0 ? 0.3 : 0.7, 0.55);
    const jawOpen = clamp(p.jaw ?? 0, 0, 1);
    this.jaw.setPosition(nx + f * sp.headW * 0.18 * s, ny + sp.headH * 0.12 * s).setRotation(headA + f * jawOpen * 0.55).setFlipX(f < 0).setScale((1 / RES) * s);
    this.jaw.setOrigin(f > 0 ? 0.15 : 0.85, 0.3);
    this.eye.setPosition(nx + f * sp.headW * 0.42 * s, ny - sp.headH * 0.12 * s);
    this.headX = nx + f * sp.headW * 0.5 * s; this.headY = ny;
    this.hipX = hip.x; this.hipY = hip.y; this.shX = sh.x; this.shY = sh.y;
    // tail
    const root = { x: hip.x - f * sp.body * 0.45 * s, y: hip.y - sp.body * 0.2 * s };
    if (!this.init) { this.tail.reset(root.x, root.y, -f, 0.5); this.init = true; }
    const lash = p.tailLash ?? 0;
    this.tail.seg = sp.tailSeg * s;
    this.tail.step(p.dt, root.x, root.y, 4, (i) => {
      const u = i / sp.tailN;
      return { x: -f * 520 * (1 - u) + Math.sin(p.t * 0.012 + i * 0.6) * lash * 1600, y: 500 * (1 - u) - sp.tailCurl * 2600 * Math.max(0, u - 0.6) ** 2 * 6 };
    });
    this.tailView.w0 = sp.tailW * s; this.tailView.w1 = sp.tailW * 0.55 * s;
    this.tailView.draw(this.tail.pts);
    if (p.alpha !== undefined) this.setAlpha(p.alpha);
  }
}

// ------------------------------------------------------------------ species

export const LEOPARD: QuadSpec = {
  key: 'leo', spine: 44, hipH: 43, shH: 45, thigh: 25, shin: 23, meta: 13, uarm: 25, farm: 23, body: 25, neck: 15, legW: 7.5,
  headW: 26, headH: 18, chest: 1.18,
  head: (c) => { // a rounded cat head: broad skull, short muzzle, small round ear
    c.beginPath(); c.ellipse(10, 10, 9.5, 8, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(14, 6); c.quadraticCurveTo(25, 7, 25.5, 11.5); c.quadraticCurveTo(24, 14.5, 15, 14); c.fill();
    c.beginPath(); c.ellipse(6, 3, 3.2, 3.6, -0.4, 0, Math.PI * 2); c.fill();
  },
  jawW: 16, jawH: 6, jaw: (c) => { c.beginPath(); c.moveTo(0, 1); c.lineTo(15, 2); c.quadraticCurveTo(13, 6, 2, 5); c.fill(); },
  tailN: 12, tailSeg: 6.5, tailW: 4.8, tailCurl: 0.9,
};

export const JACKAL: QuadSpec = {
  key: 'jak', spine: 28, hipH: 26, shH: 27, thigh: 14, shin: 13, meta: 9, uarm: 14, farm: 14, body: 13, neck: 11, legW: 3.8,
  headW: 22, headH: 14, chest: 1.0,
  head: (c) => { // a narrow canine head: pointed muzzle, tall ears
    c.beginPath(); c.ellipse(7, 8, 6, 5.2, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(9, 5); c.lineTo(21.5, 9); c.lineTo(20, 11); c.lineTo(9, 12); c.fill();
    c.beginPath(); c.moveTo(3, 5); c.lineTo(4.5, -0.5 + 1); c.lineTo(8, 4.5); c.fill();
  },
  jawW: 14, jawH: 4, jaw: (c) => { c.beginPath(); c.moveTo(0, 1); c.lineTo(13, 1.5); c.lineTo(12, 3.5); c.lineTo(1, 3.5); c.fill(); },
  tailN: 7, tailSeg: 4.5, tailW: 5, tailCurl: -0.1,
};
