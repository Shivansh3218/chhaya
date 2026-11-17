import Phaser from 'phaser';
import { ART_OVERRIDES } from '../artOverrides';

// Hand-shaped scenery drawn with antialiased canvas paths at 2x (shown at 1/2): earth with ragged rock faces,
// matted grass, roots and stones; a wooden cart; great banyan trunks; a vine.

export const ART = 2;
const INK = '#07080a';

export type Rect = { x: number; y: number; w: number; h: number };

function canvas(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, rnd: Phaser.Math.RandomDataGenerator) => void) {
  if (ART_OVERRIDES.has(key)) return; // hand-made art replaces this one
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const t = scene.textures.createCanvas(key, Math.ceil(w * ART), Math.ceil(h * ART))!;
  const c = t.getContext();
  c.scale(ART, ART);
  draw(c, new Phaser.Math.RandomDataGenerator([key]));
  t.refresh();
}

/** one earth block. Returns the texture key; the image's top-left goes at (r.x - PAD, r.y - TOP) */
export const PAD = 40, TOP = 60;
export function groundTexture(scene: Phaser.Scene, key: string, r: Rect, opts: { left: boolean; right: boolean }) {
  const W = r.w + PAD * 2, H = r.h + TOP + 120;
  canvas(scene, key, W, H, (c, rnd) => {
    const ox = PAD, oy = TOP; // block origin inside the canvas
    const ph = rnd.realInRange(0, 10);
    const top = (x: number) => oy - 1.5 - Math.sin(x * 0.011 + ph) * 2 - Math.sin(x * 0.047 + ph * 2) * 1.1 - Math.sin(x * 0.19 + ph) * 0.5;
    const bottom = H;
    // outline: left face down→up, top, right face up→down
    c.beginPath();
    c.moveTo(ox - 2, bottom);
    for (let y = bottom; y > oy + 14; y -= rnd.between(6, 12)) c.lineTo(ox - (opts.left ? rnd.realInRange(0, 5) + (y > oy + 50 ? rnd.realInRange(-3, 6) : 0) : 0), y);
    c.quadraticCurveTo(ox - 3, oy + 3, ox + 6, top(6));
    for (let x = 8; x <= r.w - 8; x += 4) c.lineTo(ox + x, top(x));
    c.quadraticCurveTo(ox + r.w + 3, oy + 3, ox + r.w + 1, oy + 14);
    for (let y = oy + 14; y < bottom; y += rnd.between(6, 12)) c.lineTo(ox + r.w + (opts.right ? rnd.realInRange(0, 5) + (y > oy + 50 ? rnd.realInRange(-3, 6) : 0) : 0), y);
    c.lineTo(ox + r.w + 2, bottom);
    c.closePath();
    c.fillStyle = INK;
    c.fill();
    if (scene.textures.exists('ground_fill')) {
      // hand-painted earth: a seamless tile at 2x, clipped into the outline
      const pat = c.createPattern(scene.textures.get('ground_fill').getSourceImage() as CanvasImageSource, 'repeat');
      if (pat) { pat.setTransform(new DOMMatrix().scale(1 / ART)); c.save(); c.clip(); c.fillStyle = pat; c.fillRect(0, 0, W, H); c.restore(); }
    }
    // a faint cold rim of light along the top edge, and a darker band under it (soil depth)
    c.save();
    c.clip();
    const rim = c.createLinearGradient(0, oy - 6, 0, oy + 16);
    rim.addColorStop(0, 'rgba(120,128,132,0.35)');
    rim.addColorStop(0.35, 'rgba(60,64,68,0.18)');
    rim.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rim;
    c.fillRect(0, oy - 8, W, 26);
    // rock seams on the faces
    c.strokeStyle = 'rgba(70,76,82,0.16)';
    c.lineWidth = 1;
    for (const side of [opts.left ? 0 : -1, opts.right ? 1 : -1]) {
      if (side < 0) continue;
      const fx = side === 0 ? ox + 4 : ox + r.w - 4;
      for (let y = oy + 30; y < oy + r.h; y += rnd.between(18, 34)) {
        c.beginPath(); c.moveTo(fx, y); c.quadraticCurveTo(fx + (side ? -10 : 10), y + 4, fx + (side ? -rnd.between(14, 30) : rnd.between(14, 30)), y + rnd.between(-3, 6)); c.stroke();
      }
    }
    c.restore();
    c.fillStyle = INK; c.strokeStyle = INK;
    // half-buried stones
    for (let x = rnd.between(30, 90); x < r.w - 20; x += rnd.between(70, 190)) {
      const w = rnd.between(8, 22), h = rnd.between(5, 10);
      c.beginPath(); c.ellipse(ox + x, top(x) + 2, w / 2, h / 2, rnd.realInRange(-0.2, 0.2), Math.PI, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(110,116,120,0.22)'; c.lineWidth = 0.8;
      c.beginPath(); c.ellipse(ox + x, top(x) + 2, w / 2, h / 2, 0, Math.PI * 1.15, Math.PI * 1.7); c.stroke();
      c.strokeStyle = INK;
    }
    // grass: thousands of thin curved blades, thicker in clumps
    const blade = (x: number, y: number, h: number, lean: number, wid: number) => {
      c.beginPath();
      c.moveTo(x - wid, y + 2);
      c.quadraticCurveTo(x - wid * 0.3 + lean * 0.3, y - h * 0.55, x + lean, y - h);
      c.quadraticCurveTo(x + wid * 0.3 + lean * 0.35, y - h * 0.55, x + wid, y + 2);
      c.fill();
    };
    for (let x = 2; x < r.w - 2; x += rnd.realInRange(1.2, 3.6)) {
      const clump = (Math.sin(x * 0.05 + ph) + Math.sin(x * 0.013)) > 0.9;
      const h = clump ? rnd.between(7, 17) : rnd.between(2, 6);
      blade(ox + x, top(x), h, rnd.realInRange(-4, 4), clump ? 0.9 : 0.6);
    }
    // roots and grass falling over the edges, tendrils hanging down the faces
    for (const side of [-1, 1]) {
      if ((side < 0 && !opts.left) || (side > 0 && !opts.right)) continue;
      const ex = side < 0 ? ox - 1 : ox + r.w + 1;
      for (let i = 0; i < 10; i++) blade(ex - side * i * 2.4, oy + 1, rnd.between(6, 15), side * rnd.between(4, 11), 0.7);
      const n = Math.min(7, Math.floor(r.h / 30));
      for (let k = 0; k < n; k++) {
        const y0 = oy + 8 + k * rnd.between(10, 26);
        const len = rnd.between(14, 60), sway = rnd.between(3, 12) * side;
        c.lineWidth = rnd.realInRange(0.8, 2.2);
        c.lineCap = 'round';
        c.beginPath(); c.moveTo(ex - side * 2, y0);
        c.bezierCurveTo(ex + sway, y0 + len * 0.3, ex + sway * 0.4, y0 + len * 0.7, ex + sway * 1.1, y0 + len);
        c.stroke();
        if (rnd.frac() < 0.5) { c.lineWidth = 0.7; c.beginPath(); c.moveTo(ex + sway * 0.6, y0 + len * 0.5); c.quadraticCurveTo(ex + sway + side * 5, y0 + len * 0.6, ex + sway + side * 7, y0 + len * 0.75); c.stroke(); }
      }
    }
  });
  return key;
}

/** a small two-wheeled wooden cart (body only; the wheel is a separate texture so it can turn) */
export function cartTextures(scene: Phaser.Scene) {
  canvas(scene, 'cart_body', 80, 40, (c) => {
    c.fillStyle = INK; c.strokeStyle = INK;
    // planks of the bed with gaps, side rails, a broken shaft
    c.fillRect(2, 14, 76, 9);
    for (let x = 4; x < 76; x += 9) c.fillRect(x, 4, 6, 12);
    c.fillRect(1, 2, 78, 3.2);
    c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(78, 18); c.lineTo(79, 18); c.stroke();
    c.fillStyle = 'rgba(90,92,94,0.25)';
    for (let x = 4; x < 76; x += 9) c.fillRect(x + 4.6, 5, 0.9, 10);
    c.fillStyle = INK;
    c.fillRect(30, 22, 20, 6); // axle block
  });
  canvas(scene, 'cart_wheel', 30, 30, (c) => {
    c.strokeStyle = INK; c.fillStyle = INK;
    c.lineWidth = 3; c.beginPath(); c.arc(15, 15, 13, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.6;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.beginPath(); c.moveTo(15, 15); c.lineTo(15 + Math.cos(a) * 12.5, 15 + Math.sin(a) * 12.5); c.stroke(); }
    c.beginPath(); c.arc(15, 15, 3.4, 0, Math.PI * 2); c.fill();
  });
}

/** a banyan trunk that rises out of view: knotted, slightly leaning, flaring into buttress roots, with aerial roots around it */
export function trunkTexture(scene: Phaser.Scene, key: string, w: number, h: number, shade: string, blur = 0) {
  canvas(scene, key, w * 5, h, (c, rnd) => {
    if (blur) c.filter = `blur(${blur * ART}px)`;
    const cx = w * 2.5, lean = rnd.realInRange(-0.04, 0.04);
    const ph1 = rnd.realInRange(0, 6), ph2 = rnd.realInRange(0, 6);
    const half = (y: number, side: number) => {
      const fromBase = h - y;
      const flare = fromBase < 150 ? Math.pow(1 - fromBase / 150, 2.4) * w * 1.3 : 0;
      const knot = Math.sin(y * 0.021 + (side > 0 ? ph1 : ph2)) * 2.2 + Math.sin(y * 0.07 + ph1 * side) * 1.1;
      return w * 0.48 + flare + knot;
    };
    const xAt = (y: number) => cx + (h - y) * lean;
    c.fillStyle = shade; c.strokeStyle = shade;
    c.beginPath();
    c.moveTo(xAt(h) - half(h, -1), h);
    for (let y = h; y >= 0; y -= 8) c.lineTo(xAt(y) - half(y, -1), y);
    for (let y = 0; y <= h; y += 8) c.lineTo(xAt(y) + half(y, 1), y);
    c.closePath(); c.fill();
    // buttress roots reaching out along the ground
    for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
      const len = rnd.between(30, 80) + k * 20, x0 = xAt(h - 40) + side * w * (0.2 + k * 0.15);
      c.lineWidth = 9 - k * 2.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x0, h - 60 + k * 12); c.quadraticCurveTo(x0 + side * len * 0.5, h - 18, x0 + side * len, h); c.stroke();
    }
    // bark: long, wandering ridges
    c.strokeStyle = 'rgba(78,84,88,0.2)'; c.lineWidth = 1.1;
    for (let k = 0; k < 8; k++) {
      const u = -0.4 + (k / 7) * 0.8;
      c.beginPath();
      for (let y = h - 30; y >= 0; y -= 20) { const x = xAt(y) + u * half(y, u > 0 ? 1 : -1) * 0.9 + Math.sin(y * 0.03 + k) * 1.5; if (y === h - 30) c.moveTo(x, y); else c.lineTo(x, y); }
      c.stroke();
    }
    c.strokeStyle = shade;
    for (let k = 0; k < rnd.between(6, 10); k++) {
      const x = cx + rnd.between(-w * 2.2, w * 2.2), end = h - rnd.between(0, h * 0.55);
      c.lineWidth = rnd.realInRange(0.8, 2.4);
      c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + rnd.between(-6, 6), end * 0.4, x + rnd.between(-8, 8), end * 0.8, x + rnd.between(-4, 4), end); c.stroke();
    }
  });
}

