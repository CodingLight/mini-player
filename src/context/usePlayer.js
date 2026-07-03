import { useContext } from "react";
import { PlayerContext } from "./context.js";

// 读取播放器全局状态的 hook。
// 必须在 <PlayerProvider> 内部使用，否则会抛出错误。
export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}