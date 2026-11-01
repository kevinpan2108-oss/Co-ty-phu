import test from "node:test";
import assert from "node:assert/strict";
import { CUBE_ROT, cubeTransform } from "../dice-visuals.js";

test("all six cube faces have a defined final orientation", () => {
  assert.deepEqual(CUBE_ROT, {
    1: [0, 0],
    2: [0, -90],
    3: [-90, 0],
    4: [90, 0],
    5: [0, 90],
    6: [0, 180]
  });
  assert.deepEqual(Object.keys(CUBE_ROT).sort(), ["1", "2", "3", "4", "5", "6"]);
});

test("cube transform keeps the chosen face visible after full spins", () => {
  assert.equal(
    cubeTransform(2, [720, 1080]),
    "rotateX(720deg) rotateY(1080deg) rotateX(0deg) rotateY(-90deg)"
  );
  assert.equal(
    cubeTransform(6, [360, 720]),
    "rotateX(360deg) rotateY(720deg) rotateX(0deg) rotateY(180deg)"
  );
});

test("invalid cube values and spin angles safely fall back to face one", () => {
  assert.equal(cubeTransform(0, [NaN, Infinity]), "rotateX(0deg) rotateY(0deg) rotateX(0deg) rotateY(0deg)");
});
