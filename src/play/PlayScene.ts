import Phaser from 'phaser';
import { sfx } from '../audio';
import { loadSave, writeSave, type SaveData } from '../save';
import { TouchControls } from '../touch';
import { Menu, type MenuItem } from '../ui';
import { Autopilot } from './autopilot';
import { CHAPTERS, PLAYABLE, chapterIndex } from './chapters';
import { CAT, MJ, REGISTRY, type Ent, type Light, type MBody, type Prop } from './ents/base';
import './ents/all';
import { Lamp } from './ents/world';
import type { Burnable } from './ents/hazards';
import type { Vine } from './ents/vine';
import type { Water } from './ents/water';
import { GirlRig } from './girl';
import { Player, NO_INPUT, BODY_H, type Corner, type Inp } from './player';
import { Terrain } from './terrain';
import { makePlayTextures } from './textures';
import type { ChapterInfo, LevelData } from './types';

// The game on the new engine: Matter physics, the jointed girl, a level built from chapter code, its things,
// light and darkness, the camera, death and checkpoints, pause and the end of the chapter.

const W = 1280, H = 720;
const ZOOM = 1.3;
const BONE = '#d8d2c4', SERIF = 'Georgia, serif', DEVA = '"Noto Serif Devanagari", "Nirmala UI", "Mangal", serif';

export interface StartData { chapter?: string; cp?: number; auto?: boolean }

/** creatures expose this to traps and fire */
export interface Creature { x: number; y: number; alive: boolean; onGround?: () => boolean; trapped?: (kind: string) => void; scare?: (x: number, y: number, k: number) => void }

export class PlayScene extends Phaser.Scene {
  constructor() { super({ key: 'play', physics: { default: 'matter', matter: { gravity: { x: 0, y: 1.4 }, debug: false } } as Phaser.Types.Core.PhysicsConfig }); }

  info!: ChapterInfo;
  L!: LevelData;
  save!: SaveData;
  P!: Player;
  rig!: GirlRig;
  ents: Ent[] = [];
  byId = new Map<string, Ent>();
  props: Prop[] = [];
  vines: Vine[] = [];
  waters: Water[] = [];
  lamps: Lamp[] = [];
  burnables: Burnable[] = [];
  creatures: Creature[] = [];
  camZones: { x: number; w: number; zoom?: number; dy?: number; dx?: number; lock?: number }[] = [];
  darkZones: { x: number; w: number; k: number; fade?: number }[] = [];
  rainZones: { x: number; w: number; k?: number }[] = [];
  shelters: { x: number; y: number; w: number; h: number; kind: string; side?: number }[] = [];
  flags: Record<string, unknown> = {};
  flagsAt: Record<string, unknown>[] = [];
  staticCorners: Corner[] = [];
  terrain!: Terrain;
  groundBodies: MBody[] = [];

  cp = 0; dead = false; ended = false; paused = false; started = false;
  deadT = 0; deathKind = '';
  t = 0; dt = 1 / 60;
  chapterDeaths = 0;
  flameK = 1; dimmedThisFrame = false; windNow = 0; flashK = 0;
  lastInp: Inp = NO_INPUT;
  auto?: Autopilot;
  startData: StartData = {};

  // view
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  touch!: TouchControls;
  uiCam!: Phaser.Cameras.Scene2D.Camera;
  ui: Phaser.GameObjects.GameObject[] = [];
  uiDone = new Set<Phaser.GameObjects.GameObject>();
  layers: { s: Phaser.GameObjects.TileSprite; f: number; fy: number; y0: number }[] = [];
  midA?: Phaser.GameObjects.TileSprite; midB?: Phaser.GameObjects.TileSprite;
  endHold = 0;
  glow!: Phaser.GameObjects.Image; flame!: Phaser.GameObjects.Image;
  embers!: Phaser.GameObjects.Particles.ParticleEmitter;
  dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  splash!: Phaser.GameObjects.Particles.ParticleEmitter;
  smoke!: Phaser.GameObjects.Particles.ParticleEmitter;
  sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  rainFx?: Phaser.GameObjects.Particles.ParticleEmitter;
  grain!: Phaser.GameObjects.TileSprite;
  grade?: Phaser.FX.ColorMatrix;
  bloom?: Phaser.FX.Bloom;
  darkRT?: Phaser.GameObjects.RenderTexture;
  darkBrush?: Phaser.GameObjects.Image;
  hintText!: Phaser.GameObjects.Text;
  prompt!: Phaser.GameObjects.Image;
  camX = 0; camY = 0; lookX = 120; zoomNow = ZOOM; camDy = 0; camDx = 0; shakeK = 0;
  prevJump = false; prevGrab = false; prevAct = false;
  hintShown?: string; lingerT = 0; lingerHint?: string;
  menu?: Menu;
  overlay: Phaser.GameObjects.GameObject[] = [];
  pauseBtn?: Phaser.GameObjects.Container;
  droppedDiya?: Phaser.GameObjects.Image;
  lowFx = false;
  lastRigX = 0;
  solidCache: MBody[] = []; solidFrame = -1; frame = 0;

  init(data: StartData) {
    this.startData = data ?? {};
    this.save = loadSave();
    const id = data?.chapter ?? this.save.chapter;
    this.info = PLAYABLE.find((c) => c.id === id) ?? CHAPTERS[0];
    this.cp = data?.cp ?? (this.save.chapter === this.info.id ? this.save.checkpoint : 0);
  }

