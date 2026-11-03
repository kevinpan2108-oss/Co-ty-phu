import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hasLiquidationOptions, mortgageEligibility, sellHouseEligibility, cashSnapshot, cashDeltas } from "../economy.js";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
function fn(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  return app.slice(start, app.indexOf("\n}\n", start) + 3);
}
const spaceSource = app.match(/const SPACE_DATA = (\[[\s\S]*?\n\]);/)[1];
const api = new Function("hasLiquidationOptions", "money", "sendToJail", `
  const SPACE_DATA = ${spaceSource};
  const JAIL_FEE = 50;
  ${fn("chargePlayer")}
  ${fn("applyDebtFunds")}
  ${fn("canDeclareBankruptcy")}
  ${fn("ownedAssetCount")}
  ${fn("buildingRepairCost")}
  ${fn("applyCardEffect")}
  return { SPACE_DATA, chargePlayer, applyDebtFunds, canDeclareBankruptcy, applyCardEffect };`)(hasLiquidationOptions, String, (room, uid, from) => {
  room.players[uid].position = 10; room.players[uid].jailTurns = 1; room.extraRoll = false; room.doublesCount = 0;
});
const { SPACE_DATA, chargePlayer, applyDebtFunds, canDeclareBankruptcy, applyCardEffect } = api;
const mk = () => ({ players: { a: { name: "A", cash: 0, position: 0, jailTurns: 0 }, b: { name: "B", cash: 100, position: 0, jailTurns: 0 } }, propertyOwners: {}, houses: {}, mortgages: {}, turnUid: "a", turnNumber: 1 });

test("out of cash but still owns assets: debt is created, bankruptcy is not allowed yet", () => {
  const room = mk(); room.propertyOwners = { s1: "a" };
  const r = chargePlayer(room, "a", 20, "b", "Tiền thuê");
  assert.equal(r.remaining, 20);
  assert.equal(room.players.a.cash, 0);
  assert.equal(room.players.b.cash, 100, "creditor is not credited for money that was not paid");
  assert.equal(canDeclareBankruptcy(room, "a"), false, "mortgage is still possible");
});

test("in debt and selling houses: refund pays the debt, creditor gets exactly the debt once", () => {
  const room = mk(); room.propertyOwners = { s1: "a", s3: "a" }; room.houses = { s1: 1, s3: 1 };
  chargePlayer(room, "a", 20, "b", "Tiền thuê");
  const sell = sellHouseEligibility(SPACE_DATA, room.propertyOwners, room.houses, "a", 1);
  assert.equal(sell.ok, true);
  applyDebtFunds(room, "a", sell.refund); // 25 hoàn lại
  assert.equal(room.debt, null);
  assert.equal(room.players.b.cash, 120, "creditor +20 once");
  assert.equal(room.players.a.cash, 5, "surplus 5 stays with the debtor");
});

test("in debt and mortgaging land pays the debt first", () => {
  const room = mk(); room.propertyOwners = { s1: "a" };
  chargePlayer(room, "a", 20, "b", "Tiền thuê");
  const m = mortgageEligibility(SPACE_DATA, room.propertyOwners, room.houses, room.mortgages, "a", 1);
  assert.equal(m.ok, true);
  applyDebtFunds(room, "a", m.amount); // 30
  assert.equal(room.debt, null);
  assert.equal(room.players.b.cash, 120);
  assert.equal(room.players.a.cash, 10);
});

test("cannot pay after liquidating everything: bankruptcy becomes available", () => {
  const room = mk(); room.propertyOwners = { s1: "a" }; room.mortgages = { s1: 30 };
  chargePlayer(room, "a", 500, "b", "Tiền thuê");
  assert.equal(room.debt.amount, 500);
  assert.equal(canDeclareBankruptcy(room, "a"), true);
});

test("a second charge while a debt is open never double-charges or double-credits", () => {
  const room = mk(); room.players.a.cash = 10;
  chargePlayer(room, "a", 50, "b", "Thuê");
  const before = JSON.stringify(room.players);
  const again = chargePlayer(room, "b", 30, "a", "Thẻ"); // người khác bị trừ khi a còn nợ -> bị chặn
  assert.equal(again.blocked, true);
  assert.equal(JSON.stringify(room.players), before);
});

test("card effects: money, per-asset fee, repairs and go-to-jail (no START salary, no extra roll)", () => {
  const room = mk(); room.players.a.cash = 500; room.propertyOwners = { s1: "a", s3: "a" }; room.houses = { s1: 2, s3: 5 };
  applyCardEffect(room, "a", { kind: "money", amount: 100, text: "+" });
  assert.equal(room.players.a.cash, 600);
  applyCardEffect(room, "a", { kind: "payPerAsset", amount: 15, text: "phí" });
  assert.equal(room.players.a.cash, 570);
  applyCardEffect(room, "a", { kind: "repair", perHouse: 25, perHotel: 100, text: "sửa" });
  assert.equal(room.players.a.cash, 570 - (2 * 25 + 100));
  room.extraRoll = true;
  applyCardEffect(room, "a", { kind: "goToJail", text: "tù" });
  assert.equal(room.players.a.position, 10);
  assert.equal(room.players.a.jailTurns, 1);
  assert.equal(room.extraRoll, false);
});

test("event deltas show exactly one debit and one credit for a rent payment", () => {
  const room = mk(); room.players.a.cash = 100;
  const before = cashSnapshot(room.players);
  chargePlayer(room, "a", 30, "b", "Thuê");
  assert.deepEqual(cashDeltas(before, cashSnapshot(room.players)), { a: -30, b: 30 });
});

test("START: passing START pays the salary exactly once per lap in the move plan", async () => {
  const { calculateDiceMove } = await import("../economy.js");
  assert.equal(calculateDiceMove(38, [3, 3]).passesStart, true);
  assert.equal(calculateDiceMove(30, [3, 3]).passesStart, false);
  assert.equal(calculateDiceMove(34, [3, 3]).passesStart, true, "landing exactly on START (40) counts as passing for salary");
});
