import Phaser from 'phaser';
import type { Block, Style } from './types';

// Ground drawn as hand-shaped silhouettes: ragged faces, matted grass or worn stone along the top, roots and
// tendrils over the edges. Long blocks are drawn as chunks (≤ CHUNK px) whose top edges match (the top line is
// a function of world x), and only the top band is textured — below it the earth is plain ink.
// Chunks are created when the camera comes near and destroyed when it leaves (see Terrain.stream).

export const ART = 2;
const INK = '#07080a';
const CHUNK = 1200;
const BAND = 220;   // textured depth below the top
const TOPPAD = 48;  // canvas space above the top line (grass, rims)
const SIDEPAD = 36; // canvas space beyond exposed faces (roots, tendrils)

/** the top line of a block at world x (px below b.y) */
export function topLine(style: Style, x: number) {
  if (style === 'stone' || style === 'brick' || style === 'iron' || style === 'wood') return 0;
  return -1.5 - Math.sin(x * 0.011) * 2 - Math.sin(x * 0.047 + 1.3) * 1.1 - Math.sin(x * 0.19 + 0.4) * 0.5;
}

let SERIAL = 0;
type Chunk = { b: Block; x0: number; x1: number; key: string; img?: Phaser.GameObjects.Image; fill?: Phaser.GameObjects.Rectangle };

export class Terrain {
  chunks: Chunk[] = [];
  private n = 0;
  constructor(private scene: Phaser.Scene, blocks: Block[], private depth = 10) {
    for (const b of blocks) {
      if (b.hidden) continue;
      const parts = Math.max(1, Math.ceil(b.w / CHUNK));
      for (let i = 0; i < parts; i++) {
        const x0 = b.x + (b.w * i) / parts, x1 = b.x + (b.w * (i + 1)) / parts;
        this.chunks.push({ b, x0, x1, key: `terr_${SERIAL++}_${this.n++}` });
      }
    }
  }

  stream(camX0: number, camX1: number, camY0 = -1e9, camY1 = 1e9) {
    for (const c of this.chunks) {
      const near = c.x1 > camX0 - 900 && c.x0 < camX1 + 900 && c.b.y < camY1 + 900 && c.b.y + c.b.h > camY0 - 900;
      const far = c.x1 < camX0 - 2200 || c.x0 > camX1 + 2200 || c.b.y > camY1 + 2200 || c.b.y + c.b.h < camY0 - 2200;
      if (near && !c.img) this.make(c);
      else if (far && c.img) this.drop(c);
    }
  }

  destroy() { for (const c of this.chunks) this.drop(c); }

  private drop(c: Chunk) {
    c.img?.destroy(); c.fill?.destroy(); c.img = c.fill = undefined;
    if (this.scene.textures.exists(c.key)) this.scene.textures.remove(c.key);
  }

  private make(c: Chunk) {
    const b = c.b, style = b.style ?? 'earth';
    const first = c.x0 === b.x, last = Math.abs(c.x1 - (b.x + b.w)) < 0.5;
    const left = first && !!b.left, right = last && !!b.right;
    const band = Math.min(b.h, BAND);
    const lp = left ? SIDEPAD : 2, rp = right ? SIDEPAD : 2;
    const W = c.x1 - c.x0 + lp + rp, H = band + TOPPAD + (band < b.h ? 30 : 4);
    const tex = this.scene.textures.createCanvas(c.key, Math.ceil(W * ART), Math.ceil(H * ART))!;
    const ctx = tex.getContext();
    ctx.scale(ART, ART);
    drawBlock(this.scene, ctx, { style, x0: c.x0, x1: c.x1, bx: b.x, by: b.y, h: band, full: b.h, left, right, ox: lp, oy: TOPPAD, W, H });
    tex.refresh();
    if (b.ceil) {
      // a ceiling: the same ragged edge, upside down — roots and tendrils hanging from its underside
      const top = b.y + b.h - (H - TOPPAD);
      c.img = this.scene.add.image(c.x0 - lp, top, c.key).setOrigin(0).setScale(1 / ART).setDepth(this.depth).setFlipY(true);
      if (top > b.y) c.fill = this.scene.add.rectangle(c.x0, b.y, c.x1 - c.x0, top - b.y + 12, 0x07080a).setOrigin(0).setDepth(this.depth - 0.01);
      return;
    }
    c.img = this.scene.add.image(c.x0 - lp, b.y - TOPPAD, c.key).setOrigin(0).setScale(1 / ART).setDepth(this.depth);
    if (b.h > band) {
      const fx0 = c.x0 + (left ? 3 : 0), fx1 = c.x1 - (right ? 3 : 0);
      c.fill = this.scene.add.rectangle(fx0, b.y + band + 10, fx1 - fx0, b.h - band - 10, 0x07080a).setOrigin(0).setDepth(this.depth - 0.01);
    }
  }
}

