import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../deal-ui.css", import.meta.url), "utf8");

test("the permanent Event Panel is removed from the game stage", () => {
  assert.doesNotMatch(html, /id="eventPanel"/);
  assert.doesNotMatch(html, /id="epHistoryButton"/);
  assert.doesNotMatch(html, /id="epMinButton"/);
  assert.doesNotMatch(app, /eventPanel|epHistoryButton|epMinButton/);
});

test("contextual deal card exposes purchase, auction, receipt and debt details", () => {
  for (const id of ["dealCard","dealKicker","dealTitle","dealPrice","dealRent","dealFacts","pendingActions","epMoney","epConfirmRow"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(app, /function renderDealCard\(\)/);
  assert.match(app, /buy\.textContent = "MUA NGAY"/);
  assert.match(app, /pass\.textContent = "ĐẤU GIÁ"/);
  assert.match(app, /auction\.currentBid/);
  assert.match(app, /CẦN XỬ LÝ KHOẢN NỢ/);
});

test("property deed exposes graduated rent, mortgage and building-cost details", () => {
  assert.match(html, /id="dealRentSchedule"/);
  assert.match(html, /id="dealBuildCost"/);
  assert.match(app, /HOUSE_RENT_MULTIPLIERS\.forEach/);
  assert.match(app, /GIÁ TRỊ THẾ CHẤP/);
  assert.match(app, /Bán lại 50%/);
  assert.match(css, /\\.deal-rent-schedule/);
  assert.match(css, /\\.deal-rent-row\\.active/);
});

test("deal history is moved to its own toolbar control", () => {
  assert.match(html, /id="dealHistoryButton"/);
  assert.match(app, /dealHistoryButton.*renderHistory/s);
});

test("deal card has clear price, rent, property and action hierarchy", () => {
  assert.match(css, /\.deal-value-grid/);
  assert.match(css, /\.deal-facts/);
  assert.match(css, /\.deal-actions/);
  assert.match(css, /data-kind="purchase"/);
  assert.match(css, /data-kind="auction"/);
  assert.match(css, /data-kind="debt"/);
  assert.match(css, /\.deal-card\[hidden\]/);
});

test("dice are displayed as large 3D cubes with two throw arcs and a landing settle", () => {
  assert.match(css, /transform-style:preserve-3d/);
  assert.match(css, /diceThrowFromLeft/);
  assert.match(css, /diceThrowFromRight/);
  assert.match(css, /diceSettle/);
  assert.match(css, /\.cube \.die\.face\[data-v="6"\]/);
});
