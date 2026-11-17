import Phaser from 'phaser';

// Hand-made art drops in over the generated art. List PNGs in public/art/manifest.json:
//   { "assets": { "g_head": "girl/head.png", "trees_mid": "bg/trees_mid.png" } }
// Each file replaces the texture with the same key. Keep the template's size and pivot (public/art/templates)
// and it fits with no code changes. See docs/art-brief.md.

// one shared set even if hot reload ever loads this module twice
const G = globalThis as unknown as { __chhayaArt?: Set<string> };
export const ART_OVERRIDES: Set<string> = (G.__chhayaArt ??= new Set<string>());
type Manifest = { assets?: Record<string, string> };

/** call in a preload(): loads the manifest and then every PNG it lists */
export function loadArt(scene: Phaser.Scene) {
  scene.load.on('filecomplete-json-art_manifest', (_key: string, _type: string, data: Manifest) => {
    for (const [key, file] of Object.entries(data?.assets ?? {})) scene.load.image(`art:${key}`, `art/${file}`);
  });
  scene.load.json('art_manifest', 'art/manifest.json');
  scene.load.json('art_sizes', 'art/templates/sizes.json');
}

/** after the generated art exists: swap in every loaded PNG under its real key */
export function applyArt(scene: Phaser.Scene) {
  const tm = scene.textures;
  const sizes = (scene.cache.json.get('art_sizes') ?? {}) as Record<string, [number, number]>;
  for (const k of tm.getTextureKeys()) {
    if (!k.startsWith('art:')) continue;
    const key = k.slice(4);
    if (tm.exists(key)) tm.remove(key);
    // painted bigger than the template (say 4x)? scale it down to the template's exact size
    const want = sizes[key];
    const img = tm.get(k).getSourceImage() as HTMLImageElement;
    if (want && (img.width !== want[0] || img.height !== want[1])) {
      const t = tm.createCanvas(key, want[0], want[1])!;
      const c = t.getContext();
      c.imageSmoothingQuality = 'high';
      c.drawImage(img, 0, 0, want[0], want[1]);
      t.refresh();
      tm.remove(k);
    } else tm.renameTexture(k, key);
    ART_OVERRIDES.add(key);
  }
  if (ART_OVERRIDES.size) console.info(`[art] using ${ART_OVERRIDES.size} hand-made asset(s):`, [...ART_OVERRIDES].join(', '));
}
