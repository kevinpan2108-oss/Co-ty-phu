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
)();
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

test("only stations and utilities enter the auction flow", () => {
  const stations = SPACE_DATA.filter((space) => space.type === "station");
  const utilities = SPACE_DATA.filter((space) => space.type === "utility");
  const properties = SPACE_DATA.filter((space) => space.type === "property");
  assert.equal(stations.length, 4);
  assert.equal(utilities.length, 2);
  assert.ok(stations.every(isAuctionSpace));
  assert.ok(utilities.every(isAuctionSpace));
  assert.ok(properties.every((space) => !isAuctionSpace(space)));
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
