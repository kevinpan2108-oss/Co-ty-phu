import test from "node:test";
import assert from "node:assert/strict";
import { CHANCE_CARDS, FORTUNE_CARDS, drawCard } from "../cards.js";

test("Chance and Khí vận are separate regional decks", () => {
  assert.ok(CHANCE_CARDS.length >= 10);
  assert.ok(FORTUNE_CARDS.length >= 8);
  const chanceIds=new Set(CHANCE_CARDS.map((card)=>card.id));
  assert.ok(FORTUNE_CARDS.every((card)=>!chanceIds.has(card.id)));
});

test("cards have a range of effects beyond adding or subtracting cash", () => {
  const kinds=new Set([...CHANCE_CARDS,...FORTUNE_CARDS].map((card)=>card.kind));
  for(const kind of ["money","repair","payPerAsset","payEachPlayer","collectFromEach","jailPass","goToJail"]) {
    assert.ok(kinds.has(kind),`missing card effect: ${kind}`);
  }
});

test("decks can be drawn deterministically for game logic and tests", () => {
  assert.equal(drawCard("chance",()=>0).id,CHANCE_CARDS[0].id);
  assert.equal(drawCard("fortune",()=>0).id,FORTUNE_CARDS[0].id);
  assert.equal(drawCard("fortune",()=>1).id,FORTUNE_CARDS.at(-1).id);
});

test("repair cards contain distinct house and hotel costs", () => {
  for(const card of [...CHANCE_CARDS,...FORTUNE_CARDS].filter((item)=>item.kind==="repair")) {
    assert.ok(card.perHouse>0);
    assert.ok(card.perHotel>card.perHouse);
  }
});
