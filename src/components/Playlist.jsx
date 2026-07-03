import { useEffect, useMemo, useState } from "react";
import { usePlayer } from "../context/usePlayer.js";
import { paletteFor } from "../utils/palette.js";
import { formatTime } from "../utils/formatTime.js";

// ============================================================================
// 播放列表组件
// ----------------------------------------------------------------------------
// 加载 /public/songs/manifest.json 并渲染曲目列表：
//   - 当前曲目：用三段均衡器替代时长，并高亮 + 粉橙渐变描边
//   - 已播放曲目：标题与时长变暗（表示已听过）
//   - 未播放曲目：正常显示
// 整列可纵向滚动，超长列表也不会撑破布局。
// ============================================================================

// 当前曲目右侧的动画三段均衡器。三条柱用错位动画模拟律动。
function Equalizer({ playing }) {
  return (
    <span className="inline-flex items-end gap-[2px] h-3.5 w-3.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-[2px] rounded-sm bg-pink-400"
          style={{
            animation: playing
              ? `eq${i} 900ms ease-in-out ${i * 120}ms infinite alternate`
              : "none",
            height: playing ? undefined : "30%",
          }}
        />
      ))}
      <style>{`
        @keyframes eq0 { 0% { height: 35%; } 100% { height: 95%; } }
        @keyframes eq1 { 0% { height: 60%; } 100% { height: 25%; } }
        @keyframes eq2 { 0% { height: 80%; } 100% { height: 45%; } }
      `}</style>
    </span>
  );
}

// 没有真实专辑封面时，用曲目派生色板 + 首字母生成一个迷你"封面"。
// 这样每首歌都有独立的视觉身份。
function ArtSwatch({ track, size = 36 }) {
  const [c1, c2, c3] = paletteFor(track);
  const initial = (track.title || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className="relative shrink-0 rounded-md overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${c1}, ${c2} 60%, ${c3})`,
      }}
    >
      <span className="absolute inset-0 grid place-items-center text-white/95 font-semibold text-sm tracking-tight">
        {initial}
      </span>
      <span
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 55%)",
        }}
      />
    </div>
  );
}

export default function Playlist() {
  const {
    tracks,
    currentIndex,
    isPlaying,
    played,
    selectIndex,
    load,
  } = usePlayer();
  const [loadError, setLoadError] = useState(null);

  // 挂载时加载播放列表清单。
  // 静态托管没有目录列表接口，所以通过 manifest.json 这个约定来对接
  // 构建产物和播放器 UI。cancelled 标志位防止组件卸载后还写 state。
  useEffect(() => {
    let cancelled = false;
    fetch("/songs/manifest.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.tracks) ? data.tracks : [];
        load(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message || "加载播放列表失败");
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // 列表总时长（仅用于头部展示）。
  const totalDuration = useMemo(
    () => tracks.reduce((sum, t) => sum + (t.duration || 0), 0),
    [tracks],
  );

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-3xl bg-white/55 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.12)] overflow-hidden">
      {/* 列表头 */}
      <header className="flex items-baseline justify-between px-6 pt-6 pb-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            即将播放
          </h2>
          <p className="text-xs text-neutral-500 dark:text-white/50 mt-0.5">
            {tracks.length} 首 · {formatTime(totalDuration)}
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 dark:text-white/30">
          队列
        </span>
      </header>

      {/* 列表主体（可纵向滚动） */}
      <div className="px-3 pb-3 overflow-y-auto min-h-0 flex-1 playlist-scroll">
        {loadError && (
          <div className="m-3 rounded-xl border border-red-300/40 bg-red-100/40 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
            无法加载播放列表：{loadError}
          </div>
        )}

        {!loadError && tracks.length === 0 && (
          <div className="m-3 rounded-xl bg-white/40 dark:bg-white/5 px-3 py-6 text-center text-xs text-neutral-500 dark:text-white/50">
            加载曲目中…
          </div>
        )}

        <ul className="flex flex-col gap-1">
          {tracks.map((track, i) => {
            const active = i === currentIndex;
            const wasPlayed = played.has(i) && !active;
            return (
              <li key={track.id || i}>
                <button
                  type="button"
                  onClick={() => selectIndex(i)}
                  aria-current={active ? "true" : undefined}
                  data-active={active ? "true" : "false"}
                  data-index={i}
                  className={[
                    "group w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-all duration-200",
                    // 当前曲目：粉橙渐变背景 + 白色描边
                    active
                      ? "bg-gradient-to-r from-pink-500/20 via-orange-400/15 to-transparent ring-1 ring-white/40 dark:ring-white/15"
                      : // 已播放曲目：偏暗背景
                      wasPlayed
                      ? "bg-white/30 dark:bg-white/[0.03] hover:bg-white/60 dark:hover:bg-white/[0.06]"
                      : // 未播放：透明背景，hover 时浮起
                        "hover:bg-white/60 dark:hover:bg-white/[0.05]",
                  ].join(" ")}
                >
                  <ArtSwatch track={track} />

                  <div className="min-w-0 flex-1">
                    <div
                      className={[
                        "truncate text-[14px] font-medium tracking-tight",
                        active
                          ? "text-pink-600 dark:text-pink-300"
                          : wasPlayed
                          ? "text-neutral-500 dark:text-white/45"
                          : "text-neutral-900 dark:text-white/90",
                      ].join(" ")}
                    >
                      {track.title}
                    </div>
                    <div className="truncate text-[11px] text-neutral-500 dark:text-white/45 mt-0.5">
                      {track.artist}
                    </div>
                  </div>

                  {/* 右侧：当前曲目显示均衡器，否则显示总时长 */}
                  <div className="flex items-center gap-3 shrink-0">
                    {active ? (
                      <Equalizer playing={isPlaying} />
                    ) : (
                      <span
                        className={[
                          "text-[11px] tabular-nums",
                          wasPlayed
                            ? "text-neutral-400 dark:text-white/30"
                            : "text-neutral-500 dark:text-white/40",
                        ].join(" ")}
                      >
                        {formatTime(track.duration)}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}