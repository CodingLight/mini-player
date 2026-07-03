import { useContext } from "react";
import { ThemeContext } from "./themeContext.js";

// 读取主题状态的 hook。
// 必须在 <ThemeProvider> 内部使用，否则会抛出错误。
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}