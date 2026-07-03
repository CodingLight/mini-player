import { describe, it, expect } from "vitest";
import {
  paletteFor,
  hashString,
  PALETTES,
} from "../src/utils/palette.js";

// palette 工具函数测试
// 覆盖：哈希确定性、返回值结构、调色板边界、空值兜底

describe("palette", () => {
  it("hashString 是确定性的", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });

  it("paletteFor 始终返回长度为 3 的色板", () => {
    const p = paletteFor({ title: "Lemon Balm" });
    expect(p).toHaveLength(3);
    p.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  });

  it("paletteFor 对相同标题返回相同色板", () => {
    expect(paletteFor({ title: "In Love" })).toEqual(
      paletteFor({ title: "In Love" }),
    );
  });

  it("返回值始终落在 PALETTES 列表内", () => {
    for (let i = 0; i < PALETTES.length; i++) {
      const p = paletteFor({ title: `__forced_${i}__` });
      // 哈希可能映射到任意下标，但结果一定来自精选色板列表
      const found = PALETTES.some(
        (pal) => pal[0] === p[0] && pal[1] === p[1] && pal[2] === p[2],
      );
      expect(found).toBe(true);
    }
  });

  it("标题为空 / 缺失时优雅兜底", () => {
    expect(paletteFor({})).toHaveLength(3);
    expect(paletteFor(null)).toHaveLength(3);
  });
});