import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `function ${name} should exist`);
  const end = app.indexOf("\n}\n", start);
  return app.slice(start, end + 3);
}
const spaceSource = app.match(/const SPACE_DATA = (\[[\s\S]*?\n\]);/)[1];
const api = new Function(
  `const SPACE_DATA = ${spaceSource};
   ${extractFunction("getSpaceId")}
   ${extractFunction("provinceCells")}
   ${extractFunction("ownsWholeProvince")}
   ${extractFunction("calcRent")}
   return {SPACE_DATA, provinceCells, ownsWholeProvince, calcRent};`
)();
const { SPACE_DATA, provinceCells, ownsWholeProvince, calcRent } = api;

const MEKONG_PROVINCES = [
  "Long An", "Tiền Giang", "Bến Tre", "Trà Vinh", "Vĩnh Long", "Đồng Tháp", "Cần Thơ",
  "Hậu Giang", "Sóc Trăng", "Bạc Liêu", "An Giang", "Kiên Giang", "Cà Mau"
];
const properties = SPACE_DATA.map((space, index) => ({ ...space, index })).filter((space) => space.type === "property");

test("the board has 40 spaces and 22 purchasable places", () => {
  assert.equal(SPACE_DATA.length, 40);
  assert.equal(properties.length, 22);
});

test("every one of the 13 Mekong Delta provinces appears on the board", () => {
  const groups = new Set(properties.map((space) => space.group));
  assert.deepEqual([...groups].sort(), [...MEKONG_PROVINCES].sort());
});

test("each place has an icon, a description and a province colour", () => {
  const colorOf = new Map();
  for (const space of properties) {
    assert.ok(space.icon, `${space.name} needs an icon`);
    assert.ok(space.info && space.info.length > 20, `${space.name} needs a description`);
    assert.match(space.color, /^#[0-9a-f]{6}$/i);
    assert.equal(colorOf.get(space.group) ?? space.color, space.color, `${space.group} must use one colour`);
    colorOf.set(space.group, space.color);
  }
  assert.equal(new Set(colorOf.values()).size, 13, "each province has its own colour");
});

test("prices rise along the board and rent stays below price", () => {
  for (let i = 1; i < properties.length; i++) {
    assert.ok(properties[i].price >= properties[i - 1].price, `${properties[i].name} should not be cheaper than ${properties[i - 1].name}`);
  }
  for (const space of properties) assert.ok(space.rent < space.price);
});

test("owning every place of a province doubles the rent", () => {
  const [a, b] = provinceCells("Tiền Giang");
  const space = SPACE_DATA[a];
  const one = calcRent(space, { [`s${a}`]: "p1" }, "p1", 7);
  assert.deepEqual(one, { rent: space.rent, wholeProvince: false });
  const both = calcRent(space, { [`s${a}`]: "p1", [`s${b}`]: "p1" }, "p1", 7);
  assert.deepEqual(both, { rent: space.rent * 2, wholeProvince: true });
  const split = calcRent(space, { [`s${a}`]: "p1", [`s${b}`]: "p2" }, "p1", 7);
  assert.equal(split.wholeProvince, false);
});

test("provinces with a single place never get the province bonus", () => {
  for (const province of ["Long An", "Hậu Giang", "Kiên Giang", "Cà Mau"]) {
    const cells = provinceCells(province);
    assert.equal(cells.length, 1, `${province} has one place`);
    assert.equal(ownsWholeProvince({ [`s${cells[0]}`]: "p1" }, province, "p1"), false);
  }
});

test("stations double per extra station and utilities depend on the dice", () => {
  const stations = SPACE_DATA.map((s, i) => (s.type === "station" ? i : -1)).filter((i) => i >= 0);
  const utilities = SPACE_DATA.map((s, i) => (s.type === "utility" ? i : -1)).filter((i) => i >= 0);
  assert.equal(stations.length, 4);
  assert.equal(calcRent(SPACE_DATA[stations[0]], { [`s${stations[0]}`]: "p1" }, "p1", 5).rent, 40);
  assert.equal(calcRent(SPACE_DATA[stations[0]], { [`s${stations[0]}`]: "p1", [`s${stations[1]}`]: "p1" }, "p1", 5).rent, 80);
  assert.equal(calcRent(SPACE_DATA[utilities[0]], { [`s${utilities[0]}`]: "p1" }, "p1", 6).rent, 24);
  assert.equal(calcRent(SPACE_DATA[utilities[0]], { [`s${utilities[0]}`]: "p1", [`s${utilities[1]}`]: "p1" }, "p1", 6).rent, 60);
});
