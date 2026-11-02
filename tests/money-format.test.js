import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../style.css", import.meta.url), "utf8");

test("compact money labels use K and dot-decimal M notation", () => {
  const match = app.match(/function moneyShort\(units\) \{[\s\S]*?\n\}/);
  assert.ok(match, "moneyShort should exist");
  const moneyShort = Function("UNIT_VND", "return (" + match[0] + ");")(10000);

  assert.equal(moneyShort(60), "600K");
  assert.equal(moneyShort(100), "1M");
  assert.equal(moneyShort(120), "1.2M");
  assert.equal(moneyShort(280), "2.8M");
  assert.equal(moneyShort(400), "4M");
  assert.equal(moneyShort(0), "0K");
});

test("tile labels have a clear hierarchy and a compact price badge", () => {
  assert.match(css, /#gameView \.space \.space-name\{[\s\S]*?font-size:\.215em/);
  assert.match(css, /#gameView \.space \.space-price\{[\s\S]*?min-width:2\.5em[\s\S]*?font-variant-numeric:tabular-nums/);
  assert.match(css, /#gameView \.space\.side-left \.space-text,[\s\S]*?width:75%/);
});
