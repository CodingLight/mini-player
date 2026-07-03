import { createContext } from "react";

// PlayerContext 拆到独立模块，方便 PlayerContext.jsx 只导出组件，
// 这样开发模式下 react-refresh/only-export-components 规则就不会报错。
export const PlayerContext = createContext(null);