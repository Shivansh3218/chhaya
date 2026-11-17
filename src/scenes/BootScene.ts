import Phaser from 'phaser';
import { applyArt, loadArt } from '../artOverrides';

// Every visual in the game is generated here at startup — no image files needed.
// Style: soft, layered dusk. Distant layers are blurred (depth of field), light falls in shafts,
// the nearest foreground is a dark blur, and the only warm colour is the girl's diya.

const INK = 0x07080a;

type Banyan = {
  x: number; s: number;
  blobs: { dx: number; dy: number; rx: number; ry: number }[];
  roots: { dx: number; len: number; w: number; bend: number }[];
};

type Pose = { l1: number; lift1: number; l2: number; lift2: number; bob: number; arm: number; back: number; sway: number; braid: number; reach?: number };

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    loadArt(this);
  }

  create() {
    this.makeBasics();
    this.makeGirl();
    this.makeForest();
    this.makeStepwell();
    this.makeMill();
    this.makeCreatures();
    this.makeOverlays();
    this.makeProps();
    applyArt(this);
    const q = new URLSearchParams(location.search);
    const ch = q.get('chapter');
    if (ch) this.scene.start('play', { chapter: ch, cp: Number(q.get('cp') ?? 0) });
    else this.scene.start('menu');
  }

  private canvasTex(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
    const t = this.textures.createCanvas(key, w, h)!;
    draw(t.getContext());
    t.refresh();
  }

  /** Draws with horizontal padding (draw functions repeat content at ±w), then blurs — so the result still tiles seamlessly. */
  private blurredTex(key: string, w: number, h: number, blur: number, draw: (ctx: CanvasRenderingContext2D) => void) {
    const pad = Math.ceil(blur * 3) + 2;
    const tmp = document.createElement('canvas');
    tmp.width = w + pad * 2;
    tmp.height = h;
    const tctx = tmp.getContext('2d')!;
    tctx.translate(pad, 0);
    draw(tctx);
    this.canvasTex(key, w, h, (ctx) => {
      ctx.filter = blur > 0 ? `blur(${blur}px)` : 'none';
      ctx.drawImage(tmp, -pad, 0);
      ctx.filter = 'none';
    });
  }

  private makeBasics() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff).fillRect(0, 0, 4, 4);
    g.generateTexture('px', 4, 4);
    g.destroy();

    // soft round particle (dust, splashes, embers)
    this.canvasTex('soft', 32, 32, (ctx) => {
      const gr = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.4, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 32, 32);
    });

    // icons (white; tinted where used): an open hand, a diya flame, an up arrow
    this.canvasTex('ico_hand', 64, 64, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.roundRect(18, 30, 30, 26, 9); ctx.fill();
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.roundRect(19 + i * 7.5, 8 + (i === 0 || i === 3 ? 6 : 0), 6, 28, 3); ctx.fill(); }
      ctx.beginPath(); ctx.roundRect(8, 30, 16, 7, 3.5); ctx.fill();
    });
    this.canvasTex('ico_flame', 64, 64, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(32, 48, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(32, 6); ctx.bezierCurveTo(44, 22, 42, 36, 32, 40); ctx.bezierCurveTo(22, 36, 20, 22, 32, 6); ctx.fill();
    });
    this.canvasTex('ico_up', 64, 64, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(32, 8); ctx.lineTo(54, 36); ctx.lineTo(40, 36); ctx.lineTo(40, 56); ctx.lineTo(24, 56); ctx.lineTo(24, 36); ctx.lineTo(10, 36); ctx.closePath(); ctx.fill();
    });

    this.canvasTex('glow', 256, 256, (ctx) => {
      const gr = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255,190,110,0.5)');
      gr.addColorStop(0.2, 'rgba(255,160,80,0.24)');
      gr.addColorStop(0.5, 'rgba(255,130,60,0.08)');
      gr.addColorStop(1, 'rgba(255,100,40,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 256, 256);
    });

    // rain streak
    this.canvasTex('streak', 3, 22, (ctx) => {
      const gr = ctx.createLinearGradient(0, 0, 0, 22);
      gr.addColorStop(0, 'rgba(210,220,228,0)');
      gr.addColorStop(1, 'rgba(210,220,228,0.9)');
      ctx.fillStyle = gr;
      ctx.fillRect(1, 0, 1.2, 22);
    });

    // wall lamp: an iron bracket holding a clay diya
    const lg = this.add.graphics();
    lg.fillStyle(0x0a0a0a);
    lg.fillRect(14, 0, 4, 22);          // bracket
    lg.fillRect(4, 22, 24, 3);          // shelf
    lg.fillEllipse(16, 21, 18, 7);      // diya bowl
    lg.fillTriangle(22, 18, 28, 16, 24, 21); // spout
    lg.generateTexture('walllamp', 32, 28);
    lg.destroy();

    this.canvasTex('flame', 10, 14, (ctx) => {
      const gr = ctx.createRadialGradient(5, 8, 0, 5, 8, 7);
      gr.addColorStop(0, 'rgba(255,252,230,1)');
      gr.addColorStop(0.45, 'rgba(255,196,100,0.9)');
      gr.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.ellipse(5, 8, 3.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // The protagonist: a small girl carrying a diya. Drawn at 2x, facing right, with a simple skeleton:
  // two-bone legs and arms (knees bend forward, elbows back), a torso that can lean, a flared lehenga and a braid.
  private makeGirl() {
    const S = 2;
    type P = {
      f1x: number; f1y: number; f2x: number; f2y: number; // front / back foot offsets (x forward, y = lift)
      drop: number;   // hips lower (crouch, stride bounce)
      lean: number;   // torso lean (+ forward)
      arm: number;    // diya arm lift (- up)
      bx: number; by: number; // back hand target, relative to the back shoulder
      sway: number; braid: number;
    };
    const ik = (ax: number, ay: number, tx: number, ty: number, l1: number, l2: number, bendSign: number) => {
      // two-bone IK: returns the joint between (ax, ay) and the (reachable) target
      let dx = tx - ax, dy = ty - ay;
      let d = Math.hypot(dx, dy);
      const max = l1 + l2 - 0.01;
      if (d > max) { dx *= max / d; dy *= max / d; d = max; }
      const a = Math.acos(Phaser.Math.Clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
      const ang = Math.atan2(dy, dx) - bendSign * a;
      return { x: ax + Math.cos(ang) * l1, y: ay + Math.sin(ang) * l1, tx: ax + dx, ty: ay + dy };
    };
    const draw = (key: string, p: P) => {
      const g = this.add.graphics();
      g.fillStyle(INK);
      const line = (x1: number, y1: number, x2: number, y2: number, w: number) => {
        g.lineStyle(w * S, INK, 1);
        g.lineBetween(x1 * S, y1 * S, x2 * S, y2 * S);
        g.fillCircle(x1 * S, y1 * S, (w * S) / 2);
        g.fillCircle(x2 * S, y2 * S, (w * S) / 2);
      };
      const hipY = 32.6 + p.drop;
      const sh = { x: 16 + p.lean * 0.85, y: 19.4 + p.drop * 0.8 };
      const leg = (hx: number, fx: number, fy: number) => {
        const k = ik(hx, hipY, hx + fx, 46.6 - fy, 8.4, 8.4, 1); // knee bends forward
        line(hx, hipY, k.x, k.y, 3);
        line(k.x, k.y, k.tx, k.ty, 2.6);
        line(k.tx, k.ty, k.tx + 2.3, k.ty + 0.3, 1.9); // foot
      };
      leg(15.2 + p.lean * 0.2, p.f2x, p.f2y); // back leg
      const bs = { x: sh.x - 0.8, y: sh.y + 0.8 }; // back arm
      const be = ik(bs.x, bs.y, bs.x + p.bx, bs.y + p.by, 5.2, 5.2, -1);
      line(bs.x, bs.y, be.x, be.y, 2.3);
      line(be.x, be.y, be.tx, be.ty, 2.1);
      // lehenga: from the waist, flaring to a swaying hem
      const wx = 16 + p.lean * 0.55, wy = 25 + p.drop * 0.9;
      const skirt = [
        [wx - 3.4, wy - 1], [wx + 3.4, wy - 1], [wx + 8.8 + p.sway, 36 + p.drop], [wx + 6 + p.sway * 1.2, 37.6 + p.drop],
        [wx + p.sway * 1.3, 38.3 + p.drop], [wx - 6 + p.sway * 1.2, 37.6 + p.drop], [wx - 8.8 + p.sway, 36 + p.drop],
      ].map(([x, y]) => ({ x: x * S, y: y * S }));
      g.fillPoints(skirt, true);
      // torso from the shoulders to the waist
      g.fillPoints([[sh.x - 3.3, sh.y - 1.5], [sh.x + 3.3, sh.y - 1.5], [wx + 3.5, wy], [wx - 3.5, wy]].map(([x, y]) => ({ x: x * S, y: y * S })), true);
      leg(17 + p.lean * 0.2, p.f1x, p.f1y); // front leg
      const hd = { x: 16.3 + p.lean, y: 10.4 + p.drop * 0.75 };
      g.fillRect((sh.x - 1.2) * S, (hd.y + 3.5) * S, 2.6 * S, 3.2 * S); // neck
      g.fillCircle(hd.x * S, hd.y * S, 6.2 * S); // head
      g.fillCircle((hd.x - 4.6) * S, (hd.y - 1.4) * S, 2.6 * S); // hair knot
      const bt = { x: hd.x - 8 - p.braid, y: hd.y + 8.6 + Math.abs(p.braid) * 0.3 };
      const bm = { x: (hd.x - 4.8 + bt.x) / 2 - 0.6, y: (hd.y + bt.y) / 2 };
      line(hd.x - 4.8, hd.y - 0.8, bm.x, bm.y, 2.1); // braid, two links
      line(bm.x, bm.y, bt.x, bt.y, 1.8);
      g.fillCircle(bt.x * S, (bt.y + 0.8) * S, 1.6 * S);
      const fs = { x: sh.x + 1.4, y: sh.y + 0.8 }; // front arm holds the diya out
      const fe = ik(fs.x, fs.y, fs.x + 6.6, fs.y + 5.2 + p.arm, 4.4, 4.4, -1);
      line(fs.x, fs.y, fe.x, fe.y, 2.3);
      line(fe.x, fe.y, fe.tx, fe.ty, 2.1);
      g.fillEllipse((fe.tx + 1.4) * S, (fe.ty + 1) * S, 7.4 * S, 3.1 * S); // the diya
      g.fillTriangle((fe.tx + 4.6) * S, (fe.ty + 0.2) * S, (fe.tx + 7.4) * S, (fe.ty - 0.8) * S, (fe.tx + 5) * S, (fe.ty + 1.4) * S);
      g.generateTexture(key, 32 * S, 48 * S);
      g.destroy();
    };
    const stand: P = { f1x: 1.2, f1y: 0, f2x: -1.2, f2y: 0, drop: 0, lean: 0, arm: 0, bx: -1, by: 8.5, sway: 0, braid: 0 };
    // idle: slow breathing — the chest rises, the diya arm settles, the braid and hem stir
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, b = (1 - Math.cos(a)) / 2;
      draw(`p_idle${i}`, { ...stand, drop: b * 0.55, lean: -b * 0.25, arm: b * 0.6, by: 8.5 + b * 0.3, sway: Math.sin(a) * 0.35, braid: 0.2 + Math.sin(a - 0.8) * 0.35 });
    }
    // a foot's path through one stride (phase 0..1): planted and sliding back for the stance half,
    // then lifted and swung forward (eased) for the swing half
    const footPath = (ph: number, stride: number, lift: number) => {
      ph = ((ph % 1) + 1) % 1;
      if (ph < 0.5) return { x: stride - (ph / 0.5) * 2 * stride, y: 0 };
      const u = (ph - 0.5) / 0.5, e = u * u * (3 - 2 * u);
      return { x: -stride + e * 2 * stride, y: Math.sin(u * Math.PI) * lift };
    };
    // walk: medium strides, a soft bounce, the free arm swinging against the legs
    for (let i = 0; i < 12; i++) {
      const ph = i / 12, a = ph * Math.PI * 2;
      const f1 = footPath(ph, 5.2, 3.2), f2 = footPath(ph + 0.5, 5.2, 3.2);
      draw(`p_walk${i}`, {
        f1x: f1.x, f1y: f1.y, f2x: f2.x, f2y: f2.y,
        drop: 0.9 - Math.cos(a * 2) * 0.6, lean: 0.8, arm: Math.sin(a) * 0.7, bx: -f1.x * 0.55 - 0.5, by: 8,
        sway: -Math.sin(a) * 1, braid: 0.4 + Math.abs(Math.sin(a)) * 0.8,
      });
    }
    // run: long strides with knees driving up, a stronger bounce and lean
    for (let i = 0; i < 12; i++) {
      const ph = i / 12, a = ph * Math.PI * 2;
      const f1 = footPath(ph, 8.2, 6.5), f2 = footPath(ph + 0.5, 8.2, 6.5);
      draw(`p_run${i}`, {
        f1x: f1.x, f1y: f1.y, f2x: f2.x, f2y: f2.y,
        drop: 1.5 - Math.cos(a * 2) * 1.1, lean: 2.2, arm: Math.sin(a) * 1.2, bx: -f1.x * 0.8 - 1, by: 6,
        sway: -Math.sin(a) * 1.7, braid: 1.4 + Math.abs(Math.sin(a)) * 1.8,
      });
    }
    // push: leaning hard into the crate, short steps behind
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      draw(`p_push${i}`, {
        f1x: -2 + Math.sin(a) * 3, f1y: Math.max(0, Math.cos(a)) * 2.2, f2x: -5 - Math.sin(a) * 3, f2y: Math.max(0, -Math.cos(a)) * 2.2,
        drop: 1.2 + Math.abs(Math.cos(a)) * 0.4, lean: 4.2, arm: -1.5, bx: 8.5, by: 2.5, sway: -1.6, braid: 1.8,
      });
    }
    // pull: leaning back, stepping backwards; back hand reaching forward to the crate
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      draw(`p_pull${i}`, {
        f1x: 2.5 + Math.sin(a) * 3, f1y: Math.max(0, Math.cos(a)) * 2, f2x: -3 - Math.sin(a) * 3, f2y: Math.max(0, -Math.cos(a)) * 2,
        drop: 1.4, lean: -2.8, arm: -0.5, bx: 9, by: 4.5, sway: 1.4, braid: -0.6,
      });
    }
    draw('p_pull', { f1x: 2.5, f1y: 0, f2x: -3, f2y: 0, drop: 1.4, lean: -2.8, arm: -0.5, bx: 9, by: 4.5, sway: 1.4, braid: -0.6 });
    draw('p_skid', { f1x: 6, f1y: 0, f2x: -2, f2y: 0, drop: 1.6, lean: -2.2, arm: -1, bx: -4, by: 5, sway: 2, braid: -1.5 });
    draw('p_land', { f1x: 3, f1y: 0, f2x: -3, f2y: 0, drop: 3.4, lean: 1.4, arm: 1, bx: -2, by: 6, sway: 0.6, braid: 1.8 });
    draw('p_jump', { f1x: 4, f1y: 8, f2x: -3, f2y: 4, drop: -1, lean: 1.4, arm: -2, bx: -5, by: 3, sway: -1.8, braid: 2.8 });
    draw('p_apex', { f1x: 3, f1y: 6, f2x: -2, f2y: 5, drop: -0.5, lean: 0.6, arm: -2.5, bx: -6, by: 1, sway: -0.4, braid: 1.2 });
    draw('p_fall', { f1x: 2.5, f1y: 1.5, f2x: -2, f2y: 0, drop: 0, lean: -0.3, arm: -3, bx: -6, by: -2, sway: 1.8, braid: -1.4 });
    // hanging from a vine: back hand up holding on; climbing a ladder
    draw('p_hang', { f1x: 2, f1y: 3, f2x: -2, f2y: 1, drop: 0, lean: 0, arm: 1, bx: 0.5, by: -16, sway: 0.8, braid: -0.5 });
    draw('p_climb0', { f1x: 1, f1y: 6, f2x: -1, f2y: 0, drop: 0, lean: 0.5, arm: 0, bx: 1, by: -15, sway: 0, braid: 0 });
    draw('p_climb1', { f1x: 1, f1y: 0, f2x: -1, f2y: 6, drop: -1, lean: 0.5, arm: 1, bx: 2, by: -12, sway: 0, braid: 0.4 });
  }

  // ------------------------------------------------------------------ Chapter I: banyan forest

  private makeForest() {
    this.canvasTex('sky', 1280, 720, (ctx) => {
      const gr = ctx.createLinearGradient(0, 0, 0, 720);
      gr.addColorStop(0, '#161d23');
      gr.addColorStop(0.45, '#4d575e');
      gr.addColorStop(0.8, '#8a8a80');
      gr.addColorStop(1, '#9a9688');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 1280, 720);
      // a low sun somewhere behind the canopy: warm at its heart, cooling outwards
      const haze = ctx.createRadialGradient(820, 400, 0, 820, 400, 680);
      haze.addColorStop(0, 'rgba(246,226,188,0.5)');
      haze.addColorStop(0.35, 'rgba(226,210,180,0.2)');
      haze.addColorStop(1, 'rgba(200,200,190,0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, 1280, 720);
    });

    const makeTrees = (key: string, color: string, count: number, scale: number, seed: string, groundH: number, blur: number) => {
      const rnd = new Phaser.Math.RandomDataGenerator([seed]);
      const trees: Banyan[] = [];
      for (let i = 0; i < count; i++) {
        const s = scale * rnd.realInRange(0.75, 1.25);
        const blobs = Array.from({ length: rnd.between(6, 10) }, () => ({
          dx: rnd.between(-170, 170) * s, dy: rnd.between(-60, 40) * s,
          rx: rnd.between(70, 130) * s, ry: rnd.between(40, 70) * s,
        }));
        const roots = Array.from({ length: rnd.between(8, 18) }, () => ({
          dx: rnd.between(-190, 190) * s, len: rnd.realInRange(0.3, 1), w: rnd.realInRange(1, 3) * s, bend: rnd.between(-12, 12),
        }));
        trees.push({ x: (i + rnd.realInRange(0.1, 0.9)) * (1024 / count), s, blobs, roots });
      }
      this.blurredTex(key, 1024, 720, blur, (ctx) => {
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        for (const t of trees) for (const off of [-1024, 0, 1024]) this.drawBanyan(ctx, t, t.x + off);
        // soft rolling ground line
        ctx.beginPath();
        ctx.moveTo(-1100, 720);
        for (let x = -1100; x <= 2100; x += 16) ctx.lineTo(x, 720 - groundH - Math.sin((x / 1024) * Math.PI * 4) * 10);
        ctx.lineTo(2100, 720);
        ctx.fill();
      });
    };
    makeTrees('trees_far2', '#6c7173', 6, 0.5, 'far2', 200, 6);
    makeTrees('trees_far', '#50555a', 4, 0.75, 'far', 150, 3);
    makeTrees('trees_mid', '#2b2f33', 3, 1.05, 'mid', 95, 1.2);

    // warm light falling through the canopy
    this.canvasTex('shafts_warm', 1400, 720, (ctx) => {
      const rnd = new Phaser.Math.RandomDataGenerator(['shafts']);
      ctx.filter = 'blur(16px)';
      for (let k = 0; k < 6; k++) {
        const x0 = 260 + k * 170 + rnd.between(-40, 40), w = rnd.between(40, 120);
        const gr = ctx.createLinearGradient(0, -40, 0, 720);
        gr.addColorStop(0, `rgba(255,236,200,${rnd.realInRange(0.12, 0.22)})`);
        gr.addColorStop(1, 'rgba(255,236,200,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(x0, -40); ctx.lineTo(x0 + w, -40); ctx.lineTo(x0 + w + 300, 760); ctx.lineTo(x0 + 300, 760);
        ctx.fill();
      }
    });

    // a falling leaf (banyan leaves are broad ovals with a point)
    this.canvasTex('leaf', 12, 8, (ctx) => {
      ctx.fillStyle = '#0b0c0d';
      ctx.beginPath(); ctx.moveTo(1, 4); ctx.quadraticCurveTo(5, -1, 11, 4); ctx.quadraticCurveTo(5, 9, 1, 4); ctx.fill();
    });
    // a distant bird, wings up and wings down
    for (const [key, up] of [['bird0', 1], ['bird1', -1]] as const) {
      this.canvasTex(key, 22, 12, (ctx) => {
        ctx.strokeStyle = '#2a2f33'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(1, 6 - 4 * up); ctx.quadraticCurveTo(6, 6 - 5 * up, 11, 7); ctx.quadraticCurveTo(16, 6 - 5 * up, 21, 6 - 4 * up); ctx.stroke();
        ctx.fillStyle = '#2a2f33'; ctx.beginPath(); ctx.ellipse(11, 7, 2.4, 1.4, 0, 0, Math.PI * 2); ctx.fill();
      });
    }
    // clumps of tall grass that stand right in front of the camera and sway
    for (let c = 0; c < 3; c++) {
      this.canvasTex(`clump${c}`, 120, 96, (ctx) => {
        const rnd = new Phaser.Math.RandomDataGenerator([`clump${c}`]);
        ctx.fillStyle = '#030304';
        for (let i = 0; i < 26; i++) {
          const bx = 60 + rnd.between(-36, 36), h = rnd.between(34, 92), lean = rnd.between(-22, 22), w = rnd.realInRange(1.8, 3.4);
          ctx.beginPath();
          ctx.moveTo(bx - w, 96);
          ctx.quadraticCurveTo(bx - w * 0.4 + lean * 0.2, 96 - h * 0.6, bx + lean, 96 - h);
          ctx.quadraticCurveTo(bx + w * 0.4 + lean * 0.25, 96 - h * 0.6, bx + w, 96);
          ctx.fill();
        }
        ctx.beginPath(); ctx.ellipse(60, 96, 40, 8, 0, 0, Math.PI * 2); ctx.fill();
      });
    }

    // nearest foreground: big blurred ferns and grass, very close to the "lens"
    this.blurredTex('fg_ferns', 1024, 220, 4, (ctx) => {
      const rnd = new Phaser.Math.RandomDataGenerator(['ferns']);
      ctx.fillStyle = '#020203';
      ctx.strokeStyle = '#020203';
      const items = Array.from({ length: 7 }, () => ({ x: rnd.between(0, 1024), h: rnd.between(50, 95), n: rnd.between(5, 9) }));
      for (const it of items) for (const off of [-1024, 0, 1024]) {
        const x = it.x + off;
        for (let k = 0; k < it.n; k++) {
          const a = -Math.PI / 2 + (k / (it.n - 1) - 0.5) * 2.2;
          const len = it.h * (0.6 + 0.4 * Math.cos(k * 1.7));
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(x, 222);
          ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.3, 222 + Math.sin(a) * len * 0.8, x + Math.cos(a) * len, 222 + Math.sin(a) * len * 0.75);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(x, 222, it.h * 0.5, it.h * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  private drawBanyan(ctx: CanvasRenderingContext2D, t: Banyan, x: number) {
    const base = 720;
    const crownY = base - 330 * t.s;
    ctx.beginPath();
    ctx.moveTo(x - 45 * t.s, base);
    ctx.quadraticCurveTo(x - 16 * t.s, base - 60 * t.s, x - 18 * t.s, crownY + 30 * t.s);
    ctx.lineTo(x + 18 * t.s, crownY + 30 * t.s);
    ctx.quadraticCurveTo(x + 16 * t.s, base - 60 * t.s, x + 45 * t.s, base);
    ctx.fill();
    // limbs: thick boughs spreading from the trunk into the crown
    const rnd = new Phaser.Math.RandomDataGenerator([`limbs${Math.round(t.x)}`]);
    for (const b of t.blobs) {
      ctx.lineWidth = Math.max(2, 9 * t.s);
      ctx.beginPath();
      ctx.moveTo(x, crownY + 40 * t.s);
      ctx.quadraticCurveTo(x + b.dx * 0.4, crownY + b.dy + 30 * t.s, x + b.dx * 0.85, crownY + b.dy + 6 * t.s);
      ctx.stroke();
    }
    // the crown: clumps of foliage, each a cloud of leaf-sprays with a ragged, drooping lower edge
    for (const b of t.blobs) {
      const cx = x + b.dx, cy = crownY + b.dy;
      ctx.beginPath();
      ctx.ellipse(cx, cy, b.rx * 0.7, b.ry * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      const n = 46;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rnd.realInRange(-0.06, 0.06);
        const below = Math.sin(a) > 0.2; // the underside hangs in loose sprays
        const rr = Math.min(b.rx, b.ry) * rnd.realInRange(below ? 0.12 : 0.16, below ? 0.22 : 0.3);
        const px = cx + Math.cos(a) * b.rx * rnd.realInRange(0.68, 0.86);
        const py = cy + Math.sin(a) * b.ry * rnd.realInRange(0.66, 0.84) + (below ? rnd.realInRange(0, 10) * t.s : 0);
        ctx.beginPath();
        ctx.arc(px, py, rr, 0, Math.PI * 2);
        ctx.fill();
        if (below && rnd.frac() < 0.45) {
          // a leafy tip dangling below
          ctx.beginPath();
          ctx.ellipse(px + rnd.realInRange(-4, 4) * t.s, py + rr + 6 * t.s, 2.6 * t.s + 1, 7 * t.s + 2, rnd.realInRange(-0.3, 0.3), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    for (const r of t.roots) {
      const top = crownY + 30 * t.s;
      const end = top + (base - top) * r.len;
      ctx.lineWidth = r.w;
      ctx.beginPath();
      ctx.moveTo(x + r.dx, top);
      ctx.quadraticCurveTo(x + r.dx + r.bend, (top + end) / 2, x + r.dx, end);
      ctx.stroke();
    }
  }

  // ------------------------------------------------------------------ Chapter II: the stepwell

  private makeStepwell() {
    this.canvasTex('sky2', 1280, 720, (ctx) => {
      const gr = ctx.createLinearGradient(0, 0, 0, 720);
      gr.addColorStop(0, '#121820');
      gr.addColorStop(0.6, '#3a444d');
      gr.addColorStop(1, '#5a6268');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 1280, 720);
      const halo = ctx.createRadialGradient(990, 140, 0, 990, 140, 420);
      halo.addColorStop(0, 'rgba(220,226,214,0.4)');
      halo.addColorStop(1, 'rgba(220,226,214,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.filter = 'blur(2px)';
      ctx.fillStyle = 'rgba(236,238,226,0.9)';
      ctx.beginPath();
      ctx.arc(990, 140, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.filter = 'none';
    });

    const arch = (ctx: CanvasRenderingContext2D, cx: number, base: number, w: number, h: number) => {
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, base);
      ctx.lineTo(cx - w / 2, base - h * 0.55);
      ctx.quadraticCurveTo(cx - w / 2, base - h, cx, base - h);
      ctx.quadraticCurveTo(cx + w / 2, base - h, cx + w / 2, base - h * 0.55);
      ctx.lineTo(cx + w / 2, base);
      ctx.closePath();
      ctx.fill();
    };

    this.blurredTex('arch_far', 1024, 720, 3, (ctx) => {
      for (const off of [-1024, 0, 1024]) {
        ctx.save();
        ctx.translate(off, 0);
        ctx.fillStyle = '#434a50';
        ctx.fillRect(0, 150, 1024, 570);
        for (let x = 0; x < 1024; x += 32) ctx.fillRect(x, 136, 18, 14);
        ctx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 8; i++) arch(ctx, 64 + i * 128, 330, 64, 130);
        for (let i = 0; i < 16; i++) arch(ctx, 32 + i * 64, 470, 30, 70);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#3a4046';
        for (let y = 340; y < 720; y += 26) ctx.fillRect(0, y, 1024, 2);
        ctx.restore();
      }
    });

    this.blurredTex('arch_mid', 1024, 720, 1.2, (ctx) => {
      ctx.fillStyle = '#24282c';
      for (const off of [-1024, 0, 1024]) {
        for (let i = 0; i < 4; i++) {
          const x = off + 40 + i * 256;
          ctx.fillRect(x, 300, 44, 420);
          ctx.fillRect(x - 10, 290, 64, 16);
        }
        ctx.fillRect(off, 270, 1024, 22);
        ctx.beginPath();
        ctx.moveTo(off + 300, 720);
        for (let s = 0; s < 14; s++) {
          ctx.lineTo(off + 300 + s * 30, 720 - s * 24);
          ctx.lineTo(off + 300 + (s + 1) * 30, 720 - s * 24);
        }
        ctx.lineTo(off + 720, 720);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(off, 690, 1024, 30);
      }
    });

    // cold moonlight falling from the upper right
    this.canvasTex('shafts_moon', 1400, 720, (ctx) => {
      const rnd = new Phaser.Math.RandomDataGenerator(['moon']);
      ctx.filter = 'blur(18px)';
      for (let k = 0; k < 5; k++) {
        const x0 = 700 + k * 150 + rnd.between(-40, 40), w = rnd.between(50, 130);
        const gr = ctx.createLinearGradient(0, -40, 0, 720);
        gr.addColorStop(0, `rgba(205,220,235,${rnd.realInRange(0.1, 0.18)})`);
        gr.addColorStop(1, 'rgba(205,220,235,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(x0, -40); ctx.lineTo(x0 + w, -40); ctx.lineTo(x0 + w - 420, 760); ctx.lineTo(x0 - 420, 760);
        ctx.fill();
      }
    });

    this.blurredTex('fg_rubble', 1024, 220, 4, (ctx) => {
      const rnd = new Phaser.Math.RandomDataGenerator(['rubble']);
      ctx.fillStyle = '#020203';
      const items = Array.from({ length: 10 }, () => ({ x: rnd.between(0, 1024), w: rnd.between(30, 110), h: rnd.between(20, 70), r: rnd.realInRange(-0.3, 0.3) }));
      for (const it of items) for (const off of [-1024, 0, 1024]) {
        ctx.save();
        ctx.translate(it.x + off, 222 - it.h / 2);
        ctx.rotate(it.r);
        ctx.beginPath();
        ctx.roundRect(-it.w / 2, -it.h / 2, it.w, it.h, 8);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillRect(-1024, 205, 3072, 20);
    });

    const g = this.add.graphics();
    g.fillStyle(0x0a0b0c);
    g.fillPoints([{ x: 3, y: 8 }, { x: 10, y: 1 }, { x: 20, y: 2 }, { x: 25, y: 10 }, { x: 21, y: 20 }, { x: 8, y: 21 }, { x: 1, y: 15 }], true);
    g.generateTexture('rock', 26, 22);
    g.clear();
    g.fillStyle(0x0b0c0d);
    for (const x of [1, 11, 21]) g.fillRect(x, 0, 4, 296);
    for (let y = 10; y < 290; y += 40) g.fillRect(0, y, 26, 4);
    for (const x of [1, 11, 21]) g.fillTriangle(x, 296, x + 4, 296, x + 2, 310);
    g.generateTexture('gatebars', 26, 310);
    g.destroy();
  }

  // ------------------------------------------------------------------ Chapter III: the river mill at dusk

  private makeMill() {
    const TAU = Math.PI * 2;
    this.canvasTex('sky3', 1280, 720, (ctx) => {
      const gr = ctx.createLinearGradient(0, 0, 0, 720);
      gr.addColorStop(0, '#1d191b');
      gr.addColorStop(0.5, '#665650');
      gr.addColorStop(1, '#a88c74');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 1280, 720);
      const sun = ctx.createRadialGradient(260, 520, 0, 260, 520, 560);
      sun.addColorStop(0, 'rgba(255,206,150,0.5)');
      sun.addColorStop(1, 'rgba(255,206,150,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.filter = 'blur(3px)';
      ctx.fillStyle = 'rgba(255,228,190,0.75)';
      ctx.beginPath();
      ctx.arc(260, 520, 38, 0, TAU);
      ctx.fill();
      ctx.filter = 'none';
    });

    // distant hills (periodic over 1024 px so they tile)
    this.blurredTex('hills_far', 1024, 720, 5, (ctx) => {
      ctx.fillStyle = '#6a5c55';
      ctx.beginPath();
      ctx.moveTo(-1100, 720);
      for (let x = -1100; x <= 2100; x += 12) ctx.lineTo(x, 470 + Math.sin((x / 1024) * TAU * 2) * 28 + Math.sin((x / 1024) * TAU * 5) * 10);
      ctx.lineTo(2100, 720);
      ctx.fill();
    });

    // fields with lone trees and a far temple spire
    this.blurredTex('fields_far', 1024, 720, 2.5, (ctx) => {
      const rnd = new Phaser.Math.RandomDataGenerator(['fields']);
      ctx.fillStyle = '#4a403c';
      const trees = Array.from({ length: 5 }, () => ({ x: rnd.between(0, 1024), s: rnd.realInRange(0.6, 1.1) }));
      for (const off of [-1024, 0, 1024]) {
        ctx.beginPath();
        ctx.moveTo(off - 10, 720);
        for (let x = 0; x <= 1034; x += 12) ctx.lineTo(off + x, 560 + Math.sin((x / 1024) * TAU * 3) * 12);
        ctx.lineTo(off + 1034, 720);
        ctx.fill();
        for (const t of trees) {
          const x = off + t.x, base = 560 + Math.sin((t.x / 1024) * TAU * 3) * 12;
          ctx.fillRect(x - 3 * t.s, base - 70 * t.s, 6 * t.s, 70 * t.s);
          ctx.beginPath();
          ctx.ellipse(x, base - 85 * t.s, 42 * t.s, 30 * t.s, 0, 0, TAU);
          ctx.fill();
        }
        // a small shikhara (temple spire) on the horizon
        const sx = off + 700;
        ctx.beginPath();
        ctx.moveTo(sx - 26, 560); ctx.quadraticCurveTo(sx - 24, 500, sx, 470); ctx.quadraticCurveTo(sx + 24, 500, sx + 26, 560);
        ctx.fill();
        ctx.fillRect(sx - 1.5, 456, 3, 16);
      }
    });

    // the mill buildings: pitched roofs, a wheel, posts and a footbridge
    this.blurredTex('mill_mid', 1024, 720, 1.2, (ctx) => {
      ctx.fillStyle = '#2d2724';
      ctx.strokeStyle = '#2d2724';
      for (const off of [-1024, 0, 1024]) {
        const house = (x: number, w: number, h: number) => {
          const base = 650;
          ctx.fillRect(off + x, base - h, w, h);
          ctx.beginPath();
          ctx.moveTo(off + x - 18, base - h); ctx.lineTo(off + x + w / 2, base - h - w * 0.42); ctx.lineTo(off + x + w + 18, base - h);
          ctx.fill();
        };
        house(120, 220, 170);
        house(380, 120, 110);
        house(700, 180, 140);
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(off + 640, 560, 90, 0, TAU); ctx.stroke();
        ctx.lineWidth = 4;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU;
          ctx.beginPath(); ctx.moveTo(off + 640, 560); ctx.lineTo(off + 640 + Math.cos(a) * 90, 560 + Math.sin(a) * 90); ctx.stroke();
        }
        for (let x = 0; x < 1024; x += 64) ctx.fillRect(off + x, 600, 6, 120);
        ctx.fillRect(off, 640, 1024, 80);
      }
    });

    // low sun rays fanning from the left
    this.canvasTex('shafts_dusk', 1400, 720, (ctx) => {
      ctx.filter = 'blur(20px)';
      const ox = 320, oy = 520;
      for (let k = 0; k < 7; k++) {
        const a = -0.75 + k * 0.17, spread = 0.035 + (k % 3) * 0.015;
        const gr = ctx.createRadialGradient(ox, oy, 0, ox, oy, 1200);
        gr.addColorStop(0, 'rgba(255,214,160,0.2)');
        gr.addColorStop(1, 'rgba(255,214,160,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + Math.cos(a - spread) * 1400, oy + Math.sin(a - spread) * 1400);
        ctx.lineTo(ox + Math.cos(a + spread) * 1400, oy + Math.sin(a + spread) * 1400);
        ctx.fill();
      }
    });

    // riverside reeds, very close to the camera
    this.blurredTex('fg_reeds', 1024, 220, 4, (ctx) => {
      const rnd = new Phaser.Math.RandomDataGenerator(['reeds']);
      ctx.strokeStyle = '#020203';
      ctx.fillStyle = '#020203';
      const reeds = Array.from({ length: 26 }, () => ({ x: rnd.between(0, 1024), h: rnd.between(50, 120), lean: rnd.between(-18, 18), head: rnd.frac() < 0.4 }));
      for (const r of reeds) for (const off of [-1024, 0, 1024]) {
        const x = r.x + off;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, 222);
        ctx.quadraticCurveTo(x + r.lean * 0.3, 222 - r.h * 0.6, x + r.lean, 222 - r.h);
        ctx.stroke();
        if (r.head) {
          ctx.beginPath();
          ctx.ellipse(x + r.lean, 222 - r.h + 12, 4, 13, r.lean * 0.01, 0, TAU);
          ctx.fill();
        }
      }
      ctx.fillRect(-1024, 205, 3072, 20);
    });

    // gear (white, tinted in game)
    this.canvasTex('gear', 256, 256, (ctx) => {
      ctx.translate(128, 128);
      ctx.fillStyle = '#ffffff';
      const teeth = 16;
      ctx.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const a = (i / (teeth * 2)) * TAU;
        const r = i % 2 ? 106 : 124;
        const a2 = a + TAU / (teeth * 2);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 62, Math.sin(a) * 62, 22, 0, TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, TAU);
      ctx.fill();
    });

    // the great millstone (chakki): dressed grinding face with furrows, hole in the centre
    this.canvasTex('millstone', 128, 128, (ctx) => {
      ctx.translate(64, 64);
      ctx.fillStyle = '#0c0b0b';
      ctx.beginPath();
      ctx.arc(0, 0, 62, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#2a2523';
      ctx.lineWidth = 2;
      for (let s = 0; s < 8; s++) {
        const a = (s / 8) * TAU;
        for (let k = 0; k < 3; k++) {
          const off = 14 + k * 9;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 16 + Math.cos(a + 1.2) * (off - 14) * 0.3, Math.sin(a) * 16 + Math.sin(a + 1.2) * (off - 14) * 0.3);
          ctx.lineTo(Math.cos(a + 0.35) * 58, Math.sin(a + 0.35) * 58);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = 'rgba(150,126,110,0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 60, 0, TAU);
      ctx.stroke();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, TAU);
      ctx.fill();
    });
  }

  // ------------------------------------------------------------------ Phase 2: creatures and people

  private makeCreatures() {
    const S = 2;
    // the leopard (baagh): drawn at 2x, facing right, feet on the bottom edge. 66x34 logical.
    // Legs are two-bone (front: elbow back; hind: hock back), the spine rolls with the stride and the tail flows.
    const catIk = (ax: number, ay: number, tx: number, ty: number, l1: number, l2: number, bend: number) => {
      let dx = tx - ax, dy = ty - ay;
      let d = Math.hypot(dx, dy);
      const max = l1 + l2 - 0.01;
      if (d > max) { dx *= max / d; dy *= max / d; d = max; }
      const a = Math.acos(Phaser.Math.Clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
      const ang = Math.atan2(dy, dx) - bend * a;
      return { x: ax + Math.cos(ang) * l1, y: ay + Math.sin(ang) * l1, tx: ax + dx, ty: ay + dy };
    };
    type CatPose = {
      legs: [number, number, number, number][]; // per leg [footX offset, lift] for hindFar, hindNear, foreFar, foreNear
      bodyY: number; stretch: number; headY: number; headX: number; tail: number[]; // tail: 3 segment angles
    };
    const OX = 9; // shift right so the long tail fits on the canvas
    const cat = (key: string, p: CatPose) => {
      const g = this.add.graphics();
      g.fillStyle(INK);
      g.translateCanvas(OX * S, 0);
      const L = (x1: number, y1: number, x2: number, y2: number, w: number) => {
        g.lineStyle(w * S, INK, 1);
        g.lineBetween(x1 * S, y1 * S, x2 * S, y2 * S);
        g.fillCircle(x1 * S, y1 * S, (w * S) / 2);
        g.fillCircle(x2 * S, y2 * S, (w * S) / 2);
      };
      const by = p.bodyY, st = p.stretch;
      const hip = { x: 21 - st * 2, y: by - 1 }, shoulder = { x: 43 + st * 2, y: by };
      const leg = (ax: number, ay: number, fx: number, lift: number, fore: boolean, w: number) => {
        const footX = ax + fx, footY = 33 - lift;
        const k = catIk(ax, ay + 3, footX, footY, fore ? 8.4 : 8.8, fore ? 8.4 : 9.4, fore ? -1 : 1);
        L(ax, ay + 2, k.x, k.y, w + 1.2);
        L(k.x, k.y, k.tx, k.ty, w);
        L(k.tx, k.ty, k.tx + 2.2, k.ty + 0.2, w - 0.6);
      };
      // far legs first (they sit behind the body)
      leg(hip.x, hip.y, p.legs[0][0], p.legs[0][1], false, 2.6);
      leg(shoulder.x, shoulder.y, p.legs[2][0], p.legs[2][1], true, 2.4);
      // body: belly, chest, haunch
      g.fillEllipse(32 * S, (by - 0.6) * S, (42 + st * 5) * S, 10.5 * S);      // long, lean barrel
      g.fillEllipse(shoulder.x * S, (by - 0.2) * S, 12.5 * S, 13.5 * S);        // deep chest
      g.fillEllipse((hip.x - 0.5) * S, (by - 1.2) * S, 12 * S, 12 * S);         // haunch
      g.fillTriangle((shoulder.x - 6) * S, (by + 5) * S, (shoulder.x + 4) * S, (by + 6) * S, (shoulder.x - 2) * S, (by + 8) * S); // belly line
      // neck and head
      const hx = shoulder.x + 8.5 + p.headX, hy = p.headY;
      L(shoulder.x + 2, by - 2.5, hx - 2.5, hy + 2, 6);
      g.fillEllipse(hx * S, hy * S, 10 * S, 8.6 * S);                         // small, broad skull
      g.fillEllipse((hx + 4.2) * S, (hy + 1.6) * S, 5.6 * S, 4 * S);           // muzzle
      g.fillCircle((hx - 2.6) * S, (hy - 3.8) * S, 1.9 * S);                    // round ear
      // near legs
      leg(hip.x + 2, hip.y, p.legs[1][0], p.legs[1][1], false, 2.9);
      leg(shoulder.x + 2, shoulder.y, p.legs[3][0], p.legs[3][1], true, 2.7);
      // tail: three segments, thick to thin, curling
      let tx = hip.x - 5, ty = by - 3, a = Math.PI;
      const segs = [6, 6, 6, 5], wid = [2.7, 2.3, 2, 1.8];
      const tail = [...p.tail, p.tail[2] * 1.6 - 0.35];
      for (let i = 0; i < 4; i++) {
        a += tail[i];
        const nx = tx + Math.cos(a) * segs[i], ny = ty + Math.sin(a) * segs[i];
        L(tx, ty, nx, ny, wid[i]);
        tx = nx; ty = ny;
      }
      g.generateTexture(key, 80 * S, 34 * S);
      g.destroy();
    };
    const TAU = Math.PI * 2;
    // walk: lateral sequence (hind, fore on one side, then the other); gentle spine roll, swaying tail
    for (let i = 0; i < 12; i++) {
      const ph = (i / 12) * TAU;
      const foot = (off: number, stride: number, lift: number): [number, number, number, number] => {
        const a = ph + off * TAU;
        return [Math.sin(a) * stride, Math.max(0, Math.cos(a)) * lift, 0, 0];
      };
      cat(`cat_walk${i}`, {
        legs: [foot(0.5, 5.5, 3.2), foot(0, 5.5, 3.2), foot(0.75, 5, 3), foot(0.25, 5, 3)],
        bodyY: 17 + Math.sin(ph * 2) * 0.5, stretch: 0, headY: 11 + Math.sin(ph * 2 + 0.6) * 0.7, headX: 0,
        tail: [-0.55 + Math.sin(ph) * 0.18, -0.35 + Math.sin(ph - 0.7) * 0.3, -0.25 + Math.sin(ph - 1.4) * 0.4],
      });
    }
    // gallop (rotary): hind pair then fore pair, the body bunching and stretching, head low, tail streaming
    for (let i = 0; i < 8; i++) {
      const ph = (i / 8) * TAU;
      const pair = (off: number, spread: number, stride: number): [number, number, number, number] => {
        const a = ph + off * TAU;
        return [Math.sin(a) * stride, Math.max(0, Math.cos(a)) * 6, spread, 0];
      };
      const hf = pair(0, 0, 8), hn = pair(0.08, 0, 8), ff = pair(0.5, 0, 8.5), fn = pair(0.58, 0, 8.5);
      cat(`cat_run${i}`, {
        legs: [hf, hn, ff, fn], bodyY: 16 + Math.sin(ph) * 1.4, stretch: Math.cos(ph) * 1.2,
        headY: 12.5 + Math.sin(ph + 0.8) * 1, headX: 1,
        tail: [-0.15, -0.12 + Math.sin(ph) * 0.15, -0.1 + Math.sin(ph - 0.6) * 0.25],
      });
    }
    // crouch: low, weight back, head down and forward; two frames of a twitching tail tip
    const crouchLegs: [number, number, number, number][] = [[-3, 0, 0, 0], [-1, 0, 0, 0], [3, 0, 0, 0], [5, 0, 0, 0]];
    cat('cat_crouch0', { legs: crouchLegs, bodyY: 22, stretch: -0.6, headY: 19, headX: 2, tail: [-0.2, 0.25, 0.5] });
    cat('cat_crouch1', { legs: crouchLegs, bodyY: 22.3, stretch: -0.6, headY: 19.3, headX: 2, tail: [-0.2, 0.15, -0.3] });
    cat('cat_crouch', { legs: crouchLegs, bodyY: 22, stretch: -0.6, headY: 19, headX: 2, tail: [-0.2, 0.25, 0.5] });
    // the leap: fully stretched, forelegs reaching, hind legs trailing
    cat('cat_leap', {
      legs: [[-9, 6, 0, 0], [-7, 4, 0, 0], [11, 9, 0, 0], [13, 7, 0, 0]], bodyY: 15, stretch: 2.2, headY: 11, headX: 2,
      tail: [0.05, 0.1, 0.15],
    });
    // landing: forelegs braced, haunches still up
    cat('cat_land', { legs: [[-2, 4, 0, 0], [0, 3, 0, 0], [5, 0, 0, 0], [7, 0, 0, 0]], bodyY: 18, stretch: 0.5, headY: 15, headX: 1, tail: [-0.4, -0.3, -0.2] });
    cat('cat_walk0_', { legs: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], bodyY: 17, stretch: 0, headY: 11, headX: 0, tail: [-0.55, -0.35, -0.25] });

    // the poacher (shikari): an adult silhouette in a turban, with a slingshot. 32x62 logical.
    const man = (key: string, o: { aim?: boolean; step?: number; torch?: boolean }) => {
      const g = this.add.graphics();
      g.fillStyle(INK);
      const L = (x1: number, y1: number, x2: number, y2: number, w: number) => {
        g.lineStyle(w * S, INK, 1);
        g.lineBetween(x1 * S, y1 * S, x2 * S, y2 * S);
        g.fillCircle(x1 * S, y1 * S, (w * S) / 2);
        g.fillCircle(x2 * S, y2 * S, (w * S) / 2);
      };
      const st = o.step ?? 0;
      L(15, 38, 15 + st * 5, 61, 4); L(17, 38, 17 - st * 5, 61, 4);  // legs (dhoti)
      g.fillPoints([[11, 18], [21, 18], [23, 40], [9, 40]].map(([x, y]) => ({ x: x * S, y: y * S })), true); // kurta
      g.fillCircle(16 * S, 11 * S, 5.5 * S);                         // head
      g.fillEllipse(16 * S, 6.5 * S, 13 * S, 6 * S);                 // turban
      g.fillCircle(11 * S, 6 * S, 2.6 * S);
      L(14, 20, 12 - st * 2, 34, 2.8);                               // back arm
      if (o.aim) {
        L(18, 20, 30, 18, 2.8);                                      // arm out, holding the slingshot
        L(30, 18, 31, 12, 1.6); L(30, 18, 33, 13, 1.6);              // the Y fork
        L(20, 21, 25, 21, 2.4);                                      // drawing hand
      } else if (o.torch) {
        L(18, 20, 25, 25, 2.8); L(25, 25, 26, 16, 1.8);              // arm up holding a lantern pole
        g.fillRect(23 * S, 10 * S, 6 * S, 7 * S);                    // lantern
      } else {
        L(18, 20, 21 + st * 2, 34, 2.8);
      }
      g.generateTexture(key, 34 * S, 62 * S);
      g.destroy();
    };
    man('man_stand', {});
    man('man_aim', { aim: true });
    man('man_walk0', { step: 1 });
    man('man_walk1', { step: -1 });
    man('man_torch0', { torch: true, step: 1 });
    man('man_torch1', { torch: true, step: -1 });
    man('man_torch', { torch: true });

    // the brother: a boy a little older than her, in a short kurta, carrying a bundle on a stick
    const boy = (key: string, st: number) => {
      const g = this.add.graphics();
      g.fillStyle(INK);
      const L = (x1: number, y1: number, x2: number, y2: number, w: number) => {
        g.lineStyle(w * S, INK, 1);
        g.lineBetween(x1 * S, y1 * S, x2 * S, y2 * S);
        g.fillCircle(x1 * S, y1 * S, (w * S) / 2);
        g.fillCircle(x2 * S, y2 * S, (w * S) / 2);
      };
      L(14, 34, 14 + st * 5, 53, 3.2); L(17, 34, 17 - st * 5, 53, 3.2);
      g.fillRoundedRect(10 * S, 17 * S, 11 * S, 19 * S, 3 * S);
      g.fillCircle(15.5 * S, 11 * S, 6 * S);
      g.fillEllipse(15 * S, 7 * S, 12 * S, 5 * S); // hair
      L(13, 20, 12 - st * 3, 33, 2.4);
      L(18, 20, 22, 14, 2.4); L(22, 14, 9, 2, 1.6); // stick over the shoulder
      g.fillCircle(8 * S, 3 * S, 4 * S);            // the bundle
      g.generateTexture(key, 34 * S, 54 * S);
      g.destroy();
    };
    boy('boy0', 1); boy('boy1', 0); boy('boy2', -1);

    const g = this.add.graphics();
    g.fillStyle(0x111111).fillCircle(4, 4, 4);
    g.generateTexture('pebble', 8, 8);
    g.clear();
    // temple bell
    g.fillStyle(INK);
    g.fillRect(13, 0, 2, 10);
    g.fillPoints([{ x: 6, y: 26 }, { x: 22, y: 26 }, { x: 19, y: 12 }, { x: 14, y: 9 }, { x: 9, y: 12 }], true);
    g.fillRect(4, 25, 20, 3);
    g.fillCircle(14, 30, 2.5);
    g.generateTexture('bell', 28, 34);
    g.destroy();

    // a shadow creature: a soft knot of darkness
    this.canvasTex('shade', 64, 64, (ctx) => {
      const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(0,0,0,0.95)');
      gr.addColorStop(0.5, 'rgba(2,2,4,0.7)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 64, 64);
    });
    // a column of moonlight
    this.canvasTex('beam', 80, 720, (ctx) => {
      const gr = ctx.createLinearGradient(0, 0, 80, 0);
      gr.addColorStop(0, 'rgba(200,215,235,0)');
      gr.addColorStop(0.5, 'rgba(200,215,235,0.22)');
      gr.addColorStop(1, 'rgba(200,215,235,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 80, 720);
      const v = ctx.createLinearGradient(0, 0, 0, 720);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(0.15, 'rgba(0,0,0,1)');
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, 80, 720);
    });
  }

  // ------------------------------------------------------------------ shared overlays and props

  private makeOverlays() {
    this.canvasTex('vignette', 1280, 720, (ctx) => {
      ctx.save();
      ctx.translate(640, 360);
      ctx.scale(1.25, 0.75);
      const gr = ctx.createRadialGradient(0, 0, 260, 0, 0, 660);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,0.8)');
      ctx.fillStyle = gr;
      ctx.fillRect(-640, -640, 1280, 1280);
      ctx.restore();
    });

    this.canvasTex('grain', 256, 256, (ctx) => {
      const img = ctx.createImageData(256, 256);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    });

    this.blurredTex('fog', 1024, 360, 8, (ctx) => {
      const rnd = new Phaser.Math.RandomDataGenerator(['fog']);
      for (let i = 0; i < 40; i++) {
        const x = rnd.between(0, 1024), y = rnd.between(120, 300), r = rnd.between(60, 170), a = rnd.realInRange(0.05, 0.14);
        for (const off of [-1024, 0, 1024]) {
          const gr = ctx.createRadialGradient(x + off, y, 0, x + off, y, r);
          gr.addColorStop(0, `rgba(215,212,204,${a})`);
          gr.addColorStop(1, 'rgba(215,212,204,0)');
          ctx.fillStyle = gr;
          ctx.fillRect(x + off - r, y - r, r * 2, r * 2);
        }
      }
    });

    this.blurredTex('fg_roots', 1024, 240, 2.5, (ctx) => {
      const rnd = new Phaser.Math.RandomDataGenerator(['fg']);
      ctx.fillStyle = '#030304';
      ctx.strokeStyle = '#030304';
      const items = Array.from({ length: 9 }, () => ({ x: rnd.between(0, 1024), len: rnd.between(40, 220), w: rnd.realInRange(2, 6), leaves: rnd.between(0, 4) }));
      for (const it of items) for (const off of [-1024, 0, 1024]) {
        const x = it.x + off;
        ctx.lineWidth = it.w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.quadraticCurveTo(x + 10, it.len / 2, x - 4, it.len);
        ctx.stroke();
        for (let k = 0; k < it.leaves; k++) {
          ctx.beginPath();
          ctx.ellipse(x + (k % 2 ? 9 : -9), (it.len * (k + 1)) / (it.leaves + 1), 9, 4, k % 2 ? 0.5 : -0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillRect(-1024, 0, 3072, 6);
    });
  }

  private makeProps() {
    const g = this.add.graphics();
    g.fillStyle(0x0b0c0d).fillRoundedRect(0, 0, 64, 64, 4);
    g.lineStyle(2, 0x1d1f21, 1);
    g.strokeRoundedRect(3, 3, 58, 58, 3);
    g.lineBetween(3, 22, 61, 22); g.lineBetween(3, 42, 61, 42);
    g.lineBetween(6, 58, 58, 6);
    g.lineStyle(1.5, 0x3a3e42, 0.8).lineBetween(3, 1, 61, 1);
    g.generateTexture('crate', 64, 64);
    g.clear();
    g.fillStyle(0x08090a).fillRoundedRect(0, 0, 330, 36, 16);
    g.lineStyle(1.5, 0x17191b, 1);
    for (let x = 30; x < 300; x += 37) g.lineBetween(x, 8, x + 22, 10);
    for (let x = 50; x < 300; x += 53) g.lineBetween(x, 24, x + 30, 27);
    g.strokeEllipse(318, 18, 12, 30);
    g.lineStyle(1.5, 0x34383c, 0.7).lineBetween(16, 1.5, 314, 1.5);
    g.generateTexture('log', 330, 36);
    g.clear();
    g.fillStyle(0x0b0c0d).fillRoundedRect(0, 0, 140, 16, 4);
    g.lineStyle(1, 0x1d1f21, 1);
    for (let x = 28; x < 140; x += 28) g.lineBetween(x, 2, x, 14);
    g.lineStyle(1.5, 0x3a3e42, 0.7).lineBetween(4, 1, 136, 1);
    g.generateTexture('plank', 140, 16);
    g.destroy();
  }
}
