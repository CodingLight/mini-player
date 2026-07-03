import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { PlayerProvider } from "../src/context/PlayerContext.jsx";
import { usePlayer } from "../src/context/usePlayer.js";

// 简易 wrapper：让 renderHook 能在 <PlayerProvider> 内调用 usePlayer
function wrapper({ children }) {
  return <PlayerProvider>{children}</PlayerProvider>;
}

// PlayerContext 单元测试
// 覆盖：初始状态、load、toggle、next/prev（含 3 秒规则）、
//       selectIndex 自动播放、seek 与 setVolume 的钳制、
//       markPlayed 幂等性、已播放记录跨操作保留

describe("PlayerContext", () => {
  beforeEach(() => {
    // renderHook 每次调用都会创建独立的 Provider，无需重置
  });

  it("初始状态为空", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    expect(result.current.tracks).toEqual([]);
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.volume).toBeGreaterThan(0);
    expect(result.current.played.size).toBe(0);
  });

  it("load() 注入列表并默认选中第一首", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => {
      result.current.load([
        { id: "a", title: "A", artist: "x", duration: 100, src: "/a.mp3" },
        { id: "b", title: "B", artist: "x", duration: 200, src: "/b.mp3" },
      ]);
    });
    expect(result.current.tracks).toHaveLength(2);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentTrack?.id).toBe("a");
  });

  it("toggle 翻转 isPlaying", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => result.current.toggle());
    expect(result.current.isPlaying).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.isPlaying).toBe(false);
  });

  it("next() 前进并在末尾循环回第一首", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => {
      result.current.load([
        { id: "a", title: "A", artist: "x", duration: 100, src: "/a.mp3" },
        { id: "b", title: "B", artist: "x", duration: 100, src: "/b.mp3" },
      ]);
    });
    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(1);
    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(0); // 末尾循环
  });

  it("prev() 在 3 秒内回到上一首，超过 3 秒则重置当前曲", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => {
      result.current.load([
        { id: "a", title: "A", artist: "x", duration: 100, src: "/a.mp3" },
        { id: "b", title: "B", artist: "x", duration: 100, src: "/b.mp3" },
      ]);
      result.current.selectIndex(1); // 选中 B
    });
    act(() => result.current.setCurrentTime(10)); // 超过 3 秒
    act(() => result.current.prev());
    expect(result.current.currentIndex).toBe(1); // 仍在 B
    expect(result.current.currentTime).toBe(0);  // 重置进度

    act(() => result.current.selectIndex(1));
    act(() => result.current.setCurrentTime(1)); // 不满 3 秒
    act(() => result.current.prev());
    expect(result.current.currentIndex).toBe(0); // 回到 A
  });

  it("selectIndex() 切换并自动播放", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => {
      result.current.load([
        { id: "a", title: "A", artist: "x", duration: 100, src: "/a.mp3" },
        { id: "b", title: "B", artist: "x", duration: 100, src: "/b.mp3" },
      ]);
    });
    act(() => result.current.selectIndex(1));
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isPlaying).toBe(true);
  });

  it("seek() 被钳制到 [0, duration]", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => {
      result.current.load([
        { id: "a", title: "A", artist: "x", duration: 100, src: "/a.mp3" },
      ]);
      result.current.setDuration(100);
    });
    act(() => result.current.seek(50));
    expect(result.current.currentTime).toBe(50);
    act(() => result.current.seek(9999));
    expect(result.current.currentTime).toBe(100); // 上限
    act(() => result.current.seek(-5));
    expect(result.current.currentTime).toBe(0); // 下限
  });

  it("setVolume() 被钳制到 0..1", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => result.current.setVolume(2));
    expect(result.current.volume).toBe(1);
    act(() => result.current.setVolume(-1));
    expect(result.current.volume).toBe(0);
    act(() => result.current.setVolume(0.42));
    expect(result.current.volume).toBeCloseTo(0.42);
  });

  it("markPlayed() 是幂等的", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => {
      result.current.load([
        { id: "a", title: "A", artist: "x", duration: 100, src: "/a.mp3" },
      ]);
      result.current.markPlayed(0);
      result.current.markPlayed(0);
    });
    expect(result.current.played.size).toBe(1);
  });

  it("已播放标记在动作之间保持", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => {
      result.current.load([
        { id: "a", title: "A", artist: "x", duration: 100, src: "/a.mp3" },
        { id: "b", title: "B", artist: "x", duration: 100, src: "/b.mp3" },
      ]);
      result.current.markPlayed(0);
    });
    expect(result.current.played.has(0)).toBe(true);
    expect(result.current.played.has(1)).toBe(false);
  });

  it("setShuffleOn 切换随机开关", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    expect(result.current.shuffleOn).toBe(false);
    act(() => result.current.setShuffleOn(true));
    expect(result.current.shuffleOn).toBe(true);
    act(() => result.current.setShuffleOn(false));
    expect(result.current.shuffleOn).toBe(false);
  });

  it("cycleRepeat 在 off / all / one 之间循环", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    // 初始为 all
    expect(result.current.repeatMode).toBe("all");
    act(() => result.current.cycleRepeat());
    expect(result.current.repeatMode).toBe("one");
    act(() => result.current.cycleRepeat());
    expect(result.current.repeatMode).toBe("off");
    act(() => result.current.cycleRepeat());
    expect(result.current.repeatMode).toBe("all");
  });

  it("随机模式下 next() 跳到非当前曲目", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => {
      result.current.load([
        { id: "a", title: "A", artist: "x", duration: 100, src: "/a.mp3" },
        { id: "b", title: "B", artist: "x", duration: 100, src: "/b.mp3" },
        { id: "c", title: "C", artist: "x", duration: 100, src: "/c.mp3" },
        { id: "d", title: "D", artist: "x", duration: 100, src: "/d.mp3" },
      ]);
      result.current.setShuffleOn(true);
    });
    // 多次运行 next() 一定不会停在原曲目
    for (let i = 0; i < 20; i++) {
      const before = result.current.currentIndex;
      act(() => result.current.next());
      expect(result.current.currentIndex).not.toBe(before);
    }
  });

  it("关循环 + 末尾时 next() 保持原 index", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => {
      result.current.load([
        { id: "a", title: "A", artist: "x", duration: 100, src: "/a.mp3" },
        { id: "b", title: "B", artist: "x", duration: 100, src: "/b.mp3" },
      ]);
      // 关循环
      result.current.cycleRepeat(); // all -> one
      result.current.cycleRepeat(); // one -> off
      result.current.selectIndex(1);
    });
    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(1); // 末尾不再循环
  });
});