// 精选的苹果音乐风格渐变色板。
// 每条色板是 3 个色值的数组，可直接用于 `background: linear-gradient(...)`
// 内联样式或 CSS 变量。
export const PALETTES = [
  ["#ff2d55", "#ff375f", "#ff9f0a"], // 桃粉 → 珊瑚
  ["#0a84ff", "#5e5ce6", "#bf5af2"], // 天蓝 → 靛蓝 → 紫罗兰
  ["#30d158", "#5ac8fa", "#64d2ff"], // 薄荷 → 青蓝
  ["#ff375f", "#ff9f0a", "#ffd60a"], // 日落
  ["#bf5af2", "#ff375f", "#ff9f0a"], // 品红黄昏
  ["#5e5ce6", "#0a84ff", "#64d2ff"], // 冷潮
  ["#ff9f0a", "#ff375f", "#ff2d55"], // 余烬
  ["#64d2ff", "#5e5ce6", "#0a84ff"], // 冰川
];

// 简单的确定性哈希函数：同一首曲目永远映射到同一组色板。
export function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

// 给定曲目返回其专属色板。无标题时退回 id，再退回兜底 "default"。
export function paletteFor(track) {
  const key = track?.title || track?.id || "default";
  const idx = hashString(key) % PALETTES.length;
  return PALETTES[idx];
}