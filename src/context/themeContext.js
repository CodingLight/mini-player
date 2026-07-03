import { createContext } from "react";

// 同样为了避开 react-refresh/only-export-components 规则，
// 把 ThemeContext 拆出来，theme.jsx 只负责导出 <ThemeProvider> 组件。
export const ThemeContext = createContext(null);