/** the bough a vine hangs from: a long, slightly sagging branch with leaf clusters, reaching in from off-screen */
export function boughTexture(scene: Phaser.Scene, key: string) {
  canvas(scene, key, 520, 90, (c, rnd) => {
    c.fillStyle = INK; c.strokeStyle = INK; c.lineCap = 'round';
    // the limb tapers from the trunk side (left) to a thin tip
    const bz = (t: number) => { const u = 1 - t; return { x: u * u * u * 0 + 3 * u * u * t * 140 + 3 * u * t * t * 300 + t * t * t * 500, y: u * u * u * 30 + 3 * u * u * t * 40 + 3 * u * t * t * 52 + t * t * t * 44 }; };
    const top: { x: number; y: number }[] = [], bot: { x: number; y: number }[] = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40, p = bz(t), w = 7.5 * (1 - t) + 1.2 + Math.sin(t * 19) * 0.4; top.push({ x: p.x, y: p.y - w }); bot.push({ x: p.x, y: p.y + w }); }
    c.beginPath(); c.moveTo(top[0].x, top[0].y); for (const p of top) c.lineTo(p.x, p.y); for (const p of bot.reverse()) c.lineTo(p.x, p.y); c.closePath(); c.fill();
    c.lineWidth = 6; c.beginPath(); c.moveTo(300, 50); c.quadraticCurveTo(360, 30, 420, 20); c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(200, 44); c.quadraticCurveTo(230, 62, 250, 70); c.stroke();
    for (let i = 0; i < 70; i++) {
      const x = rnd.between(120, 510), y = 40 - (x > 380 ? (x - 380) * 0.15 : 0) + rnd.between(-16, 14);
      c.beginPath(); c.ellipse(x, y, rnd.realInRange(3, 6), rnd.realInRange(1.6, 2.8), rnd.realInRange(-1, 1), 0, Math.PI * 2); c.fill();
    }
  });
}

