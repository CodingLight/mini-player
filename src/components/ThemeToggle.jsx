import { useTheme } from "../context/useTheme.js";

// ============================================================================
// 主题切换按钮
// ----------------------------------------------------------------------------
// 玻璃质感的圆形按钮，hover 时浮起 + 玻璃高光。
// 内部太阳 ↔ 月亮两个图标叠加，通过 opacity + rotate + scale 三个变换
// 做交叉淡入淡出，切换主题时有一个细腻的转场动画。
//
// 用 inline SVG 而不是 emoji，是为了保证跨系统（macOS / Windows / Linux）
// 视觉一致，并且能直接继承 currentColor。
// ============================================================================

const IconSun = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const IconMoon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="currentColor" stroke="none" />
  </svg>
);

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "切换到浅色主题" : "切换到深色主题"}
      aria-pressed={isDark}
      title={isDark ? "切换到浅色主题" : "切换到深色主题"}
      // 亮 / 深色下都用玻璃质感，但用不同色调保证对比度
      className="group relative grid h-9 w-9 place-items-center rounded-full bg-white/55 text-neutral-700 ring-1 ring-white/60 backdrop-blur-md hover:bg-white/80 hover:scale-105 active:scale-95 transition-all duration-200 dark:bg-white/10 dark:text-white/80 dark:ring-white/15 dark:hover:bg-white/20 dark:hover:text-white"
    >
      {/* 悬停时的玻璃高光（径向渐变） */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 70%)",
        }}
      />
      <span className="relative">
        {/* 太阳：浅色主题下显示 */}
        <span
          className={`absolute inset-0 grid place-items-center transition-all duration-300 ${
            isDark
              ? "opacity-0 -rotate-90 scale-50"
              : "opacity-100 rotate-0 scale-100"
          }`}
        >
          <IconSun className="h-[18px] w-[18px]" />
        </span>
        {/* 月亮：深色主题下显示 */}
        <span
          className={`transition-all duration-300 ${
            isDark
              ? "opacity-100 rotate-0 scale-100"
              : "opacity-0 rotate-90 scale-50"
          }`}
        >
          <IconMoon className="h-[18px] w-[18px]" />
        </span>
      </span>
    </button>
  );
}