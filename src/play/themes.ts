import type { Theme } from './types';

// Looks for each place she passes through. Layer keys are textures made in BootScene (or replaced by art in
// public/art/manifest.json).

export const FOREST: Theme = {
  id: 'forest', sky: 'sky', far2: 'trees_far2', far: 'trees_far', mid: 'trees_mid', mid2: 'trees_mid2', shafts: 'shafts_warm', fgTop: 'fg_roots', fg: 'fg_ferns',
  fog: 0.75, ground: 'earth', trunks: '#14181b', leaves: true, fireflies: true, ambient: 'forest',
};
export const HOLLOW: Theme = { ...FOREST, id: 'hollow', shafts: undefined, fog: 0.55, darkness: 0.35, fireflies: false, grade: { bright: 0.92, sat: 0.6 } };
export const CAMP: Theme = { ...FOREST, id: 'camp', fog: 0.6, grade: { bright: 0.95, sat: 0.75 } };
export const FIELDS: Theme = { id: 'fields', sky: 'sky3', far2: 'hills_far', far: 'fields_far', mid: 'mill_mid', shafts: 'shafts_dusk', fg: 'fg_reeds', fog: 0.45, ground: 'earth', ambient: 'wind', grade: { bright: 0.9, sat: 0.55 } };
export const STEPWELL: Theme = { id: 'stepwell', sky: 'sky2', far: 'arch_far', mid: 'arch_mid', shafts: 'shafts_moon', fg: 'fg_rubble', fog: 0.3, ground: 'stone', ambient: 'cave', darkness: 0.25, grade: { sat: 0.5 } };
export const MILL: Theme = { id: 'mill', sky: 'sky3', far2: 'hills_far', far: 'fields_far', mid: 'mill_mid', shafts: 'shafts_dusk', fg: 'fg_reeds', fog: 0.32, ground: 'earth', ambient: 'water', grade: { sat: 0.6 } };
export const MONSOON: Theme = { id: 'monsoon', sky: 'sky3', far2: 'hills_far', far: 'fields_far', mid: 'fields_mid', fg: 'fg_reeds', fog: 0.6, ground: 'earth', ambient: 'rain', grade: { bright: 0.8, sat: 0.35 } };
export const RAILWAY: Theme = { id: 'railway', sky: 'sky3', far2: 'hills_far', far: 'fields_far', mid: 'trees_mid', fg: 'fg_rubble', fog: 0.5, ground: 'rock', ambient: 'wind', grade: { bright: 0.85, sat: 0.4 } };
export const FORT: Theme = { id: 'fort', sky: 'sky2', far: 'arch_far', mid: 'arch_mid', shafts: 'shafts_moon', fg: 'fg_rubble', fog: 0.4, ground: 'stone', ambient: 'wind', grade: { sat: 0.45 } };
export const TEMPLE: Theme = { id: 'temple', sky: 'sky2', far2: 'hills_far', far: 'arch_far', mid: 'arch_mid', shafts: 'shafts_moon', fg: 'fg_rubble', fog: 0.45, ground: 'stone', ambient: 'wind', grade: { sat: 0.5 } };