  create() {
    this.resetFields();
    makePlayTextures(this);
    const L = (this.L = this.info.build());
    this.cp = Phaser.Math.Clamp(this.cp, 0, L.checkpoints.length - 1);
    const M = this.matter;
    const b = L.bounds;
    M.world.setBounds(b.x, b.y - 400, b.w, b.h + 800, 64, true, true, false, false);
    const cam = this.cameras.main;
    cam.setBackgroundColor('#000000');
    this.lowFx = this.save.effects === 'low';

    this.makeBackdrop();

    // ground: physics bodies now, pictures streamed in as the camera nears them
    this.terrain = new Terrain(this, L.blocks);
    this.events.once('shutdown', () => this.terrain.destroy());
    for (const g of L.blocks) {
      const body = M.add.rectangle(g.x + g.w / 2, g.y + g.h / 2, g.w, g.h, { isStatic: true, friction: 0.8, label: 'ground', collisionFilter: { category: CAT.GROUND, mask: 0xffff } }) as MBody;
      this.groundBodies.push(body);
      if (!g.noGrab) {
        if (g.left) this.staticCorners.push({ x: g.x, y: g.y, side: 1 });
        if (g.right) this.staticCorners.push({ x: g.x + g.w, y: g.y, side: -1 });
      }
    }
    for (const d of L.decor) {
      const img = this.add.image(d.x, d.y, d.key).setOrigin(d.ox ?? 0.5, d.oy ?? 1).setDepth(d.depth ?? 4).setScale(d.sx ?? 0.5, d.sy ?? d.sx ?? 0.5);
      if (d.sf !== undefined) img.setScrollFactor(d.sf, 1);
      if (d.tint !== undefined) img.setTint(d.tint);
      if (d.alpha !== undefined) img.setAlpha(d.alpha);
      if (d.flip) img.setFlipX(true);
      if (d.rot) img.setRotation(d.rot);
    }

    // checkpoint lamps, then everything else
    L.checkpoints.forEach((c, i) => { if (c.lamp !== 'none') this.addEnt({ type: 'lamp', id: `cp${i}`, x: c.x - (c.lamp === 'wall' ? 0 : 34), y: c.y, kind: c.lamp ?? 'post', cp: i }); });
    for (const d of L.ents) this.addEnt(d);

    // the girl
    const c0 = L.checkpoints[this.cp];
    this.P = new Player(this, c0.x, c0.y);
    this.rig = new GirlRig(this, 12);
    this.glow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(13);
    this.flame = this.add.image(0, 0, 'flame').setBlendMode(Phaser.BlendModes.ADD).setDepth(13.1).setScale(0.75);
    this.embers = this.add.particles(0, 0, 'soft', {
      speedY: { min: -40, max: -18 }, speedX: { min: -8, max: 8 }, lifespan: { min: 500, max: 1100 }, scale: { start: 0.05, end: 0 },
      tint: 0xffb35a, blendMode: Phaser.BlendModes.ADD, frequency: 240, alpha: { start: 0.9, end: 0 },
    }).setDepth(13.2);
    this.dust = this.add.particles(0, 0, 'soft', {
      speed: { min: 8, max: 50 }, angle: { min: 190, max: 350 }, lifespan: 900, gravityY: -10,
      alpha: { start: 0.28, end: 0 }, scale: { start: 0.2, end: 0.8 }, tint: 0x9a9a96, emitting: false,
    }).setDepth(13);
    this.splash = this.add.particles(0, 0, 'soft', {
      speed: { min: 60, max: 220 }, angle: { min: 230, max: 310 }, lifespan: 700, gravityY: 700,
      alpha: { start: 0.6, end: 0 }, scale: { start: 0.12, end: 0.04 }, tint: 0xaab4bc, emitting: false,
    }).setDepth(14.7);
    this.smoke = this.add.particles(0, 0, 'soft', {
      speedY: { min: -40, max: -12 }, speedX: { min: -14, max: 14 }, lifespan: { min: 900, max: 1800 }, scale: { start: 0.25, end: 0.9 },
      alpha: { start: 0.55, end: 0 }, tint: 0x050505, emitting: false,
    }).setDepth(12.9);
    this.sparks = this.add.particles(0, 0, 'soft', {
      speed: { min: 10, max: 40 }, angle: { min: 240, max: 300 }, lifespan: 600, gravityY: -20,
      scale: { start: 0.08, end: 0 }, tint: 0xffb35a, blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).setDepth(12.8);
    this.makeAtmosphere();

    // foreground, lens, film
    const th = L.theme;
    if (th.fgTop && this.textures.exists(th.fgTop)) this.layer(th.fgTop, 0, 1.4, 1.0, 21.5).setSize(W, 237);
    if (this.textures.exists(th.fg)) { const near = this.layer(th.fg, H - 190, 1.75, 1.2, 22); near.setSize(W, 217); near.tilePositionY = 2; }
    this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(30);
    this.grain = this.add.tileSprite(0, 0, W, H, 'grain').setOrigin(0).setScrollFactor(0).setDepth(31).setAlpha(0.05).setBlendMode(Phaser.BlendModes.OVERLAY);
    this.makeDarkness();

    // camera & post
    cam.setZoom(ZOOM);
    cam.setBounds(b.x, b.y, b.w, b.h);
    if (this.game.renderer.type === Phaser.WEBGL && !this.lowFx) {
      this.bloom = cam.postFX.addBloom(0xffffff, 1, 1, 1, 0.8, 3);
      this.grade = cam.postFX.addColorMatrix();
    }
    this.P.place(c0.x, c0.y);
    this.camX = c0.x + this.lookX; this.camY = c0.y - 128;
    cam.centerOn(this.camX, this.camY);
    this.lastRigX = c0.x;

    this.makeUI();
    this.keys = this.input.keyboard!.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,SHIFT,J,E,K,ESC,P,ENTER,R,Z,X') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown', () => this.unlockAudio());
    this.input.on('pointerdown', () => this.unlockAudio());
    this.input.keyboard!.on('keydown-ESC', () => { if (this.paused) this.closePause(); else this.openPause(); });
    this.input.keyboard!.on('keydown-P', () => { if (!this.paused) this.openPause(); });
    this.input.keyboard!.on('keydown-R', () => { if (!this.paused && !this.dead && this.started) this.die('retry'); });
    cam.fadeIn(1400, 0, 0, 0);

    // respawn state for the checkpoint we start at
    for (const e of this.ents) e.reset(this.cp);
    this.lamps.forEach((l) => { if (l.d.cp !== undefined && (l.d.cp as number) <= this.cp) l.light(true); });
    this.flagsAt[this.cp] = { ...this.flags };
    if (chapterIndex(this.info.id) >= 0) { this.save.chapter = this.info.id; this.save.checkpoint = this.cp; this.persist(); }
    sfx.setMuted(!this.save.sound);

    if (this.startData.auto || new URLSearchParams(location.search).has('auto')) this.startAuto();
    if (!this.auto) this.titleCard();
    this.started = true;
    if (import.meta.env.DEV) (window as unknown as { S: PlayScene }).S = this;
  }

