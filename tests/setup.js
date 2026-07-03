// Vitest 全局测试设置
// 1. 引入 testing-library 匹配器（含 jest-dom 扩展）
// 2. 每个测试结束后清理已渲染的 DOM
// 3. 给 jsdom 补上组件依赖的浏览器 API（HTMLMediaElement / PointerEvent）

import "@testing-library/dom";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// 每个用例结束后卸载所有已渲染的 React 树，防止跨用例污染
afterEach(() => {
  cleanup();
});

// jsdom 没有完整实现 HTMLAudioElement 的 play() / pause()，
// 这里把 play() 改成返回 resolved Promise，让 useEffect 不报错。
if (
  typeof window !== "undefined" &&
  typeof window.HTMLMediaElement !== "undefined"
) {
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: function play() {
      return Promise.resolve();
    },
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: function pause() {},
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "load", {
    configurable: true,
    value: function load() {},
  });
}

// jsdom 缺 PointerEvent，这里只补出组件用到的字段
if (typeof window !== "undefined" && typeof window.PointerEvent === "undefined") {
  class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  window.PointerEvent = PointerEvent;
}

// jsdom 不实现 Pointer Capture API（setPointerCapture / releasePointerCapture），
// 测试里的 pointerDown 事件需要它；补成 no-op 即可。
if (typeof Element !== "undefined") {
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function () {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function () {};
  }
}