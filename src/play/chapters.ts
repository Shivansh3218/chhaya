import type { ChapterInfo } from './types';
import { ch01 } from './chapters/ch01';
import { ch02 } from './chapters/ch02';
import { ch03 } from './chapters/ch03';
import { ch04 } from './chapters/ch04';
import { ch05 } from './chapters/ch05';
import { ch06 } from './chapters/ch06';
import { ch07 } from './chapters/ch07';
import { ch08 } from './chapters/ch08';
import { ch09 } from './chapters/ch09';
import { ch10 } from './chapters/ch10';
import { zoo } from './chapters/zoo';
import { calib } from './chapters/calib';

// The story, in order. A chapter without `build` is listed as coming soon.

type Entry = Omit<ChapterInfo, 'build'> & { build?: ChapterInfo['build'] };
const ALL: Entry[] = [
  { id: 'c01', num: 'Chapter I', title: 'The Banyan', titleHi: 'अध्याय १  ·  बरगद', build: ch01 },
  { id: 'c02', num: 'Chapter II', title: 'The Hollow', titleHi: 'अध्याय २  ·  खोह', build: ch02 },
  { id: 'c03', num: 'Chapter III', title: 'The Poachers', titleHi: 'अध्याय ३  ·  शिकारी', build: ch03 },
  { id: 'c04', num: 'Chapter IV', title: 'The Fields', titleHi: 'अध्याय ४  ·  खेत', build: ch04 },
  { id: 'c05', num: 'Chapter V', title: 'The Stepwell', titleHi: 'अध्याय ५  ·  बावड़ी', build: ch05 },
  { id: 'c06', num: 'Chapter VI', title: 'The Mill', titleHi: 'अध्याय ६  ·  चक्की', build: ch06 },
  { id: 'c07', num: 'Chapter VII', title: 'The Monsoon', titleHi: 'अध्याय ७  ·  बरसात', build: ch07 },
  { id: 'c08', num: 'Chapter VIII', title: 'The Railway', titleHi: 'अध्याय ८  ·  रेलगाड़ी', build: ch08 },
  { id: 'c09', num: 'Chapter IX', title: 'The Fort', titleHi: 'अध्याय ९  ·  क़िला', build: ch09 },
  { id: 'c10', num: 'Chapter X', title: 'The Temple', titleHi: 'अध्याय १०  ·  मंदिर', build: ch10 },
];

const DEV: Entry[] = [];
if (import.meta.env.DEV) {
  DEV.push({ id: 'zoo', num: 'Dev', title: 'The cast', titleHi: 'zoo', build: zoo });
  for (const k of ['gap', 'gapup', 'wall', 'rise', 'drop']) for (const n of [100, 130, 150, 170, 190, 210, 260, 300, 340]) DEV.push({ id: `cal_${k}_${n}`, num: 'Dev', title: `${k} ${n}`, titleHi: 'calib', build: calib(k, n) });
}
/** the ten chapters, as players see them */
export const CHAPTER_LIST = ALL;
export const CHAPTERS = ALL.filter((c): c is ChapterInfo => !!c.build);
/** everything that can be started, including dev test levels (dev builds only) */
export const PLAYABLE = [...CHAPTERS, ...DEV.filter((c): c is ChapterInfo => !!c.build)];
export const chapterIndex = (id: string) => CHAPTERS.findIndex((c) => c.id === id);
