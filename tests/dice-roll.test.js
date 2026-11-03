import test from "node:test";
import assert from "node:assert/strict";
import { buildDieKeyframes, DICE_ANIM_MS, DICE_IMPACTS } from "../dice-roll.js";
import { cubeTransform } from "../dice-visuals.js";

for (const value of [1, 2, 3, 4, 5, 6]) for (const idx of [0, 1]) {
  test(`xúc xắc ${idx} mặt ${value}: dừng đúng mặt, đúng chỗ, không xoay vô hạn`, () => {
    const { fly, spin, shadow } = buildDieKeyframes(value, idx, 60);
    assert.equal(fly.length, spin.length); assert.equal(fly.length, shadow.length);
    assert.equal(fly[0].offset, 0); assert.equal(fly.at(-1).offset, 1);
    for (let i = 1; i < fly.length; i++) assert.ok(fly[i].offset > fly[i - 1].offset, "offset tăng dần");
    assert.equal(spin.at(-1).transform, cubeTransform(value, [0, 0]), "khung cuối đúng mặt ngửa");
    assert.match(fly.at(-1).transform, /^translate\(0\.0px,0\.0px\) scale\(1\.000,1\.000\)$/);
  });
}
test("xúc xắc nảy ba nhịp: chạm bàn (y=0) ở các mốc va chạm và các đỉnh thấp dần", () => {
  const { fly } = buildDieKeyframes(3, 0, 100);
  const at = (ms) => fly.find((k) => Math.abs(k.offset * DICE_ANIM_MS - ms) < 1);
  const y = (k) => Number(k.transform.match(/translate\([^,]+,(-?[\d.]+)px/)[1]);
  for (const ms of DICE_IMPACTS) assert.equal(y(at(ms)), 0);
  const apexes = [1050, 1580, 1930, 2110].map((ms) => y(at(ms)));
  for (let i = 1; i < apexes.length; i++) assert.ok(apexes[i] > apexes[i - 1], "đỉnh sau thấp hơn đỉnh trước (y âm hơn = cao hơn)");
});
test("góc xoay giảm dần sau khi tung (giảm tốc, không dừng đột ngột)", () => {
  const { spin } = buildDieKeyframes(5, 0, 60);
  const ang = (k) => Number(k.transform.match(/rotateX\((-?[\d.]+)deg\)/)[1]);
  const flying = spin.filter((k) => k.offset * DICE_ANIM_MS >= 1050);
  for (let i = 1; i < flying.length; i++) assert.ok(Math.abs(ang(flying[i])) <= Math.abs(ang(flying[i - 1])));
});
