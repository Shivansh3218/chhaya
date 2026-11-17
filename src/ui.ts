import Phaser from 'phaser';
import { sfx } from './audio';

export type MenuItem = { label: () => string; action: () => void; enabled?: () => boolean };

const BONE = '#d8d2c4';

// A vertical text menu: mouse/touch (tap an item) and keyboard (↑ ↓ + Enter/Space).
export class Menu {
  readonly container: Phaser.GameObjects.Container;
  private texts: Phaser.GameObjects.Text[] = [];
  private idx = 0;
  private dead = false;

  private onKey = (e: KeyboardEvent) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.move(-1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.move(1);
    else if (e.code === 'Enter' || e.code === 'Space') this.choose(this.idx);
  };

  constructor(private scene: Phaser.Scene, x: number, y: number, private items: MenuItem[], spacing = 46, size = 24) {
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(42);
    items.forEach((_, i) => {
      const t = scene.add.text(x, y + i * spacing, '', { fontFamily: 'Georgia, serif', fontSize: `${size}px`, color: BONE })
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { if (this.ok(i) && this.idx !== i) { this.idx = i; this.refresh(); } });
      t.on('pointerdown', () => this.choose(i));
      this.texts.push(t);
      this.container.add(t);
    });
    this.idx = Math.max(0, items.findIndex((_, i) => this.ok(i)));
    scene.input.keyboard?.on('keydown', this.onKey);
    this.refresh();
  }

  private ok(i: number) { const e = this.items[i].enabled; return !e || e(); }

  private move(d: number) {
    for (let k = 0; k < this.items.length; k++) {
      this.idx = (this.idx + d + this.items.length) % this.items.length;
      if (this.ok(this.idx)) break;
    }
    sfx.tick();
    this.refresh();
  }

  private choose(i: number) {
    if (this.dead || !this.ok(i)) return;
    sfx.unlock();
    sfx.tick();
    this.items[i].action();
    this.refresh();
  }

  refresh() {
    if (this.dead) return;
    this.texts.forEach((t, i) => {
      const label = this.items[i].label();
      const sel = i === this.idx;
      t.setText(sel ? `✦   ${label}   ✦` : label);
      t.setAlpha(!this.ok(i) ? 0.28 : sel ? 1 : 0.62);
    });
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.container.destroy();
  }
}
