import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const rulesText = await readFile(new URL("../firebase-database.rules.json", import.meta.url), "utf8");
const rules = JSON.parse(rulesText);

test("Firebase config points to the intended Singapore project", () => {
  const match = app.match(/const DEFAULT_FIREBASE_CONFIG = (\{[\s\S]*?\n\});/);
  assert.ok(match, "DEFAULT_FIREBASE_CONFIG should exist");
  const config = Function("return (" + match[1] + ")")();
  assert.equal(config.projectId, "cotyphuonline-8f536");
  assert.equal(config.databaseURL, "https://cotyphuonline-8f536-default-rtdb.asia-southeast1.firebasedatabase.app");
  assert.ok(config.apiKey && config.appId && config.authDomain);
});

test("the board contains 40 spaces", () => {
  const match = app.match(/const SPACE_DATA = (\[[\s\S]*?\n\]);/);
  assert.ok(match, "SPACE_DATA should exist");
  const spaces = Function("return (" + match[1] + ")")();
  assert.equal(spaces.length, 40);
  assert.equal(spaces[0].type, "start");
  assert.equal(spaces[10].type, "jail");
  assert.equal(spaces[20].type, "free");
  assert.equal(spaces[30].type, "gotojail");
});

test("room creation reserves a code with a transaction", () => {
  const start = app.indexOf("async function createRoom()");
  const end = app.indexOf("\nasync function joinRoom()", start);
  const body = app.slice(start, end);
  assert.ok(body.includes("runTransaction"));
  assert.ok(body.includes("if (existing !== null) return;"));
  assert.ok(!body.includes("await set(ref(db, `${ROOM_ROOT}/${code}`)"));
});

test("the lobby loads the versioned Firebase module entry point", () => {
  assert.ok(html.includes('<script type="module" src="./app.js?v='));
  assert.ok(html.includes("</script>"));
});

test("players do not need to paste Firebase JSON", () => {
  const match = app.match(/const DEFAULT_FIREBASE_CONFIG = (\{[\s\S]*?\n\});/);
  assert.ok(match, "DEFAULT_FIREBASE_CONFIG should exist");
  const config = Function("return (" + match[1] + ")")();
  assert.match(config.apiKey, /^AIza[\w-]{35}$/);
  assert.ok(!html.includes("settingsDialog"));
  assert.ok(!html.includes("firebaseConfigInput"));
  assert.ok(!app.includes("parseFirebaseConfig"));
});

test("database rules are valid, do not use unsupported numChildren() and need no sign-in", () => {
  const room = rules.rules.rooms["$roomId"];
  assert.ok(room);
  assert.ok(!rulesText.includes("numChildren"));
  assert.ok(!rulesText.includes("auth"), "game does not use Firebase Authentication");
  assert.ok(room[".validate"].includes("$roomId.matches("), "room code must be validated");
  assert.equal(rules.rules.rooms[".read"], undefined, "rooms must not be listable");
});

test("the game does not depend on Firebase Authentication", () => {
  assert.ok(!app.includes("firebase-auth.js"));
  assert.ok(!app.includes("signInAnonymously"));
});
