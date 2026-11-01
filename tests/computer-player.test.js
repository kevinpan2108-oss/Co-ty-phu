import test from "node:test";
import assert from "node:assert/strict";
import { shouldComputerBuy } from "../computer-player.js";

test("computer buys a cheap property while keeping some cash", () => {
  assert.equal(shouldComputerBuy({type:"property",price:60,group:"Tiền Giang"},300,[]),true);
});

test("computer declines a purchase that would empty its wallet", () => {
  assert.equal(shouldComputerBuy({type:"property",price:320,group:"Cà Mau"},350,[]),false);
});

test("computer prefers completing a color group if it keeps a reserve", () => {
  const owned=[{type:"property",price:60,group:"Bến Tre"}];
  assert.equal(shouldComputerBuy({type:"property",price:100,group:"Bến Tre"},250,owned),true);
});

test("computer keeps a larger reserve for stations and utilities", () => {
  assert.equal(shouldComputerBuy({type:"station",price:200},500,[]),false);
  assert.equal(shouldComputerBuy({type:"station",price:200},600,[]),true);
});

test("computer cannot buy without enough cash or a priced space", () => {
  assert.equal(shouldComputerBuy({type:"property",price:100},80,[]),false);
  assert.equal(shouldComputerBuy({type:"free"},1500,[]),false);
});
