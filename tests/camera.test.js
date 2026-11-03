import test from "node:test";
import assert from "node:assert/strict";
import { solveCamera, CAMERA } from "../camera.js";

const view = { w: 844, h: 390 };
const bounds = { x: 200, y: 0, w: 440, h: 390 };

test("camera places the focus point at the anchor when there is room", () => {
  const cam = solveCamera({ focus: { x: 420, y: 195 }, viewport: view, anchor: { x: 290, y: 200 }, scale: 1.8, bounds: { x: -400, y: -300, w: 1700, h: 1000 } });
  assert.ok(Math.abs(420 * cam.scale + cam.tx - 290) < 1e-6);
  assert.ok(Math.abs(195 * cam.scale + cam.ty - 200) < 1e-6);
});

test("camera never lets the board leave the viewport (corners and edges)", () => {
  for (const focus of [{ x: 200, y: 0 }, { x: 640, y: 0 }, { x: 200, y: 390 }, { x: 640, y: 390 }]) {
    const cam = solveCamera({ focus, viewport: view, anchor: { x: 290, y: 200 }, scale: CAMERA.focusScale, bounds });
    const left = cam.tx + bounds.x * cam.scale, right = cam.tx + (bounds.x + bounds.w) * cam.scale;
    const top = cam.ty + bounds.y * cam.scale, bottom = cam.ty + (bounds.y + bounds.h) * cam.scale;
    // phần bàn cờ lớn hơn khung thì luôn phủ kín khung; nhỏ hơn thì nằm trọn trong khung
    if (bounds.w * cam.scale >= view.w) assert.ok(left <= 0 && right >= view.w); else assert.ok(left >= 0 && right <= view.w);
    if (bounds.h * cam.scale >= view.h) assert.ok(top <= 0 && bottom >= view.h); else assert.ok(top >= 0 && bottom <= view.h);
  }
});

test("zoom is clamped to a sane range and never below overview", () => {
  assert.equal(solveCamera({ focus: { x: 0, y: 0 }, viewport: view, anchor: { x: 0, y: 0 }, scale: 9 }).scale, CAMERA.maxScale);
  assert.equal(solveCamera({ focus: { x: 0, y: 0 }, viewport: view, anchor: { x: 0, y: 0 }, scale: 0.2 }).scale, 1);
});

test("focus zoom is gentle: more than follow zoom but never too close", () => {
  assert.ok(CAMERA.focusScale > CAMERA.followScale);
  assert.ok(CAMERA.focusScale <= 2.2);
  assert.ok(CAMERA.focusTilt >= CAMERA.followTilt && CAMERA.focusTilt < 60);
});
