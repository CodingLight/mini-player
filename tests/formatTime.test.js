import { describe, it, expect } from "vitest";
import { formatTime } from "../src/utils/formatTime.js";

// formatTime 单元测试
// 覆盖：基础格式、分钟进位、向下取整、非法输入、双位数补零

describe("formatTime", () => {
  it("格式化不足一分钟的秒数", () => {
    expect(formatTime(7)).toBe("0:07");
    expect(formatTime(45)).toBe("0:45");
  });

  it("正确处理分钟进位", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(125)).toBe("2:05");
  });

  it("对浮点秒数向下取整", () => {
    expect(formatTime(59.9)).toBe("0:59");
  });

  it("对非法输入返回 0:00", () => {
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(-10)).toBe("0:00");
    expect(formatTime(undefined)).toBe("0:00");
  });

  it("秒数始终两位补零", () => {
    expect(formatTime(61)).toBe("1:01");
    expect(formatTime(600)).toBe("10:00");
  });
});