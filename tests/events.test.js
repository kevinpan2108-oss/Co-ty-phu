import test from "node:test";
import assert from "node:assert/strict";
import { currentTurnEvent, eventLogList, eventReason } from "../events.js";

test("current event is shown only during its recorded turn", () => {
  const event = { id: 7, turn: 4, text: "Đã mua đất" };
  assert.equal(currentTurnEvent({ turnNumber: 4, event }), event);
  assert.equal(currentTurnEvent({ turnNumber: 5, event }), null);
  assert.equal(currentTurnEvent({ turnNumber: 4, event: null }), null);
});

test("event history accepts both array and Firebase object representations", () => {
  const first = { id: 1, text: "Mua đất" };
  const second = { id: 2, text: "Trả tiền thuê" };
  assert.deepEqual(eventLogList({ log: [first, second] }), [first, second]);
  assert.deepEqual(eventLogList({ log: { 1: first, 0: second } }), [second, first]);
  assert.deepEqual(eventLogList({}), []);
});

test("event reasons describe each property finance action", () => {
  const uid = "player-a";
  const cases = [
    ["build", -50, "xây nhà/khách sạn"],
    ["sellHouse", 25, "bán nhà/khách sạn"],
    ["mortgage", 30, "cầm cố tài sản"],
    ["redeem", -33, "giải chấp tài sản"],
    ["bankruptcy", 0, "phá sản"]
  ];
  for (const [kind, delta, expected] of cases) {
    assert.equal(eventReason({ kind, uid }, uid, delta), expected, kind);
  }
});

test("rent event explains payer and owner from the player's point of view", () => {
  const event = { kind: "property", uid: "payer" };
  assert.equal(eventReason(event, "payer", -20), "trả tiền thuê");
  assert.equal(eventReason(event, "owner", 20), "nhận tiền thuê");
});

test("auction reason distinguishes winner payments from other auction events", () => {
  const event = { kind: "auction", uid: "passer" };
  assert.equal(eventReason(event, "winner", -200), "thắng đấu giá");
  assert.equal(eventReason(event, "passer", 0), "đấu giá");
});
