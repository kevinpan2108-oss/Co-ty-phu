import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const hud = await readFile(new URL("../hud-redesign.css", import.meta.url), "utf8");

test("the redesigned HUD stylesheet loads after the board theme", () => {
  const boardTheme = html.indexOf("style.css?v=marmalade-board-20261102");
  const hudTheme = html.indexOf("hud-redesign.css?v=marmalade-hud-20261102");
  assert.ok(boardTheme >= 0 && hudTheme > boardTheme);
});

test("player information includes cash, position, asset count and developed assets", () => {
  assert.match(app, /const ownedAssets = Object\.entries\(roomState\.propertyOwners \|\| \{\}\)/);
  assert.match(app, /const developedAssets = ownedAssets\.filter/);
  assert.match(app, /class="player-cash"/);
  assert.match(app, /class="player-position"/);
  assert.match(app, /class="player-metrics"/);
  assert.match(app, /tài sản/);
  assert.match(app, /có nhà/);
});

test("player rail and event panel use separate readable cards", () => {
  assert.match(hud, /\.players-panel\s*\{[\s\S]*?flex-direction: column/);
  assert.match(hud, /\.player-card\.active\s*\{[\s\S]*?background:/);
  assert.match(hud, /\.event-panel,\s*#gameView \.event-panel\.idle\s*\{[\s\S]*?right:/);
  assert.match(hud, /\.ep-head\s*\{[\s\S]*?background:/);
  assert.match(hud, /\.cell-info\s*\{[\s\S]*?background: #fffdf6/);
});

test("the player and event cards have compact landscape and phone breakpoints", () => {
  assert.match(hud, /max-height: 560px\) and \(orientation: landscape\)/);
  assert.match(hud, /max-width: 620px/);
  assert.match(hud, /max-width: 420px/);
});
