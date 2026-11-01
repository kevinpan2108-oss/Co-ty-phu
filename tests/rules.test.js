// Kiểm tra hành vi của firebase-database.rules.json bằng bộ mô phỏng tối giản (tests/support/rules-sim.mjs).
// Đây KHÔNG phải Firebase Emulator: hãy chạy thêm Emulator hoặc Rules Playground trước khi phát hành.
// Game không dùng đăng nhập nên Rules không biết "ai" đang ghi; các ca dưới đây kiểm tra các ràng buộc
// cấu trúc (không đổi được người tạo/người vào, phòng chỉ đi theo chiều chờ → chơi → kết thúc, giá trị hợp lệ...).
import test from "node:test";
import assert from "node:assert/strict";
import { loadRules } from "./support/rules-sim.mjs";

const rules = loadRules(new URL("../firebase-database.rules.json", import.meta.url).pathname);
const A = "pAAAAAAAAAAAAAAAAAAAAAAAA".toLowerCase().slice(0, 24);
const B = "pbbbbbbbbbbbbbbbbbbbbbbb";
const C = "pccccccccccccccccccccccc";
const CODE = "ABC234";
const clone = (o) => JSON.parse(JSON.stringify(o));
const player = (uid, name, color) => ({ uid, name, color, cash: 1500, position: 0, jailTurns: 0 });
const waiting = () => ({
  status: "waiting", creatorUid: A, players: { [A]: player(A, "An", "#d6f06b") }, propertyOwners: {},
  turnUid: A, turnNumber: 1, message: "An đã tạo phòng.", createdAt: 1, updatedAt: 1
});
const playing = () => {
  const r = waiting();
  r.status = "playing"; r.joinerUid = B; r.players[B] = player(B, "Binh", "#f18e72"); r.message = "Bắt đầu";
  return r;
};
const edit = (base, fn) => { const r = clone(base()); fn(r); return r; };
const allowed = (oldRoom, newRoom, code = CODE) => rules.write(null, code, oldRoom, newRoom).ok;

