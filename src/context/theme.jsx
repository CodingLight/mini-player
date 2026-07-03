import { useCallback, useEffect, useState } from "react";
import { ThemeContext } from "./themeContext.js";

// ============================================================================
// ThemeProvider —— 极简的亮 / 深色主题状态，带 localStorage 持久化
// ----------------------------------------------------------------------------
// 首次挂载时的解析优先级：
//   1. localStorage 中的存储值（"light" | "dark"）
//   2. 系统 `prefers-color-scheme`（匹配则为 "dark"，否则 "light"）
//
// 一旦用户点击过切换按钮，存储值就会一直胜出（直到清理站点数据）。
// 我们刻意不再持续同步系统偏好——否则系统改设置后页面又会跳回原主题。
// ============================================================================

const STORAGE_KEY = "mini-player:theme";

/**
 * 读取初始主题值（依次：localStorage → 系统偏好 → 默认 light）
 * 用懒初始化函数传给 useState，避免每次渲染都跑一次。
 */
function readInitialTheme() {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage 可能被禁用（隐私模式 / 第三方 cookie 限制），直接走系统偏好
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  // 把主题同步到 <html>：
  //   1. 切换 .dark 类，让 Tailwind 的 dark: 变体生效
  //   2. 设置 colorScheme，让原生控件（滚动条、input range 滑块）颜色匹配
  //   3. 持久化到 localStorage
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // 写入失败时静默忽略
    }
  }, [theme]);

  // 切换 light ↔ dark。
  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}