  resetFields() {
    this.ents = []; this.byId = new Map(); this.props = []; this.vines = []; this.waters = []; this.lamps = []; this.burnables = []; this.creatures = [];
    this.camZones = []; this.darkZones = []; this.rainZones = []; this.shelters = []; this.flags = {}; this.flagsAt = []; this.staticCorners = []; this.groundBodies = [];
    this.dead = this.ended = this.paused = this.started = false; this.deadT = 0; this.chapterDeaths = 0; this.flameK = 1; this.windNow = 0; this.endHold = 0; this.audioOn = false;
    this.ui = []; this.uiDone = new Set(); this.layers = []; this.midA = this.midB = undefined; this.overlay = []; this.menu = undefined; this.pauseBtn = undefined; this.auto = undefined;
    this.lookX = 120; this.zoomNow = ZOOM; this.camDy = 0; this.camDx = 0; this.shakeK = 0; this.hintShown = undefined; this.lingerT = 0;
    this.prevJump = this.prevGrab = this.prevAct = true; this.droppedDiya = undefined; this.solidFrame = -1; this.frame = 0; this.darkRT = undefined;
  }

  addEnt(d: LevelData['ents'][number]) {
    const C = REGISTRY[d.type];
    if (!C) { console.warn('unknown entity', d.type); return; }
    const e = new C(this, d);
    this.ents.push(e);
    if (e.id) this.byId.set(e.id, e);
    return e;
  }
  ent<T = Ent>(id: string) { return this.byId.get(id) as unknown as T; }

  // ------------------------------------------------------------------ backdrop & atmosphere

  layer(key: string, y: number, f: number, fy: number, depth: number, alpha = 1, blend?: Phaser.BlendModes) {
    const s = this.add.tileSprite(0, y, W, H, key).setOrigin(0).setScrollFactor(0).setDepth(depth).setAlpha(alpha);
    if (blend !== undefined) s.setBlendMode(blend);
    this.layers.push({ s, f, fy, y0: y });
    return s;
  }

