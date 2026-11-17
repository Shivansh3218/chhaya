// Sound. Foley (steps, impacts, cloth, wood, stone, creaks) is real recordings from Kenney's CC0 packs
// (public/audio, see public/audio/CREDITS.md), played with small random changes of pitch and level so no two
// steps sound alike. Wind, rain, water, fire and breath stay as shaped noise, which is what they are.
// Nothing here uses plain oscillator beeps for a real-world sound.

export type Surface = 'grass' | 'wood' | 'stone';
export type Ambient = 'forest' | 'wind' | 'rain' | 'water' | 'cave' | 'none';

const GROUPS: Record<string, number | number[]> = {
  step_grass: 5, step_wood: 5, step_stone: 5,
  land: 3, thud: 3, wood: 3, stone: 3, metal: 3, plank: 3, punch: 3,
  cloth: [1, 2, 3, 4], creak: [1, 2, 3], door: [1, 2],
  click: 0, latch: 0, chop: 0, leather: 0, belt: 0,
};

class Sfx {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noiseBuf!: AudioBuffer;
  private bufs = new Map<string, AudioBuffer[]>();
  private last = new Map<string, number>();
  private ambNodes: AudioNode[] = [];
  private ambTimers: number[] = [];
  private ambKind: Ambient | null = null;
  private muted = false;
  surface: Surface = 'grass';

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      // a gentle compressor keeps sudden impacts from clipping
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      void this.load();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private async load() {
    const c = this.ctx!;
    const base = `${import.meta.env.BASE_URL}audio/`;
    const jobs: Promise<void>[] = [];
    for (const [g, spec] of Object.entries(GROUPS)) {
      const names = typeof spec === 'number' ? (spec === 0 ? [g] : Array.from({ length: spec }, (_, i) => `${g}${i}`)) : spec.map((i) => `${g}${i}`);
      const list: AudioBuffer[] = [];
      this.bufs.set(g, list);
      for (const n of names) {
        jobs.push(fetch(`${base}${n}.ogg`).then((r) => r.arrayBuffer()).then((a) => c.decodeAudioData(a)).then((b) => { list.push(b); }).catch(() => undefined));
      }
    }
    await Promise.all(jobs);
  }

