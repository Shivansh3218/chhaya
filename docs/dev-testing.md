# Testing and art workflow (for developers and agents)

## Running

- **Dev server:** `npm run dev` (port 5173). The app's `.claude/launch.json` lives one folder up and starts the server as `chhaya`.
- **Main game:** `http://localhost:5173/` (title menu). Jump straight into a chapter with `?chapter=c03&cp=2`.
  `?unlock` unlocks every chapter in the menu.
- **Checks:** `npx tsc --noEmit -p .` must be clean, and `npm run build` must pass.
- **Hot reload can duplicate modules** after many edits. If textures go missing or modules act twice, restart the dev server.

## Automated playthroughs

Every chapter is built with `src/play/builder.ts`, which records the steps to solve each beat as it lays the
geometry. In a dev build the page has a `chh` helper (`src/play/devtools.ts`) that plays them back with the
game loop under manual control — it works with the browser pane hidden:

```js
await chh.auto('c01')                    // → { finished, deaths, gameSeconds, cp, of, log }
await chh.auto('c04', { cp: 5 })         // start at lamp 5
await chh.auto('c02', { shotEvery: 300, prefix: 'c02' })   // screenshots every 5 game-seconds
await chh.play('c06', 3)                 // start a chapter paused at a lamp; then chh.step(n), chh.render(n)
await chh.shot('name')                   // one screenshot
chh.release()                            // give the loop back to the browser
```

- Screenshots are POSTed to a small receiver: `node scripts/dev/shot-server.cjs <folder>` (127.0.0.1:5199).
- Long runs exceed one console call; start them in the background and poll, e.g.
  `window.res = {}; (async () => { for (const c of ['c01','c02']) res[c] = await chh.auto(c); })()`.
- `log` lists steps that timed out or got stuck; `deaths` lists each death as `kind@x,y cpN stepM`.
- Dev-only levels: `zoo` (every creature standing in a row) and `cal_gap_150` etc. (movement envelope).

## Art pipeline

- **Drop-in art:** `public/art/manifest.json` maps a texture key to a PNG under `public/art/`.
  - It replaces the generated texture of that key at boot (`src/artOverrides.ts`).
  - Files larger than the template are scaled down to the template's size (`public/art/templates/sizes.json`).
  - Add new keys to `sizes.json` when you add them.
- **Templates and the brief:** `public/art/templates/` and `docs/art-brief.md`.
- **Raw generated images (not shipped):** `art-src/raw/`. Processed results go to `public/art/gen/`, and provenance goes in `public/art/gen/CREDITS.md`.
- **Generators**
  - **TAAFT Image Generator** at https://theresanaiforthat.com/@taaft/image-generator/
    - Free, and the output is free for commercial use.
    - Use it through Claude in Chrome, where the user is signed in.
    - Avoid prompts describing children. Its filter rejects them, so say "cartoon character" or "icon".
    - Your own results appear as `img` elements whose `src` matches `media.theresanaiforthat.com/g/<16 hex>-<uuid>.png`.
  - **FLUX.1-schnell on Hugging Face:** `scripts/art/gen-flux.mjs`. Anonymous quota runs out quickly; set `HF_TOKEN` for more.
- **Processing:** `python scripts/art/process.py [name ...]` (Pillow + NumPy) turns `art-src/raw/<name>.png` into `public/art/gen/<name>.png` using a per-image recipe:
  - Silhouette art: luminance becomes alpha (white turns transparent) and the shape is tinted to the layer colour.
  - Characters and props: fit the bounding box into the template.
  - Long layers: cross-fade an extra strip so the layer tiles horizontally, then blur across the wrap.
  - Fill textures: cross-fade both ways.
  - Look at every result in-game before keeping it.
