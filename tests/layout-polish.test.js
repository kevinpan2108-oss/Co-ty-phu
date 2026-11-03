import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../layout-polish.css", import.meta.url), "utf8");
const camera = await readFile(new URL("../camera.js", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("the readability stylesheet loads after the game board, HUD and deed styles", () => {
  const deal = html.indexOf("deal-ui.css?v=marmalade-dealflow-20261102");
  const polish = html.indexOf("layout-polish.css?v=marmalade-player-rail-20261103");
  assert.ok(deal >= 0 && polish > deal);
});

test("the board is enlarged while leaving a right-side transaction rail", () => {
  assert.match(css, /--S:min\(89cqh,73cqw,800px\)/);
  assert.match(css, /left:37\.5%/);
  assert.match(camera, /anchorX: 0\.22/);
});

test("the deal card is wider, taller and its key details use readable type sizes", () => {
  assert.match(css, /width:min\(27cqw,346px\)/);
  assert.match(css, /max-height:min\(50cqh,480px\)/);
  assert.match(css, /top:clamp\(266px,30cqh,300px\)/);
  assert.match(css, /\.deal-value-grid small \{[\s\S]*?font-size:9px/);
  assert.match(css, /\.deal-facts small \{[\s\S]*?font-size:8px/);
  assert.match(css, /\.deal-description \{\s*max-height:4\.1em/);
  assert.match(css, /flex:0 1 150px;[\s\S]*?max-width:150px/);
});

test("the roll dock is anchored at the bottom right instead of covering the board center", () => {
  assert.match(css, /#gameView \.hud-roll\s*\{\s*left:auto;\s*right:clamp/);
  assert.match(css, /#gameView \.roll-button\s*\{\s*min-width:clamp\(170px/);
});

test("rotated phone layout reserves a deed rail and keeps the roll control in the bottom-right corner", () => {
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /top:8px;\s*right:10px;\s*bottom:52px;/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /#gameView \.hud-roll\s*\{\s*left:auto;\s*right:10px/);
});

test("purchase certificates avoid repeating the district name and construction cost", () => {
  assert.match(app, /space\?\.group && !isPending/);
  assert.match(app, /space\?\.houseCost && !isPending/);
});

test("player dock is a compact vertical rail on the right for desktop and rotated phones", () => {
  assert.match(css, /#gameView \.players-panel\s*\{[\s\S]*?right:clamp\([\s\S]*?left:auto;[\s\S]*?width:min\(17cqw,224px\)/);
  assert.match(css, /#gameView \.player-position,[\s\S]*?#gameView \.player-metrics \{ display:none!important; \}/);
  assert.match(css, /@media\(max-height:560px\) and \(orientation:landscape\)[\s\S]*?right:10px;[\s\S]*?left:auto;/);
  assert.match(css, /@media\(max-width:620px\)[\s\S]*?right:10px;[\s\S]*?left:auto;/);
  assert.match(css, /#gameView \.deal-card \{\s*top:108px/);
});
