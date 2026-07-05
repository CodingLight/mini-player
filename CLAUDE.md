# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All scripts are in `package.json` and run with npm:

| Task | Command |
| --- | --- |
| Dev server (HMR) | `npm run dev` |
| Production build | `npm run build` |
| Preview built output | `npm run preview` |
| Run all tests once | `npm test` |
| Watch tests | `npm run test:watch` |
| Run a single test file | `npx vitest run tests/ProgressBar.test.jsx` |
| Run a single test by name | `npx vitest run -t "render 已播放时间与剩余时间"` |
| Lint | `npm run lint` |

> The repo is configured for `npm`. `@testing-library/react` requires `--legacy-peer-deps` on some npm versions; if you see ERESOLVE on `npm install`, pass that flag.

## Architecture

A React 18 + Vite + Tailwind v4 single-page app with a hand-rolled audio player. The interesting shape is in **how state flows between a hidden `<audio>` element and the React tree**, and in **how a few cross-cutting rules shaped the file layout**.

### State flow: Context ↔ audio bridge

The `<audio>` element is **never** referenced from React components directly. Instead:

- `src/context/PlayerContext.jsx` is the single source of truth (`tracks`, `currentIndex`, `isPlaying`, `currentTime`, `duration`, `volume`, `played`, `shuffleOn`, `repeatMode`).
- `src/hooks/useAudioPlayer.js` is mounted once (inside `MusicPlayer`) and is the *only* module that touches `HTMLAudioElement`. It mirrors state both directions:
  - context → audio: on `track` change it sets `audio.src`; on `isPlaying` change it calls `play()` / `pause()`; on `volume` change it sets `audio.volume`.
  - audio → context: it listens to `timeupdate` / `loadedmetadata` / `ended` and writes back through `setCurrentTime` / `setDuration` / `next` / `stop`.
- `ProgressBar.jsx` cannot reach the audio element either. To force a seek it dispatches a window event — `window.dispatchEvent(new CustomEvent("mini-player:seek", { detail: seconds }))` — which `useAudioPlayer` listens for. This is the **only** piece of inter-module bus signalling in the project; keep it that way.
- Drag-to-scrub: `ProgressBar` updates context state for the *preview* during drag, but the audio jump is **only** dispatched on `pointerUp`. Regression tests assert this.

### Modes: shuffle / repeat

- `shuffleOn` (boolean) + `repeatMode` (`"off" | "all" | "one"`) live in `PlayerContext`.
- `next()` is mode-aware: shuffle picks a random non-current index, list-repeat wraps to 0, off-mode clamps at the last index.
- `useAudioPlayer` mirrors this on the `ended` event: `"one"` resets `currentTime = 0` and re-plays; `"off"` + last track calls `stop()`; everything else calls `next()`. The `ended` callback is ref-stored (`onEndRef`) so it always reads the latest `currentIndex` / `tracks` / `repeatMode` snapshot without re-binding the listener.

### react-refresh file splits

`eslint-plugin-react-refresh` forbids files from exporting both components and non-components. The project obeys by splitting each context into three files:

- `context.js` — `createContext(null)` (and `themeContext.js` for the theme).
- `<Name>.jsx` — the `Provider` component (e.g. `PlayerContext.jsx`, `theme.jsx`).
- `usePlayer.js` / `useTheme.js` — the consumer hooks with the `if (!ctx) throw` guard.

**When adding a new context, follow the same three-file pattern**; otherwise the dev server will fail to compile.

### Tailwind v4 dark mode

Tailwind v4 defaults `dark:` to `prefers-color-scheme`. We use class-based dark mode by declaring in `src/index.css`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

`<html class="dark">` is toggled in `theme.jsx`'s `useEffect`, which also sets `colorScheme` and persists to `localStorage`. If you remove the `@custom-variant` line the theme toggle will appear to do nothing — that is the only reason to keep it.

### Theme & palette

- Apple HIG color tokens live in the `@theme` block of `src/index.css` (`--color-apple-pink`, `--shadow-apple-*`, `--animate-*`, etc.).
- `src/utils/palette.js` exposes `PALETTES` (8 curated gradients) + `hashString` + `paletteFor(track)`. The aurora background and the per-track art swatch are both derived from this; add new gradients to `PALETTES` to widen the pool.
- `src/utils/formatTime.js` is the only time formatter (`mm:ss`, clamps negatives / `NaN`).

### Volume slider rule (regression-tested)

`PlayerControls` `VolumeSlider` does **not** follow the pointer on hover. It only updates `volume` after `pointerDown` sets `draggingRef.current = true`. The thumb grows on hover or drag, never on its own. The test "音量滑块:仅按下后才跟随鼠标移动,hover 不跟随" enforces this — do not regress it.

## Testing conventions

- Tests live in `tests/`, mirror `src/` structure, use Vitest + Testing Library + jsdom.
- `tests/setup.js` polyfills the missing jsdom pieces: `HTMLMediaElement.play` / `pause` / `load`, `PointerEvent`, and `Element.setPointerCapture` / `releasePointerCapture`. The Pointer Capture polyfills are **global** (in setup, not in a per-test `beforeEach`) — the early ProgressBar tests had a local one but the volume slider test needed it on every slider render, so it moved to setup.
- Tests look up buttons by their Chinese `aria-label` (e.g. `getByLabelText("播放")` / `"暂停"` / `"上一曲"` / `"下一曲"` / `"静音"` / `"取消静音"` / `"开启随机播放"` / `"切换到单曲循环"`). If you change a label, update the tests in lock-step.
- Prefer asserting via `usePlayer()` (via a `<Capture />` child component) over reaching into module internals. See `PlayerControls.test.jsx` for the pattern.

## Quality gates

Before finishing any change, all three must be green:

- `npm run lint` — 0 errors, 0 warnings (the project treats both as blockers).
- `npm test` — 40 / 40 currently; new behaviour should come with new tests.
- `npm run build` — must succeed; bundle size is unmonitored but a regression in `dist/assets/index-*.js` is a useful sanity check.

## Where to look first

| If you are changing… | Start with |
| --- | --- |
| A new transport control or button | `src/components/PlayerControls.jsx` + `tests/PlayerControls.test.jsx` |
| Drag / click / keyboard seek semantics | `src/components/ProgressBar.jsx` + `tests/ProgressBar.test.jsx` (the `mini-player:seek` regression tests) |
| Playback state, `next` / `prev` / modes | `src/context/PlayerContext.jsx` + `tests/PlayerContext.test.jsx` |
| Audio element behaviour (loop, ended, autoplay) | `src/hooks/useAudioPlayer.js` — keep `onEndRef` snapshot semantics |
| Theme tokens or aurora gradients | `src/index.css` (`@theme` + `@custom-variant dark`) and `src/utils/palette.js` |
| Adding a new context | Copy the three-file split (`context.js` + `<Name>.jsx` + `use<Name>.js`) |
