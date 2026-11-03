import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const hud = await readFile(new URL("../hud-redesign.css", import.meta.url), "utf8");
const deal = await readFile(new URL("../deal-ui.css", import.meta.url), "utf8");
const polish = await readFile(new URL("../layout-polish.css", import.meta.url), "utf8");

test("the player HUD stylesheet loads after the board theme", () => {
  const boardTheme = html.indexOf("style.css?v=marmalade-dealflow-20261102");
  const hudTheme = html.indexOf("hud-redesign.css?v=marmalade-hud-20261102");
  const dealTheme = html.indexOf("deal-ui.css?v=marmalade-dealflow-20261102");
  const polishTheme = html.indexOf("layout-polish.css?v=marmalade-player-rail-20261103");
  assert.ok(boardTheme >= 0 && hudTheme > boardTheme && dealTheme > hudTheme && polishTheme > dealTheme);
});

test("player cards show only the token, player name and compact cash balance", () => {
  assert.match(app, /function moneyShort\(units\)/);
  assert.match(app, /toLocaleString\("en-US", \{maximumFractionDigits:1\}\) \+ "M"/);
  assert.match(app, /Math\.round\(vnd \/ 1000\).*"K"/);
  assert.match(app, /class="player-cash".*moneyShort\(p\.cash\)/s);
  assert.doesNotMatch(app, /class="player-position"|class="player-metrics"/);
  assert.match(polish, /#gameView \.players-panel\s*\{[\s\S]*?right:clamp\([\s\S]*?left:auto;[\s\S]*?width:min\(17cqw,224px\)/);
  assert.match(polish, /\.player-card\.active::before/);
});

test("the old Event Panel is removed and the replacement deal card is mounted", () => {
  assert.doesNotMatch(html, /id="eventPanel"/);
  assert.doesNotMatch(app, /eventPanel|epHistoryButton|epMinButton/);
  assert.match(html, /id="dealCard"/);
  assert.match(app, /function renderDealCard\(\)/);
  assert.match(html, /id="dealHistoryButton"/);
});

test("the player rail retains compact landscape and phone breakpoints", () => {
  assert.match(hud, /max-height: 560px\) and \(orientation: landscape\)/);
  assert.match(hud, /max-width: 620px/);
  assert.match(hud, /max-width: 420px/);
  assert.match(deal, /max-width:620px/);
  assert.match(deal, /max-width:420px/);
});
