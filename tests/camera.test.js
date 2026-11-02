import test from "node:test";
import assert from "node:assert/strict";
import { CAMERA, solveCamera, quadCenter, boundsFromPoints } from "../camera.js";

test("camera positions a landing tile at the requested anchor", () => {
  const result = solveCamera({
    focus: { x: 500, y: 300 },
    viewport: { w: 1000, h: 700 },
    anchor: { x: 380, y: 350 },
    scale: 1.5
  });
  assert.deepEqual(result, { tx: -370, ty: -100, scale: 1.5 });
  assert.equal(result.tx + 500 * result.scale, 380);
  assert.equal(result.ty + 300 * result.scale, 350);
});

test("camera clamps a zoomed board so it continues covering the viewport", () => {
  const bounds = { x: 0, y: 0, w: 1000, h: 700 };
  const viewport = { w: 600, h: 400 };
  const result = solveCamera({
    focus: { x: 10, y: 10 },
    viewport,
    anchor: { x: 300, y: 200 },
    scale: 1.8,
    bounds
  });
  assert.ok(result.tx <= 0);
  assert.ok(result.tx + bounds.w * result.scale >= viewport.w);
  assert.ok(result.ty <= 0);
  assert.ok(result.ty + bounds.h * result.scale >= viewport.h);
});

test("camera centers a zoomed board when its bounds are smaller than the viewport", () => {
  const result = solveCamera({
    focus: { x: 150, y: 100 },
    viewport: { w: 800, h: 600 },
    anchor: { x: 400, y: 300 },
    scale: 1.5,
    bounds: { x: 100, y: 50, w: 200, h: 100 }
  });
  assert.deepEqual(result, { tx: 100, ty: 150, scale: 1.5 });
});

test("camera scale stays within the supported range", () => {
  assert.equal(solveCamera({ focus:{x:0,y:0}, viewport:{w:100,h:100}, anchor:{x:0,y:0}, scale:9 }).scale, CAMERA.maxScale);
  assert.equal(solveCamera({ focus:{x:0,y:0}, viewport:{w:100,h:100}, anchor:{x:0,y:0}, scale:0.25 }).scale, 1);
});

test("camera computes the center of a projected tile from all four corners", () => {
  const projectedTile = [
    { x: 40, y: 28 },
    { x: 132, y: 39 },
    { x: 125, y: 112 },
    { x: 34, y: 101 }
  ];
  assert.deepEqual(quadCenter(projectedTile), { x: 82.75, y: 70 });
});

test("camera bounds use the real corners of a perspective-skewed board", () => {
  const projectedBoard = [
    { x: 120, y: 18 },
    { x: 760, y: 64 },
    { x: 724, y: 676 },
    { x: 84, y: 630 }
  ];
  assert.deepEqual(boundsFromPoints(projectedBoard), { x: 84, y: 18, w: 676, h: 658 });
  const viewport = { w: 390, h: 844 };
  const bounds = boundsFromPoints(projectedBoard);
  const result = solveCamera({
    focus: quadCenter(projectedBoard),
    viewport,
    anchor: { x: 160, y: 422 },
    scale: 1.8,
    bounds
  });
  assert.ok(result.tx <= 0);
  assert.ok(result.tx + (bounds.x + bounds.w) * result.scale >= viewport.w || bounds.w * result.scale <= viewport.w);
  assert.ok(result.ty <= 0);
  assert.ok(result.ty + (bounds.y + bounds.h) * result.scale >= viewport.h || bounds.h * result.scale <= viewport.h);
});
