import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isAuctionable, getHouseCost, buildEligibility, propertyGroupIndices, calcRent as economyRent } from "../economy.js";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `function ${name} should exist`);
  const end = app.indexOf("\n}\n", start);
  return app.slice(start, end + 3);
}
const spaceSource = app.match(/const SPACE_DATA = (\[[\s\S]*?\n\]);/)[1];
const api = new Function(
  "isAuctionable",
  `const SPACE_DATA = ${spaceSource};
   const AUCTION_INCREMENT = 10;
   const COMPUTER_UID = "__computer__";
   ${extractFunction("getSpaceId")}
   ${extractFunction("provinceCells")}
   ${extractFunction("ownsWholeProvince")}
   ${extractFunction("calcRent")}
   ${extractFunction("isAuctionSpace")}
   ${extractFunction("nextAuctionBid")}
   ${extractFunction("isOpeningRollPhase")}
   ${extractFunction("canAdvanceTurn")}
   ${extractFunction("compareOpeningRolls")}
   ${extractFunction("isComputerActionDue")}
   return {SPACE_DATA, provinceCells, ownsWholeProvince, calcRent, isAuctionSpace, nextAuctionBid, isOpeningRollPhase, canAdvanceTurn, compareOpeningRolls, isComputerActionDue};`
)(isAuctionable);
const { SPACE_DATA, provinceCells, ownsWholeProvince, calcRent, isAuctionSpace, nextAuctionBid, isOpeningRollPhase, canAdvanceTurn, compareOpeningRolls, isComputerActionDue } = api;

const MEKONG_PROVINCES = [
  "Long An", "Tiền Giang", "Bến Tre", "Trà Vinh", "Vĩnh Long", "Đồng Tháp", "Cần Thơ",
  "Hậu Giang", "Sóc Trăng", "Bạc Liêu", "An Giang", "Kiên Giang", "Cà Mau"
];
const properties = SPACE_DATA.map((space, index) => ({ ...space, index })).filter((space) => space.type === "property");

test("the board has 40 spaces and 22 purchasable places", () => {
  assert.equal(SPACE_DATA.length, 40);
  assert.equal(properties.length, 22);
});

const EXPECTED_GROUPS = [
  ["Đầu nguồn", [1, 3], 50],
  ["Xứ dừa", [6, 8, 9], 50],
  ["Sắc Khmer", [11, 13, 14], 100],
  ["Chợ nổi", [16, 18, 19], 100],
  ["Tây Đô", [21, 23, 24], 150],
  ["Miền duyên hải", [26, 27, 29], 150],
  ["Rừng tràm biên giới", [31, 32, 34], 200],
  ["Đất mũi biển đảo", [37, 39], 200]
];

test("22 properties are split into exactly 8 colour groups with Monopoly structure (2,3,3,3,3,3,3,2)", () => {
  const groups = new Map();
  for (const space of properties) groups.set(space.group, [...(groups.get(space.group) || []), space.index]);
  assert.equal(groups.size, 8);
  assert.deepEqual([...groups.values()].map((cells) => cells.length), [2, 3, 3, 3, 3, 3, 3, 2]);
  for (const [name, cells] of EXPECTED_GROUPS.map(([n, c]) => [n, c])) assert.deepEqual(groups.get(name), cells);
});

test("no colour group has a single tile, so every group can build houses", () => {
  for (const [name] of EXPECTED_GROUPS) {
    const cells = provinceCells(name);
    assert.ok(cells.length >= 2, `${name} needs at least 2 tiles`);
    const owners = Object.fromEntries(cells.map((i) => [`s${i}`, "p1"]));
    assert.equal(buildEligibility(SPACE_DATA, owners, {}, {}, "p1", cells[0], 1000).ok, true, `${name} can build`);
  }
});