/** a short tapered segment for drawing ropes and vines from rotated sprites */
export function ropeTextures(scene: Phaser.Scene) {
  canvas(scene, 'vine_seg', 12, 4, (c) => {
    c.fillStyle = INK;
    c.beginPath(); c.arc(2, 2, 1.7, 0, Math.PI * 2); c.arc(10, 2, 1.7, 0, Math.PI * 2); c.fill();
    c.fillRect(2, 0.3, 8, 3.4);
  });
  canvas(scene, 'vine_leaf', 10, 6, (c) => {
    c.fillStyle = INK;
    c.beginPath(); c.moveTo(0, 3); c.quadraticCurveTo(4, -1, 10, 3); c.quadraticCurveTo(4, 7, 0, 3); c.fill();
  });
  canvas(scene, 'post_lamp', 24, 60, (c) => {
    c.fillStyle = INK; c.strokeStyle = INK;
    c.fillRect(10.5, 10, 3, 50);
    c.fillRect(5, 9, 14, 2.2);
    c.beginPath(); c.ellipse(12, 8, 6, 2.6, 0, 0, Math.PI); c.fill();
    c.beginPath(); c.moveTo(16, 7); c.lineTo(20, 5.5); c.lineTo(17, 8.5); c.fill();
  });
  canvas(scene, 'pebble', 8, 6, (c) => { c.fillStyle = INK; c.beginPath(); c.ellipse(4, 3, 3.8, 2.8, 0, 0, Math.PI * 2); c.fill(); });
  canvas(scene, 'twig', 22, 6, (c) => {
    c.strokeStyle = INK; c.lineWidth = 1.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(1, 3); c.quadraticCurveTo(10, 1.5, 21, 3.5); c.moveTo(12, 2.5); c.lineTo(16, 0.5); c.stroke();
  });
}
