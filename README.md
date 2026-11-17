# Chhaya (छाया)

An atmospheric, silhouette puzzle-platformer set in an Indian dusk-forest. A small girl carries a diya
(oil lamp) through banyan groves, bamboo-stake traps and old shrines. It is an original game:
original story, character, art, levels and sound.

## Run

```
npm install
npm run dev      # http://localhost:5173
```

Ten chapters: the Banyan, the Hollow, the Poachers, the Fields, the Stepwell, the Mill, the Monsoon, the Railway,
the Fort and the Temple.

Keyboard: ← → / A D walk, Space jump (hold for higher), Shift hold to grab and pull, ↑ ↓ climb, E burn · light ·
set the diya down or pick it up, R retry from the last lamp, Esc pause. On a touch screen, on-screen buttons appear.

## Code map

| File | What it does |
|---|---|
| `src/play/PlayScene.ts` | The game: Matter physics, light and darkness, camera, checkpoints, death, pause, chapter end |
| `src/play/player.ts`, `girl.ts` | The girl's controller and her live jointed skeleton |
| `src/play/creatures/` | Leopard and jackals, the spider, poachers, crows, shadows — all procedurally jointed |
| `src/play/ents/` | Props, vines, water, fire, traps and machinery, lamps, weather, set-piece scripts |
| `src/play/chapters/ch01..ch10.ts` | The chapters, built with `builder.ts` and the shared `beats.ts` |
| `src/play/MenuScene.ts` | Title screen, chapter select, settings |
| `src/scenes/BootScene.ts` | Generates the backdrops and shared textures in code |
| `src/audio.ts` | Every sound, synthesised with Web Audio |
| `src/touch.ts` | Touch buttons |

Testing and the art pipeline: [docs/dev-testing.md](docs/dev-testing.md). Build log: [docs/progress.md](docs/progress.md).

## Android

The web build is wrapped with [Capacitor](https://capacitorjs.com) (`android/`). Every push to `main` builds a
debug APK on GitHub Actions (`.github/workflows/android.yml`) and attaches it to the **latest** release.

To build it yourself (needs JDK 17 and the Android SDK):

```
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug    # app/build/outputs/apk/debug/app-debug.apk
```