  makeBackdrop() {
    const th = this.L.theme;
    this.add.image(0, 0, th.sky).setOrigin(0).setScrollFactor(0).setDepth(0).setDisplaySize(W, H);
    if (th.far2 && this.textures.exists(th.far2)) this.layer(th.far2, 0, 0.06, 0.03, 0.5);
    this.layer(th.far, 0, 0.14, 0.06, 1);
    if (th.shafts && this.textures.exists(th.shafts)) {
      const shafts = this.add.image(-40, 0, th.shafts).setOrigin(0).setScrollFactor(0).setDepth(1.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85);
      this.tweens.add({ targets: shafts, alpha: { from: 0.55, to: 1 }, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: shafts, x: 30, duration: 14000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    if (th.trunks) {
      // the forest: fog sheets between the distant rows so each one sits further back in the haze
      this.layer('fog', 250, 0.1, 0.05, 0.8, th.fog * 0.7);
      this.layer('fog', 290, 0.26, 0.12, 1.7, th.fog * 0.55);
    }
    this.midA = this.layer(th.mid, th.trunks ? 0 : 40, 0.38, 0.18, 2);
    // a second middle layer, offset half a tile and cross-faded with the first, one tile on and one off
    this.midB = th.mid2 && this.textures.exists(th.mid2) ? this.layer(th.mid2, th.trunks ? 0 : 40, 0.38, 0.18, 2.01) : undefined;
    this.layer('fog', 300, 0.55, 0.3, 2.5, th.fog);
    if (th.trunks) {
      const b = this.L.bounds;
      const rnd = new Phaser.Math.RandomDataGenerator([this.L.id]);
      const near = this.textures.exists('banyan_near') ? 'banyan_near' : 'trunk_mid';
      // great banyans just behind the path: big, soft, grey with distance
      for (let x = b.x + 300; x < b.x + b.w; x += rnd.between(800, 1400)) {
        const gy = this.groundTop(x, -1e9);
        this.add.image(x, Math.min(gy, 1200) + 140, near).setOrigin(0.5, 1).setScrollFactor(0.86, 1).setDepth(4)
          .setScale(rnd.realInRange(0.5, 0.65)).setTint(0x6c7378).setAlpha(0.9).setFlipX(rnd.frac() < 0.5);
      }
      // and now and then a trunk right against the lens: black, out of focus, passing quickly
      const fg = this.textures.exists('banyan_fg') ? 'banyan_fg' : near;
      for (let x = b.x + 900; x < b.x + b.w; x += rnd.between(2600, 3800)) {
        const gy = this.groundTop(x, -1e9);
        this.add.image(x * 1.25, Math.min(gy, 1200) + 520, fg).setOrigin(0.5, 1).setScrollFactor(1.25, 1).setDepth(21.2)
          .setScale(0.8).setTint(0x020203).setAlpha(0.95).setFlipX(rnd.frac() < 0.5);
      }
    }
  }

  makeAtmosphere() {
    const th = this.L.theme, cam = this.cameras.main;
    if (th.leaves) this.add.particles(0, 0, 'leaf', {
      x: { min: -300, max: W + 300 }, y: -30, lifespan: 10000, speedY: { min: 26, max: 50 }, speedX: { min: -30, max: 6 },
      rotate: { start: 0, end: 600 }, scale: { min: 0.45, max: 1 }, frequency: 700,
      emitCallback: (p: Phaser.GameObjects.Particles.Particle) => { p.x += cam.worldView.x; p.y += cam.worldView.y; },
    }).setDepth(12.5);
    if (th.fireflies) this.add.particles(0, 0, 'soft', {
      x: { min: -100, max: W + 100 }, y: { min: 380, max: 640 }, lifespan: { min: 3500, max: 6000 },
      speedX: { min: -12, max: 12 }, speedY: { min: -10, max: 6 }, scale: { start: 0.05, end: 0.08 },
      alpha: { values: [0, 0.8, 0.15, 0.7, 0] }, tint: 0xffd98a, frequency: 500, blendMode: Phaser.BlendModes.ADD,
      emitCallback: (p: Phaser.GameObjects.Particles.Particle) => { p.x += cam.worldView.x; p.y += cam.worldView.y - 300; },
    }).setDepth(13.5);
    if (this.rainZones.length) {
      this.rainFx = this.add.particles(0, 0, 'streak', {
        x: { min: -200, max: W + 300 }, y: -40, lifespan: 900, speedY: { min: 900, max: 1200 }, speedX: { min: -160, max: -100 },
        scale: { min: 0.6, max: 1.1 }, alpha: { start: 0.45, end: 0.2 }, frequency: 6, quantity: 2, rotate: 8,
        emitCallback: (p: Phaser.GameObjects.Particles.Particle) => { p.x += cam.worldView.x; p.y += cam.worldView.y; },
      }).setDepth(20);
      this.rainFx.emitting = false;
    }
  }

  makeDarkness() {
    // a low-res overlay: darkness with holes where there is light
    if (!this.textures.exists('lightmask')) {
      const t = this.textures.createCanvas('lightmask', 128, 128)!;
      const c = t.getContext();
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 128, 128); t.refresh();
    }
    const any = this.L.theme.darkness || this.darkZones.length;
    if (!any) return;
    this.darkRT = this.add.renderTexture(0, 0, W / 4, H / 4).setOrigin(0).setScrollFactor(0).setScale(4).setDepth(19);
    this.darkBrush = this.make.image({ key: 'lightmask', add: false });
  }

  makeUI() {
    this.hintText = this.add.text(W / 2, 646, '', { fontFamily: SERIF, fontSize: '19px', color: BONE, fontStyle: 'italic', align: 'center' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(40).setAlpha(0);
    this.prompt = this.add.image(0, 0, 'ico_flame').setScrollFactor(0).setDepth(40).setScale(0.32).setAlpha(0).setTint(0xffd27a);
    this.ui.push(this.hintText, this.prompt);
    this.touch = new TouchControls(this);
    this.touch.setVisible(true);
    this.makePauseButton();
    this.uiCam = this.cameras.add(0, 0, W, H, false, 'ui');
    this.sortCameras();
    this.events.on('prerender', () => this.sortCameras());
  }

  sortCameras() {
    for (const o of this.children.list) {
      if (this.uiDone.has(o)) continue;
      this.uiDone.add(o);
      let r: Phaser.GameObjects.GameObject = o;
      while ((r as Phaser.GameObjects.Container).parentContainer) r = (r as Phaser.GameObjects.Container).parentContainer;
      const isUi = this.ui.includes(r) || ((r as unknown as { depth: number }).depth >= 39 && (r as unknown as { scrollFactorX: number }).scrollFactorX === 0);
      if (isUi) this.cameras.main.ignore(o); else this.uiCam.ignore(o);
    }
  }

  audioOn = false;
  unlockAudio() {
    if (this.audioOn) return;
    this.audioOn = true;
    sfx.unlock(); sfx.setMuted(!this.save.sound);
    const th = this.L.theme;
    sfx.surface = th.ground === 'stone' || th.ground === 'rock' || th.ground === 'brick' ? 'stone' : th.ground === 'wood' ? 'wood' : 'grass';
    sfx.startAmbient(th.ambient ?? 'forest');
  }

  titleCard() {
    const t1 = this.add.text(W / 2, 290, this.info.titleHi, { fontFamily: DEVA, fontSize: '34px', color: BONE }).setOrigin(0.5).setScrollFactor(0).setDepth(41).setAlpha(0);
    const t2 = this.add.text(W / 2, 344, `${this.info.num}  —  ${this.info.title}`, { fontFamily: SERIF, fontSize: '26px', color: BONE }).setOrigin(0.5).setScrollFactor(0).setDepth(41).setAlpha(0);
    this.ui.push(t1, t2);
    this.tweens.add({ targets: [t1, t2], alpha: 0.85, duration: 1400, hold: 1800, yoyo: true, delay: 300, ease: 'Sine.inOut', onComplete: () => { t1.destroy(); t2.destroy(); } });
  }

  // ------------------------------------------------------------------ queries for things in the level

  solidBodies() {
    if (this.solidFrame !== this.frame) {
      this.solidFrame = this.frame;
      this.solidCache = (this.matter.world.localWorld as unknown as { bodies: MBody[] }).bodies.filter((b) => b.label === 'ground' || b.label === 'prop' || b.label === 'plat');
    }
    return this.solidCache;
  }

  /** the top of the first solid at x at or below fromY */
  groundTop(x: number, fromY = this.P ? this.P.feetY - 30 : -1e9) {
    let best = 1e9;
    for (const b of this.matter ? this.solidBodiesSafe() : []) {
      if (x < b.bounds.min.x || x > b.bounds.max.x) continue;
      const tp = b.bounds.min.y;
      if (tp >= fromY - 0.5 && tp < best) best = tp;
    }
    return best;
  }
  private solidBodiesSafe() { return this.P ? this.solidBodies() : (this.matter.world.localWorld as unknown as { bodies: MBody[] }).bodies.filter((b) => b.label === 'ground'); }

  cornerList(): Corner[] {
    const out = this.staticCorners.slice();
    for (const p of this.props) {
      if (!p.alive || !p.grabbable) continue;
      const a = ((p.body.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI / 2);
      if (Math.min(a, Math.PI / 2 - a) > 0.15) continue;
      const b = p.body.bounds;
      out.push({ x: b.min.x, y: b.min.y, side: 1, body: p.body }, { x: b.max.x, y: b.min.y, side: -1, body: p.body });
    }
    return out;
  }

  waterAt(x: number, y: number) { return this.waters.find((w) => w.contains(x, y)); }

  /** is anything solid between two points (sight lines for shooters, light for shadows) */
  lineClear(ax: number, ay: number, bx: number, by: number) {
    const bodies = this.solidBodies().filter((b) => b.label !== 'plat');
    return MJ.Query.ray(bodies, { x: ax, y: ay }, { x: bx, y: by }, 1).length === 0;
  }

  lightList(): Light[] {
    const out: Light[] = [];
    for (const e of this.ents) e.lights(out);
    if (this.P.carrying && !this.dead) out.push({ x: this.rig.flameX, y: this.rig.flameY, r: 120 * (0.45 + 0.55 * this.flameK), k: this.flameK, warm: true });
    if (this.droppedDiya) out.push({ x: this.droppedDiya.x, y: this.droppedDiya.y - 6, r: 120, k: 1, warm: true });
    return out;
  }
  lightAt(x: number, y: number, lights = this.lightList()) {
    let k = 0;
    for (const l of lights) { const d = Math.hypot(l.x - x, l.y - y); if (d < l.r) k = Math.max(k, (1 - d / l.r) * (l.k ?? 1)); }
    return k;
  }

  scareAt(x: number, y: number, k: number) { for (const c of this.creatures) c.scare?.(x, y, k); }

  windAt(x: number) { void x; return this.windNow; }

  sheltered(x: number, y: number, what: 'rain' | 'wind', dir: number) {
    for (const s of this.shelters) {
      if (x < s.x || x > s.x + s.w || y < s.y - s.h || y > s.y) continue;
      if (s.kind === 'roof') return true;
      if (s.kind === 'wall' && (what === 'rain' ? false : Math.sign(s.side ?? 1) === -dir || true)) return true;
    }
    return false;
  }

  dimFlame(amount: number) { this.flameK = Math.max(0, this.flameK - amount); this.dimmedThisFrame = true; }

  // effects
  dustAt(x: number, y: number, n: number) { this.dust.explode(n, x, y); }
  splashAt(x: number, y: number, k: number) { this.splash.explode(Math.round(6 + k * 10), x, y); }
  emberAt(p: { x: number; y: number }) { this.sparks.explode(2, p.x, p.y); }
  shake(k: number) { this.shakeK = Math.max(this.shakeK, k); }
  knock(dir: number, stun: number) { if (!this.dead) this.P.knock(dir, stun); }
  persist() { writeSave(this.save); }

  // ------------------------------------------------------------------ input

  readInput(): Inp {
    if (this.auto && !this.auto.done) {
      const a = this.auto.input();
      const jumpPressed = a.jumpHeld && !this.prevJump; this.prevJump = a.jumpHeld;
      const grabPressed = a.grab && !this.prevGrab; this.prevGrab = a.grab;
      const act = a.act && !this.prevAct; this.prevAct = a.act;
      return { ...a, jumpPressed, grabPressed, act };
    }
    const k = this.keys, t = this.touch;
    t.update();
    const left = k.LEFT.isDown || k.A.isDown || t.left, right = k.RIGHT.isDown || k.D.isDown || t.right;
    const jumpHeld = k.SPACE.isDown || t.jump || (k.UP.isDown && this.P.state === 'swim');
    const grab = k.SHIFT.isDown || k.J.isDown || k.Z.isDown || t.grab;
    const actHeld = k.E.isDown || k.K.isDown || k.X.isDown || t.lamp;
    const inp: Inp = {
      dir: (right ? 1 : 0) - (left ? 1 : 0), up: k.UP.isDown || k.W.isDown, down: k.DOWN.isDown || k.S.isDown,
      jumpHeld, jumpPressed: jumpHeld && !this.prevJump, grab, grabPressed: grab && !this.prevGrab, act: actHeld && !this.prevAct,
    };
    this.prevJump = jumpHeld; this.prevGrab = grab; this.prevAct = actHeld;
    // touch: while hanging, the grab button lets go; on a vine, grab climbs down
    if (t.enabled && this.P.state === 'rope' && t.grab) { inp.down = true; inp.grabPressed = false; }
    return inp;
  }

  startAuto() { this.auto = new Autopilot(this, this.L.steps, this.cp, this.L.cpSteps); }

  // ------------------------------------------------------------------ the loop

  update(time: number, delta: number) {
    this.frame++;
    this.dt = Math.min(delta, 50) / 1000;
    this.t = time;
    if (this.paused) return;
    const inp = this.readInput();
    this.lastInp = inp;
    this.P.extVx = 0; this.windNow = 0; this.dimmedThisFrame = false; this.flashK = 0;
    // cull by where the camera is heading (worldView only updates when a frame is drawn)
    const half = W / 2 / this.zoomNow;
    const camL = this.camX - half, camR = this.camX + half;
    for (const e of this.ents) {
      if (e.range && (e.x < camL - e.range || e.x > camR + e.range)) continue;
      e.update(this.dt, time);
    }
    if (!this.dead && !this.ended) {
      if (inp.act) this.doAct();
      this.P.control(inp, time, this.dt);
      this.checkpoints();
      if (this.P.feetY > this.L.killY && !this.dead) this.die('pit');
      if (!this.ended && !this.dead) {
        if (this.L.endFlag) {
          // a chapter that ends on lighting a lamp: hold on the light for a moment, then end
          if (this.flags[this.L.endFlag]) { this.endHold += this.dt; if (this.endHold > 2.2) this.end(); }
        } else if (this.P.x > this.L.endX) this.end();
      }
    }
    if (!this.dimmedThisFrame && this.P.carrying) this.flameK = Math.min(1, this.flameK + this.dt * 0.22);
    if (this.flameK <= 0.001 && !this.dead) this.die('flame');
    if (this.dead) this.updateDeath();
    this.updateRig(time);
    this.updateCamera(time);
    this.updateLight(time);
    this.updateUI(time);
    this.hintFade();
    this.terrain.stream(this.cameras.main.worldView.x, this.cameras.main.worldView.right, this.cameras.main.worldView.y, this.cameras.main.worldView.bottom);
  }

  doAct() {
    const P = this.P;
    // the nearest thing the diya can work on
    let best: { e: Ent; d: number } | undefined;
    const hx = this.rig.flameX, hy = this.rig.flameY;
    for (const e of this.ents) {
      const s = e.actSpot();
      if (!s) continue;
      const d = Math.hypot(s.x - hx, s.y - hy);
      const d2 = Math.hypot(s.x - P.x, s.y - (P.feetY - 20));
      const dd = Math.min(d, d2);
      if (dd < s.r && (!best || dd < best.d)) best = { e, d: dd };
    }
    if (best && (P.carrying || best.e.d.type === 'lever')) { if (best.e.act()) { this.rig.bump(-10); return; } }
    // set the diya down / pick it up
    if (this.droppedDiya && Math.abs(this.droppedDiya.x - P.x) < 30 && Math.abs(this.droppedDiya.y - P.feetY) < 30) {
      this.droppedDiya.destroy(); this.droppedDiya = undefined; P.carrying = true; sfx.tick(); return;
    }
    if (P.carrying && P.grounded && !this.L.theme.ambient?.includes('none') && this.flags.allowSetDown !== false) {
      P.carrying = false; sfx.tick();
      this.droppedDiya = this.add.image(P.x + P.facing * 10, P.feetY, 'g_diya').setOrigin(0.5, 1).setDisplaySize(10, 5).setDepth(12.2);
    }
  }

  checkpoints() {
    const P = this.P;
    for (let i = this.cp + 1; i < this.L.checkpoints.length; i++) {
      const c = this.L.checkpoints[i];
      if (P.x >= c.x && P.grounded && Math.abs(P.feetY - c.y) < 90) {
        this.cp = i;
        this.lamps.find((l) => l.d.cp === i)?.light();
        this.flagsAt[i] = { ...this.flags };
        if (chapterIndex(this.info.id) >= 0) { this.save.checkpoint = i; this.persist(); }
        this.auto?.onCheckpoint(i);
      }
    }
  }

  // ------------------------------------------------------------------ the girl, light, camera

  updateRig(time: number) {
    const P = this.P;
    let fx = P.x, fy = P.feetY + 0.5;
    if (P.state === 'swim' && P.water) { fx = P.x - P.facing * 18; fy = P.water.surface + 8; }
    const dx = this.dead ? 0 : (P.state === 'ground' || P.state === 'push' || P.state === 'pull' ? P.x - this.lastRigX : 0);
    this.lastRigX = P.x;
    const preJ = P.preJump >= 0 ? Math.min(1, 0.55 + P.preJump / 0.045 * 0.45) : 0;
    this.rig.update(fx, fy, {
      state: this.dead ? 'dead' : P.state, vx: P.state === 'rope' ? 0 : P.vx, vy: P.vy, dx, facing: P.facing, dt: this.dt, time,
      climbT: P.climbT, ropeAngle: P.rope.theta, ropeOmega: P.rope.omega, carrying: P.carrying && !(this.dead && this.deadT > 0.3), landed: P.landed,
      crouch: preJ, airT: P.airT, jumped: P.jumped, deadT: this.deadT, swimT: P.swimT,
    });
    if (this.rig.stepped && (P.state === 'ground' || P.state === 'push' || P.state === 'pull')) sfx.step();
  }

  updateLight(time: number) {
    const fl = 1 + Math.sin(time * 0.017) * 0.04 + Math.sin(time * 0.043) * 0.025 + (Math.random() - 0.5) * 0.03;
    const x = this.rig.flameX, y = this.rig.flameY;
    const show = this.rig.root.visible && this.rig.root.alpha > 0.05 && this.P.carrying && !(this.dead && this.deadT > 0.25);
    const fk = 0.35 + 0.65 * this.flameK;
    this.glow.setPosition(x, y).setScale(1.9 * fl * fk).setVisible(show).setAlpha(this.rig.root.alpha);
    this.flame.setPosition(x, y - 3).setScale((0.62 + (fl - 1) * 2) * fk, (0.7 + (fl - 1) * 3) * fk).setVisible(show).setAlpha(this.rig.root.alpha);
    this.embers.setPosition(x, y - 5);
    this.embers.emitting = show;
    if (this.droppedDiya) {
      const d = this.droppedDiya;
      this.glow.setVisible(true).setPosition(d.x + 3, d.y - 6).setScale(1.7 * fl).setAlpha(1);
      this.flame.setVisible(true).setPosition(d.x + 3, d.y - 8).setScale(0.6, 0.7).setAlpha(1);
    }
    this.grain.setTilePosition(Math.random() * 256, Math.random() * 256);
    if (this.grade && !this.dead) {
      const g = this.L.theme.grade ?? {};
      this.grade.reset();
      this.grade.brightness((g.bright ?? 1) + Math.sin(time * 0.0031) * 0.012 + Math.sin(time * 0.0173) * 0.006);
      if (g.sat !== undefined) this.grade.saturate(g.sat - 1, true);
    }
    // the darkness overlay
    let dk = this.L.theme.darkness ?? 0;
    for (const z of this.darkZones) {
      const f = z.fade ?? 200, px = this.P.x;
      const k = px < z.x - f || px > z.x + z.w + f ? 0 : px < z.x ? (px - (z.x - f)) / f : px > z.x + z.w ? 1 - (px - z.x - z.w) / f : 1;
      dk = Math.max(dk, z.k * k);
    }
    dk *= 1 - this.flashK;
    if (this.darkRT) {
      const rt = this.darkRT;
      rt.clear();
      if (dk > 0.01) {
        rt.fill(0x000000, dk);
        const cam = this.cameras.main, br = this.darkBrush!;
        for (const l of this.lightList()) {
          const sx = (l.x - cam.worldView.x) * cam.zoom, sy = (l.y - cam.worldView.y) * cam.zoom;
          const r = l.r * cam.zoom * 1.25 * (0.9 + 0.1 * fl);
          if (sx < -r || sx > W + r || sy < -r || sy > H + r) continue;
          br.setScale((r * 2) / 128 / 4).setAlpha(Math.min(1, (l.k ?? 1) * 1.1));
          rt.erase(br, sx / 4, sy / 4);
        }
      }
    }
    this.rainFx && (this.rainFx.emitting = this.rainZones.some((z) => this.P.x > z.x - 400 && this.P.x < z.x + z.w + 400));
  }

  updateCamera(time: number) {
    const cam = this.cameras.main;
    const k = (r: number) => 1 - Math.exp(-r * this.dt);
    const P = this.P;
    let zone: { zoom?: number; dy?: number; dx?: number } | undefined;
    for (const z of this.camZones) if (P.x > z.x && P.x < z.x + z.w) zone = z;
    this.zoomNow += (ZOOM * (zone?.zoom ?? 1) - this.zoomNow) * k(1.2);
    this.camDy += ((zone?.dy ?? 0) - this.camDy) * k(1.5);
    this.camDx += ((zone?.dx ?? 0) - this.camDx) * k(1.2);
    cam.setZoom(this.zoomNow);
    const lookAhead = P.state === 'rope' ? 60 : 120;
    this.lookX += (P.facing * lookAhead - this.lookX) * k(1.4);
    const tx = P.x + this.lookX + this.camDx, ty = P.body.position.y - 105 + this.camDy;
    this.camX += (tx - this.camX) * k(3.6);
    this.camY += (ty - this.camY) * k(P.vy > 500 ? 5 : 2.6);
    const sh = this.shakeK;
    this.shakeK *= Math.exp(-this.dt * 9);
    const jx = sh ? (Math.random() - 0.5) * sh * 900 : 0, jy = sh ? (Math.random() - 0.5) * sh * 900 : 0;
    cam.centerOn(this.camX + Math.sin(time * 0.0007) * 1.4 + jx, this.camY + Math.sin(time * 0.0011) * 1.0 + jy);
    const sx = cam.scrollX, sy = cam.scrollY;
    const ref = this.L.checkpoints[0].y - 380;
    for (const l of this.layers) {
      l.s.tilePositionX = sx * l.f;
      l.s.y = l.y0 - Phaser.Math.Clamp((sy - ref) * l.fy * 0.6, -160, 220);
      // a layer hanging from the top of the screen must never drop and show its top edge
      if (l.y0 === 0 && l.s.depth > 20) l.s.y = Math.min(0, l.s.y);
    }
    if (this.midA && this.midB) {
      const tp = this.midA.tilePositionX;
      this.midB.tilePositionX = tp + 512;
      // which of the two shows: alternates every tile, with a short cross-fade where the tiles meet
      const c = Math.cos((Math.PI * tp) / 1024);
      const k = Phaser.Math.Clamp(0.5 + c * 1.6, 0, 1);
      const e = k * k * (3 - 2 * k);
      this.midA.setAlpha(e); this.midB.setAlpha(1 - e);
    }
  }

  updateUI(time: number) {
    // the diya prompt over whatever can be burnt / lit / pulled
    const P = this.P;
    let spot: { x: number; y: number; r: number; label?: string } | null = null;
    if (!this.dead) for (const e of this.ents) {
      const s = e.actSpot();
      if (!s) continue;
      const d = Math.min(Math.hypot(s.x - this.rig.flameX, s.y - this.rig.flameY), Math.hypot(s.x - P.x, s.y - (P.feetY - 20)));
      if (d < s.r && (P.carrying || e.d.type === 'lever')) { spot = s; break; }
    }
    const cam = this.cameras.main;
    if (spot) {
      this.prompt.setPosition((spot.x - cam.worldView.x) * cam.zoom, (spot.y - 34 - cam.worldView.y) * cam.zoom);
      this.prompt.setTexture(spot.label === 'pull' ? 'ico_hand' : 'ico_flame');
      this.prompt.setAlpha(Math.min(0.85, this.prompt.alpha + this.dt * 3));
    } else this.prompt.setAlpha(Math.max(0, this.prompt.alpha - this.dt * 3));
    this.touch.highlight(spot ? (spot.label === 'pull' ? 'grab' : 'lamp') : undefined, time);
    // hints: after lingering in a stretch, or dying there
    if (this.save.hints && !this.ended) {
      const h = this.L.hints.find((q) => P.x >= q.x0 && P.x <= q.x1);
      if (h) {
        this.lingerT += this.dt;
        const deathsHere = (this.deathsAt[`${h.x0}`] ?? 0);
        const show = this.lingerT > (h.linger ?? 25) || deathsHere >= (h.deaths ?? 3);
        const text = this.touch.enabled && h.touch ? h.touch : h.text;
        if (show && this.hintShown !== text) { this.hintShown = text; this.hintText.setText(text); }
      } else {
        this.lingerT = 0;
        this.hintShown = undefined;
      }
    }
  }
  deathsAt: Record<string, number> = {};
  hintFade() { const want = this.hintShown ? 0.8 : 0; this.hintText.setAlpha(this.hintText.alpha + Phaser.Math.Clamp(want - this.hintText.alpha, -this.dt * 1.5, this.dt * 1.0)); }

  // ------------------------------------------------------------------ death

  die(kind: string, o: { snareX?: number; snareY?: number } = {}) {
    if (this.dead || this.ended) return;
    this.dead = true; this.deadT = 0; this.deathKind = kind;
    this.chapterDeaths++;
    if (kind !== 'retry') { this.save.deaths++; this.persist(); }
    const h = this.L.hints.find((q) => this.P.x >= q.x0 && this.P.x <= q.x1);
    if (h) this.deathsAt[`${h.x0}`] = (this.deathsAt[`${h.x0}`] ?? 0) + 1;
    const P = this.P;
    P.setV(0, 0);
    P.body.isSensor = true;
    MJ.Body.setStatic(P.body, true);
    if (kind === 'pit' || kind === 'fall') sfx.fall(); else sfx.die();
    if (kind === 'shot' || kind === 'mauled' || kind === 'crushed' || kind === 'stakes') this.shake(0.004);
    if (this.grade) this.tweens.addCounter({ from: 0, to: -0.8, duration: 700, onUpdate: (tw) => { this.grade!.reset(); this.grade!.saturate(tw.getValue() ?? 0); } });
    // the diya falls and goes out
    if (P.carrying && kind !== 'pit') {
      sfx.snuff();
      this.smoke.explode(6, this.rig.flameX, this.rig.flameY - 4);
    }
    if (kind === 'snared' && o.snareX !== undefined) {
      this.tweens.add({ targets: this.rig.root, y: o.snareY, x: o.snareX, angle: 180, duration: 260, ease: 'Quad.out' });
    }
    const wait = kind === 'pit' ? 500 : kind === 'retry' ? 100 : 1500;
    this.time.delayedCall(wait, () => {
      const cam = this.cameras.main;
      cam.fadeOut(650, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.respawn());
    });
  }

  updateDeath() {
    this.deadT += this.dt;
    const k = this.deathKind;
    if (k === 'pit' || k === 'fall' || k === 'snared' || k === 'retry') {
      if (k === 'pit') MJ.Body.setPosition(this.P.body, { x: this.P.x, y: this.P.body.position.y + 500 * this.dt });
      return;
    }
    if (k === 'drown') { MJ.Body.setPosition(this.P.body, { x: this.P.x, y: this.P.body.position.y + 30 * this.dt }); this.rig.setAlpha(Math.max(0, 1 - this.deadT * 0.9)); return; }
    // she dissolves into shadow
    if (this.deadT > 0.55) {
      const a = Math.max(0, 1 - (this.deadT - 0.55) / 0.8);
      this.rig.setAlpha(a);
      if (Math.random() < this.dt * 40 * a) this.smoke.emitParticleAt(this.P.x + (Math.random() - 0.5) * 30, this.P.feetY - Math.random() * 16);
    }
  }

  respawn() {
    const c = this.L.checkpoints[this.cp];
    this.flags = { ...(this.flagsAt[this.cp] ?? {}) };
    for (const e of this.ents) e.reset(this.cp);
    this.droppedDiya?.destroy(); this.droppedDiya = undefined;
    MJ.Body.setStatic(this.P.body, false);
    MJ.Body.setInertia(this.P.body, Infinity);
    this.P.place(c.x, c.y);
    this.rig.root.setAngle(0);
    this.dead = false; this.deadT = 0; this.flameK = 1;
    this.camX = c.x + 120; this.camY = c.y - 128; this.lookX = 120;
    this.grade?.reset();
    const cam = this.cameras.main;
    cam.fadeIn(700, 0, 0, 0);
    this.rig.setAlpha(0);
    this.tweens.add({ targets: this.rig.root, alpha: 1, duration: 800, delay: 200 });
    this.auto?.onRespawn(this.cp);
    this.prevJump = this.prevGrab = this.prevAct = true;
  }

  // ------------------------------------------------------------------ the end of a chapter

  end() {
    this.ended = true;
    this.P.setV(0, 0);
    const i = chapterIndex(this.info.id);
    if (i >= 0 && !this.save.completed.includes(this.info.id)) this.save.completed.push(this.info.id);
    const next = i >= 0 ? CHAPTERS[i + 1] : undefined;
    if (i >= 0) { this.save.chapter = next ? next.id : this.info.id; this.save.checkpoint = 0; this.persist(); }
    this.flags.__finished = true;
    const cam = this.cameras.main;
    cam.fadeOut(2600, 0, 0, 0);
    const t1 = this.add.text(W / 2, 320, next ? `${this.info.num}  ·  ${this.info.title}` : 'The light returns', { fontFamily: SERIF, fontSize: '30px', color: BONE }).setOrigin(0.5).setScrollFactor(0).setDepth(41).setAlpha(0);
    const t2 = this.add.text(W / 2, 370, next ? 'the flame goes on' : 'Thank you for playing', { fontFamily: SERIF, fontSize: '18px', color: BONE, fontStyle: 'italic' }).setOrigin(0.5).setScrollFactor(0).setDepth(41).setAlpha(0);
    this.ui.push(t1, t2);
    this.tweens.add({ targets: [t1, t2], alpha: 0.85, delay: 2200, duration: 1400 });
    if (this.auto) return; // tests read flags.__finished
    this.time.delayedCall(6500, () => {
      if (next) this.scene.restart({ chapter: next.id, cp: 0 } as StartData);
      else this.scene.start('menu', { credits: true });
    });
  }

  // ------------------------------------------------------------------ pause

  makePauseButton() {
    const g = this.add.graphics();
    g.fillStyle(0xd8d2c4, 0.08).fillCircle(0, 0, 26);
    g.lineStyle(1.5, 0xd8d2c4, 0.35).strokeCircle(0, 0, 26);
    g.fillStyle(0xd8d2c4, 0.6).fillRect(-8, -10, 5, 20).fillRect(3, -10, 5, 20);
    const hit = this.add.zone(0, 0, 64, 64).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => { if (!this.paused) this.openPause(); });
    this.pauseBtn = this.add.container(W - 50, 48, [g, hit]).setScrollFactor(0).setDepth(44);
    this.ui.push(this.pauseBtn);
  }

  text(x: number, y: number, s: string, size: number, font = SERIF, alpha = 0.9) {
    const t = this.add.text(x, y, s, { fontFamily: font, fontSize: `${size}px`, color: BONE, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(42).setAlpha(alpha);
    this.overlay.push(t); this.ui.push(t);
    return t;
  }

  openPause() {
    if (this.paused || this.ended || !this.started) return;
    this.paused = true;
    this.matter.world.pause();
    this.tweens.pauseAll();
    this.touch.setVisible(false);
    this.pauseBtn?.setVisible(false);
    const r = this.add.rectangle(0, 0, W, H, 0x000000, 0.62).setOrigin(0).setScrollFactor(0).setDepth(41);
    this.overlay.push(r); this.ui.push(r);
    this.text(W / 2, 150, 'Paused', 46);
    this.text(W / 2, 205, `${this.info.num}  —  ${this.info.title}   ·   lamp ${this.cp + 1} of ${this.L.checkpoints.length}   ·   deaths ${this.save.deaths}`, 16, SERIF, 0.55);
    const items: MenuItem[] = [
      { label: () => 'Resume', action: () => this.closePause() },
      { label: () => 'Retry from the last lamp', action: () => { this.closePause(); this.die('retry'); } },
      { label: () => `Hints:  ${this.save.hints ? 'On' : 'Off'}`, action: () => { this.save.hints = !this.save.hints; this.persist(); } },
      { label: () => `Sound:  ${this.save.sound ? 'On' : 'Off'}`, action: () => { this.save.sound = !this.save.sound; sfx.setMuted(!this.save.sound); this.persist(); } },
      { label: () => 'Chapters', action: () => { this.closePause(); this.scene.start('menu', { show: 'chapters' }); } },
      { label: () => 'Main menu', action: () => { this.closePause(); this.scene.start('menu'); } },
    ];
    this.menu = new Menu(this, W / 2, 290, items);
    this.ui.push(this.menu.container);
    const controls = this.touch.enabled
      ? ['◀ ▶  walk · push · swing     ▲  jump · climb · let go     ✋  hold to pull · drop down', 'flame  burn · light a lamp · set the diya down or pick it up']
      : ['← →  walk · push · swing     Space  jump · let go     ↑ ↓  climb     R  retry     Esc  pause', 'Shift  hold to grab and pull · drop down     E  burn · light · set the diya down or pick it up'];
    this.text(W / 2, 590, controls[0], 16, SERIF, 0.6);
    this.text(W / 2, 616, controls[1], 16, SERIF, 0.6);
    this.sortCameras();
  }

  closePause() {
    this.menu?.destroy(); this.menu = undefined;
    for (const o of this.overlay) o.destroy();
    this.overlay = [];
    this.paused = false;
    this.matter.world.resume();
    this.tweens.resumeAll();
    this.touch.setVisible(true);
    this.pauseBtn?.setVisible(true);
    this.prevJump = this.prevGrab = this.prevAct = true;
  }

  get bodyH() { return BODY_H; }
}
