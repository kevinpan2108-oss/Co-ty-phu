import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("Marmalade-inspired presentation uses a mild perspective and square board", () => {
  assert.match(css, /--rx:8deg/);
  assert.match(css, /--rz:0deg/);
  assert.match(css, /perspective\(1500px\) rotateX\(var\(--rx\)\) rotateZ\(var\(--rz\)\)/);
  assert.doesNotMatch(css, /--rx:60deg/);
  assert.doesNotMatch(css, /--rz:-45deg/);
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
});

test("visual redesign does not change the game script or add per-tile models", () => {
  assert.match(html, /app\.js\?v=marmalade-board-ui1/);
  assert.doesNotMatch(html, /space-model/);
});
