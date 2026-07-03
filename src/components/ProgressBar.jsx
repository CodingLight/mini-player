import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayer } from "../context/usePlayer.js";
import { formatTime } from "../utils/formatTime.js";

// ============================================================================
// 苹果音乐风格的进度条组件
// ----------------------------------------------------------------------------
// 交互：
//   - 点击轨道任意位置 → 跳转到该秒数
//   - 拖动圆点 → 实时跟随指针，松手才提交跳转
//   - 键盘：← / → ±5 秒，Home 跳到开头，End 跳到结尾
//
// 关键设计：
//   1. 用 ref + state 双重跟踪拖拽状态。ref 保证 pointermove/up 在
//      同一个事件循环里读到正确的 dragging，避免 React state 异步更新
//      导致的丢帧。
//   2. 用户跳转后，不仅调用 seek() 更新 context 状态，还 dispatch
//      'mini-player:seek' 事件，让 useAudioPlayer 把 audio.currentTime
//      也同步过去——否则只是 UI 显示移动，声音还在原位置。
//   3. 所有时间计算都在本组件内完成，组件由 PlayerContext 完全驱动。
// ============================================================================

export default function ProgressBar() {
  const { currentTime, duration, seek } = usePlayer();

  const trackRef = useRef(null);
  const draggingRef = useRef(false); // 同步拖拽状态，供事件回调使用
  const dragPctRef = useRef(0); // 拖拽中的百分比快照
  const [dragging, setDragging] = useState(false);
  const [hoverPct, setHoverPct] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [dragPct, setDragPct] = useState(null);

  const total = duration || 0;
  const livePct = total > 0 ? Math.min(1, currentTime / total) : 0;
  const pct = dragging && dragPct !== null ? dragPct : livePct;
  const previewPct = dragging ? pct : hoverPct;

  /**
   * 把客户端的 X 坐标转换为 0..1 的进度百分比。
   * 用 getBoundingClientRect 取轨道实际位置，比假设固定宽度更鲁棒。
   */
  const pointToPct = useCallback((clientX) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  // 鼠标按下：开始拖拽，立即跳到该位置。
  const handlePointerDown = (e) => {
    e.preventDefault();
    const p = pointToPct(e.clientX);
    draggingRef.current = true;
    dragPctRef.current = p;
    setDragging(true);
    setDragPct(p);
    // 捕获指针，确保即使指针移出轨道也能继续收到 move/up 事件。
    trackRef.current?.setPointerCapture?.(e.pointerId);
  };

  // 鼠标移动：在拖拽中时更新拖拽位置；否则仅更新悬停预览位置。
  const handlePointerMove = (e) => {
    if (draggingRef.current) {
      const p = pointToPct(e.clientX);
      dragPctRef.current = p;
      setDragPct(p);
    } else {
      setHoverPct(pointToPct(e.clientX));
    }
  };

  // 拖拽结束：提交跳转（同时同步给 <audio> 元素）。
  const endDrag = (e) => {
    if (!draggingRef.current) return;
    const p = dragPctRef.current;
    const target = p * total;
    seek(target);
    // 命令式地告诉音频钩子把这个时间点同步到 <audio> 元素——
    // 没有这一步的话，context 状态更新了但实际播放位置没变。
    window.dispatchEvent(
      new CustomEvent("mini-player:seek", { detail: target }),
    );
    draggingRef.current = false;
    dragPctRef.current = 0;
    setDragging(false);
    setDragPct(null);
    trackRef.current?.releasePointerCapture?.(e.pointerId);
  };

  // 单纯点击轨道（非拖拽）：直接跳到该位置。
  const handleClick = (e) => {
    if (dragging) return;
    const p = pointToPct(e.clientX);
    const target = p * total;
    seek(target);
    window.dispatchEvent(
      new CustomEvent("mini-player:seek", { detail: target }),
    );
  };

  // 键盘控制：方向键微调，Home/End 跳到首尾。
  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight") seek(currentTime + 5);
    else if (e.key === "ArrowLeft") seek(currentTime - 5);
    else if (e.key === "Home") seek(0);
    else if (e.key === "End") seek(total);
  };

  // 拖拽期间禁止文本选中（避免拖动时误选轨道下方的文字）。
  useEffect(() => {
    if (!dragging) return;
    const stop = (ev) => ev.preventDefault();
    window.addEventListener("selectstart", stop);
    return () => window.removeEventListener("selectstart", stop);
  }, [dragging]);

  const dotSize = dragging || hovering ? 16 : 12;
  const showPreview = (hovering || dragging) && total > 0;

  return (
    <div className="w-full select-none">
      <div
        ref={trackRef}
        role="slider"
        aria-label="播放位置"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(currentTime)}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => {
          setHovering(false);
          setHoverPct(0);
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="relative h-6 cursor-pointer touch-none outline-none"
      >
        {/* 灰色轨道：亮色用深灰半透明以与浅色玻璃背景形成对比，
            深色用半透明白保持经典苹果风格。 */}
        <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-neutral-900/20 dark:bg-white/15 overflow-hidden">
          {/* 进度填充（粉橙渐变） */}
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct * 100}%`,
              background: "linear-gradient(90deg, #ff375f 0%, #ff9f0a 100%)",
              transition: dragging ? "none" : "width 120ms linear",
            }}
          />
        </div>

        {/* 悬停预览（在当前进度右侧的浅色提示段） */}
        {showPreview && !dragging && previewPct > pct && (
          <div
            className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/25 pointer-events-none"
            style={{
              left: `${pct * 100}%`,
              width: `${(previewPct - pct) * 100}%`,
            }}
          />
        )}

        {/* 拖拽预览（比悬停预览更深一些） */}
        {dragging && previewPct > pct && (
          <div
            className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/40 pointer-events-none"
            style={{
              left: `${pct * 100}%`,
              width: `${(previewPct - pct) * 100}%`,
            }}
          />
        )}

        {/* 拖拽圆点（hover / drag 时放大） */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.35)] ring-2 ring-white/90 dark:ring-white/80"
          style={{
            left: `${pct * 100}%`,
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            background: "linear-gradient(135deg, #ffffff 0%, #f5f5f7 100%)",
            transition: dragging
              ? "width 80ms ease, height 80ms ease"
              : "width 160ms cubic-bezier(.2,.8,.2,1), height 160ms cubic-bezier(.2,.8,.2,1)",
          }}
          aria-hidden="true"
        />
      </div>

      {/* 时间标签：左侧已播放，右侧剩余时长（带负号）。
          亮色下用深灰，深色下用半透明白，保证两种主题都可读。 */}
      <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums tracking-tight text-neutral-700/80 dark:text-white/60 font-medium">
        <span>
          {formatTime(dragging ? (dragPct ?? 0) * total : currentTime)}
        </span>
        <span>-{formatTime(Math.max(0, total - currentTime))}</span>
      </div>
    </div>
  );
}