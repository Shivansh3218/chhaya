// Offline save, stored on the device (localStorage — inside the Android app this lives in the
// app's private WebView storage and survives restarts). No network, no account.

export interface SaveData {
  chapter: string;      // chapter the player is currently on
  checkpoint: number;   // last checkpoint reached in that chapter
  deaths: number;       // lifetime deaths
  completed: string[];  // ids of finished chapters (unlocks the next one)
  hints: boolean;
  sound: boolean;
  secrets: string[];  // ids of hidden lamps she has lit, e.g. 'ch1-0'
  effects: 'auto' | 'high' | 'low'; // visual effects quality ('auto' drops to low if the frame rate struggles)
}

const KEY = 'chhaya.save.v2'; // v2: the new engine's chapters (c01..c10)

const defaults = (): SaveData => ({ chapter: 'c01', checkpoint: 0, deaths: 0, completed: [], hints: true, sound: true, secrets: [], effects: 'auto' });

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults(), ...JSON.parse(raw) } : defaults();
  } catch {
    return defaults();
  }
}

export function writeSave(d: SaveData) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* storage unavailable: play on without saving */ }
}

export const hasProgress = (d: SaveData) => d.checkpoint > 0 || d.completed.length > 0 || d.deaths > 0;
