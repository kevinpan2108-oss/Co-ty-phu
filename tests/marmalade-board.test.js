import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const finalBoardRules = css.slice(css.lastIndexOf("Marmalade-style board composition"));

test("board uses a near-overhead square composition", () => {
  assert.match(finalBoardRules, /--rx:9deg/);
  assert.match(finalBoardRules, /--rz:0deg/);
  assert.match(finalBoardRules, /perspective\(1500px\) rotateX\(var\(--rx\)\) rotateZ\(var\(--rz\)\)/);
  assert.match(finalBoardRules, /left:39\.5%/);
  assert.doesNotMatch(finalBoardRules, /--rz:-45deg/);
  assert.doesNotMatch(finalBoardRules, /--rx:60deg/);
});

test("center artwork is a visible original 3D city diorama", () => {
  assert.match(html, /<svg class="scene city-diorama" viewBox="0 0 720 560"/);
  assert.match(html, /id="city-ground"/);
  assert.match(html, /id="city-road"/);
  assert.match(html, /id="city-water"/);
  assert.match(html, /class="city-boat"/);
  assert.match(finalBoardRules, /\.board-center \.scene\{\s*display:block!important;[\s\S]*?opacity:1!important/);
});

test("player cards form a right-side vertical rail", () => {
  assert.match(finalBoardRules, /\.players-panel\{[\s\S]*?right:clamp\([\s\S]*?flex-direction:column/);
  assert.match(finalBoardRules, /\.player-card:last-child\{[\s\S]*?flex-direction:row/);
});

test("the 40-space perimeter and game controls remain in place", () => {
  assert.match(app, /function getBoardCoords\(index\)/);
  assert.match(app, /SPACE_DATA\.forEach\(\(space,index\) =>/);
  assert.match(app, /div\.dataset\.index = String\(index\)/);
  assert.match(html, /id="board"/);
  assert.match(html, /id="diceStage"/);
  assert.match(html, /id="interactionCard"/);
});

test("the redesigned board stylesheet has its own cache version", () => {
  assert.match(html, /style\.css\?v=marmalade-board-20261102/);
});
