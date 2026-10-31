// Kiểm tra hành vi của firebase-database.rules.json bằng bộ mô phỏng tối giản (tests/support/rules-sim.mjs).
// Đây KHÔNG phải Firebase Emulator: hãy chạy thêm Emulator/Rules Playground trước khi phát hành.
import { loadRules } from "./support/rules-sim.mjs";

const file = new URL("../firebase-database.rules.json", import.meta.url).pathname;
const rules = loadRules(file);
const A = "uidAAAAAAAAAAAAAAAAAAAAAAAAA", B = "uidBBBBBBBBBBBBBBBBBBBBBBBBB", C = "uidCCCCCCCCCCCCCCCCCCCCCCCCC";
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

let pass = 0, fail = 0;
function expect(name, uid, oldRoom, newRoom, shouldPass, code = CODE) {
  const res = rules.write(uid, code, oldRoom, newRoom);
  const ok = res.ok === shouldPass;
  ok ? pass++ : fail++;
  console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  (expected ${shouldPass ? "allow" : "deny"}, got ${res.ok ? "allow" : "deny:" + res.reason})`));
}

console.log("== Tạo phòng ==");
expect("tạo phòng hợp lệ", A, null, waiting(), true);
expect("tạo phòng nhưng khai creatorUid là người khác", A, null, { ...waiting(), creatorUid: B }, false);
expect("tạo phòng với mã sai định dạng (có ký tự 0/O)", A, null, waiting(), false, "AB0O12");
expect("tạo phòng với mã quá dài/đường dẫn lạ", A, null, waiting(), false, "ABC234ABC234");
expect("tạo phòng với 1.000.000 tiền khởi điểm", A, null, (() => { const r = waiting(); r.players[A].cash = 1000000; return r; })(), false);
expect("tạo phòng đã ở trạng thái playing", A, null, playing(), false);
expect("tạo phòng chèn thêm người chơi thứ hai", A, null, (() => { const r = waiting(); r.players[B] = player(B, "Binh", "#f18e72"); return r; })(), false);
expect("tạo phòng với màu chứa mã HTML/CSS", A, null, (() => { const r = waiting(); r.players[A].color = 'red;" onmouseover="alert(1)'; return r; })(), false);
expect("tạo phòng với tên dài 40 ký tự", A, null, (() => { const r = waiting(); r.players[A].name = "x".repeat(40); return r; })(), false);
expect("ghi đè phòng đã tồn tại (người lạ)", C, waiting(), waiting(), false);
expect("ghi đè phòng đã tồn tại (chính chủ, đang chờ)", A, waiting(), waiting(), false);

console.log("== Tham gia phòng ==");
expect("người thứ hai vào phòng đang chờ", B, waiting(), playing(), true);
expect("người thứ ba vào phòng đang chờ khi chưa có ai (đóng giả joiner)", C, waiting(), (() => { const r = playing(); r.joinerUid = C; delete r.players[B]; r.players[C] = player(C, "Chi", "#f18e72"); return r; })(), true);
expect("người thứ ba vào phòng đã đủ 2 người", C, playing(), (() => { const r = playing(); r.players[C] = player(C, "Chi", "#aaaaaa"); return r; })(), false);
expect("người thứ ba chiếm chỗ joiner", C, playing(), (() => { const r = playing(); r.joinerUid = C; r.players[C] = player(C, "Chi", "#aaaaaa"); delete r.players[B]; return r; })(), false);
expect("joiner nâng tiền của mình lên 99999 lúc vào", B, waiting(), (() => { const r = playing(); r.players[B].cash = 99999; return r; })(), false);
expect("joiner sửa tiền của người tạo lúc vào", B, waiting(), (() => { const r = playing(); r.players[A].cash = 1; return r; })(), false);
expect("joiner đổi người tạo phòng", B, waiting(), (() => { const r = playing(); r.creatorUid = B; return r; })(), false);
expect("joiner nhét thêm người chơi thứ ba lúc vào", B, waiting(), (() => { const r = playing(); r.players[C] = player(C, "Chi", "#aaaaaa"); return r; })(), false);
expect("người tạo tự vào phòng của mình làm joiner", A, waiting(), (() => { const r = playing(); r.joinerUid = A; delete r.players[B]; return r; })(), false);

console.log("== Đang chơi ==");
const rolled = (() => { const r = playing(); r.players[A].position = 7; r.lastRoll = [3, 4]; r.message = "An tung 3+4"; return r; })();
expect("người có lượt tung xúc xắc", A, playing(), rolled, true);
expect("người KHÔNG có lượt ghi vào phòng", B, playing(), rolled, false);
expect("người ngoài phòng ghi vào phòng", C, playing(), rolled, false);
expect("không đăng nhập ghi vào phòng", null, playing(), rolled, false);
expect("kết thúc lượt (đổi turnUid)", A, rolled, (() => { const r = clone(rolled); r.turnUid = B; r.turnNumber = 2; delete r.lastRoll; return r; })(), true);
expect("đặt lượt cho người không trong phòng", A, rolled, (() => { const r = clone(rolled); r.turnUid = C; return r; })(), false);
expect("mua đất", A, playing(), (() => { const r = playing(); r.propertyOwners = { s3: A }; r.players[A].cash = 1440; return r; })(), true);
expect("gán đất cho người ngoài phòng", A, playing(), (() => { const r = playing(); r.propertyOwners = { s3: C }; return r; })(), false);
expect("ô đất sai khóa (s99)", A, playing(), (() => { const r = playing(); r.propertyOwners = { s99: A }; return r; })(), false);
expect("xúc xắc ngoài khoảng 1..6", A, playing(), (() => { const r = playing(); r.lastRoll = [9, 4]; return r; })(), false);
expect("xúc xắc chứa chuỗi HTML", A, playing(), (() => { const r = playing(); r.lastRoll = ["<img src=x onerror=alert(1)>", 4]; return r; })(), false);
expect("vị trí ngoài bàn cờ", A, playing(), (() => { const r = playing(); r.players[A].position = 55; return r; })(), false);
expect("tiền âm", A, playing(), (() => { const r = playing(); r.players[A].cash = -10; return r; })(), false);
expect("đổi màu quân thành mã HTML", A, playing(), (() => { const r = playing(); r.players[A].color = '"><script>'; return r; })(), false);
expect("đổi người tạo phòng khi đang chơi", A, playing(), (() => { const r = playing(); r.creatorUid = B; return r; })(), false);
expect("đổi joinerUid khi đang chơi", A, playing(), (() => { const r = playing(); r.joinerUid = C; return r; })(), false);
expect("nhét người chơi thứ ba khi đang chơi", A, playing(), (() => { const r = playing(); r.players[C] = player(C, "Chi", "#aaaaaa"); return r; })(), false);
expect("đưa phòng về trạng thái waiting", A, playing(), (() => { const r = playing(); r.status = "waiting"; return r; })(), false);
expect("xóa cả phòng", A, playing(), null, false);
expect("pending hợp lệ", A, playing(), (() => { const r = playing(); r.pending = { uid: A, index: 3 }; return r; })(), true);
expect("pending trỏ ô ngoài bàn cờ", A, playing(), (() => { const r = playing(); r.pending = { uid: A, index: 400 }; return r; })(), false);
expect("tin nhắn quá dài", A, playing(), (() => { const r = playing(); r.message = "x".repeat(400); return r; })(), false);

console.log("== Kết thúc ván ==");
const finished = (() => { const r = playing(); r.status = "finished"; r.winner = B; r.players[A].cash = 0; r.players[A].bankrupt = true; return r; })();
expect("phá sản -> finished + winner", A, playing(), finished, true);
expect("ván đã kết thúc: không ai được ghi tiếp (người thua)", A, finished, (() => { const r = clone(finished); r.status = "playing"; r.players[A].cash = 1500; return r; })(), false);
expect("ván đã kết thúc: người thắng ghi tiếp", B, finished, (() => { const r = clone(finished); r.message = "hack"; return r; })(), false);

console.log("== Đọc ==");
const reads = [["đã đăng nhập đọc phòng", A, true], ["chưa đăng nhập đọc phòng", null, false]];
for (const [name, uid, want] of reads) { const ok = rules.canRead(uid) === want; ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + name); }

console.log(`\nKết quả: ${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);
