import Phaser from 'phaser';

type Key = 'left' | 'right' | 'jump' | 'grab' | 'lamp';
type Btn = { x: number; y: number; r: number; key: Key };

// On-screen buttons, shown only on touch devices. Multi-touch: walk, grab and jump together.
//  left side: ◀ ▶     right side: ▲ jump (big), ✋ grab / pull / climb down, flame = diya (light, burn, set down)
export class TouchControls {
  left = false;
  right = false;
  jump = false;
  grab = false;
  lamp = false;
  readonly enabled: boolean;
  private btns: Btn[] = [];
  private gfx?: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor(private scene: Phaser.Scene) {
    this.enabled = scene.sys.game.device.input.touch;
    if (!this.enabled) return;
    this.btns = [
      { x: 110, y: 620, r: 62, key: 'left' },
      { x: 260, y: 620, r: 62, key: 'right' },
      { x: 1160, y: 615, r: 72, key: 'jump' },
      { x: 1010, y: 650, r: 52, key: 'grab' },
      { x: 1180, y: 470, r: 46, key: 'lamp' },
    ];
    const g = scene.add.graphics().setScrollFactor(0).setDepth(45);
    for (const b of this.btns) {
      g.fillStyle(0xd8d2c4, 0.06).fillCircle(b.x, b.y, b.r);
      g.lineStyle(2, 0xd8d2c4, 0.3).strokeCircle(b.x, b.y, b.r);
    }
    g.fillStyle(0xd8d2c4, 0.45);
    g.fillTriangle(88, 620, 124, 598, 124, 642);
    g.fillTriangle(282, 620, 246, 598, 246, 642);
    g.fillTriangle(1160, 590, 1134, 635, 1186, 635);
    // grab: an open hand (palm + four fingers)
    g.fillRoundedRect(997, 648, 26, 20, 6);
    for (let i = 0; i < 4; i++) g.fillRoundedRect(997 + i * 7, 630, 5, 20, 2.5);
    // lamp: a small flame over a bowl
    g.fillEllipse(1180, 484, 30, 10);
    g.fillTriangle(1172, 476, 1188, 476, 1180, 450);
    this.gfx = g;
  }

  private hl?: Phaser.GameObjects.Graphics;

  /** pulse the button that does what the on-screen prompt shows (or none) */
  highlight(key: Key | undefined, time: number) {
    if (!this.enabled) return;
    if (!this.hl) this.hl = this.scene.add.graphics().setScrollFactor(0).setDepth(46);
    this.hl.clear();
    const b = key && this.btns.find((x) => x.key === key);
    if (!b || !this.gfx?.visible) return;
    const k = 0.5 + 0.5 * Math.sin(time * 0.008);
    this.hl.lineStyle(3, 0xffd27a, 0.35 + 0.45 * k).strokeCircle(b.x, b.y, b.r + 4 + k * 5);
    this.hl.fillStyle(0xffd27a, 0.08 + 0.08 * k).fillCircle(b.x, b.y, b.r);
  }

  setVisible(v: boolean) {
    this.gfx?.setVisible(v);
    this.hl?.setVisible(v);
    for (const l of this.labels) l.setVisible(v);
  }

  update() {
    this.left = this.right = this.jump = this.grab = this.lamp = false;
    if (!this.enabled || !this.gfx?.visible) return;
    for (const p of this.scene.input.manager.pointers) {
      if (!p.isDown) continue;
      // the nearest button under the finger wins (buttons on the right sit close together)
      let best: Btn | undefined, bestD = Infinity;
      for (const b of this.btns) {
        const d = Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y);
        if (d < b.r * 1.3 && d / b.r < bestD) { best = b; bestD = d / b.r; }
      }
      if (best) this[best.key] = true;
    }
  }
}
