import Phaser from 'phaser';
import { sfx } from '../audio';
import { hasProgress, loadSave, writeSave, type SaveData } from '../save';
import { Menu, type MenuItem } from '../ui';
import { CHAPTERS, CHAPTER_LIST } from './chapters';
import { GirlRig } from './girl';

// Title screen: the misty forest, the girl and her flame at the edge of the frame, and the menus.

const W = 1280, H = 720;
const BONE = '#d8d2c4', SERIF = 'Georgia, serif', DEVA = '"Noto Serif Devanagari", "Nirmala UI", "Mangal", serif';

export class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }
  save!: SaveData;
  menu?: Menu;
  overlay: Phaser.GameObjects.GameObject[] = [];
  layers: { s: Phaser.GameObjects.TileSprite; f: number }[] = [];
  rig!: GirlRig;
  glow!: Phaser.GameObjects.Image; flame!: Phaser.GameObjects.Image;
  data0: { show?: string; credits?: boolean } = {};

  init(d: { show?: string; credits?: boolean }) { this.data0 = d ?? {}; }

  create() {
    this.save = loadSave();
    this.overlay = []; this.layers = []; this.menu = undefined;
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, H);
    const layer = (key: string, y: number, f: number, alpha = 1) => { const s = this.add.tileSprite(0, y, W, H, key).setOrigin(0).setAlpha(alpha); this.layers.push({ s, f }); return s; };
    layer('trees_far2', 0, 4);
    layer('trees_far', 0, 9);
    if (this.textures.exists('shafts_warm')) this.add.image(-40, 0, 'shafts_warm').setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7);
    layer('trees_mid', 40, 20);
    layer('fog', 300, 32, 0.6);
    // the ground she stands on, bottom right
    const g = this.add.graphics();
    g.fillStyle(0x07080a).fillRect(0, 600, W, 120);
    for (let x = 0; x < W; x += 3) { const h = 3 + ((x * 7919) % 13); g.fillTriangle(x - 1, 601, x + 1, 601, x + ((x * 31) % 7) - 3, 601 - h); }
    this.rig = new GirlRig(this, 12);
    this.glow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(13);
    this.flame = this.add.image(0, 0, 'flame').setBlendMode(Phaser.BlendModes.ADD).setDepth(13.1);
    this.rig.root.setScale(2.4);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(30);
    if (this.game.renderer.type === Phaser.WEBGL) this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 1, 0.8, 3);
    this.cameras.main.fadeIn(1200);
    if (this.data0.credits) this.showCredits();
    else if (this.data0.show === 'chapters') this.showChapters();
    else this.showMain();
    this.input.keyboard?.on('keydown', () => { sfx.unlock(); });
  }

  update(time: number, delta: number) {
    for (const l of this.layers) l.s.tilePositionX += (l.f * delta) / 1000;
    const dt = delta / 1000;
    // she stands at the edge of the frame, the flame cupped in her hand
    this.rig.update(1040, 601, { state: 'ground', vx: 0, vy: 0, dx: 0, facing: -1, dt, time, carrying: true });
    this.rig.root.setScale(-2.4, 2.4);
    const fl = 1 + Math.sin(time * 0.017) * 0.04 + (Math.random() - 0.5) * 0.03;
    const fx = 1040 - (this.rig.flameX - 1040) * 2.4 * -1, fy = 601 + (this.rig.flameY - 601) * 2.4;
    this.glow.setPosition(fx, fy).setScale(3.4 * fl);
    this.flame.setPosition(fx, fy - 6).setScale(1.3 * fl, 1.5 * fl);
  }

  clear() {
    this.menu?.destroy(); this.menu = undefined;
    for (const o of this.overlay) o.destroy();
    this.overlay = [];
  }
  text(x: number, y: number, s: string, size: number, font = SERIF, alpha = 0.9) {
    const t = this.add.text(x, y, s, { fontFamily: font, fontSize: `${size}px`, color: BONE, align: 'center' }).setOrigin(0.5).setDepth(41).setAlpha(alpha);
    this.overlay.push(t);
    return t;
  }

  start(chapter: string, cp = 0) {
    sfx.unlock();
    this.cameras.main.fadeOut(700);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('play', { chapter, cp }));
  }

  unlocked(id: string) {
    if (new URLSearchParams(location.search).has('unlock')) return true;
    const i = CHAPTERS.findIndex((c) => c.id === id);
    return i === 0 || (i > 0 && this.save.completed.includes(CHAPTERS[i - 1].id));
  }

  showMain() {
    this.clear();
    this.text(W / 2 - 120, 175, 'C H H A Y A', 84);
    this.text(W / 2 - 120, 255, 'छाया', 38, DEVA, 0.8);
    const items: MenuItem[] = [];
    if (hasProgress(this.save) && CHAPTERS.some((c) => c.id === this.save.chapter)) {
      const ch = CHAPTERS.find((c) => c.id === this.save.chapter)!;
      items.push({ label: () => `Continue  ·  ${ch.num}`, action: () => this.start(ch.id, this.save.checkpoint) });
    }
    items.push(
      { label: () => 'New Game', action: () => { this.save.chapter = CHAPTERS[0].id; this.save.checkpoint = 0; writeSave(this.save); this.start(CHAPTERS[0].id, 0); } },
      { label: () => 'Chapters', action: () => this.showChapters() },
      { label: () => `Hints:  ${this.save.hints ? 'On' : 'Off'}`, action: () => { this.save.hints = !this.save.hints; writeSave(this.save); } },
      { label: () => `Sound:  ${this.save.sound ? 'On' : 'Off'}`, action: () => { this.save.sound = !this.save.sound; sfx.setMuted(!this.save.sound); writeSave(this.save); } },
      { label: () => `Effects:  ${this.save.effects === 'low' ? 'Low' : 'High'}`, action: () => { this.save.effects = this.save.effects === 'low' ? 'high' : 'low'; writeSave(this.save); } },
    );
    this.menu = new Menu(this, W / 2 - 120, 360, items);
    const touch = this.sys.game.device.input.touch;
    this.text(W / 2 - 120, 670, touch ? 'tap to choose' : '↑ ↓ to choose  ·  Enter to select  ·  or use the mouse', 15, SERIF, 0.45);
  }

  showChapters() {
    this.clear();
    this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setDepth(40).setName('shade');
    this.overlay.push(this.children.getByName('shade')!);
    this.text(W / 2, 92, 'Chapters', 40);
    const lit = this.save.secrets.length;
    this.text(W / 2, 128, lit ? `hidden lamps lit: ${lit}` : '', 14, SERIF, 0.5);
    const items: MenuItem[] = CHAPTER_LIST.map((c) => ({
      label: () => `${c.num}  —  ${c.title}${!c.build ? '   (coming soon)' : this.unlocked(c.id) ? (this.save.completed.includes(c.id) ? '   ✓' : '') : '   (locked)'}`,
      enabled: () => !!c.build && this.unlocked(c.id),
      action: () => { this.save.chapter = c.id; this.save.checkpoint = 0; writeSave(this.save); this.start(c.id, 0); },
    }));
    items.push({ label: () => 'Back', action: () => this.showMain() });
    this.menu = new Menu(this, W / 2, 180, items, 44, 22);
    this.menu.container.setDepth(42);
  }

  showCredits() {
    this.clear();
    this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setDepth(40);
    this.text(W / 2, 220, 'The lamps are lit again.', 34);
    this.text(W / 2, 280, 'छाया', 30, DEVA, 0.8);
    this.text(W / 2, 360, `deaths: ${this.save.deaths}   ·   hidden lamps: ${this.save.secrets.length}`, 16, SERIF, 0.6);
    this.menu = new Menu(this, W / 2, 470, [{ label: () => 'Main menu', action: () => this.showMain() }]);
  }
}
