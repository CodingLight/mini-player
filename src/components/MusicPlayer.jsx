import { useMemo } from "react";
import { usePlayer } from "../context/usePlayer.js";
import { useAudioPlayer } from "../hooks/useAudioPlayer.js";
import { paletteFor } from "../utils/palette.js";
import { formatTime } from "../utils/formatTime.js";
import PlayerControls from "./PlayerControls.jsx";
import ProgressBar from "./ProgressBar.jsx";
import Playlist from "./Playlist.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

// ============================================================================
// MusicPlayer —— 应用主容器
// ----------------------------------------------------------------------------
// 负责把以下元素组合起来：
//   - 极光渐变背景（颜色随当前曲目变化）
//   - 顶部栏（logo + 主题开关 + 曲目计数）
//   - 60 / 40 分栏的 Now Playing + 播放列表
//   - 底部页脚
//
// 60 / 40 分栏在 lg 断点（≥1024px）生效，更小屏幕会自动堆叠为单列。
// ============================================================================

// 极光背景层：三个柔和的彩色球 + 基础渐变 + 颗粒纹理。
// 颜色取自当前曲目的色板，切换歌曲时整片氛围会随之改变。
function Aurora({ palette }) {
  const [c1, c2, c3] = palette;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* 基础渐变（亮 / 深色各自一套） */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 20% 10%, rgba(255,255,255,0.55), transparent 60%)," +
            "radial-gradient(120% 90% at 90% 90%, rgba(0,0,0,0.18), transparent 55%)," +
            "linear-gradient(180deg, #fbfbfd 0%, #efeff3 100%)",
        }}
      />
      <div
        className="absolute inset-0 dark:block hidden"
        style={{
          background:
            "radial-gradient(120% 90% at 20% 10%, rgba(255,255,255,0.05), transparent 60%)," +
            "linear-gradient(180deg, #0a0a0c 0%, #050507 100%)",
        }}
      />
      {/* 三个极光球，各自周期缓慢呼吸 */}
      <div
        className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-60 mix-blend-screen aurora-a"
        style={{ background: `radial-gradient(circle, ${c1}, transparent 65%)` }}
      />
      <div
        className="absolute top-1/3 -right-32 h-[520px] w-[520px] rounded-full blur-3xl opacity-55 mix-blend-screen aurora-b"
        style={{ background: `radial-gradient(circle, ${c2}, transparent 65%)` }}
      />
      <div
        className="absolute bottom-[-180px] left-1/3 h-[480px] w-[480px] rounded-full blur-3xl opacity-50 mix-blend-screen aurora-c"
        style={{ background: `radial-gradient(circle, ${c3}, transparent 65%)` }}
      />
      {/* 颗粒纹理：用 SVG turbulence 滤镜做细微的胶片噪点 */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>\")",
        }}
      />
      <style>{`
        @keyframes auroraA { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px, 40px) scale(1.08); } }
        @keyframes auroraB { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px, 30px) scale(1.12); } }
        @keyframes auroraC { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px, -40px) scale(1.06); } }
        .aurora-a { animation: auroraA 18s ease-in-out infinite; }
        .aurora-b { animation: auroraB 22s ease-in-out infinite; }
        .aurora-c { animation: auroraC 26s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// 圆形黑胶碟片：渐变 + 中心标签 + 同心凹槽 + 玻璃高光。
// 播放时以 45 秒 / 圈的速度匀速旋转。
function AlbumArt({ track, playing }) {
  const [c1, c2, c3] = paletteFor(track);
  const initial = (track?.title || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="relative aspect-square w-full max-w-[360px] mx-auto">
      {/* 背后的柔和光晕 */}
      <div
        className="absolute inset-[-10%] rounded-[44px] blur-3xl opacity-70"
        style={{ background: `radial-gradient(circle, ${c1}, transparent 65%)` }}
      />
      {/* 黑胶旋转盘 */}
      <div
        className={[
          "relative h-full w-full rounded-full overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/30",
          playing ? "animate-[spin_45s_linear_infinite]" : "",
        ].join(" ")}
        style={{
          background: `conic-gradient(from 220deg at 50% 50%, ${c1}, ${c2}, ${c3}, ${c1})`,
        }}
      >
        {/* 中心标签 */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative h-[42%] w-[42%] rounded-full bg-black/55 backdrop-blur-md ring-1 ring-white/15 grid place-items-center">
            <div className="absolute inset-3 rounded-full border border-white/10" />
            <div className="absolute inset-[28%] rounded-full bg-white/80" />
            <span className="relative text-white font-semibold text-3xl tracking-tight">
              {initial}
            </span>
          </div>
        </div>
        {/* 玻璃高光：上亮下暗，强化立体感 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 35%, rgba(0,0,0,0.18) 100%)",
          }}
        />
        {/* 同心凹槽（黑胶纹理） */}
        <div className="absolute inset-0">
          {[0.62, 0.68, 0.74, 0.8, 0.86].map((r, idx) => (
            <div
              key={idx}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
              style={{ width: `${r * 100}%`, height: `${r * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Now Playing 区域顶部的小标签：脉冲点 + 状态文字。
function NowPlayingHeader() {
  const { isPlaying } = usePlayer();
  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-neutral-500 dark:text-white/45">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse" />
      <span>{isPlaying ? "正在播放" : "已暂停"}</span>
      <span className="opacity-30">·</span>
      <span>Mini Player</span>
    </div>
  );
}

export default function MusicPlayer() {
  // 在树根处挂载一次 <audio> 副作用。
  useAudioPlayer();

  const { isPlaying, duration, tracks, currentIndex, currentTrack } =
    usePlayer();

  // 当前曲目的色板，用 useMemo 减少不必要的派生计算。
  const palette = useMemo(
    () =>
      paletteFor(
        currentIndex >= 0 ? tracks[currentIndex] : { title: "default" },
      ),
    [currentIndex, tracks],
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <Aurora palette={palette} />

      <main className="relative mx-auto flex min-h-screen w-full max-w-[1280px] flex-col gap-6 px-5 py-8 sm:px-8 lg:py-10">
        {/* 顶部栏：左 logo + 主题开关；右 曲目计数 + 总时长 */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl shadow-md"
              style={{
                background: `linear-gradient(135deg, ${palette[0]}, ${palette[2]})`,
              }}
              aria-hidden="true"
            >
              {/* 简易音符图标 */}
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white">
                <path
                  d="M9 18V5l12-2v13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="6" cy="18" r="3" fill="currentColor" />
                <circle cx="18" cy="16" r="3" fill="currentColor" />
              </svg>
            </span>
            <div className="leading-tight">
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-white/45">
                Mini
              </p>
              <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
                Music
              </h1>
            </div>

            <ThemeToggle />
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] text-neutral-500 dark:text-white/55">
            <span className="tabular-nums">
              {currentIndex >= 0 ? currentIndex + 1 : 0} / {tracks.length}
            </span>
            <span className="opacity-30">·</span>
            <span className="tabular-nums">{formatTime(duration)}</span>
          </div>
        </header>

        {/* 60 / 40 主分栏 */}
        <section className="grid flex-1 min-h-0 grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          {/* 左侧：Now Playing */}
          <article className="flex flex-col rounded-3xl bg-white/55 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.12)] p-6 sm:p-8">
            <NowPlayingHeader />

            <div className="mt-6 flex-1 grid place-items-center">
              <AlbumArt track={currentTrack} playing={isPlaying} />
            </div>

            <div className="mt-6 text-center">
              <h2 className="text-[26px] sm:text-[30px] font-bold tracking-[-0.02em] text-neutral-900 dark:text-white truncate">
                {currentTrack?.title || "暂无曲目"}
              </h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-white/55 truncate">
                {currentTrack?.artist || "—"}
              </p>
            </div>

            <div className="mt-6">
              <ProgressBar />
            </div>

            <div className="mt-7">
              <PlayerControls />
            </div>
          </article>

          {/* 右侧：播放列表 */}
          <Playlist />
        </section>

        {/* 底部页脚 */}
        <footer className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-white/40">
          <span>Tailwind CSS · React · Vite</span>
          <span className="hidden sm:inline">按空格键播放 / 暂停</span>
        </footer>
      </main>
    </div>
  );
}