type Spec = { style: Style; x0: number; x1: number; bx: number; by: number; h: number; full: number; left: boolean; right: boolean; ox: number; oy: number; W: number; H: number };

function drawBlock(scene: Phaser.Scene, c: CanvasRenderingContext2D, s: Spec) {
  const rnd = new Phaser.Math.RandomDataGenerator([`${Math.round(s.x0)}:${Math.round(s.by)}`]);
  const w = s.x1 - s.x0;
  const top = (lx: number) => s.oy + topLine(s.style, s.x0 + lx);
  const bottom = s.H;
  const ragged = s.style === 'earth' || s.style === 'rock';
  // outline
  c.beginPath();
  c.moveTo(s.ox - (s.left ? 2 : 2), bottom);
  if (s.left) {
    for (let y = bottom; y > s.oy + 14; y -= rnd.between(6, 12)) c.lineTo(s.ox - (ragged ? rnd.realInRange(0, 5) + (y > s.oy + 50 ? rnd.realInRange(-3, 6) : 0) : rnd.realInRange(0, 0.8)), y);
    if (ragged) c.quadraticCurveTo(s.ox - 3, s.oy + 3, s.ox + 6, top(6));
    else c.lineTo(s.ox, s.oy + 1);
  } else c.lineTo(s.ox - 2, top(-2));
  for (let x = s.left ? 8 : -2; x <= w + (s.right ? -8 : 2); x += 4) c.lineTo(s.ox + x, top(x));
  if (s.right) {
    if (ragged) c.quadraticCurveTo(s.ox + w + 3, s.oy + 3, s.ox + w + 1, s.oy + 14);
    else c.lineTo(s.ox + w, s.oy + 1);
    for (let y = s.oy + 14; y < bottom; y += rnd.between(6, 12)) c.lineTo(s.ox + w + (ragged ? rnd.realInRange(0, 5) + (y > s.oy + 50 ? rnd.realInRange(-3, 6) : 0) : rnd.realInRange(-0.8, 0)), y);
    c.lineTo(s.ox + w + 2, bottom);
  } else c.lineTo(s.ox + w + 2, bottom);
  c.closePath();
  c.fillStyle = INK;
  c.fill();
  c.save();
  c.clip();
  // fill texture
  if (s.style === 'earth' && scene.textures.exists('ground_fill')) {
    const pat = c.createPattern(scene.textures.get('ground_fill').getSourceImage() as CanvasImageSource, 'repeat');
    if (pat) { pat.setTransform(new DOMMatrix().translate(-((s.x0 * ART) % 512), 0).scale(1 / ART)); c.fillStyle = pat; c.fillRect(0, 0, s.W, s.H); }
  }
  // fade the band into plain ink at its bottom
  const fade = c.createLinearGradient(0, s.oy + s.h - 60, 0, s.oy + s.h + 20);
  fade.addColorStop(0, 'rgba(7,8,10,0)'); fade.addColorStop(1, 'rgba(7,8,10,1)');
  c.fillStyle = fade; c.fillRect(0, s.oy + s.h - 60, s.W, s.H);
  // a faint cold rim of light along the top
  const rim = c.createLinearGradient(0, s.oy - 6, 0, s.oy + 16);
  rim.addColorStop(0, s.style === 'earth' ? 'rgba(120,128,132,0.35)' : 'rgba(150,156,160,0.4)');
  rim.addColorStop(0.35, 'rgba(60,64,68,0.18)');
  rim.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = rim; c.fillRect(0, s.oy - 8, s.W, 26);
  // style details
  c.lineWidth = 1;
  if (s.style === 'stone' || s.style === 'brick') {
    const bh = s.style === 'brick' ? 9 : 22, bw = s.style === 'brick' ? 22 : 56;
    c.strokeStyle = s.style === 'brick' ? 'rgba(96,84,78,0.22)' : 'rgba(110,116,122,0.2)';
    for (let row = 0; row * bh < s.h + 20; row++) {
      const y = s.oy + row * bh;
      c.beginPath(); c.moveTo(0, y); c.lineTo(s.W, y); c.stroke();
      const off = ((row % 2) * bw) / 2 - ((s.x0 % bw) + bw) % bw;
      for (let x = off; x < s.W; x += bw + rnd.between(-4, 4)) { c.beginPath(); c.moveTo(s.ox + x, y); c.lineTo(s.ox + x, y + bh); c.stroke(); }
    }
    // chipped stones along the edge
    c.fillStyle = 'rgba(0,0,0,0.5)';
    for (let x = rnd.between(10, 60); x < w; x += rnd.between(40, 140)) { c.beginPath(); c.ellipse(s.ox + x, s.oy + 1, rnd.between(3, 9), rnd.between(1, 3), 0, 0, Math.PI); c.fill(); }
  } else if (s.style === 'wood') {
    c.strokeStyle = 'rgba(100,92,84,0.25)';
    for (let y = s.oy + 7; y < s.oy + s.h; y += 7) { c.beginPath(); c.moveTo(0, y); c.lineTo(s.W, y); c.stroke(); }
    for (let x = -((s.x0 % 90) + 90) % 90; x < s.W; x += 90) { c.beginPath(); c.moveTo(s.ox + x, s.oy); c.lineTo(s.ox + x, s.oy + s.h); c.stroke(); }
  } else if (s.style === 'iron') {
    c.strokeStyle = 'rgba(120,126,132,0.25)';
    for (let x = -((s.x0 % 40) + 40) % 40; x < s.W; x += 40) { c.beginPath(); c.arc(s.ox + x, s.oy + 5, 1.4, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.moveTo(0, s.oy + 10); c.lineTo(s.W, s.oy + 10); c.stroke();
  } else {
    // rock seams on exposed faces
    c.strokeStyle = 'rgba(70,76,82,0.16)';
    for (const side of [s.left ? 0 : -1, s.right ? 1 : -1]) {
      if (side < 0) continue;
      const fx = side === 0 ? s.ox + 4 : s.ox + w - 4;
      for (let y = s.oy + 30; y < s.oy + s.h; y += rnd.between(18, 34)) {
        c.beginPath(); c.moveTo(fx, y); c.quadraticCurveTo(fx + (side ? -10 : 10), y + 4, fx + (side ? -rnd.between(14, 30) : rnd.between(14, 30)), y + rnd.between(-3, 6)); c.stroke();
      }
    }
  }
  c.restore();
  c.fillStyle = INK; c.strokeStyle = INK;
  if (s.style !== 'earth' && s.style !== 'rock') {
    // moss and weeds in the cracks of worked stone
    if (s.style === 'stone' || s.style === 'brick') for (let x = rnd.between(6, 40); x < w; x += rnd.between(30, 120)) {
      for (let k = 0; k < rnd.between(2, 6); k++) {
        const bx = s.ox + x + k * 2.2, h = rnd.between(2, 8);
        c.beginPath(); c.moveTo(bx - 0.6, s.oy + 1); c.quadraticCurveTo(bx, s.oy - h * 0.6, bx + rnd.realInRange(-2, 2), s.oy - h); c.lineTo(bx + 0.6, s.oy + 1); c.fill();
      }
    }
    return;
  }
  // half-buried stones
  for (let x = rnd.between(30, 90); x < w - 20; x += rnd.between(70, 190)) {
    const sw = rnd.between(8, 22), sh = rnd.between(5, 10);
    c.beginPath(); c.ellipse(s.ox + x, top(x) + 2, sw / 2, sh / 2, rnd.realInRange(-0.2, 0.2), Math.PI, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(110,116,120,0.22)'; c.lineWidth = 0.8;
    c.beginPath(); c.ellipse(s.ox + x, top(x) + 2, sw / 2, sh / 2, 0, Math.PI * 1.15, Math.PI * 1.7); c.stroke();
    c.strokeStyle = INK;
  }
  // grass: thin curved blades, thicker in clumps
  const blade = (x: number, y: number, h: number, lean: number, wid: number) => {
    c.beginPath();
    c.moveTo(x - wid, y + 2);
    c.quadraticCurveTo(x - wid * 0.3 + lean * 0.3, y - h * 0.55, x + lean, y - h);
    c.quadraticCurveTo(x + wid * 0.3 + lean * 0.35, y - h * 0.55, x + wid, y + 2);
    c.fill();
  };
  if (s.style === 'earth') for (let x = 2; x < w - 2; x += rnd.realInRange(1.2, 3.6)) {
    const wx = s.x0 + x;
    const clump = (Math.sin(wx * 0.05) + Math.sin(wx * 0.013)) > 0.9;
    const h = clump ? rnd.between(7, 17) : rnd.between(2, 6);
    blade(s.ox + x, top(x), h, rnd.realInRange(-4, 4), clump ? 0.9 : 0.6);
  }
  // roots and grass falling over the edges, tendrils hanging down the faces
  for (const side of [-1, 1]) {
    if ((side < 0 && !s.left) || (side > 0 && !s.right)) continue;
    const ex = side < 0 ? s.ox - 1 : s.ox + w + 1;
    for (let i = 0; i < 10; i++) blade(ex - side * i * 2.4, s.oy + 1, rnd.between(6, 15), side * rnd.between(4, 11), 0.7);
    const n = Math.min(7, Math.floor(s.full / 30));
    for (let k = 0; k < n; k++) {
      const y0 = s.oy + 8 + k * rnd.between(10, 26);
      const len = rnd.between(14, 60), sway = rnd.between(3, 12) * side;
      c.lineWidth = rnd.realInRange(0.8, 2.2);
      c.beginPath(); c.moveTo(ex - side * 2, y0);
      c.bezierCurveTo(ex + sway, y0 + len * 0.3, ex + sway * 0.4, y0 + len * 0.7, ex + sway * 1.1, y0 + len);
      c.stroke();
    }
  }
}
