# 🎵 Mini Player

A mini Apple Music-style web player built with **React 18 + Tailwind CSS v4 + Vite**.

> An "Aurora × Apple Music" aesthetic — glassmorphism, Now Playing layout, a per-track aurora gradient, a spinning vinyl disc, a pulsing equalizer, and a manual light / dark theme toggle.

**Languages:** English | [简体中文](./README_zh.md)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![React](https://img.shields.io/badge/React-18.2-149eca?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/tests-40%2F40-success)](./tests)
[![Lint](https://img.shields.io/badge/lint-clean-brightgreen)](#-development)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#-development)

<p align="center">
  <img src="src/assets/hero.png" alt="Mini Player screenshot" width="720" />
</p>

---

## ✨ Features

- **Modular component tree** — `MusicPlayer`, `PlayerControls`, `ProgressBar`, `Playlist`, `ThemeToggle`. Each component owns its own state and styles.
- **React Context for global state** — `<PlayerProvider>` exposes `currentTrack`, `isPlaying`, `currentTime`, `duration`, `volume`, `shuffleOn`, `repeatMode`, `played`, plus every action: `toggle`, `next`, `prev`, `seek`, `selectIndex`, `setVolume`, `setShuffleOn`, `cycleRepeat`, `stop`, and more.
- **60 / 40 responsive split layout** that gracefully stacks into a single column on mobile.
- **Interactive progress bar** — click-to-seek, drag-to-scrub with live preview, full keyboard support (`←` / `→` ± 5 s, `Home` / `End` to extremes). Both click and pointer-up dispatch a `mini-player:seek` event so `<audio>.currentTime` stays in sync.
- **Three-button transport** — prev / play / next in a tight cluster, with prev & next as smaller circular glass buttons. A quieter row above holds **shuffle** and **repeat** (off → list → one).
- **Volume slider with a press-to-drag model** — clicking the track sets the value, and the slider only follows the pointer while the button is held down. Hover never moves it. Mute toggle + keyboard control included.
- **Auto-loaded playlist** from `public/songs/manifest.json`. The current track pulses with a three-bar equalizer; played tracks fade.
- **Apple system font stack** (SF Pro Display / Text) with subpixel antialiasing.
- **Manual light / dark theme** with `localStorage` persistence. Tailwind v4's `dark:` variant is class-based via `@custom-variant dark`, so the toggle overrides the OS preference.
- **Subtle micro-animations** — play-button hover scale, progress-dot size pulse, breathing aurora orbs, spinning vinyl on play, equalizer pulse on the active track.

---

## 📸 Screenshots

> Drop your own screenshots into `docs/` and link them here. The default hero image is at `src/assets/hero.png`.

| Light theme | Dark theme |
| --- | --- |
| _Add a screenshot here_ | _Add a screenshot here_ |

---

## 🚀 Quick start

### Prerequisites

- **Node.js ≥ 18** (Vite 8 baseline)
- **npm** (or pnpm / yarn — examples use npm)

### Install & run

```bash
git clone https://github.com/CodingLight/mini-player.git
cd mini-player
npm install
npm run dev
```

Open <http://localhost:5173> and enjoy.

### Production build

```bash
npm run build      # outputs to dist/
npm run preview    # serves the production build locally
```

---

## 🧪 Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm test` | Run the full Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | Lint the whole project with ESLint |

### Testing

**40 tests** across 5 files, all passing:

| File | Coverage |
| --- | --- |
| `formatTime.test.js` | mm:ss formatting, zero-padding, invalid input (`NaN`, negative, `undefined`) |
| `palette.test.js` | Hash determinism, palette bounds, missing-title fallback |
| `PlayerContext.test.jsx` | Initial state · `load` · `toggle` · `next` (loop / shuffle / off) · `prev` (3-second rule) · `selectIndex` autoplay · `seek` clamping · `setVolume` clamping · `setShuffleOn` · `cycleRepeat` · `stop` · `markPlayed` idempotency |
| `ProgressBar.test.jsx` | Render · click-to-seek · pointer drag (down → move → up) · keyboard arrows · Space isolation · **`mini-player:seek` event dispatch regression tests** |
| `PlayerControls.test.jsx` | Render · play / pause · prev / next · mute toggle · global Space shortcut · shuffle button `aria-pressed` · repeat cycle (off / all / one) · **volume slider only follows the pointer while pressed** |

---

## 📁 Project layout

```
mini-player/
├── public/
│   └── songs/
│       ├── manifest.json            # Playlist — read by Playlist.jsx
│       └── *.wav                    # Audio files
├── src/
│   ├── components/
│   │   ├── MusicPlayer.jsx          # Main shell — 60/40 layout, aurora background, vinyl art
│   │   ├── PlayerControls.jsx       # Play / pause, ⏮ / ⏭, shuffle / repeat, volume slider, Space shortcut
│   │   ├── ProgressBar.jsx          # Click / drag / keyboard + mini-player:seek event
│   │   ├── Playlist.jsx             # Auto-loaded list, active highlight, equalizer, played state
│   │   └── ThemeToggle.jsx          # Sun / moon glass button — light ↔ dark
│   ├── context/
│   │   ├── PlayerContext.jsx        # <PlayerProvider> — global player state + actions
│   │   ├── context.js               # PlayerContext object (split for react-refresh)
│   │   ├── usePlayer.js             # usePlayer() hook (split for react-refresh)
│   │   ├── theme.jsx                # <ThemeProvider> — light / dark + localStorage
│   │   ├── themeContext.js          # ThemeContext object (split for react-refresh)
│   │   └── useTheme.js              # useTheme() hook (split for react-refresh)
│   ├── hooks/
│   │   └── useAudioPlayer.js        # Side-effect bridge: <audio> ↔ Context, repeat-mode aware
│   ├── utils/
│   │   ├── formatTime.js            # mm:ss formatter
│   │   └── palette.js               # Title-hash → curated gradient palette
│   ├── index.css                    # Tailwind v4 @theme + Apple color tokens + @custom-variant dark
│   ├── App.jsx                      # Wraps <ThemeProvider> + <PlayerProvider>
│   └── main.jsx                     # React entry point
├── tests/
│   ├── setup.js                     # Vitest setup + jsdom polyfills (PointerEvent, Pointer Capture, HTMLMediaElement)
│   ├── formatTime.test.js
│   ├── palette.test.js
│   ├── PlayerContext.test.jsx
│   ├── ProgressBar.test.jsx
│   └── PlayerControls.test.jsx
├── index.html
├── vite.config.js
├── vitest.config.js
├── eslint.config.js
├── package.json
├── LICENSE
├── README.md
└── README_zh.md
```

---

## 🎨 Customising

- **Add tracks** — drop audio files into `public/songs/` and add an entry to `public/songs/manifest.json`:

  ```json
  {
    "id": "my-track",
    "title": "My Track",
    "artist": "Artist Name",
    "duration": 214,
    "src": "/songs/My Track.wav"
  }
  ```

- **Tweak the aurora palette** — `src/utils/palette.js` is a curated list of gradients keyed by `hashString(title)`. Add a new gradient to `PALETTES` to widen the pool.
- **Adjust theme tokens** — Apple system colors, font stack, shadows, and aurora keyframes all live in the `@theme` block of `src/index.css`.
- **Theme persistence** — `src/context/theme.jsx` reads `localStorage` first, then falls back to `prefers-color-scheme`. To follow the OS automatically, remove the localStorage branch.
- **Context ↔ audio bridge** — the only side-effecting module is `src/hooks/useAudioPlayer.js`. It uses a custom `mini-player:seek` window event so the progress bar can command the audio element without prop-drilling refs.

---

## 🌐 Browser support

Targets modern Chromium, Firefox, and Safari. The only browser capabilities we rely on are:

- `HTMLAudioElement`
- `backdrop-filter` (CSS)
- `localStorage`
- `prefers-color-scheme` (only as the first-mount fallback)
- CSS custom properties & `@custom-variant` (Tailwind v4)

All of these have been baseline since 2022.

---

## 🛣️ Roadmap

- [ ] Drag-to-reorder playlist
- [ ] Persist `currentIndex` / `currentTime` to `localStorage` across reloads
- [ ] Optional lyrics pane
- [ ] Visualizer on the album art (Web Audio API)

---

## 🤝 Contributing

Contributions are welcome! For a smooth collaboration:

1. Fork the repository and create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes and add tests when applicable.
3. Run `npm run lint` and `npm test` until both are clean.
4. Open a pull request describing the motivation and approach.

Please open an issue first for non-trivial changes so we can discuss the design before code lands.

---

## 📄 License

Released under the **MIT License**. See [`LICENSE`](./LICENSE) for the full text.

You are free to use, copy, modify, merge, publish, distribute, sublicense, and / or sell copies of the software, subject to the standard MIT terms.

---

## 🙏 Acknowledgements

- Apple Music for the visual language inspiration
- Music assets for this project are courtesy of Pedro. Thank you for providing them: https://github.com/machadop1407
- [Tailwind CSS](https://tailwindcss.com) and the Tailwind v4 alpha / beta community
- [Vitest](https://vitest.dev) and [Testing Library](https://testing-library.com) for the testing toolchain
- All the open-source maintainers whose work makes projects like this possible
