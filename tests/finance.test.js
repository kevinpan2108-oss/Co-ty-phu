import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
function extractFunction(name){
  const start=app.indexOf(`function ${name}(`);
  assert.ok(start>=0,`function ${name} exists`);
  const end=app.indexOf("\n}\n",start);
  return app.slice(start,end+3);
}
const api=new Function(
  "money",
  `${extractFunction("chargePlayer")}
   ${extractFunction("applyDebtFunds")}
   return {chargePlayer,applyDebtFunds};`
)((n)=>String(n));
const {chargePlayer,applyDebtFunds}=api;

test("partial rent/tax payment creates debt instead of immediate bankruptcy",()=>{
  const room={players:{a:{cash:20},b:{cash:100}}};
  const result=chargePlayer(room,"a",70,"b","Tiền thuê");
  assert.deepEqual(result,{paid:20,remaining:50});
  assert.equal(room.players.a.cash,0);
  assert.equal(room.players.b.cash,120);
  assert.deepEqual(room.debt,{uid:"a",amount:50,creditorUid:"b",reason:"Tiền thuê"});
});

test("mortgage or house-sale proceeds pay debt first and only keep the surplus",()=>{
  const room={players:{a:{cash:0},b:{cash:120}},debt:{uid:"a",amount:50,creditorUid:"b",reason:"Nợ thuê"}};
  applyDebtFunds(room,"a",80);
  assert.equal(room.debt,null);
  assert.equal(room.players.b.cash,170);
  assert.equal(room.players.a.cash,30);
});

test("bank debt can be repaid from liquidation proceeds without creditor transfer",()=>{
  const room={players:{a:{cash:10}},debt:{uid:"a",amount:60,creditorUid:"",reason:"Thuế"}};
  applyDebtFunds(room,"a",25);
  assert.equal(room.debt.amount,35);
  assert.equal(room.players.a.cash,10);
  applyDebtFunds(room,"a",50);
  assert.equal(room.debt,null);
  assert.equal(room.players.a.cash,25);
});

test("jail fee debt resumes the same turn only when fully repaid",()=>{
  const room={players:{a:{cash:0,jailTurns:1},b:{cash:10}},turnUid:"a",turnNumber:2,lastRoll:null,
    debt:{uid:"a",amount:30,creditorUid:"",reason:"Phí ra tù",resumeJail:true}};
  applyDebtFunds(room,"a",20);
  assert.equal(room.debt.amount,10);
  assert.equal(room.players.a.jailTurns,1);
  applyDebtFunds(room,"a",15);
  assert.equal(room.debt,null);
  assert.equal(room.players.a.jailTurns,0);
  assert.equal(room.turnUid,"b");
  assert.equal(room.turnNumber,3);
});
