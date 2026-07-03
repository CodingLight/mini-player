import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../context/usePlayer.js";

// ============================================================================
// 内联 SVG 图标
// ----------------------------------------------------------------------------
// 苹果音乐的图形语言非常克制：简单的描边或填充。我们让几何保持紧凑，
// 用 currentColor / 渐变填充处理配色。
// ============================================================================

const IconPlay = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M7 4.5v15a.5.5 0 0 0 .76.43l12-7.5a.5.5 0 0 0 0-.86l-12-7.5A.5.5 0 0 0 7 4.5Z"
      fill="currentColor"
    />
  </svg>
);

const IconPause = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="6" y="4.5" width="4" height="15" rx="1.4" fill="currentColor" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.4" fill="currentColor" />
  </svg>
);

// 上一曲 / 下一曲用 Unicode 字符（跨系统时比 emoji 更稳定）。
const IconPrev = ({ className = "" }) => (
  <span className={className} aria-hidden="true" style={{ lineHeight: 1 }}>
    ⏮
  </span>
);

const IconNext = ({ className = "" }) => (
  <span className={className} aria-hidden="true" style={{ lineHeight: 1 }}>
    ⏭
  </span>
);

const IconShuffle = ({ className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="m15 15 6 6" />
    <path d="M4 4l5 5" />
  </svg>
);

const IconRepeat = ({ className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m17 1 4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="m7 23-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

// 音量图标：muted 时显示一个"X"叠加，普通状态显示声波弧线。
const IconVolume = ({ muted, className = "" }) =>
  muted ? (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon
        points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
        fill="currentColor"
        stroke="none"
      />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon
        points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
        fill="currentColor"
        stroke="none"
      />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );

// 单曲循环"1"角标
const IconRepeatOne = ({ className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m17 1 4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="m7 23-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    <text
      x="12"
      y="14.5"
      textAnchor="middle"
      fontSize="8"
      fontWeight="700"
      fill="currentColor"
      stroke="none"
      fontFamily="ui-sans-serif, system-ui, -apple-system, 'SF Pro Display'"
    >
      1
    </text>
  </svg>
);

// ============================================================================
// 苹果风格的音量滑块
// ----------------------------------------------------------------------------
// 细轨道 + 白色填充 + 小圆点滑块。滑块在静止时缩成一个圆点，
// hover 时才显现出来——保持整体克制。
// ============================================================================
function VolumeSlider() {
  const { volume, setVolume } = usePlayer();
  const trackRef = useRef(null);
  const draggingRef = useRef(false); // 同步跟踪拖拽中状态
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const muted = volume === 0;

  // 把客户端 X 坐标转换为 0..1 的音量值。
  const pctFromX = (clientX) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  };
  const setFromX = (clientX) => setVolume(pctFromX(clientX));

  return (
    <div
      className="flex items-center gap-2"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* 静音 / 取消静音切换按钮：配色随主题切换，
          亮色下深色玻璃 + 深色图标，深色下反之。 */}
      <button
        type="button"
        aria-label={muted ? "取消静音" : "静音"}
        onClick={() => setVolume(muted ? 0.8 : 0)}
        className="grid h-7 w-7 place-items-center rounded-full bg-black/10 text-neutral-700 ring-1 ring-black/10 hover:bg-black/20 hover:text-neutral-900 transition-colors dark:bg-white/10 dark:text-white/80 dark:ring-white/15 dark:hover:bg-white/20 dark:hover:text-white"
      >
        <IconVolume muted={muted} className="h-4 w-4" />
      </button>

      {/* 音量滑块：仅在按下后开始跟随鼠标，hover 不跟随。 */}
      <div
        ref={trackRef}
        role="slider"
        aria-label="音量"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(volume * 100)}
        tabIndex={0}
        onPointerDown={(e) => {
          // 仅响应主键
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          draggingRef.current = true;
          setDragging(true);
          // 立即跳到点击位置（按下即生效）
          setFromX(e.clientX);
        }}
        onPointerMove={(e) => {
          // 仅在按下后跟随，避免 hover 即误改音量
          if (!draggingRef.current) return;
          setFromX(e.clientX);
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          setDragging(false);
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* 已被释放则忽略 */
          }
        }}
        onPointerCancel={(e) => {
          draggingRef.current = false;
          setDragging(false);
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* 忽略 */
          }
        }}
        onKeyDown={(e) => {
          // 键盘 ±5%，Home/End 到 0 / 1
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            setVolume(Math.max(0, volume - 0.05));
          } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            setVolume(Math.min(1, volume + 0.05));
          } else if (e.key === "Home") {
            e.preventDefault();
            setVolume(0);
          } else if (e.key === "End") {
            e.preventDefault();
            setVolume(1);
          }
        }}
        className="relative h-5 flex-1 min-w-[80px] cursor-pointer touch-none select-none"
      >
        {/* 轨道底色：随主题切到中性色 */}
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-full bg-black/15 dark:bg-white/20 overflow-hidden transition-all duration-200"
          style={{ height: hover ? 4 : 3 }}
        >
          {/* 当前音量填充 */}
          <div
            className="h-full rounded-full bg-neutral-900 dark:bg-white"
            style={{ width: `${volume * 100}%` }}
          />
        </div>
        {/* 滑块圆点（hover 或拖拽时浮现） */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-900 shadow ring-1 ring-white/40 transition-all duration-150 dark:bg-white dark:ring-black/20"
          style={{
            left: `${volume * 100}%`,
            width: hover || dragging ? 12 : 0,
            height: hover || dragging ? 12 : 0,
            opacity: hover || dragging ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// 播放控制主组件
// ----------------------------------------------------------------------------
// 三排结构：
//   1. shuffle / repeat 次级控件（更安静）
//   2. 上一曲 / 播放 / 下一曲 三连按钮（主控件面）
//   3. 音量滑块
//
// 配色规则（保证亮 / 深色下都可见）：
//   - 亮色：深色玻璃盘（bg-black/15） + 深色图标（text-neutral-900）
//   - 深色：浅色玻璃盘（bg-white/15） + 白色图标
// ============================================================================
export default function PlayerControls() {
  const {
    isPlaying,
    toggle,
    next,
    prev,
    shuffleOn,
    setShuffleOn,
    repeatMode,
    cycleRepeat,
  } = usePlayer();

  // 全局空格快捷键：当焦点不在输入框时，空格切换播放 / 暂停。
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Space") return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // 次级按钮的"未激活"配色：随主题切换，
  // 亮色用深色低对比度，深色用白色低对比度。
  const idleText =
    "text-neutral-600 hover:text-neutral-900 dark:text-white/55 dark:hover:text-white";
  // 激活态配色：苹果粉（system-pink）
  const activeText = "text-apple-pink dark:text-apple-pink";

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* 次级控件行：保持低调，让主控件更突出 */}
      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          aria-label={shuffleOn ? "关闭随机播放" : "开启随机播放"}
          aria-pressed={shuffleOn}
          title={shuffleOn ? "随机播放：开" : "随机播放：关"}
          onClick={() => setShuffleOn(!shuffleOn)}
          className={`transition-colors ${shuffleOn ? activeText : idleText}`}
        >
          <IconShuffle className="h-[18px] w-[18px]" />
        </button>

        <button
          type="button"
          aria-label={
            repeatMode === "off"
              ? "开启循环"
              : repeatMode === "all"
                ? "切换到单曲循环"
                : "关闭循环"
          }
          aria-pressed={repeatMode !== "off"}
          title={
            repeatMode === "off"
              ? "循环：关"
              : repeatMode === "all"
                ? "循环：列表"
                : "循环：单曲"
          }
          onClick={cycleRepeat}
          className={`transition-colors ${
            repeatMode !== "off" ? activeText : idleText
          }`}
        >
          {repeatMode === "one" ? (
            <IconRepeatOne className="h-[18px] w-[18px]" />
          ) : (
            <IconRepeat className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>

      {/* 主控件：上一曲 / 播放 / 下一曲 紧贴在一起。
          prev & next 是圆形，比播放键（h-14）小一档（h-11）。 */}
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <button
          type="button"
          aria-label="上一曲"
          onClick={prev}
          className="group relative grid h-11 w-11 place-items-center rounded-full bg-black/15 text-neutral-900 ring-1 ring-black/10 backdrop-blur-md hover:bg-black/25 hover:scale-105 active:scale-95 transition-all duration-200 dark:bg-white/15 dark:text-white dark:ring-white/20 dark:hover:bg-white/25"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 dark:bg-white/15"
          />
          <IconPrev className="relative h-5 w-5" />
        </button>

        <button
          type="button"
          aria-label={isPlaying ? "暂停" : "播放"}
          onClick={toggle}
          className="group relative grid h-14 w-14 place-items-center rounded-full bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:scale-105 active:scale-95 transition-transform"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, #ffffff, #e8e8ed 80%)",
            }}
          />
          <span className="relative">
            {isPlaying ? (
              <IconPause className="h-7 w-7" />
            ) : (
              <IconPlay className="h-7 w-7 translate-x-[1px]" />
            )}
          </span>
        </button>

        <button
          type="button"
          aria-label="下一曲"
          onClick={next}
          className="group relative grid h-11 w-11 place-items-center rounded-full bg-black/15 text-neutral-900 ring-1 ring-black/10 backdrop-blur-md hover:bg-black/25 hover:scale-105 active:scale-95 transition-all duration-200 dark:bg-white/15 dark:text-white dark:ring-white/20 dark:hover:bg-white/25"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 dark:bg-white/15"
          />
          <IconNext className="relative h-5 w-5" />
        </button>
      </div>

      <div className="w-full max-w-55">
        <VolumeSlider />
      </div>
    </div>
  );
}
