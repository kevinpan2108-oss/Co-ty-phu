import test from "node:test";
import assert from "node:assert/strict";
import {
  HOUSE_RENT_MULTIPLIERS, calculateDiceMove, propertyGroupIndices, ownsCompleteGroup,
  getHouseCost, getBuildingLabel, buildEligibility, sellHouseEligibility,
  mortgageEligibility, mortgageValue, redemptionCost, calcRent, hasLiquidationOptions, finalDiceSpin
} from "../economy.js";

const spaces = [
  {name:"Đất A",type:"property",price:60,rent:10,group:"Tiền Giang",color:"#c9824b"},
  {name:"Đất B",type:"property",price:100,rent:30,group:"Tiền Giang",color:"#c9824b"},
  {name:"Bến phà",type:"station",price:200,rent:40},
  {name:"Công ty điện",type:"utility",price:150,rent:50},
  {name:"Đất C",type:"property",price:140,rent:60,group:"Bến Tre",color:"#4fb0a8"},
  {name:"Đất D",type:"property",price:120,rent:50,group:"Bến Tre",color:"#4fb0a8"}
];

test("dice result produces one authoritative movement plan", () => {
  assert.deepEqual(calculateDiceMove(37,[4,3]),{from:37,to:4,steps:7,passesStart:true,dice:[4,3]});
  assert.deepEqual(calculateDiceMove(5,[6,6]),{from:5,to:17,steps:12,passesStart:false,dice:[6,6]});
  assert.equal(calculateDiceMove(39,[1,1]).to,1);
  assert.throws(() => calculateDiceMove(0,[0,6]),/từ 1 đến 6/);
  assert.throws(() => calculateDiceMove(0,[7,2]),/từ 1 đến 6/);
});

test("3D dice spin only adds full turns and never flips a final face by 180 degrees", () => {
  for (const index of [0,1]) {
    const spin=finalDiceSpin(index);
    assert.ok(spin.every((degrees)=>degrees%360===0));
    assert.ok(!spin.some((degrees)=>Math.abs(degrees%360)===180));
  }
  assert.notDeepEqual(finalDiceSpin(0),finalDiceSpin(1));
});

test("group ownership and even construction rules are enforced", () => {
  const owners={s0:"p1",s1:"p1"};
  assert.deepEqual(propertyGroupIndices(spaces,"Tiền Giang"),[0,1]);
  assert.equal(ownsCompleteGroup(spaces,owners,"Tiền Giang","p1"),true);
  assert.equal(ownsCompleteGroup(spaces,{s0:"p1"},"Tiền Giang","p1"),false);
  const oneHouse={s0:1};
  assert.equal(buildEligibility(spaces,owners,oneHouse,{},"p1",0,100).ok,false);
  assert.equal(buildEligibility(spaces,owners,oneHouse,{},"p1",1,100).ok,true);
  assert.equal(buildEligibility(spaces,owners,{s0:4,s1:4},{},"p1",0,100).next,5);
  assert.equal(buildEligibility(spaces,owners,{s0:5,s1:5},{},"p1",0,100).ok,false);
  assert.equal(buildEligibility(spaces,{s0:"p1"},{},{},"p1",0,100).ok,false);
});

test("houses cost half the cheapest group property, with a sensible minimum", () => {
  assert.equal(getHouseCost(spaces,0),50);
  assert.equal(getHouseCost(spaces,1),50);
  assert.equal(getHouseCost(spaces,2),0);
  assert.equal(getBuildingLabel(0),"Đất trống");
  assert.equal(getBuildingLabel(1),"1 căn nhà");
  assert.equal(getBuildingLabel(5),"Khách sạn");
});

test("rent rises as houses and hotels are built; mortgaged land earns no rent", () => {
  const owners={s0:"p1",s1:"p1"};
  const noHouse=calcRent(spaces,spaces[0],owners,"p1",7,0,{}, {});
  assert.equal(noHouse.rent,20);
  assert.equal(noHouse.wholeProvince,true);
  assert.equal(calcRent(spaces,spaces[0],owners,"p1",7,0,{s0:1},{}).rent,50);
  assert.equal(calcRent(spaces,spaces[0],owners,"p1",7,0,{s0:4},{}).rent,800);
  assert.equal(calcRent(spaces,spaces[0],owners,"p1",7,0,{s0:5},{}).rent,1250);
  const mort=calcRent(spaces,spaces[0],owners,"p1",7,0,{}, {s0:30});
  assert.equal(mort.rent,0);
  assert.equal(mort.mortgaged,true);
});

test("houses can only be sold from the most-built property in a group", () => {
  const owners={s0:"p1",s1:"p1"};
  const houses={s0:2,s1:1};
  assert.equal(sellHouseEligibility(spaces,owners,houses,"p1",0).ok,true);
  assert.equal(sellHouseEligibility(spaces,owners,houses,"p1",1).ok,false);
  assert.equal(sellHouseEligibility(spaces,owners,houses,"p1",0).refund,25);
  assert.equal(sellHouseEligibility(spaces,owners,{},"p1",0).ok,false);
});

test("mortgage requires ownership and no buildings in the same color group", () => {
  const owners={s0:"p1",s1:"p1"};
  assert.equal(mortgageValue(spaces[0]),30);
  assert.equal(mortgageEligibility(spaces,owners,{s0:1},{},"p1",0).ok,false);
  assert.equal(mortgageEligibility(spaces,owners,{},{},"p1",0).amount,30);
  assert.equal(mortgageEligibility(spaces,owners,{}, {s0:30},"p1",0).ok,false);
  assert.equal(mortgageEligibility(spaces,owners,{},{},"p2",0).ok,false);
  assert.equal(redemptionCost(30),33);
});

test("liquidation checks distinguish built assets from mortgageable assets", () => {
  assert.equal(hasLiquidationOptions(spaces,{s0:"p1"},{s0:1},{},"p1"),true);
  assert.equal(hasLiquidationOptions(spaces,{s0:"p1"},{},{}, "p1"),true);
  assert.equal(hasLiquidationOptions(spaces,{}, {}, {}, "p1"),false);
  assert.equal(HOUSE_RENT_MULTIPLIERS.length,5);
});
