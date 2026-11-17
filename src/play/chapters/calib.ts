import { Builder } from '../builder';
import { FOREST } from '../themes';

// Dev only: walls and gaps of growing size, to measure what she can do.
export function calib(kind: string, size: number) {
  return () => {
    const B = new Builder('calib', FOREST, -200, 600);
    B.floor(600); B.cp(100);
    if (kind === 'gap') B.gap(size, 0, 'abyss', { far: 400 });
    else if (kind === 'gapup') B.gap(size, -60, 'abyss', { far: 400 });
    else if (kind === 'wall') B.climbUp(size, 400);
    else if (kind === 'rise') B.rise(-size, 400);
    else if (kind === 'drop') B.drop(size, 400);
    B.floor(200);
    return B.done();
  };
}
