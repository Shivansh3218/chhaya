// Level data for the new engine. Levels are authored in code with the builder (builder.ts), one file per
// chapter in src/play/chapters. Units are world pixels, y grows downward.

export type Style = 'earth' | 'stone' | 'wood' | 'rock' | 'brick' | 'iron';

/** solid ground: a block of earth/stone. `left`/`right`: the side faces are exposed (drawn ragged, ledges grabbable) */
export interface Block { x: number; y: number; w: number; h: number; style?: Style; left?: boolean; right?: boolean; noGrab?: boolean; hidden?: boolean; id?: string; ceil?: boolean }

export interface Theme {
  id: string;
  sky: string;
  far2?: string; far: string; mid: string;
  mid2?: string;             // a second middle layer, alternated with `mid` so the same big tree doesn't keep coming back
  shafts?: string;
  fgTop?: string;            // foreground hanging from the top (roots)
  fg: string;                // foreground along the bottom
  fog: number;               // 0..1 fog layer alpha
  ground: Style;
  trunks?: string;           // world-space mid trunks colour (forest)
  leaves?: boolean;          // falling leaves
  fireflies?: boolean;
  grade?: { sat?: number; bright?: number; tint?: number };
  ambient?: 'forest' | 'wind' | 'rain' | 'water' | 'cave' | 'none';
  darkness?: number;         // baseline darkness overlay (0 = none)
}

export type EntDef = { type: string; id?: string; x: number; y: number; [k: string]: unknown };

export interface Checkpoint { x: number; y: number; lamp?: 'post' | 'wall' | 'none' }

export interface HintDef { x0: number; x1: number; text: string; touch?: string; deaths?: number; linger?: number }

/** what the autopilot does (dev testing). See autopilot.ts */
export type Step =
  | { k: 'to'; x: number; grab?: boolean; tol?: number; up?: boolean }
  | { k: 'jump'; dir: number; at?: number; hold?: number; run?: boolean }
  | { k: 'wait'; f: number }
  | { k: 'until'; c: Cond; dir?: number; grab?: boolean; up?: boolean; down?: boolean; jump?: boolean; max?: number; note?: string }
  | { k: 'climb' }
  | { k: 'act'; at?: number }
  | { k: 'hold'; f: number; dir?: number; up?: boolean; down?: boolean; grab?: boolean; jump?: boolean }
  | { k: 'push'; id: string; x: number; pull?: boolean }
  | { k: 'swing'; dir: number; release: Cond; climb?: number }
  | { k: 'do'; fn: (s: any) => void };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Cond = (s: any) => boolean;

export interface LevelData {
  id: string;
  theme: Theme;
  blocks: Block[];
  checkpoints: Checkpoint[];
  ents: EntDef[];
  hints: HintDef[];
  endX: number;
  /** the chapter ends only once this flag is set (e.g. the shrine lamp lit) */
  endFlag?: string;
  killY: number;
  bounds: { x: number; y: number; w: number; h: number };
  steps: Step[];
  /** the step index where each checkpoint's part of the run begins */
  cpSteps: number[];
  /** world-space decor: trunks, arches, posts (drawn behind/in front) */
  decor: { key: string; x: number; y: number; sx?: number; sy?: number; sf?: number; depth?: number; tint?: number; alpha?: number; flip?: boolean; rot?: number; ox?: number; oy?: number }[];
}

export interface ChapterInfo {
  id: string;       // 'c01'..
  num: string;      // 'Chapter I'
  title: string;
  titleHi: string;
  build: () => LevelData;
}
