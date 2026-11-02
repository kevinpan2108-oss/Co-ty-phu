import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../interaction-redesign.css", import.meta.url), "utf8");
const e2e = await readFile(new URL("./e2e/two-player.cjs", import.meta.url), "utf8");

test("persistent event panel is removed and contextual card is mounted", () => {
  assert.doesNotMatch(html, /id="eventPanel"|class="event-panel/);
  assert.doesNotMatch(app, /function renderEventPanel\(/);
  assert.match(html, /id="interactionCard"/);
  assert.match(app, /function renderInteractionPanel\(/);
});

test("property sale deed shows purchase, mortgage and graduated rent data", () => {
  assert.match(html, /id="dealPropertySheet"/);
  assert.match(html, /id="dealPrice"/);
  assert.match(html, /id="dealMortgage"/);
  assert.match(html, /id="dealRentList"/);
  assert.match(app, /const multipliers = \[5, 15, 45, 80, 125\]/);
  assert.match(app, /roomState\.pending/);
  assert.match(app, /roomState\.auction/);
});

test("the contextual panel supports sale, auction, debt, jail and results", () => {
  for (const mode of ["FOR SALE","AUCTION","PAYMENT DUE","IN JAIL","GAME OVER","THÔNG TIN GIAO DỊCH"]) {
    assert.ok(app.includes(mode), "missing interaction mode: " + mode);
  }
  assert.match(html, /id="pendingActions"/);
  assert.match(html, /id="epMoney"/);
  assert.match(html, /id="epBalances"/);
});

test("dice use a 3D throw animation with a board-centred landing point", () => {
  assert.match(css, /#gameView \.dice-stage\s*\{[\s\S]*?left:39\.5%/);
  assert.match(css, /animation:diceToss/);
  assert.match(css, /@keyframes diceToss/);
  assert.match(css, /diceImpactRing/);
  assert.match(e2e, /xúc xắc 3D được ném vào giữa bàn/);
});

test("new interaction stylesheet is loaded after the base HUD", () => {
  const hud = html.indexOf("hud-redesign.css?v=marmalade-hud-20261102");
  const flow = html.indexOf("interaction-redesign.css?v=marmalade-flow-20261102");
  assert.ok(hud >= 0 && flow > hud);
});
