import { useCallback, useEffect, useRef } from "react";
import { usePlayer } from "../context/usePlayer.js";

// ============================================================================
// useAudioPlayer —— 桥接一个隐藏的 HTMLAudioElement 与 PlayerContext
// ----------------------------------------------------------------------------
// 只产生副作用，不渲染任何 UI。挂载一次即可（一般在 MusicPlayer 顶部）。
//
// 同步流程：
//   (1) 选中曲目变化时，设置 <audio>.src 并调用 .load()
//   (2) isPlaying 翻转时，调用 play() / pause()
//   (3) volume 变化时，同步到 <audio>.volume
//   (4) 订阅 timeupdate / loadedmetadata / ended，把数据回写到 context
//   (5) 监听 'mini-player:seek' window 事件，让进度条组件通过事件总线
//       触发跳转，而无需把 audio 引用穿透到 context 里
//
// 用 getAudio() 懒初始化 Audio 实例，是为了满足 react-hooks/refs 规则
// （该规则禁止在 render 阶段访问 ref.current）。
// ============================================================================

export function useAudioPlayer() {
  const {
    tracks,
    currentIndex,
    isPlaying,
    volume,
    repeatMode,
    setCurrentTime,
    setDuration,
    markPlayed,
    next,
    stop,
  } = usePlayer();

  const audioRef = useRef(null);
  // 本地 ref 镜像：让 ended 回调在闭包内仍能读到最新值，
  // 而不需要把 repeatMode 写进 effect 的依赖（避免重复绑定事件）。
  const repeatModeRef = useRef(repeatMode);

  // 懒获取 Audio 实例：第一次调用时才真正创建。
  const getAudio = useCallback(() => {
    if (audioRef.current === null && typeof Audio !== "undefined") {
      const a = new Audio();
      a.preload = "metadata"; // 只预加载元数据，不下载整段音频
      audioRef.current = a;
    }
    return audioRef.current;
  }, []);

  const track = currentIndex >= 0 ? tracks[currentIndex] : null;

  // (1) 选中曲目变化 → 重新加载音频源。
  useEffect(() => {
    if (!track) return;
    const audio = getAudio();
    if (!audio) return;
    // 用绝对 URL 比较，避免相对路径导致的重复 load。
    const abs = new URL(track.src, window.location.origin).href;
    if (audio.src !== abs) {
      audio.src = track.src;
      audio.load();
      setCurrentTime(0);
      setDuration(0);
      if (currentIndex >= 0) markPlayed(currentIndex);
    }
  }, [track, currentIndex, getAudio, setCurrentTime, setDuration, markPlayed]);

  // (2) 播放状态变化 → 镜像到 <audio>.play() / pause()。
  useEffect(() => {
    if (!track) return;
    const audio = getAudio();
    if (!audio) return;
    if (isPlaying) {
      // play() 返回 Promise，浏览器自动播放策略可能 reject，这里静默吞掉。
      const p = audio.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, track, getAudio]);

  // (3) 音量变化 → 同步到 <audio>.volume。
  useEffect(() => {
    const audio = getAudio();
    if (!audio) return;
    audio.volume = volume;
  }, [volume, getAudio]);

  // 把 ended 处理函数放进 ref，让监听器稳定挂载一次，
  // 内部仍能读到最新的 currentIndex / tracks / repeatMode 快照。
  const onEndRef = useRef(() => {});
  useEffect(() => {
    onEndRef.current = () => {
      const audio = getAudio();
      if (!audio) return;
      // 单曲循环：把进度归零并继续播放
      if (repeatModeRef.current === "one") {
        audio.currentTime = 0;
        const p = audio.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
        return;
      }
      // 关循环 + 末尾：主动 stop 同步 UI 状态
      if (
        repeatModeRef.current === "off" &&
        currentIndex === tracks.length - 1
      ) {
        stop();
        return;
      }
      // 其余情况（关循环非末尾 / 列表循环 / 随机）→ 切到下一首
      next();
    };
  }, [getAudio, currentIndex, tracks, next, stop]);

  // (4) 订阅音频元素的原生事件，把数据写回 context。
  useEffect(() => {
    const audio = getAudio();
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => onEndRef.current();
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [getAudio, setCurrentTime, setDuration]);

  // 同步 repeatMode 到本地 ref，供 ended 回调读取。
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  // (5) 监听 window 上的 seek 事件，让 ProgressBar 可以命令式地跳进度。
  useEffect(() => {
    const audio = getAudio();
    if (!audio) return;
    const onSeek = (e) => {
      const t = Number(e.detail);
      if (Number.isFinite(t)) audio.currentTime = t;
    };
    window.addEventListener("mini-player:seek", onSeek);
    return () => window.removeEventListener("mini-player:seek", onSeek);
  }, [getAudio]);

  return audioRef;
}