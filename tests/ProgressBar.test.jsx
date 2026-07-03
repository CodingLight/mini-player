import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { PlayerProvider } from "../src/context/PlayerContext.jsx";
import { usePlayer } from "../src/context/usePlayer.js";
import ProgressBar from "../src/components/ProgressBar.jsx";

// 把 <ProgressBar/> 渲染到带预置数据（单首曲目 + 已知 duration）的 Provider 内。
// 返回渲染容器 + 一个读取状态的 getState 闭包。
function renderBar({ duration = 100, currentTime = 0 } = {}) {
  let api;
  function Capture() {
    api = usePlayer();
    return null;
  }
  const utils = render(
    <PlayerProvider>
      <Capture />
      <ProgressBar />
    </PlayerProvider>,
  );

  act(() => {
    api.load([
      { id: "a", title: "A", artist: "x", duration, src: "/a.mp3" },
    ]);
    api.setDuration(duration);
    api.setCurrentTime(currentTime);
  });

  return { ...utils, getState: () => api };
}

// jsdom 不会真正布局，给轨道伪造一个 200px 宽的 rect 给 pointToPct 用
function getTrackRect(el) {
  const w = 200;
  el.getBoundingClientRect = () => ({
    left: 0,
    right: w,
    top: 0,
    bottom: 10,
    width: w,
    height: 10,
    x: 0,
    y: 0,
    toJSON() {},
  });
  return w;
}

// ProgressBar 单元测试
// 覆盖：渲染时间、点击跳转、点击 / 拖拽派发 seek 事件、
//       拖拽松手跳转、键盘方向键 / Home / End、空格不应触发 toggle
describe("ProgressBar", () => {
  beforeEach(() => {
    // jsdom 缺 pointer capture，polyfill 成 no-op
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = function () {};
      Element.prototype.releasePointerCapture = function () {};
    }
  });

  it("渲染已播放时间与剩余时间", () => {
    const { getByText } = renderBar({ duration: 200, currentTime: 30 });
    expect(getByText("0:30")).toBeInTheDocument();
    expect(getByText("-2:50")).toBeInTheDocument(); // 200 - 30 = 170 = 2:50
  });

  it("点击轨道跳转到该位置", () => {
    const { container, getState } = renderBar({ duration: 100 });
    const track = container.querySelector('[role="slider"]');
    const w = getTrackRect(track);
    fireEvent.click(track, { clientX: w / 2, clientY: 5 });
    expect(getState().currentTime).toBe(50);
  });

  it("点击会派发 mini-player:seek 事件，让 <audio> 跟随", () => {
    const { container } = renderBar({ duration: 100 });
    const track = container.querySelector('[role="slider"]');
    const w = getTrackRect(track);
    const seen = [];
    const handler = (e) => seen.push(e.detail);
    window.addEventListener("mini-player:seek", handler);
    fireEvent.click(track, { clientX: w * 0.4, clientY: 5 });
    window.removeEventListener("mini-player:seek", handler);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(40);
  });

  it("拖拽松手时派发 mini-player:seek 事件，detail 是最终位置", () => {
    const { container } = renderBar({ duration: 200 });
    const track = container.querySelector('[role="slider"]');
    const w = getTrackRect(track);
    const seen = [];
    const handler = (e) => seen.push(e.detail);
    window.addEventListener("mini-player:seek", handler);

    act(() => {
      fireEvent.pointerDown(track, { clientX: w * 0.25, pointerId: 1 });
      fireEvent.pointerMove(track, { clientX: w * 0.6, pointerId: 1 });
    });
    fireEvent.pointerUp(track, { clientX: w * 0.6, pointerId: 1 });

    window.removeEventListener("mini-player:seek", handler);
    // 只在松手时派发一次，detail = 60% × 200s = 120s
    expect(seen).toEqual([120]);
  });

  it("从 25% 拖到 75%，松手跳到 75%", () => {
    const { container, getState } = renderBar({ duration: 100 });
    const track = container.querySelector('[role="slider"]');
    const w = getTrackRect(track);

    act(() => {
      fireEvent.pointerDown(track, { clientX: w * 0.25, pointerId: 1 });
      fireEvent.pointerMove(track, { clientX: w * 0.75, pointerId: 1 });
    });
    // 拖拽预览时间只是 UI 提示，真正的 seek 在 pointerUp 触发
    fireEvent.pointerUp(track, { clientX: w * 0.75, pointerId: 1 });
    expect(getState().currentTime).toBe(75);
  });

  it("键盘方向键 / Home / End 控制进度", () => {
    const { container, getState } = renderBar({
      duration: 200,
      currentTime: 50,
    });
    const track = container.querySelector('[role="slider"]');
    fireEvent.keyDown(track, { key: "ArrowRight" });
    expect(getState().currentTime).toBe(55);
    fireEvent.keyDown(track, { key: "ArrowLeft" });
    expect(getState().currentTime).toBe(50);
    fireEvent.keyDown(track, { key: "Home" });
    expect(getState().currentTime).toBe(0);
    fireEvent.keyDown(track, { key: "End" });
    expect(getState().currentTime).toBe(200);
  });

  it("焦点在进度条上时，空格不应触发 toggle", () => {
    const toggleSpy = vi.fn();
    function Capture() {
      const p = usePlayer();
      const orig = p.toggle;
      // 包一层用于检测调用
      p.toggle = (...args) => {
        toggleSpy();
        return orig(...args);
      };
      return null;
    }
    const { container } = render(
      <PlayerProvider>
        <Capture />
        <ProgressBar />
      </PlayerProvider>,
    );
    const track = container.querySelector('[role="slider"]');
    // ProgressBar 自己处理 keydown，空格的全局监听挂在 PlayerControls 上
    fireEvent.keyDown(track, { key: " " });
    expect(toggleSpy).not.toHaveBeenCalled();
  });
});