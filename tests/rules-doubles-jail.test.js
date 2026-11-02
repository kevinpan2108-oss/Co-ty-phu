import test from "node:test";
import assert from "node:assert/strict";
import {
  isDoubleRoll, doublesOutcome, jailRollOutcome, jailStatus, isAuctionable, auctionableIndices,
  cashSnapshot, cashDeltas, appendEventLog, EVENT_LOG_LIMIT, calcRent
} from "../economy.js";

test("doubles are detected only for two equal valid dice", () => {
  assert.equal(isDoubleRoll([3, 3]), true);
  assert.equal(isDoubleRoll([3, 4]), false);
  assert.equal(isDoubleRoll([0, 0]), false);
  assert.equal(isDoubleRoll(null), false);
});

test("doubles grant an extra roll; the third consecutive double goes to jail", () => {
  assert.deepEqual(doublesOutcome(0, [2, 2]), { count: 1, goToJail: false, extraRoll: true });
  assert.deepEqual(doublesOutcome(1, [5, 5]), { count: 2, goToJail: false, extraRoll: true });
  assert.deepEqual(doublesOutcome(2, [6, 6]), { count: 0, goToJail: true, extraRoll: false });
  assert.deepEqual(doublesOutcome(2, [1, 2]), { count: 0, goToJail: false, extraRoll: false });
  assert.deepEqual(doublesOutcome(undefined, [1, 6]), { count: 0, goToJail: false, extraRoll: false });
});

test("trying doubles in jail: escape on doubles (no extra roll), stay otherwise, pay on the third failure", () => {
  assert.deepEqual(jailRollOutcome(1, [4, 4]), { kind: "escape", move: true, payFee: false, nextAttempt: 0 });
  assert.deepEqual(jailRollOutcome(1, [1, 2]), { kind: "stay", move: false, payFee: false, nextAttempt: 2 });
  assert.deepEqual(jailRollOutcome(2, [1, 2]), { kind: "stay", move: false, payFee: false, nextAttempt: 3 });
  assert.deepEqual(jailRollOutcome(3, [1, 2]), { kind: "forced-pay", move: true, payFee: true, nextAttempt: 0 });
  assert.equal(jailRollOutcome(3, [6, 6]).payFee, false);
});

test("just visiting the jail corner is different from being jailed", () => {
  assert.equal(jailStatus({ position: 10, jailTurns: 0 }).state, "visiting");
  assert.equal(jailStatus({ position: 10, jailTurns: 2 }).state, "jailed");
  assert.match(jailStatus({ position: 10, jailTurns: 2 }).label, /2\/3/);
  assert.equal(jailStatus({ position: 5, jailTurns: 0 }).state, "free");
});

test("auction applies to every purchasable asset", () => {
  assert.equal(isAuctionable({ type: "property", price: 60 }), true);
  assert.equal(isAuctionable({ type: "station", price: 200 }), true);
  assert.equal(isAuctionable({ type: "utility", price: 150 }), true);
  assert.equal(isAuctionable({ type: "tax", amount: 100 }), false);
  assert.equal(isAuctionable({ type: "start" }), false);
  assert.deepEqual(auctionableIndices([{ type: "start" }, { type: "property", price: 60 }, { type: "chance" }, { type: "station", price: 200 }]), [1, 3]);
});

test("utilities: rent is 4x dice with one company, 10x with both, none when mortgaged", () => {
  const sp = [{ type: "utility", price: 150 }, { type: "utility", price: 150 }];
  assert.equal(calcRent(sp, sp[0], { s0: "p1" }, "p1", 9, 0).rent, 36);
  assert.equal(calcRent(sp, sp[0], { s0: "p1", s1: "p1" }, "p1", 9, 0).rent, 90);
  assert.equal(calcRent(sp, sp[0], { s0: "p1", s1: "p1" }, "p1", 9, 0, {}, { s1: 75 }).rent, 36);
  assert.equal(calcRent(sp, sp[0], { s0: "p1" }, "p1", 9, 0, {}, { s0: 75 }).rent, 0);
});

test("event cash deltas are computed from real balances, so nothing can be counted twice", () => {
  const before = cashSnapshot({ a: { cash: 100 }, b: { cash: 50 } });
  const after = cashSnapshot({ a: { cash: 80 }, b: { cash: 70 } });
  assert.deepEqual(cashDeltas(before, after), { a: -20, b: 20 });
  assert.deepEqual(cashDeltas(before, before), {});
});

test("event log keeps only the latest entries and tolerates Firebase object form", () => {
  let log;
  for (let i = 1; i <= EVENT_LOG_LIMIT + 5; i++) log = appendEventLog(log, { id: i });
  assert.equal(log.length, EVENT_LOG_LIMIT);
  assert.equal(log.at(-1).id, EVENT_LOG_LIMIT + 5);
  assert.deepEqual(appendEventLog({ 0: { id: 1 }, 1: { id: 2 } }, { id: 3 }).map((e) => e.id), [1, 2, 3]);
});
