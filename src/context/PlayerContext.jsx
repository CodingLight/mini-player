import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PlayerContext } from "./context.js";

// ============================================================================
// Context 数据结构说明
// ----------------------------------------------------------------------------
// 状态字段：
//   tracks           Track[]   播放列表（由 manifest.json 加载）
//   currentIndex     number    当前选中曲目的下标（-1 表示未选中）
//   isPlaying        boolean   音频是否在播放
//   currentTime      number    当前曲目已播放的秒数
//   duration         number    当前曲目的总时长（秒）
//   volume           number    音量，范围 0..1
//   played           Set<num>  本次会话中已被播放过的曲目下标集合
//   shuffleOn        boolean   随机播放开关（开启时 next 走随机选曲）
//   repeatMode       'off' | 'one' | 'all'
//                              循环模式：off = 不循环 / one = 单曲循环
//                              / all = 列表循环
//
// 动作方法：
//   load(tracks)               注入播放列表（挂载时调用一次）
//   toggle()                   播放 / 暂停切换
//   next()                     切到下一首（受 shuffle / repeat 模式影响）
//   prev()                     距起点超过 3 秒则重置当前曲目，否则切到上一首
//   seek(seconds)              跳转到指定时间
//   selectIndex(i)             切换选中曲目（同时自动播放）
//   setVolume(v)               设置音量（0..1）
//   setShuffleOn(b)            开启 / 关闭随机播放
//   cycleRepeat()              off → all → one → off 循环切换
//   setDuration(seconds)       内部方法：由 useAudioPlayer 上报元数据
//   setCurrentTime(seconds)    内部方法：由 useAudioPlayer 上报 timeupdate
//
// 设计原则：状态全部保存在 Provider 里（纯数据），<audio> 元素由
// useAudioPlayer hook 负责管理与同步。
// ============================================================================

export function PlayerProvider({ children, initialTracks = [] }) {
  const [tracks, setTracks] = useState(initialTracks);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTimeState] = useState(0);
  const [duration, setDurationState] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [played, setPlayed] = useState(() => new Set());
  const [shuffleOn, setShuffleOnState] = useState(false);
  // 循环模式：'off' 不循环 / 'all' 列表循环 / 'one' 单曲循环
  const [repeatMode, setRepeatMode] = useState("all");

  // stateRef 让异步的音频回调能读到"最新"状态值，
  // 又不会触发额外渲染。每次渲染后通过下面的 effect 同步更新。
  const stateRef = useRef({
    tracks,
    currentIndex,
    isPlaying,
    volume,
    duration,
    currentTime,
    shuffleOn,
    repeatMode,
  });
  useEffect(() => {
    stateRef.current = {
      tracks,
      currentIndex,
      isPlaying,
      volume,
      duration,
      currentTime,
      shuffleOn,
      repeatMode,
    };
  }, [
    tracks,
    currentIndex,
    isPlaying,
    volume,
    duration,
    currentTime,
    shuffleOn,
    repeatMode,
  ]);

  // 记录已被播放过的曲目下标（幂等）。
  const markPlayed = useCallback((i) => {
    setPlayed((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }, []);

  // 加载播放列表。如果之前还没有选中曲目，自动选中第一首。
  const load = useCallback((next) => {
    setTracks(next);
    if (next.length && stateRef.current.currentIndex < 0) {
      setCurrentIndex(0);
    }
  }, []);

  // 播放 / 暂停切换。
  const toggle = useCallback(() => setIsPlaying((p) => !p), []);

  // 切到下一首。受 shuffle / repeat 模式影响：
  //   - shuffleOn:从全部曲目中均匀随机选一首（不重复选同一首）
  //   - repeatMode === 'all': 末尾循环回第一首
  //   - repeatMode === 'off': 走到末尾就停在最后一首（由 useAudioPlayer 触发停止）
  const next = useCallback(() => {
    setCurrentTimeState(0);
    setCurrentIndex((i) => {
      const len = stateRef.current.tracks.length;
      if (len === 0) return -1;
      const { shuffleOn: shuf, repeatMode: rep } = stateRef.current;
      if (shuf) {
        // 随机模式：从除当前以外的所有曲目中随机选一首；
        // 只有一首时也允许重播。
        if (len === 1) return 0;
        let nextIdx;
        do {
          nextIdx = Math.floor(Math.random() * len);
        } while (nextIdx === i);
        return nextIdx;
      }
      if (i < 0) return 0;
      const nextIdx = i + 1;
      if (nextIdx >= len) {
        // 末尾：根据 repeat 模式决定循环回第一首还是停在末尾
        return rep === "all" ? 0 : i;
      }
      return nextIdx;
    });
  }, []);

  // 切到上一首。复刻苹果音乐行为：超过 3 秒则重置当前曲目，
  // 否则才真正切到上一首。
  const prev = useCallback(() => {
    if (stateRef.current.currentTime > 3) {
      setCurrentTimeState(0);
      return;
    }
    setCurrentTimeState(0);
    setCurrentIndex((i) => {
      if (i <= 0) return Math.max(0, stateRef.current.tracks.length - 1);
      return i - 1;
    });
  }, []);

  // 跳转到指定时间（秒），会被钳制在 [0, duration] 区间内。
  const seek = useCallback((seconds) => {
    setCurrentTimeState(
      Math.max(0, Math.min(seconds, stateRef.current.duration || seconds)),
    );
  }, []);

  // 选中指定曲目并自动开始播放。
  const selectIndex = useCallback((i) => {
    setCurrentTimeState(0);
    setCurrentIndex(i);
    setIsPlaying(true);
  }, []);

  // 设置音量，会被钳制到 0..1。
  const setVolume = useCallback((v) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);

  // 切换随机播放开关。
  const setShuffleOn = useCallback((b) => setShuffleOnState(Boolean(b)), []);

  // 循环模式三档切换：off → all → one → off
  const cycleRepeat = useCallback(() => {
    setRepeatMode((m) => (m === "off" ? "all" : m === "all" ? "one" : "off"));
  }, []);

  // 主动停止播放（不切歌、不重置进度）。
  const stop = useCallback(() => setIsPlaying(false), []);

  // 由 useAudioPlayer 上报 audio.duration（来自 loadedmetadata 事件）。
  const setDuration = useCallback((s) => {
    setDurationState(Number.isFinite(s) && s > 0 ? s : 0);
  }, []);

  // 由 useAudioPlayer 上报 audio.currentTime（来自 timeupdate 事件）。
  const setCurrentTime = useCallback((s) => {
    setCurrentTimeState(Math.max(0, Number.isFinite(s) ? s : 0));
  }, []);

  // 暴露给消费者的上下文值，用 useMemo 减少不必要的重渲染。
  const value = useMemo(
    () => ({
      // 状态
      tracks,
      currentIndex,
      currentTrack: currentIndex >= 0 ? tracks[currentIndex] : null,
      isPlaying,
      currentTime,
      duration,
      volume,
      played,
      shuffleOn,
      repeatMode,
      // 动作
      load,
      toggle,
      next,
      prev,
      seek,
      selectIndex,
      setVolume,
      setShuffleOn,
      cycleRepeat,
      stop,
      setDuration,
      setCurrentTime,
      markPlayed,
    }),
    [
      tracks,
      currentIndex,
      isPlaying,
      currentTime,
      duration,
      volume,
      played,
      shuffleOn,
      repeatMode,
      load,
      toggle,
      next,
      prev,
      seek,
      selectIndex,
      setVolume,
      setShuffleOn,
      cycleRepeat,
      stop,
      setDuration,
      setCurrentTime,
      markPlayed,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}