import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './play/MenuScene';
import { PlayScene } from './play/PlayScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 4 },
  scene: [BootScene, MenuScene, PlayScene],
});

// handy for debugging in the browser console during development
if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
  import('./play/devtools').then((m) => m.installDevtools(game));
}