test("the 40 board indexes keep their positions (rooms stay compatible)", () => {
  const types = SPACE_DATA.map((s) => s.type[0] + s.type.length).join(",");
  const expectedCorners = { 0: "start", 10: "jail", 20: "free", 30: "gotojail" };
  for (const [i, type] of Object.entries(expectedCorners)) assert.equal(SPACE_DATA[i].type, type);
  assert.deepEqual([5, 15, 25, 35].map((i) => SPACE_DATA[i].type), ["station", "station", "station", "station"]);
  assert.deepEqual([12, 28].map((i) => SPACE_DATA[i].type), ["utility", "utility"]);
  assert.deepEqual([2, 17, 33].map((i) => SPACE_DATA[i].type), ["chance", "chance", "chance"]);
  assert.deepEqual([7, 22, 36].map((i) => SPACE_DATA[i].type), ["fortune", "fortune", "fortune"]);
  assert.deepEqual([4, 38].map((i) => SPACE_DATA[i].type), ["tax", "tax"]);
  assert.ok(types.length > 0);
});

test("each place has an icon, a description and one colour per group", () => {
  const colorOf = new Map();
  for (const space of properties) {
    assert.ok(space.icon, `${space.name} needs an icon`);
    assert.ok(space.info && space.info.length > 20, `${space.name} needs a description`);
    assert.match(space.color, /^#[0-9a-f]{6}$/i);
    assert.equal(colorOf.get(space.group) ?? space.color, space.color, `${space.group} must use one colour`);
    colorOf.set(space.group, space.color);
  }
  assert.equal(new Set(colorOf.values()).size, 8, "each group has its own colour");
});

test("prices, base rents and house costs follow the Monopoly scale", () => {
  const priceList = properties.map((p) => p.price);
  assert.deepEqual(priceList, [60, 60, 100, 100, 120, 140, 140, 160, 180, 180, 200, 220, 220, 240, 260, 260, 280, 300, 300, 320, 350, 400]);
  const rentList = properties.map((p) => p.rent);
  assert.deepEqual(rentList, [2, 4, 6, 6, 8, 10, 10, 12, 14, 14, 16, 18, 18, 20, 22, 22, 24, 26, 26, 28, 35, 50]);
  for (const [name, cells, cost] of EXPECTED_GROUPS) {
    for (const cell of cells) assert.equal(getHouseCost(SPACE_DATA, cell), cost, `${name} house cost`);
  }
  // Khách sạn = nhà thứ 5 trả cùng đơn giá xây.
  const owners = { s37: "p1", s39: "p1" };
  assert.equal(buildEligibility(SPACE_DATA, owners, { s37: 4, s39: 4 }, {}, "p1", 37, 1000).cost, 200);
});

test("prices rise along the board and rent stays below price", () => {
  for (let i = 1; i < properties.length; i++) {
    assert.ok(properties[i].price >= properties[i - 1].price, `${properties[i].name} should not be cheaper than ${properties[i - 1].name}`);
  }
  for (const space of properties) assert.ok(space.rent < space.price);
});

test("owning a whole colour group doubles the base rent; houses use the Monopoly multipliers", () => {
  const [a, b] = provinceCells("Đầu nguồn");
  const space = SPACE_DATA[a];
  const one = calcRent(space, { [`s${a}`]: "p1" }, "p1", 7);
  assert.deepEqual(one, { rent: space.rent, wholeProvince: false });
  const both = calcRent(space, { [`s${a}`]: "p1", [`s${b}`]: "p1" }, "p1", 7);
  assert.deepEqual(both, { rent: space.rent * 2, wholeProvince: true });
  const split = calcRent(space, { [`s${a}`]: "p1", [`s${b}`]: "p2" }, "p1", 7);
  assert.equal(split.wholeProvince, false);
  const owners = { [`s${a}`]: "p1", [`s${b}`]: "p1" };
  // Mediterranean-style: 2 → 10 / 30 / 90 / 160 / 250 theo bội số 5/15/45/80/125.
  const rents = [1, 2, 3, 4, 5].map((n) => economyRent(SPACE_DATA, space, owners, "p1", 7, a, { [`s${a}`]: n }, {}).rent);
  assert.deepEqual(rents, [10, 30, 90, 160, 250]);
});

test("every group of two or more tiles gets the group bonus; one owner of a partial group does not", () => {
  for (const [name, cells] of EXPECTED_GROUPS) {
    assert.equal(ownsWholeProvince(Object.fromEntries(cells.slice(1).map((i) => [`s${i}`, "p1"])), name, "p1"), false);
    assert.equal(ownsWholeProvince(Object.fromEntries(cells.map((i) => [`s${i}`, "p1"])), name, "p1"), true);
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

test("every unowned purchasable asset can be auctioned; corners, cards and taxes cannot", () => {
  for (const space of SPACE_DATA) {
    const buyable = ["property", "station", "utility"].includes(space.type);
    assert.equal(isAuctionSpace(space), buyable, `${space.name}`);
  }
  assert.equal(SPACE_DATA.filter(isAuctionSpace).length, 28);
});

test("auction starts at 100,000₫ and rises in 100,000₫ steps", () => {
  assert.equal(nextAuctionBid({ currentBid: 0 }), 10);
  assert.equal(nextAuctionBid({ currentBid: 10 }), 20);
  assert.equal(nextAuctionBid({ currentBid: 120 }), 130);
});

test("the board renderer no longer injects floating 3D landmark art", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const renderer = source.slice(source.indexOf("function renderBoard()"), source.indexOf("function renderPlayers()"));
  assert.doesNotMatch(renderer, /artSvg|space-art/);
  assert.ok(source.includes("function isAuctionSpace(space)"));
});


test("the computer is scheduled only for its actual turn or auction bid", () => {
  const human = "human";
  const computer = "__computer__";
  assert.equal(isComputerActionDue({ status: "playing", turnUid: computer }, computer), true);
  assert.equal(isComputerActionDue({ status: "playing", turnUid: human, auction: { turnUid: computer } }, computer), true);
  assert.equal(isComputerActionDue({ status: "playing", turnUid: computer, auction: { turnUid: human } }, computer), false);
  assert.equal(isComputerActionDue({ status: "finished", turnUid: computer }, computer), false);
});


test("opening dice choose the player with the higher total and detect ties", () => {
  assert.equal(compareOpeningRolls([6, 4], [3, 5]), 1);
  assert.equal(compareOpeningRolls([1, 2], [4, 5]), -1);
  assert.equal(compareOpeningRolls([3, 4], [5, 2]), 0);
});
test("the game waits for opening rolls only on newly started matches", () => {
  assert.equal(isOpeningRollPhase({status:"playing",openingRound:1,openingRolls:{}}), true);
  assert.equal(isOpeningRollPhase({status:"playing",openingRound:2,startPlayerUid:"p1"}), false);
  assert.equal(isOpeningRollPhase({status:"playing"}), false);
});
test("the computer waits for the human opening roll, then submits its own", () => {
  const state = {status:"playing",creatorUid:"human",turnUid:"human",openingRound:1,openingRolls:{}};
  assert.equal(isComputerActionDue(state,"computer"), false);
  state.openingRolls.human = [4,5];
  assert.equal(isComputerActionDue(state,"computer"), true);
  state.openingRolls.computer = [2,3];
  assert.equal(isComputerActionDue(state,"computer"), false);
});
test("the lobby offers both classic and Vietnamese everyday tokens", async () => {
  const { TOKEN_OPTIONS, tokenMarkup } = await import("../board-art.js");
  assert.deepEqual(TOKEN_OPTIONS.map((item) => item.id), ["penguin","puppy","plastic-chair","vietnamese-coffee"]);
  assert.match(tokenMarkup("plastic-chair"), /<svg/);
  assert.match(tokenMarkup("vietnamese-coffee"), /<svg/);
});


test("rooms from older versions remain playable without an opening-roll phase", () => {
  assert.equal(canAdvanceTurn({status:"playing",turnUid:"p1"}), true);
  assert.equal(canAdvanceTurn({status:"playing",openingRound:1}), false);
  assert.equal(canAdvanceTurn({status:"playing",openingRound:2,startPlayerUid:"p2"}), true);
});