const cases = [
  // [tên, phòng cũ, phòng mới, được phép?, mã phòng]
  ["tạo phòng hợp lệ", null, waiting(), true],
  ["tạo phòng với mã sai định dạng (có 0/O)", null, waiting(), false, "AB0O12"],
  ["tạo phòng với mã quá dài", null, waiting(), false, "ABC234ABC234"],
  ["tạo phòng với mã người chơi sai định dạng", null, edit(waiting, (r) => { r.creatorUid = "x"; r.players = { x: player("x", "An", "#d6f06b") }; r.turnUid = "x"; }), false],
  ["tạo phòng với 1.000.000 tiền", null, edit(waiting, (r) => { r.players[A].cash = 1000000; }), false],
  ["tạo phòng đã ở trạng thái playing", null, playing(), false],
  ["tạo phòng chèn sẵn người chơi thứ hai", null, edit(waiting, (r) => { r.players[B] = player(B, "Binh", "#f18e72"); }), false],
  ["tạo phòng với màu chứa mã HTML/CSS", null, edit(waiting, (r) => { r.players[A].color = 'red;" onmouseover="alert(1)'; }), false],
  ["tạo phòng với tên dài 40 ký tự", null, edit(waiting, (r) => { r.players[A].name = "x".repeat(40); }), false],
  ["xóa cả phòng", waiting(), null, false],
  ["xóa phòng đang chơi", playing(), null, false],
  ["thay phòng đang chờ bằng phòng của người khác", waiting(), edit(waiting, (r) => { r.creatorUid = C; r.players = { [C]: player(C, "Chi", "#d6f06b") }; r.turnUid = C; }), false],

  ["người thứ hai vào phòng đang chờ", waiting(), playing(), true],
  ["người vào nâng tiền của mình lên 99999", waiting(), edit(playing, (r) => { r.players[B].cash = 99999; }), false],
  ["người vào sửa tiền của người tạo", waiting(), edit(playing, (r) => { r.players[A].cash = 1; }), false],
  ["người vào đổi người tạo phòng", waiting(), edit(playing, (r) => { r.creatorUid = B; }), false],
  ["người vào nhét thêm người chơi thứ ba", waiting(), edit(playing, (r) => { r.players[C] = player(C, "Chi", "#aaaaaa"); }), false],
  ["người tạo tự vào phòng của mình", waiting(), edit(playing, (r) => { r.joinerUid = A; delete r.players[B]; }), false],
  ["vào phòng nhưng giữ trạng thái waiting", waiting(), edit(playing, (r) => { r.status = "waiting"; }), false],
  ["người thứ ba chiếm chỗ khi đã đủ 2 người", playing(), edit(playing, (r) => { r.joinerUid = C; r.players[C] = player(C, "Chi", "#aaaaaa"); delete r.players[B]; }), false],
  ["thêm người thứ ba khi đã đủ 2 người", playing(), edit(playing, (r) => { r.players[C] = player(C, "Chi", "#aaaaaa"); }), false],

  ["tung xúc xắc", playing(), edit(playing, (r) => { r.players[A].position = 7; r.lastRoll = [3, 4]; r.message = "An tung 3+4"; }), true],
  ["mua đất", playing(), edit(playing, (r) => { r.propertyOwners = { s3: A }; r.players[A].cash = 1440; }), true],
  ["kết thúc lượt (đổi turnUid)", edit(playing, (r) => { r.lastRoll = [3, 4]; }), edit(playing, (r) => { r.turnUid = B; r.turnNumber = 2; }), true],
  ["pending hợp lệ", playing(), edit(playing, (r) => { r.pending = { uid: A, index: 3 }; }), true],
  ["auction hợp lệ chờ giá đầu tiên", playing(), edit(playing, (r) => { r.auction = { index: 5, turnUid: B, currentBid: 0, highestUid: "", openedByUid: A, passedUid: "" }; }), true],
  ["auction có người trả giá hợp lệ", playing(), edit(playing, (r) => { r.auction = { index: 12, turnUid: A, currentBid: 20, highestUid: B, openedByUid: A, passedUid: "" }; }), true],
  ["auction index ngoài bàn cờ", playing(), edit(playing, (r) => { r.auction = { index: 50, turnUid: B, currentBid: 0, highestUid: "", openedByUid: A, passedUid: "" }; }), false],
  ["auction không được dùng cho ô đất thường", playing(), edit(playing, (r) => { r.auction = { index: 3, turnUid: B, currentBid: 0, highestUid: "", openedByUid: A, passedUid: "" }; }), false],
  ["auction bidder không thuộc phòng", playing(), edit(playing, (r) => { r.auction = { index: 5, turnUid: C, currentBid: 0, highestUid: "", openedByUid: A, passedUid: "" }; }), false],
  ["auction người trả giá cao nhất không thuộc phòng", playing(), edit(playing, (r) => { r.auction = { index: 5, turnUid: B, currentBid: 10, highestUid: C, openedByUid: A, passedUid: "" }; }), false],
  ["auction giá âm", playing(), edit(playing, (r) => { r.auction = { index: 5, turnUid: B, currentBid: -10, highestUid: "", openedByUid: A, passedUid: "" }; }), false],
  ["opening round và kết quả tung hợp lệ", playing(), edit(playing, (r) => { r.openingRound = 1; r.openingRolls = { [A]: [5, 6] }; r.openingLastRoll = { uid: A, round: 1, dice: [5, 6] }; }), true],
  ["opening dice ngoài khoảng 1..6", playing(), edit(playing, (r) => { r.openingRound = 1; r.openingRolls = { [A]: [7, 2] }; }), false],
  ["opening roll người ngoài phòng", playing(), edit(playing, (r) => { r.openingRound = 1; r.openingRolls = { [C]: [2, 3] }; }), false],
  ["người đi trước phải thuộc phòng", playing(), edit(playing, (r) => { r.startPlayerUid = C; }), false],
  ["token ghế nhựa hợp lệ", playing(), edit(playing, (r) => { r.players[A].token = "plastic-chair"; }), true],
  ["token cà phê sữa hợp lệ", playing(), edit(playing, (r) => { r.players[B].token = "vietnamese-coffee"; }), true],
  ["token lạ bị từ chối", playing(), edit(playing, (r) => { r.players[A].token = "tank"; }), false],
  ["phá sản → finished + winner", playing(), edit(playing, (r) => { r.status = "finished"; r.winner = B; r.players[A].cash = 0; r.players[A].bankrupt = true; }), true],
  ["đổi người tạo khi đang chơi", playing(), edit(playing, (r) => { r.creatorUid = B; }), false],
  ["đổi người vào khi đang chơi", playing(), edit(playing, (r) => { r.joinerUid = C; }), false],
  ["đưa phòng về waiting", playing(), edit(playing, (r) => { r.status = "waiting"; }), false],
  ["đặt lượt cho người không trong phòng", playing(), edit(playing, (r) => { r.turnUid = C; }), false],
  ["lùi số lượt", edit(playing, (r) => { r.turnNumber = 5; }), edit(playing, (r) => { r.turnNumber = 2; }), false],
  ["gán đất cho người ngoài phòng", playing(), edit(playing, (r) => { r.propertyOwners = { s3: C }; }), false],
  ["ô đất sai khóa (s99)", playing(), edit(playing, (r) => { r.propertyOwners = { s99: A }; }), false],
  ["xúc xắc ngoài khoảng 1..6", playing(), edit(playing, (r) => { r.lastRoll = [9, 4]; }), false],
  ["xúc xắc chứa chuỗi HTML", playing(), edit(playing, (r) => { r.lastRoll = ["<img src=x onerror=alert(1)>", 4]; }), false],
  ["vị trí ngoài bàn cờ", playing(), edit(playing, (r) => { r.players[A].position = 55; }), false],
  ["tiền âm", playing(), edit(playing, (r) => { r.players[A].cash = -10; }), false],
  ["đổi màu quân thành mã HTML", playing(), edit(playing, (r) => { r.players[A].color = '"><script>'; }), false],
  ["pending trỏ ô ngoài bàn cờ", playing(), edit(playing, (r) => { r.pending = { uid: A, index: 400 }; }), false],
  ["tin nhắn quá dài", playing(), edit(playing, (r) => { r.message = "x".repeat(400); }), false],

  ["ván đã kết thúc: mở lại thành playing", edit(playing, (r) => { r.status = "finished"; r.winner = B; }), edit(playing, (r) => { r.status = "playing"; }), false],
  ["ván đã kết thúc: sửa tiếp", edit(playing, (r) => { r.status = "finished"; r.winner = B; }), edit(playing, (r) => { r.status = "finished"; r.winner = B; r.message = "hack"; }), false]
];

for (const [name, oldRoom, newRoom, want, code] of cases) {
  test("rules: " + name, () => assert.equal(allowed(oldRoom, newRoom, code), want));
}

test("rules: ai cũng đọc được phòng khi biết mã, nhưng không có quyền liệt kê danh sách phòng", () => {
  assert.equal(rules.canRead(null), true);
  const raw = JSON.parse(JSON.stringify(rules.raw));
  assert.equal(raw.rules[".read"], undefined);
  assert.equal(raw.rules.rooms[".read"], undefined);
});