  /** play a recorded sound from a group. Returns false if it is not loaded (yet). */
  private play(group: string, vol: number, opt: { rate?: number; jitter?: number; lp?: number; delay?: number } = {}) {
    const c = this.ctx;
    const list = this.bufs.get(group);
    if (!c || !list || !list.length) return false;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === this.last.get(group)) i = (i + 1) % list.length;
    this.last.set(group, i);
    const t = c.currentTime + (opt.delay ?? 0);
    const s = c.createBufferSource();
    s.buffer = list[i];
    const j = opt.jitter ?? 0.08;
    s.playbackRate.value = (opt.rate ?? 1) * (1 + (Math.random() * 2 - 1) * j);
    const g = c.createGain();
    g.gain.value = vol * (0.85 + Math.random() * 0.3);
    let node: AudioNode = s;
    if (opt.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.lp; node.connect(f); node = f; }
    node.connect(g);
    g.connect(this.master);
    s.start(t);
    return true;
  }

  private env(g: GainNode, t: number, peak: number, attack: number, dur: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  private tone(f0: number, dur: number, type: OscillatorType, peak: number, f1?: number, delay = 0, attack = 0.005) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    this.env(g, t, peak, attack, dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, type: BiquadFilterType, freq: number, q: number, peak: number, delay = 0, attack = 0.004, freqEnd?: number) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    f.Q.value = q;
    const g = c.createGain();
    this.env(g, t, peak, attack, dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start(t, Math.random() * 1.2);
    s.stop(t + dur + 0.05);
  }

  // ---------------------------------------------------------------- the girl
  tick() { if (!this.play('click', 0.12, { rate: 1.4 })) this.noise(0.03, 'bandpass', 2400, 2, 0.05); }
  /** a small bare-footed child: quiet, soft, a little muffled */
  step() {
    const g = `step_${this.surface}`;
    if (!this.play(g, this.surface === 'grass' ? 0.32 : 0.22, { rate: 1.12, jitter: 0.09, lp: 3200 })) this.noise(0.07, 'bandpass', 650 + Math.random() * 500, 1.4, 0.12);
  }
  jump() { this.play('cloth', 0.22, { rate: 1.15, jitter: 0.1 }) || this.noise(0.12, 'bandpass', 1800, 0.8, 0.04, 0, 0.02, 900); }
  land() {
    if (!this.play('land', 0.38, { rate: 1.1, lp: 2400 })) this.noise(0.18, 'lowpass', 900, 0.7, 0.22);
    this.play(`step_${this.surface}`, 0.25, { rate: 0.95 });
    this.play('cloth', 0.1, { rate: 1.2, delay: 0.03 });
  }
  die() {
    this.play('punch', 0.35, { rate: 0.8, lp: 900 });
    this.play('cloth', 0.25, { rate: 0.85, delay: 0.05 });
    this.noise(0.6, 'lowpass', 900, 0.7, 0.18, 0.02, 0.01, 150);
  }
  fall() { this.noise(0.9, 'bandpass', 700, 1.5, 0.06, 0, 0.3, 220); }
  scrape() { this.play('cloth', 0.14, { rate: 0.8, jitter: 0.12 }) || this.noise(0.16, 'bandpass', 300, 3, 0.1, 0, 0.02); }

  // ---------------------------------------------------------------- the world
  thud() {
    if (!this.play('thud', 0.7, { rate: 0.75, lp: 1200 })) this.noise(0.6, 'lowpass', 420, 0.7, 0.5, 0, 0.003, 80);
    this.play('wood', 0.35, { rate: 0.7, lp: 900 });
    this.noise(0.6, 'lowpass', 260, 0.7, 0.25, 0, 0.003, 60);
  }
  splash(level = 1) {
    this.noise(0.5, 'bandpass', 1300, 0.7, 0.28 * level, 0, 0.004, 320);
    this.noise(0.25, 'highpass', 2600, 0.5, 0.07 * level, 0.02);
    for (let k = 0; k < 3 * level; k++) this.noise(0.06, 'bandpass', 900 + Math.random() * 1500, 4, 0.05 * level, 0.1 + Math.random() * 0.35);
  }
  paddle() { this.noise(0.2, 'bandpass', 600 + Math.random() * 300, 1.2, 0.05, 0, 0.05, 350); }
  clunk() { if (!this.play('wood', 0.4, { rate: 1.05 })) this.noise(0.15, 'bandpass', 900, 3, 0.2); }
  rumble() { this.noise(3.5, 'lowpass', 160, 0.8, 0.35, 0, 0.6); this.play('stone', 0.2, { rate: 0.5, lp: 500, delay: 0.3 }); }
  crack() {
    if (!this.play('chop', 0.3, { rate: 1.3, jitter: 0.12, lp: 5000 })) this.noise(0.04, 'bandpass', 2500, 3, 0.08);
    for (let k = 0; k < 3; k++) this.noise(0.03, 'highpass', 2500 + Math.random() * 1500, 1, 0.04, 0.05 + k * 0.05);
  }
  stone() { if (!this.play('stone', 0.5, { rate: 0.85, lp: 2500 })) this.noise(0.3, 'lowpass', 1200, 0.7, 0.3, 0, 0.003, 150); this.play('thud', 0.3, { rate: 0.8 }); }
  slam() {
    if (!this.play('door', 0.55, { rate: 0.75, lp: 2200 })) this.noise(0.4, 'lowpass', 700, 0.7, 0.4, 0, 0.002, 120);
    this.play('thud', 0.4, { rate: 0.7 });
  }
  ignite() { this.noise(0.6, 'bandpass', 700, 0.6, 0.25, 0, 0.05, 2200); this.crackle(); }
  crackle() {
    for (let k = 0; k < 4; k++) this.noise(0.02 + Math.random() * 0.02, 'highpass', 2000 + Math.random() * 3000, 0.8, 0.04 + Math.random() * 0.05, k * 0.05 + Math.random() * 0.06);
  }
  /** a wick catching: a soft breath of flame, a few crackles */
  lampLit() { this.noise(0.5, 'bandpass', 500, 0.7, 0.14, 0, 0.06, 1400); this.crackle(); }
  snuff() { this.noise(0.6, 'lowpass', 600, 0.7, 0.22, 0, 0.01, 100); }
  gust() { this.noise(1.8, 'bandpass', 450, 0.5, 0.2, 0, 0.6, 900); }
  rainTick() { this.noise(0.05, 'highpass', 3500 + Math.random() * 2500, 0.6, 0.02); }
  snap() { if (!this.play('chop', 0.4, { rate: 1.5, jitter: 0.15 })) this.noise(0.05, 'bandpass', 1800, 3, 0.3); this.play('cloth', 0.1, { rate: 0.7, delay: 0.03 }); }
  creakSoft() { this.play('creak', 0.07, { rate: 1.25, jitter: 0.15, lp: 2500 }); }
  creak() { this.play('creak', 0.22, { rate: 0.9, jitter: 0.1 }); }
  roll() { this.noise(0.6, 'lowpass', 110, 0.8, 0.3, 0, 0.08); }
  grind() { this.noise(0.25, 'bandpass', 200 + Math.random() * 80, 3, 0.08, 0, 0.05); this.play('stone', 0.05, { rate: 0.5, lp: 600 }); }
  /** a temple bell: inharmonic partials with a long ring (a bell is a tone, so a tone it stays) */
  bell(base = 660, level = 1) {
    this.play('metal', 0.08 * level, { rate: 0.6, lp: 1500 });
    const parts: [number, number, number][] = [[0.5, 0.03, 3.2], [1, 0.05, 2.6], [2.01, 0.022, 1.8], [2.76, 0.018, 1.3], [4.07, 0.009, 0.9]];
    for (const [m, gain, dur] of parts) this.tone(base * m * (1 + (Math.random() - 0.5) * 0.004), dur, 'sine', gain * level, undefined, 0, 0.002);
  }

  // ---------------------------------------------------------------- creatures and people (breath and voice as shaped noise)
  /** a big cat's low growl: rumbling noise, pulsed like breath through the throat */
  growl() {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime, dur = 0.9;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(220, t); f.frequency.linearRampToValueAtTime(380, t + 0.35); f.frequency.linearRampToValueAtTime(200, t + dur);
    const g = c.createGain(); this.env(g, t, 0.5, 0.12, dur);
    const am = c.createGain(); am.gain.value = 0.5;
    const lfo = c.createOscillator(); lfo.frequency.setValueAtTime(24, t); lfo.frequency.linearRampToValueAtTime(18, t + dur);
    const lg = c.createGain(); lg.gain.value = 0.5;
    lfo.connect(lg); lg.connect(am.gain);
    s.connect(f); f.connect(am); am.connect(g); g.connect(this.master);
    s.start(t, Math.random()); lfo.start(t); s.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }
  roar() {
    this.noise(0.7, 'bandpass', 420, 1.5, 0.45, 0, 0.04, 160);
    this.noise(0.5, 'bandpass', 1100, 3, 0.12, 0.02, 0.05, 500);
    this.noise(0.8, 'lowpass', 180, 0.8, 0.3, 0, 0.05);
  }
  yelp() { this.noise(0.3, 'bandpass', 1500, 8, 0.25, 0, 0.01, 650); this.noise(0.2, 'bandpass', 2600, 6, 0.06, 0, 0.01, 1200); }
  stretch() { this.play('creak', 0.06, { rate: 1.7, jitter: 0.1 }); }
  twang() { this.play('leather', 0.3, { rate: 1.3 }) || this.noise(0.08, 'bandpass', 2200, 3, 0.12); this.noise(0.12, 'bandpass', 1500, 2, 0.05, 0, 0.005, 3000); }
  pebbleHit() { this.play('stone', 0.18, { rate: 1.9, jitter: 0.15 }) || this.noise(0.08, 'bandpass', 1600, 2, 0.15); }
  shout() { this.noise(0.4, 'bandpass', 700, 4, 0.14, 0, 0.04, 550); this.noise(0.35, 'bandpass', 1900, 6, 0.06, 0, 0.04, 1500); }
  whisper() { this.noise(0.9, 'bandpass', 2800 + Math.random() * 800, 4, 0.05, 0, 0.3, 1800); }
  possess() { this.noise(0.8, 'bandpass', 3000, 4, 0.06, 0, 0.2, 900); this.noise(1, 'lowpass', 200, 1, 0.12, 0, 0.3); }
  release() { this.noise(0.9, 'bandpass', 600, 2, 0.06, 0, 0.2, 2400); }

  // ---------------------------------------------------------------- ambience, one bed per place
  startAmbient(kind: Ambient = 'forest') {
    const c = this.ctx;
    if (!c || this.ambKind === kind) return;
    this.stopAmbient();
    this.ambKind = kind;
    if (kind === 'none') return;
    const bed = (type: BiquadFilterType, freq: number, q: number, level: number, breathe: number, sweep: number, rate = 0.06) => {
      const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.value = level;
      const lfo = c.createOscillator(); lfo.frequency.value = rate * (0.8 + Math.random() * 0.4);
      const lg = c.createGain(); lg.gain.value = breathe; lfo.connect(lg); lg.connect(g.gain);
      const lfo2 = c.createOscillator(); lfo2.frequency.value = rate * 1.7;
      const lg2 = c.createGain(); lg2.gain.value = sweep; lfo2.connect(lg2); lg2.connect(f.frequency);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(0, Math.random() * 1.5); lfo.start(); lfo2.start();
      this.ambNodes.push(s, lfo, lfo2, g);
    };
    const every = (fn: () => void, min: number, max: number) => {
      const go = () => { if (this.ambKind !== kind) return; fn(); this.ambTimers.push(window.setTimeout(go, min + Math.random() * (max - min))); };
      this.ambTimers.push(window.setTimeout(go, Math.random() * max));
    };
    if (kind === 'forest') {
      bed('lowpass', 380, 0.5, 0.06, 0.04, 150);
      bed('bandpass', 1400, 0.4, 0.008, 0.006, 400, 0.04);           // distant leaves
      every(() => this.cricket(), 900, 3500);
      every(() => this.cricket(0.4), 1500, 5000);                      // a farther one
      every(() => this.play('creak', 0.025, { rate: 0.6 + Math.random() * 0.3, lp: 900 }), 9000, 22000);   // a bough somewhere
    } else if (kind === 'wind') {
      bed('lowpass', 500, 0.6, 0.09, 0.06, 260, 0.08);
      bed('bandpass', 900, 2, 0.015, 0.012, 500, 0.05);
      every(() => this.gust(), 6000, 14000);
    } else if (kind === 'rain') {
      bed('highpass', 2500, 0.4, 0.05, 0.01, 300, 0.1);
      bed('lowpass', 700, 0.5, 0.06, 0.02, 100, 0.07);
      every(() => this.rainTick(), 40, 160);
    } else if (kind === 'water') {
      bed('lowpass', 450, 0.6, 0.08, 0.025, 120, 0.2);
      bed('bandpass', 1100, 1.2, 0.02, 0.012, 300, 0.33);
      every(() => this.cricket(0.5), 1500, 5000);
    } else if (kind === 'cave') {
      bed('lowpass', 240, 0.6, 0.06, 0.03, 60, 0.04);
      every(() => this.drip(), 1800, 6000);
    }
  }
  stopAmbient() {
    for (const n of this.ambNodes) { try { (n as AudioScheduledSourceNode).stop?.(); } catch { /* already stopped */ } n.disconnect(); }
    for (const t of this.ambTimers) clearTimeout(t);
    this.ambNodes = []; this.ambTimers = []; this.ambKind = null;
  }
  /** a field cricket: a few very short pulses of a narrow high tone */
  private cricket(level = 1) {
    const base = 4300 + Math.random() * 700;
    const n = 3 + Math.floor(Math.random() * 3);
    const rep = 1 + Math.floor(Math.random() * 3);
    for (let r = 0; r < rep; r++) for (let k = 0; k < n; k++) this.tone(base, 0.012, 'sine', 0.006 * level, undefined, r * 0.42 + k * 0.034, 0.002);
  }
  /** water dripping in a stone well: a tiny drop with a falling pitch and a short echo */
  private drip() {
    const f = 1200 + Math.random() * 900;
    this.tone(f, 0.06, 'sine', 0.025, f * 0.55);
    this.tone(f, 0.06, 'sine', 0.008, f * 0.55, 0.23);
  }
}

export const sfx = new Sfx();
