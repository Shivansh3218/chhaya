import { Builder } from '../builder';
import { FOREST } from '../themes';

// Dev only: the cast standing in a row, for screenshot review of the rigs.
export function zoo() {
  const B = new Builder('zoo', FOREST, -200, 600);
  B.floor(3600);
  B.cp(0);
  B.ent({ type: 'leopard', x: 260, mode: 'territory', minX: 200, maxX: 420 });
  B.ent({ type: 'jackal', x: 560, wake: 99999 });
  B.ent({ type: 'jackal', x: 620, wake: 99999, facing: -1 });
  B.ent({ type: 'spider', x: 900, mode: 'lurk', wake: 1 });
  B.ent({ type: 'poacher', x: 1200, weapon: 'sling', facing: -1, range: 1 });
  B.ent({ type: 'poacher', x: 1320, weapon: 'blowgun', facing: -1, range: 1 });
  B.ent({ type: 'poacher', x: 1440, weapon: 'rifle', facing: -1, range: 1 });
  B.ent({ type: 'crows', x: 1700, n: 5, w: 120 });
  B.ent({ type: 'shadows', x: 1900, w: 200, n: 3, reach: 140 });
  return B.done();
}
