import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
const layoutCss = css.slice(css.lastIndexOf("Marmalade-inspired tabletop layout"));
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const e2eSource = await readFile(new URL("./e2e/two-player.cjs", import.meta.url), "utf8");

test("Marmalade-inspired presentation uses a mild perspective and square board", () => {
  assert.match(layoutCss, /--rx:8deg/);
  assert.match(layoutCss, /--rz:0deg/);
  assert.match(layoutCss, /perspective\(1500px\) rotateX\(var\(--rx\)\) rotateZ\(var\(--rz\)\)/);
  assert.doesNotMatch(layoutCss, /--rx:60deg/);
  assert.doesNotMatch(layoutCss, /--rz:-45deg/);
});

test("tile names face outward along all four board edges", () => {
  assert.match(css, /\.space\.side-top \.space-text\{transform:translate\(-50%,-50%\) rotate\(180deg\)\}/);
  assert.match(css, /\.space\.side-left \.space-text,[\s\S]*?rotate\(-90deg\)/);
  assert.match(css, /\.space\.side-right \.space-text\{transform:translate\(-50%,-50%\) rotate\(90deg\)\}/);
  assert.match(css, /\.space\.side-bottom \.space-text\{transform:translate\(-50%,-50%\)\}/);
});

test("player HUD is a vertical rail and the Mekong city scene is visible", () => {
  assert.match(css, /#gameView \.players-panel\{\s*display:flex;\s*flex-direction:column/);
  assert.match(css, /#gameView \.board-center \.scene\{\s*display:block!important/);
  assert.match(html, /class="mekong-city"/);
  assert.match(html, /<div class="hud-top">\s*<div id="playersPanel" class="players-panel"><\/div>\s*<\/div>\s*<div class="room-pill">/);
});

test("visual redesign does not change the game script or add per-tile models", () => {
  assert.match(html, /app\.js\?v=marmalade-camera-city-mobile3/);
  assert.match(html, /style\.css\?v=marmalade-camera-city-mobile3/);
  assert.doesNotMatch(html, /space-model/);
});

test("camera measures actual perspective quads instead of the axis-aligned board rectangle", async () => {
  const camera = await readFile(new URL("../camera.js", import.meta.url), "utf8");
  assert.match(camera, /getBoxQuads\?\.\(\{ box: "border" \}\)/);
  assert.match(camera, /quadCenter\(readQuad\(cell\)\)/);
  assert.match(camera, /boundsFromPoints\(projectedCorners\)/);
  assert.match(camera, /camera-geometry-marker/);
});

test("the riverside centerpiece has layered road, quay, lantern and pier details", () => {
  assert.match(html, /class="city-street"/);
  assert.match(html, /class="city-market"/);
  assert.match(html, /class="city-quay"/);
  assert.match(html, /class="city-lanterns"/);
  assert.match(html, /class="city-boat"/);
  assert.match(html, /id="townShadow"/);
});

test("portrait and landscape mobile layouts keep their own responsive board and HUD sizing", () => {
  assert.match(css, /@media\(max-width:900px\) and \(orientation:portrait\)/);
  assert.match(css, /@media\(max-width:900px\) and \(orientation:landscape\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(e2eSource, /inspectMobileOrientation\(w, h, "portrait"/);\n  assert.match(e2eSource, /inspectMobileOrientation\(h, w, "landscape"/);
});
