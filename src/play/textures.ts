import Phaser from 'phaser';
import { ART_OVERRIDES } from '../artOverrides';
import { boughTexture, cartTextures, ropeTextures, trunkTexture } from '../slice/art';

// Generated textures for the new engine (props and machinery). Hand-made or generated art listed in
// public/art/manifest.json replaces any of these by key.

const INK = '#07080a';

function canvas(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, rnd: Phaser.Math.RandomDataGenerator) => void, res = 2) {
  if (ART_OVERRIDES.has(key) || scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, Math.ceil(w * res), Math.ceil(h * res))!;
  const c = t.getContext();
  c.scale(res, res);
  c.fillStyle = INK; c.strokeStyle = INK; c.lineCap = 'round'; c.lineJoin = 'round';
  draw(c, new Phaser.Math.RandomDataGenerator([key]));
  t.refresh();
}

export function makePlayTextures(scene: Phaser.Scene) {
  ropeTextures(scene);
  cartTextures(scene);
  boughTexture(scene, 'bough');
  if (!scene.textures.exists('trunk_mid')) trunkTexture(scene, 'trunk_mid', 50, 820, '#14181b', 1.4);
  trunkTexture(scene, 'trunk_near', 70, 900, '#07080a', 0);

  canvas(scene, 'water_sheen', 64, 3, (c) => {
    const g = c.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(150,170,185,0)'); g.addColorStop(0.5, 'rgba(150,170,185,0.5)'); g.addColorStop(1, 'rgba(150,170,185,0)');
    c.fillStyle = g; c.fillRect(0, 1, 64, 1);
  });
  canvas(scene, 'rock', 26, 22, (c) => {
    c.beginPath(); c.moveTo(3, 8); c.lineTo(10, 1); c.lineTo(20, 2); c.lineTo(25, 10); c.lineTo(21, 20); c.lineTo(8, 21); c.lineTo(1, 15); c.closePath(); c.fill();
  }, 1);
  canvas(scene, 'crack', 60, 30, (c, r) => {
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(160,160,155,0.35)';
    for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(30, 0); let x = 30, y = 0; for (let i = 0; i < 5; i++) { x += r.between(-6, 6); y += r.between(3, 6); c.lineTo(x, y); } c.stroke(); }
  });
  canvas(scene, 'brazier', 40, 34, (c) => {
    c.beginPath(); c.moveTo(2, 0); c.lineTo(38, 0); c.lineTo(30, 14); c.lineTo(10, 14); c.closePath(); c.fill();
    c.fillRect(18, 14, 4, 18); c.fillRect(10, 30, 20, 4);
  });
  canvas(scene, 'jaws_open', 48, 16, (c) => {
    c.lineWidth = 2; c.beginPath(); c.ellipse(24, 12, 20, 3.5, 0, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 9; i++) { const x = 6 + i * 4.5; c.beginPath(); c.moveTo(x - 1.5, 10); c.lineTo(x, 4); c.lineTo(x + 1.5, 10); c.fill(); }
    c.fillRect(20, 12, 8, 4);
  });
  canvas(scene, 'jaws_shut', 48, 16, (c) => {
    c.lineWidth = 2.4; c.beginPath(); c.moveTo(6, 14); c.quadraticCurveTo(24, -2, 42, 14); c.stroke();
    for (let i = 0; i < 7; i++) { const x = 10 + i * 4.6; c.beginPath(); c.moveTo(x - 1.4, 9); c.lineTo(x, 13); c.lineTo(x + 1.4, 9); c.fill(); }
    c.fillRect(20, 12, 8, 4);
  });
  canvas(scene, 'gatebars2', 24, 64, (c) => {
    for (const x of [2, 10, 18]) c.fillRect(x, 0, 4, 64);
    c.fillRect(0, 8, 24, 3); c.fillRect(0, 40, 24, 3);
  }, 2);
  canvas(scene, 'crusher', 100, 64, (c) => {
    c.beginPath(); c.roundRect(0, 4, 100, 50, 4); c.fill();
    c.fillRect(6, 54, 88, 10);
    c.strokeStyle = 'rgba(110,116,122,0.3)'; c.lineWidth = 1.2;
    for (const x of [12, 50, 88]) { c.beginPath(); c.arc(x, 14, 2.4, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.moveTo(2, 6); c.lineTo(98, 6); c.stroke();
  });
  canvas(scene, 'sawblade', 64, 64, (c) => {
    c.beginPath();
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, a2 = ((i + 0.5) / 24) * Math.PI * 2; c.lineTo(32 + Math.cos(a) * 31, 32 + Math.sin(a) * 31); c.lineTo(32 + Math.cos(a2) * 26, 32 + Math.sin(a2) * 26); }
    c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(32, 32, 4, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'source-over'; c.strokeStyle = 'rgba(150,156,160,0.35)'; c.lineWidth = 1; c.beginPath(); c.arc(32, 32, 18, 0, Math.PI * 2); c.stroke();
  });
  canvas(scene, 'web_seg', 12, 4, (c) => { c.fillStyle = 'rgba(200,206,212,0.8)'; c.fillRect(0, 1.5, 12, 1); });
  // the brother: a thin boy in profile, a bundle over his shoulder (white, tinted where used)
  canvas(scene, 'brother', 30, 66, (c) => {
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(15, 9, 7, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(9, 17); c.lineTo(21, 17); c.lineTo(20, 42); c.lineTo(10, 42); c.closePath(); c.fill();
    c.fillRect(10, 40, 4.5, 24); c.fillRect(16, 40, 4.5, 24);
    c.beginPath(); c.ellipse(6, 18, 7, 9, -0.4, 0, Math.PI * 2); c.fill(); // the bundle
    c.fillRect(19, 18, 3.5, 18);
  });
  canvas(scene, 'hut', 220, 160, (c) => {
    c.fillRect(20, 70, 180, 90);
    c.beginPath(); c.moveTo(0, 78); c.lineTo(110, 0); c.lineTo(220, 78); c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out'; c.fillRect(90, 100, 34, 60); c.globalCompositeOperation = 'source-over';
  });
  canvas(scene, 'shrine', 90, 130, (c) => {
    c.fillRect(10, 60, 70, 70);
    c.beginPath(); c.moveTo(5, 62); c.quadraticCurveTo(45, 0, 85, 62); c.closePath(); c.fill();
    c.fillRect(43, 0, 4, 14);
    c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.moveTo(30, 130); c.lineTo(30, 95); c.quadraticCurveTo(45, 78, 60, 95); c.lineTo(60, 130); c.fill(); c.globalCompositeOperation = 'source-over';
  });
  canvas(scene, 'hay', 70, 58, (c, r) => {
    c.beginPath(); c.roundRect(2, 3, 66, 53, 10); c.fill();
    c.strokeStyle = 'rgba(120,112,96,0.35)'; c.lineWidth = 0.8;
    for (let i = 0; i < 60; i++) { const x = r.between(4, 66), y = r.between(5, 54); c.beginPath(); c.moveTo(x, y); c.lineTo(x + r.between(-8, 8), y + r.between(-3, 3)); c.stroke(); }
    c.fillStyle = '#07080a'; c.fillRect(2, 18, 66, 2.5); c.fillRect(2, 38, 66, 2.5);
    for (let i = 0; i < 26; i++) { const x = r.between(0, 70); c.fillRect(x, r.between(0, 4), 0.8, r.between(3, 7)); }
  });
  canvas(scene, 'bones', 70, 14, (c) => { // a deer's remains in the grass: ribs and a long leg bone
    c.fillStyle = 'rgba(140,140,132,0.5)'; c.strokeStyle = 'rgba(140,140,132,0.5)'; c.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(12 + i * 5, 13); c.quadraticCurveTo(14 + i * 5, 3, 22 + i * 4, 2 + i); c.stroke(); }
    c.beginPath(); c.moveTo(48, 12); c.lineTo(68, 9); c.stroke();
    c.beginPath(); c.ellipse(6, 10, 6, 3.6, 0.2, 0, Math.PI * 2); c.fill();
  });
  canvas(scene, 'grass_tall', 30, 40, (c, r) => { // long grass right against the lens
    for (let i = 0; i < 9; i++) { const x = r.between(2, 28), h = r.between(20, 39), lean = r.between(-8, 8); c.beginPath(); c.moveTo(x - 1, 40); c.quadraticCurveTo(x + lean * 0.3, 40 - h * 0.6, x + lean, 40 - h); c.quadraticCurveTo(x + lean * 0.3 + 1, 40 - h * 0.6, x + 1, 40); c.fill(); }
  });
  canvas(scene, 'web_big', 200, 180, (c, r) => { // an old orb web strung between roots (pale lines, tinted where used)
    c.strokeStyle = 'rgba(220,226,232,0.55)'; c.lineWidth = 0.6;
    const cx = 100 + r.between(-10, 10), cy = 90 + r.between(-10, 10);
    const spokes = 16, ends: { x: number; y: number }[] = [];
    for (let i = 0; i < spokes; i++) { const a = (i / spokes) * Math.PI * 2 + r.realInRange(-0.1, 0.1), L = r.between(70, 98); ends.push({ x: cx + Math.cos(a) * L, y: cy + Math.sin(a) * L * 0.9 }); c.beginPath(); c.moveTo(cx, cy); c.lineTo(ends[i].x, ends[i].y); c.stroke(); }
    for (let k = 1; k < 13; k++) { c.beginPath(); for (let i = 0; i <= spokes; i++) { const e = ends[i % spokes], u = k / 13 + r.realInRange(-0.01, 0.01); const x = cx + (e.x - cx) * u, y = cy + (e.y - cy) * u + (i % 2 ? 1.2 : 0); if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); }
    // torn: a few strands hanging loose
    for (let i = 0; i < 4; i++) { const e = ends[r.between(0, spokes - 1)]; c.beginPath(); c.moveTo(e.x, e.y); c.quadraticCurveTo(e.x + r.between(-10, 10), e.y + 20, e.x + r.between(-6, 6), e.y + r.between(30, 60)); c.stroke(); }
  });
  canvas(scene, 'cocoon', 26, 50, (c) => {
    c.fillStyle = 'rgba(190,196,200,0.75)';
    c.beginPath(); c.ellipse(13, 28, 10, 21, 0, 0, Math.PI * 2); c.fill();
    c.fillRect(12.4, 0, 1.2, 10);
    c.strokeStyle = 'rgba(120,124,128,0.6)'; c.lineWidth = 0.7;
    for (let y = 12; y < 48; y += 4) { c.beginPath(); c.moveTo(4, y); c.quadraticCurveTo(13, y + 3, 22, y - 1); c.stroke(); }
  });
  canvas(scene, 'scarf', 26, 14, (c) => { // the brother's scarf: dull red cloth caught on a thorn
    c.fillStyle = '#5a1f1a';
    c.beginPath(); c.moveTo(2, 2); c.quadraticCurveTo(12, 0, 16, 4); c.lineTo(24, 12); c.lineTo(19, 13); c.lineTo(13, 8); c.quadraticCurveTo(7, 9, 1, 6); c.closePath(); c.fill();
  });
  canvas(scene, 'leaves', 110, 10, (c, r) => { // fallen leaves on solid ground (no twigs)
    for (let i = 0; i < 40; i++) { c.beginPath(); c.ellipse(r.between(2, 108), r.between(5, 9), r.between(2, 5), r.between(1, 2), r.realInRange(-0.5, 0.5), 0, Math.PI * 2); c.fill(); }
  });
  canvas(scene, 'bell', 28, 30, (c) => {
    c.beginPath(); c.moveTo(14, 2); c.quadraticCurveTo(5, 3, 5, 16); c.quadraticCurveTo(4, 24, 1, 27); c.lineTo(27, 27); c.quadraticCurveTo(24, 24, 23, 16); c.quadraticCurveTo(23, 3, 14, 2); c.fill();
    c.fillRect(12, 0, 4, 4); c.beginPath(); c.arc(14, 28.5, 2.5, 0, Math.PI * 2); c.fill();
  });
  canvas(scene, 'signal', 30, 140, (c) => { // a railway semaphore post
    c.fillRect(13, 10, 4, 130); c.fillRect(6, 136, 18, 4);
    c.beginPath(); c.moveTo(15, 18); c.lineTo(30, 14); c.lineTo(30, 22); c.lineTo(15, 24); c.fill();
    c.fillStyle = 'rgba(160,40,30,0.8)'; c.beginPath(); c.arc(11, 22, 3, 0, Math.PI * 2); c.fill();
  });
  canvas(scene, 'plank', 30, 8, (c) => { c.beginPath(); c.roundRect(0, 1, 30, 6, 1.5); c.fill(); });
  canvas(scene, 'cage_boy', 70, 80, (c) => { // the cage with a boy crouched inside, behind the bars
    c.fillStyle = '#2a2d30'; c.beginPath(); c.arc(36, 30, 7, 0, Math.PI * 2); c.fill(); c.fillRect(27, 37, 18, 22); c.fillRect(24, 56, 26, 18);
    c.fillStyle = '#07080a'; c.fillRect(0, 0, 70, 5); c.fillRect(0, 75, 70, 5);
    for (let x = 1; x < 70; x += 8) c.fillRect(x, 0, 2.6, 80);
  });
  canvas(scene, 'cage', 70, 80, (c) => {
    c.fillRect(0, 0, 70, 5); c.fillRect(0, 75, 70, 5);
    for (let x = 1; x < 70; x += 8) c.fillRect(x, 0, 2.6, 80);
  });
}
