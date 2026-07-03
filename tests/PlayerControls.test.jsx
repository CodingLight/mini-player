import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { PlayerProvider } from "../src/context/PlayerContext.jsx";
import { usePlayer } from "../src/context/usePlayer.js";
import PlayerControls from "../src/components/PlayerControls.jsx";

// 简易 setup：渲染 PlayerControls 并加载 N 条测试曲目
function setup(tracks = 3) {
  let api;
  function Capture() {
    api = usePlayer();
    return null;
  }
  const utils = render(
    <PlayerProvider>
      <Capture />
      <PlayerControls />
    </PlayerProvider>,
  );
  act(() => {
    api.load(
      Array.from({ length: tracks }).map((_, i) => ({
        id: `t${i}`,
        title: `Track ${i}`,
        artist: "Tester",
        duration: 100,
        src: `/t${i}.mp3`,
      })),
    );
  });
  return { ...utils, getState: () => api };
}

// PlayerControls 单元测试
// 覆盖：渲染播放按钮、播放/暂停切换、上一曲/下一曲、
//       静音切换、全局空格快捷键
describe("PlayerControls", () => {
  beforeEach(() => {
    // jsdom 不提供 Audio，polyfill 一份最小实现，
    // 让 useAudioPlayer 在挂载时不报错
    if (typeof window !== "undefined" && !window.Audio) {
      window.Audio = class {
        constructor() {
          this.src = "";
          this.volume = 1;
          this.currentTime = 0;
          this.duration = 0;
          this.preload = "";
          this.listeners = {};
        }
        addEventListener() {}
        removeEventListener() {}
        play() {
          return Promise.resolve();
        }
        pause() {}
        load() {}
      };
    }
  });

  it("暂停状态下渲染播放按钮", () => {
    const { getByLabelText } = setup();
    expect(getByLabelText("播放")).toBeInTheDocument();
  });

  it("点击切换播放 / 暂停", () => {
    const { getByLabelText, getState } = setup();
    const btn = getByLabelText("播放");
    fireEvent.click(btn);
    expect(getState().isPlaying).toBe(true);
    expect(getByLabelText("暂停")).toBeInTheDocument();
    fireEvent.click(getByLabelText("暂停"));
    expect(getState().isPlaying).toBe(false);
  });

  it("下一曲按钮前进", () => {
    const { getByLabelText, getState } = setup(3);
    fireEvent.click(getByLabelText("下一曲"));
    expect(getState().currentIndex).toBe(1);
  });

  it("上一曲按钮后退", () => {
    const { getByLabelText, getState } = setup(3);
    act(() => getState().selectIndex(2));
    act(() => getState().setCurrentTime(0));
    fireEvent.click(getByLabelText("上一曲"));
    expect(getState().currentIndex).toBe(1);
  });

  it("静音按钮切换音量", () => {
    const { getByLabelText, getState } = setup();
    fireEvent.click(getByLabelText("静音"));
    expect(getState().volume).toBe(0);
    fireEvent.click(getByLabelText("取消静音"));
    expect(getState().volume).toBeGreaterThan(0);
  });

  it("无输入框聚焦时，全局空格键切换播放", () => {
    const { getState } = setup();
    fireEvent.keyDown(window, { code: "Space" });
    expect(getState().isPlaying).toBe(true);
  });

  it("点击随机播放按钮可开启/关闭，并通过 aria-pressed 反馈", () => {
    const { getByLabelText, getState } = setup();
    const btn = getByLabelText("开启随机播放");
    expect(btn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(btn);
    expect(getState().shuffleOn).toBe(true);
    // 开启后 aria-label 也应切换成"关闭随机播放"，并 aria-pressed=true
    const onBtn = getByLabelText("关闭随机播放");
    expect(onBtn).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(onBtn);
    expect(getState().shuffleOn).toBe(false);
  });

  it("点击循环按钮循环切换 off / all / one", () => {
    const { getByLabelText, getState } = setup();
    // 初始 all
    expect(getState().repeatMode).toBe("all");
    fireEvent.click(getByLabelText("切换到单曲循环"));
    expect(getState().repeatMode).toBe("one");
    fireEvent.click(getByLabelText("关闭循环"));
    expect(getState().repeatMode).toBe("off");
    fireEvent.click(getByLabelText("开启循环"));
    expect(getState().repeatMode).toBe("all");
  });

  it("音量滑块：仅按下后才跟随鼠标移动，hover 不跟随", () => {
    const { getByLabelText, getState } = setup();
    const slider = getByLabelText("音量");
    // jsdom 没有 layout，给滑块伪造一个 200px 宽的矩形
    const w = 200;
    slider.getBoundingClientRect = () => ({
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
    const before = getState().volume;

    // 仅 pointerMove（无 pointerDown）不应改变音量
    fireEvent.pointerMove(slider, { clientX: w * 0.9, pointerId: 1 });
    expect(getState().volume).toBe(before);

    // pointerDown 后再 pointerMove 应跟随
    act(() => {
      fireEvent.pointerDown(slider, { clientX: w * 0.2, pointerId: 1 });
    });
    act(() => {
      fireEvent.pointerMove(slider, { clientX: w * 0.8, pointerId: 1 });
    });
    expect(getState().volume).toBeCloseTo(0.8);
    fireEvent.pointerUp(slider, { clientX: w * 0.8, pointerId: 1 });

    // 松手后再次 pointerMove 不应再改变音量
    const released = getState().volume;
    fireEvent.pointerMove(slider, { clientX: w * 0.1, pointerId: 2 });
    expect(getState().volume).toBe(released);
  });
});