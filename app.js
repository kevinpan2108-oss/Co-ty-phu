import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

// Public Firebase Web App configuration for this game.
// Realtime Database is hosted in asia-southeast1 (Singapore).
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAECssZ_j6yvb9aYagqw6yh9kFfadIJFw8",
  authDomain: "cotyphuonline-8f536.firebaseapp.com",
  databaseURL: "https://cotyphuonline-8f536-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cotyphuonline-8f536",
  storageBucket: "cotyphuonline-8f536.firebasestorage.app",
  messagingSenderId: "901354948118",
  appId: "1:901354948118:web:eb7eeb61580816136f5737",
  measurementId: "G-5DR33JFZYB"
};

const $ = (id) => document.getElementById(id);
const ROOM_ROOT = "rooms";
const APP_NAME = "co-ty-phu";
const LAST_ROOM_KEY = "ctp-last-room";
const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const FALLBACK_COLOR = "#b9b59b";
const START_CASH = 1500;
const SALARY = 200;
const JAIL_FEE = 50;
const TOKEN_COLORS = ["#d6f06b", "#f18e72"];
const SPACE_DATA = [
  {name:"XUẤT PHÁT",type:"start",icon:"🏁",corner:true},
  {name:"Đường Lê Lợi",type:"property",price:60,rent:10,color:"#9b8067",group:"Nâu"},
  {name:"CƠ HỘI",type:"chance",icon:"🎴"},
  {name:"Đường Đồng Khởi",type:"property",price:60,rent:20,color:"#9b8067",group:"Nâu"},
  {name:"THUẾ THU NHẬP",type:"tax",icon:"🧾",amount:100},
  {name:"Ga Sài Gòn",type:"station",price:200,rent:40,color:"#343f48",icon:"🚉"},
  {name:"Đường Hai Bà Trưng",type:"property",price:100,rent:30,color:"#83c6d2",group:"Xanh biển"},
  {name:"CƠ HỘI",type:"chance",icon:"🎴"},
  {name:"Đường Pasteur",type:"property",price:100,rent:40,color:"#83c6d2",group:"Xanh biển"},
  {name:"Đường Nguyễn Huệ",type:"property",price:120,rent:50,color:"#83c6d2",group:"Xanh biển"},
  {name:"VÀO TÙ / THĂM TÙ",type:"jail",icon:"🔒",corner:true},
  {name:"Đường Trần Hưng Đạo",type:"property",price:140,rent:60,color:"#d77e85",group:"Hồng"},
  {name:"Công ty Điện lực",type:"utility",price:150,rent:50,color:"#e5d79d",icon:"💡"},
  {name:"Đường Nguyễn Trãi",type:"property",price:140,rent:70,color:"#d77e85",group:"Hồng"},
  {name:"Đường Cách Mạng Tháng 8",type:"property",price:160,rent:80,color:"#d77e85",group:"Hồng"},
  {name:"Ga Hà Nội",type:"station",price:200,rent:40,color:"#343f48",icon:"🚉"},
  {name:"Đường Bạch Đằng",type:"property",price:180,rent:90,color:"#eea56e",group:"Cam"},
  {name:"CƠ HỘI",type:"chance",icon:"🎴"},
  {name:"Đường Trần Phú",type:"property",price:180,rent:100,color:"#eea56e",group:"Cam"},
  {name:"Đường Lý Thường Kiệt",type:"property",price:200,rent:110,color:"#eea56e",group:"Cam"},
  {name:"BÃI ĐỖ XE MIỄN PHÍ",type:"free",icon:"🅿️",corner:true},
  {name:"Đường Hùng Vương",type:"property",price:220,rent:120,color:"#e66f56",group:"Đỏ"},
  {name:"CƠ HỘI",type:"chance",icon:"🎴"},
  {name:"Đường Phan Đình Phùng",type:"property",price:220,rent:130,color:"#e66f56",group:"Đỏ"},
  {name:"Đường Điện Biên Phủ",type:"property",price:240,rent:140,color:"#e66f56",group:"Đỏ"},
  {name:"Ga Đà Nẵng",type:"station",price:200,rent:40,color:"#343f48",icon:"🚉"},
  {name:"Đường Trần Hưng Đạo (ĐN)",type:"property",price:260,rent:150,color:"#e6d36e",group:"Vàng"},
  {name:"Đường Bạch Đằng (ĐN)",type:"property",price:260,rent:160,color:"#e6d36e",group:"Vàng"},
  {name:"Công ty Cấp nước",type:"utility",price:150,rent:50,color:"#e5d79d",icon:"💧"},
  {name:"Đường Nguyễn Văn Linh",type:"property",price:280,rent:170,color:"#e6d36e",group:"Vàng"},
  {name:"ĐI THẲNG VÀO TÙ",type:"gotojail",icon:"🚓",corner:true},
  {name:"Đường Võ Nguyên Giáp",type:"property",price:300,rent:180,color:"#76b889",group:"Xanh lá"},
  {name:"Đường Trần Phú (PQ)",type:"property",price:300,rent:190,color:"#76b889",group:"Xanh lá"},
  {name:"CƠ HỘI",type:"chance",icon:"🎴"},
  {name:"Đường Bãi Trường",type:"property",price:320,rent:200,color:"#76b889",group:"Xanh lá"},
  {name:"Ga Phú Quốc",type:"station",price:200,rent:40,color:"#343f48",icon:"🚉"},
  {name:"CƠ HỘI",type:"chance",icon:"🎴"},
  {name:"Đường Sunset Town",type:"property",price:350,rent:220,color:"#8a79bb",group:"Tím"},
  {name:"THUẾ ĐẶC BIỆT",type:"tax",icon:"🧾",amount:100},
  {name:"Đường Cầu Hôn",type:"property",price:400,rent:250,color:"#8a79bb",group:"Tím"}
];
const CHANCE_CARDS = [
  {text:"Bạn nhận được cổ tức đầu tư. Nhận $100.",amount:100},
  {text:"Sửa chữa nhà cửa. Trả $80.",amount:-80},
  {text:"Trúng thưởng cuộc thi. Nhận $150.",amount:150},
  {text:"Phí dịch vụ bất ngờ. Trả $50.",amount:-50},
  {text:"Một người bạn trả nợ. Nhận $60.",amount:60},
  {text:"Đóng góp quỹ cộng đồng. Trả $100.",amount:-100}
];

let firebaseApp = null;
let auth = null;
let db = null;
let currentUser = null;
let currentRoomCode = null;
let roomState = null;
let unsubscribeRoom = null;
let busy = false;

function setMessage(id, message, isError = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = message || "";
  el.style.color = isError ? "#f18e72" : "";
}
function setConnection(online, message) {
  const badge = $("connectionBadge");
  badge.classList.toggle("online", !!online);
  badge.classList.toggle("offline", !online);
  badge.lastChild.textContent = message;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function money(value) {
  return "$" + Number(value || 0).toLocaleString("en-US");
}
// Dữ liệu phòng do trình duyệt của người chơi ghi lên, nên mọi giá trị đưa vào innerHTML/style phải được kiểm tra.
function safeColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value)) ? String(value) : FALLBACK_COLOR;
}
function cleanName(value, fallback) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 18) || fallback;
}
function store(op, key, value) {
  try {
    if (op === "set") localStorage.setItem(key, value);
    else if (op === "remove") localStorage.removeItem(key);
    else return localStorage.getItem(key);
  } catch { /* chế độ riêng tư có thể chặn localStorage */ }
  return null;
}
function describeSpace(index) {
  const space = SPACE_DATA[index];
  if (!space) return "";
  const ownerUid = roomState?.propertyOwners?.[getSpaceId(index)];
  const owner = ownerUid ? roomState?.players?.[ownerUid] : null;
  const parts = [space.name];
  if (space.price) parts.push("giá " + money(space.price));
  if (space.type === "station") parts.push("thuê $40, gấp đôi cho mỗi ga sở hữu thêm");
  else if (space.type === "utility") parts.push("thuê 4× điểm xúc xắc (10× nếu có cả hai công ty)");
  else if (space.rent) parts.push("thuê " + money(space.rent));
  if (space.type === "tax") parts.push("nộp " + money(space.amount));
  if (owner) parts.push("chủ: " + owner.name);
  return parts.join(" · ");
}
function getSpaceId(index) {
  return "s" + index;
}
function getPlayerEntries(room) {
  return Object.entries(room?.players || {});
}
function myPlayer() {
  return roomState?.players?.[currentUser?.uid] || null;
}
function otherPlayerUid(room = roomState) {
  return getPlayerEntries(room).find(([uid]) => uid !== currentUser?.uid)?.[0] || null;
}
function setBusy(value) {
  busy = value;
  ["createRoomButton","joinRoomButton"].forEach((id) => { $(id).disabled = value; });
  if (roomState) renderRoom();
}
function notify(text) {
  $("gameNotice").textContent = text || "";
  setTimeout(() => { if ($("gameNotice").textContent === text) $("gameNotice").textContent = ""; }, 5500);
}

function explainFirebaseError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || error || "");
  const hint = {
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "apiKey Firebase không đúng (sai ký tự hoặc sai hoa/thường). Hãy sao chép lại apiKey từ Firebase Console → Project settings → Your apps.",
    "auth/invalid-api-key": "apiKey Firebase không đúng. Hãy sao chép lại apiKey từ Firebase Console → Project settings → Your apps.",
    "auth/operation-not-allowed": "Chưa bật đăng nhập Ẩn danh: Firebase Console → Authentication → Sign-in method → Anonymous → Enable.",
    "auth/admin-restricted-operation": "Chưa bật đăng nhập Ẩn danh: Firebase Console → Authentication → Sign-in method → Anonymous → Enable.",
    "auth/network-request-failed": "Không kết nối được tới Firebase. Hãy kiểm tra mạng rồi thử lại.",
    "auth/too-many-requests": "Firebase tạm khóa do thử quá nhiều lần. Hãy đợi vài phút.",
    "auth/requests-from-referer-" : ""
  }[code];
  if (hint) return hint + " (" + code + ")";
  if (/referer|referrer/i.test(code + message)) return "apiKey đang bị giới hạn tên miền. Hãy thêm tên miền của game vào Google Cloud → APIs & Services → Credentials → API key → Website restrictions. (" + code + ")";
  if (/permission[_ ]denied/i.test(code + message)) return "Firebase Rules từ chối thao tác. Hãy Publish file firebase-database.rules.json trong Realtime Database → Rules.";
  return (code ? "[" + code + "] " : "") + message;
}
async function disconnectFirebase() {
  if (currentRoomCode) leaveRoom();
  const app = firebaseApp;
  firebaseApp = null; auth = null; db = null; currentUser = null;
  if (app) { try { await deleteApp(app); } catch { /* app đã bị đóng */ } }
}
async function connectFirebase(config) {
  if (!config?.apiKey || !config?.databaseURL || !config?.projectId || !config?.appId) {
    throw new Error("Thiếu apiKey, databaseURL, projectId hoặc appId trong Firebase config.");
  }
  await disconnectFirebase();
  setConnection(false, "Đang kết nối...");
  // Tên app CỐ ĐỊNH: Firebase Auth lưu tài khoản ẩn danh theo tên app. Nếu tên đổi mỗi lần tải
  // trang thì mỗi lần F5 sẽ thành một uid mới và người chơi mất chỗ trong phòng.
  firebaseApp = initializeApp(config, APP_NAME);
  auth = getAuth(firebaseApp);
  db = getDatabase(firebaseApp);
  const credential = await signInAnonymously(auth);
  currentUser = credential.user;
  let everConnected = false;
  onValue(ref(db, ".info/connected"), (snapshot) => {
    const online = snapshot.val() === true;
    everConnected = everConnected || online;
    setConnection(online, online ? "Đã kết nối" : everConnected ? "Mất kết nối, đang thử lại..." : "Đang kết nối...");
  });
  return currentUser;
}
async function requireConnection() {
  if (db && currentUser) return true;
  if (connectionPromise) {
    try { await connectionPromise; } catch { /* lỗi đã được ghi vào firebaseError */ }
  } else {
    await connectGame(); // lần trước thất bại: thử lại ngay khi người chơi bấm nút
  }
  if (db && currentUser) return true;
  setMessage("lobbyMessage", "Chưa kết nối được máy chủ online: " + firebaseError, true);
  return false;
}
function openRoom(code) {
  if (unsubscribeRoom) unsubscribeRoom();
  currentRoomCode = code;
  store("set", LAST_ROOM_KEY, code);
  setMessage("lobbyMessage", "");
  roomState = null;
  $("lobbyView").classList.add("hidden");
  $("gameView").classList.remove("hidden");
  $("roomCodeLabel").textContent = code;
  $("centerStatus").textContent = "ĐANG KẾT NỐI PHÒNG...";
  unsubscribeRoom = onValue(ref(db, `${ROOM_ROOT}/${code}`), (snapshot) => {
    if (!snapshot.exists()) {
      leaveRoom("Phòng không còn tồn tại.");
      return;
    }
    roomState = snapshot.val();
    renderRoom();
  }, (error) => {
    notify("Không thể đọc phòng: " + explainFirebaseError(error));
  });
}
function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length:6}, () => alphabet[Math.floor(Math.random()*alphabet.length)]).join("");
}
async function createRoom() {
  if (busy) return;
  setBusy(true);
  try {
    if (!(await requireConnection())) return;
    const name = cleanName($("playerName").value, "Người chơi 1");
    const uid = currentUser.uid;
    let code = null;
    // Giữ chỗ mã phòng bằng transaction để mã mới sinh không bao giờ ghi đè phòng của người khác.
    for (let attempt = 0; attempt < 10 && !code; attempt++) {
      const candidate = generateRoomCode();
      const room = {
        status:"waiting",
        creatorUid:uid,
        joinerUid:null,
        players:{
          [uid]:{uid,name,color:TOKEN_COLORS[0],cash:START_CASH,position:0,jailTurns:0}
        },
        propertyOwners:{},
        turnUid:uid,
        turnNumber:1,
        lastRoll:null,
        pending:null,
        message:name+" đã tạo phòng. Đang chờ người chơi thứ hai...",
        createdAt:Date.now(),
        updatedAt:Date.now()
      };
      const result = await runTransaction(ref(db, `${ROOM_ROOT}/${candidate}`), (existing) => {
        if (existing !== null) return;
        return room;
      }, {applyLocally:false});
      if (result.committed) code = candidate;
    }
    if (!code) throw new Error("Chưa tạo được mã phòng trống. Vui lòng thử lại.");
    openRoom(code);
  } catch (error) {
    setMessage("lobbyMessage", "Không tạo được phòng: " + explainFirebaseError(error), true);
  } finally {
    setBusy(false);
  }
}
async function joinRoom() {
  if (busy) return;
  const code = $("roomCodeInput").value.trim().toUpperCase();
  if (!ROOM_CODE_PATTERN.test(code)) {
    setMessage("lobbyMessage", "Mã phòng cần có 6 ký tự (không gồm I, O, 0, 1).", true);
    return;
  }
  const name = cleanName($("playerName").value, "Người chơi 2");
  setBusy(true);
  try {
    if (!(await requireConnection())) return;
    const roomRef = ref(db, `${ROOM_ROOT}/${code}`);
    const uid = currentUser.uid;
    const existing = await get(roomRef);
    if (!existing.exists()) throw new Error("Không tìm thấy phòng " + code + ". Hãy kiểm tra lại mã phòng.");
    const data = existing.val();
    // Đã là thành viên (vào lại phòng sau khi tải lại trang): không cần ghi gì.
    if (!data.players?.[uid]) {
      if (data.status !== "waiting" || data.joinerUid) throw new Error("Phòng này đã đủ 2 người hoặc ván đã bắt đầu.");
      const result = await runTransaction(roomRef, (room) => {
        // Lần gọi đầu tiên SDK có thể đưa vào null vì chưa có dữ liệu trong cache. Phải trả lại null
        // (không phải undefined) để SDK lấy dữ liệu thật từ server rồi gọi lại hàm này;
        // trả undefined sẽ hủy giao dịch ngay và lần tham gia nào cũng "thất bại".
        if (room === null) return room;
        if (room.players?.[uid]) return room;
        if (room.status !== "waiting" || room.joinerUid) return;
        if (!room.creatorUid || room.creatorUid === uid) return;
        const creatorName = room.players?.[room.creatorUid]?.name;
        const joinName = name === creatorName ? name.slice(0, 14) + " (2)" : name;
        room.players = room.players || {};
        room.players[uid] = {uid,name:joinName,color:TOKEN_COLORS[1],cash:START_CASH,position:0,jailTurns:0};
        room.joinerUid = uid;
        room.status = "playing";
        room.message = joinName+" đã tham gia. Cuộc chơi bắt đầu!";
        room.updatedAt = Date.now();
        return room;
      }, {applyLocally:false});
      if (!result.committed || !result.snapshot.val()?.players?.[uid]) {
        throw new Error("Không vào được phòng: phòng đã đủ 2 người hoặc ván đã bắt đầu.");
      }
    }
    openRoom(code);
  } catch (error) {
    setMessage("lobbyMessage", explainFirebaseError(error), true);
  } finally {
    setBusy(false);
  }
}
function leaveRoom(message) {
  if (unsubscribeRoom) unsubscribeRoom();
  unsubscribeRoom = null;
  currentRoomCode = null;
  roomState = null;
  store("remove", LAST_ROOM_KEY);
  $("gameView").classList.add("hidden");
  $("lobbyView").classList.remove("hidden");
  $("gameNotice").textContent = "";
  if (typeof message === "string") setMessage("lobbyMessage", message);
}
async function resumeLastRoom() {
  const code = store("get", LAST_ROOM_KEY);
  if (!code || !ROOM_CODE_PATTERN.test(code)) return;
  try {
    const snapshot = await get(ref(db, `${ROOM_ROOT}/${code}`));
    if (snapshot.exists() && snapshot.val().players?.[currentUser.uid]) { openRoom(code); return; }
  } catch { /* không đọc được phòng cũ: bỏ qua và về sảnh */ }
  store("remove", LAST_ROOM_KEY);
}
function getBoardCoords(index) {
  if (index === 0) return [10,10];
  if (index <= 9) return [10,10-index];
  if (index === 10) return [10,0];
  if (index <= 19) return [20-index,0];
  if (index === 20) return [0,0];
  if (index <= 29) return [0,index-20];
  if (index === 30) return [0,10];
  return [index-30,10];
}
function renderBoard() {
  const board = $("board");
  board.querySelectorAll(".space").forEach((el) => el.remove());
  const center = board.querySelector(".board-center");
  SPACE_DATA.forEach((space,index) => {
    const [row,col] = getBoardCoords(index);
    const ownerUid = roomState?.propertyOwners?.[getSpaceId(index)];
    const owner = ownerUid ? roomState?.players?.[ownerUid] : null;
    const tokens = getPlayerEntries(roomState).filter(([,p]) => Number(p.position) === index);
    const div = document.createElement("div");
    div.className = "space" + (space.corner ? " corner" : "");
    div.style.gridRow = String(row+1);
    div.style.gridColumn = String(col+1);
    const icon = space.icon || (space.type === "property" ? "🏠" : space.type === "station" ? "🚉" : space.type === "utility" ? "⚡" : "");
    const colorBar = space.color || (space.type === "property" ? "#9b8067" : "transparent");
    const price = space.price ? money(space.price) : space.amount ? money(space.amount) : "";
    const description = describeSpace(index);
    div.dataset.index = String(index);
    div.title = description;
    div.setAttribute("aria-label", description);
    div.innerHTML = `
      <span class="space-color" style="background:${colorBar}"></span>
      ${icon ? `<span class="space-icon">${icon}</span>` : ""}
      <span class="space-name">${escapeHtml(space.name)}</span>
      ${price && !space.corner ? `<span class="space-price">${price}</span>` : ""}
      ${owner ? `<span class="owned-mark" style="background:${safeColor(owner.color)}"></span>` : ""}
      <span class="space-players">${tokens.map(([,p])=>`<i class="token" title="${escapeHtml(p.name)}" style="background:${safeColor(p.color)}"></i>`).join("")}</span>
    `;
    board.insertBefore(div, center);
  });
  center.style.zIndex = "0";
}
function renderPlayers() {
  const entries = getPlayerEntries(roomState);
  $("playersPanel").innerHTML = entries.map(([uid,p]) => {
    const isTurn = roomState.turnUid === uid;
    const isMe = uid === currentUser.uid;
    const space = SPACE_DATA[Number(p.position)]?.name || "—";
    return `<div class="player-card ${isTurn?"active":""}">
      <div class="player-head"><i class="player-dot" style="background:${safeColor(p.color)}"></i><span class="player-name">${escapeHtml(p.name)}</span>${isMe?'<span class="you-label">BẠN</span>':""}</div>
      <div class="player-cash">${money(p.cash)}</div>
      <p class="player-position">${escapeHtml(space)} ${p.jailTurns ? "· Đang ở tù" : ""}</p>
    </div>`;
  }).join("");
  const turnPlayer = roomState.players?.[roomState.turnUid];
  const waitingForOpponent = roomState.status === "waiting";
  $("turnName").textContent = waitingForOpponent || !turnPlayer ? "Chờ đối thủ..." : turnPlayer.name;
  // Màu quân cờ phụ thuộc vào việc là người tạo hay người vào phòng, nên chú giải phải lấy màu thật.
  const opponent = roomState.players?.[otherPlayerUid()];
  $("legendMine").style.color = safeColor(myPlayer()?.color);
  $("legendOpponent").style.color = safeColor(opponent?.color || TOKEN_COLORS[1]);
}
function renderProperties() {
  const ownerMap = roomState.propertyOwners || {};
  const owned = Object.entries(ownerMap).map(([id,uid]) => {
    const index = Number(id.slice(1));
    return {space:SPACE_DATA[index],uid};
  }).filter(item => item.space);
  if (!owned.length) {
    $("propertyList").innerHTML = '<div class="empty-properties">Chưa có bất động sản nào được mua.<br>Hãy tung xúc xắc để sở hữu mảnh đất đầu tiên!</div>';
    return;
  }
  $("propertyList").innerHTML = owned.map(({space,uid}) => {
    const player = roomState.players?.[uid];
    return `<div class="property-row"><i class="property-swatch" style="background:${space.color || "#b9b59b"}"></i><div><strong>${escapeHtml(space.name)}</strong><small>${escapeHtml(player?.name || "Người chơi")} · ${space.type === "station" ? "Thuê từ $40" : space.type === "utility" ? "Thuê 4× xúc xắc" : "Thuê " + money(space.rent || 50)}</small></div></div>`;
  }).join("");
}
function renderActions() {
  const mine = myPlayer();
  const isMyTurn = roomState.turnUid === currentUser.uid;
  const playing = roomState.status === "playing" && getPlayerEntries(roomState).length === 2;
  const pending = roomState.pending;
  const dice = roomState.lastRoll;
  $("diceResult").innerHTML = dice ? `<span>${Number(dice[0]) || 0}</span><span>${Number(dice[1]) || 0}</span>` : "<span>⚄</span><span>⚄</span>";
  $("actionMessage").textContent = roomState.message || (roomState.status === "waiting" ? "Đang chờ người chơi thứ hai..." : "Đến lượt bạn!");
  const buttons = $("pendingActions");
  buttons.innerHTML = "";
  if (pending?.uid === currentUser.uid && SPACE_DATA[pending.index]) {
    const space = SPACE_DATA[pending.index];
    const buy = document.createElement("button");
    buy.className = "primary-button";
    buy.textContent = "Mua " + money(space.price);
    buy.disabled = busy || mine.cash < space.price;
    buy.addEventListener("click", buyProperty);
    const pass = document.createElement("button");
    pass.className = "secondary-button";
    pass.textContent = "Bỏ qua";
    pass.disabled = busy;
    pass.addEventListener("click", passProperty);
    buttons.append(buy,pass);
  }
  // Chỉ được nộp phạt ra tù ở ĐẦU lượt (chưa có xúc xắc). Nếu vừa bị đưa vào tù trong lượt này
  // (đã có lastRoll) thì phải kết thúc lượt, nếu không việc "mất một lượt" bị bỏ qua.
  const canPayJail = Number(mine?.jailTurns || 0) > 0 && !dice;
  $("rollButton").textContent = canPayJail ? "🔓 Trả $" + JAIL_FEE + " để ra tù" : "🎲 Tung xúc xắc";
  $("rollButton").disabled = busy || !playing || !isMyTurn || !!pending || !!dice || roomState.status === "finished";
  $("endTurnButton").disabled = busy || !playing || !isMyTurn || !!pending || !dice || roomState.status === "finished";
  if (roomState.status === "waiting") {
    $("centerStatus").textContent = "CHỜ NGƯỜI CHƠI THỨ HAI";
  } else if (roomState.status === "finished") {
    $("centerStatus").textContent = "VÁN ĐẤU KẾT THÚC";
  } else {
    $("centerStatus").textContent = isMyTurn ? "ĐẾN LƯỢT BẠN" : "ĐỢI ĐỐI THỦ...";
  }
  if (roomState.status === "finished" && roomState.winner) {
    $("actionMessage").textContent = "🏆 " + (roomState.players?.[roomState.winner]?.name || "Người chơi") + " chiến thắng!";
  }
}
function renderRoom() {
  if (!roomState || !currentUser) return;
  $("roomCodeLabel").textContent = currentRoomCode;
  renderPlayers();
  renderBoard();
  renderProperties();
  renderActions();
}

async function rollDice() {
  if (!roomState || busy) return;
  const mine = myPlayer();
  if (mine?.jailTurns) return releaseFromJail();
  setBusy(true);
  try {
    const dice = [1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];
    const uid = currentUser.uid;
    const result = await runTransaction(ref(db, `${ROOM_ROOT}/${currentRoomCode}`), (room) => {
      if (room === null) return room; // SDK chưa có dữ liệu: yêu cầu nạp từ server rồi gọi lại
      if (!room || room.status !== "playing" || room.turnUid !== uid || room.pending || room.lastRoll) return;
      const player = room.players?.[uid];
      if (!player || player.jailTurns) return;
      const total = dice[0]+dice[1];
      const oldPos = Number(player.position || 0);
      const newPos = (oldPos + total) % 40;
      if (oldPos + total >= 40) player.cash += SALARY;
      player.position = newPos;
      room.lastRoll = dice;
      room.pending = null;
      const space = SPACE_DATA[newPos];
      const id = getSpaceId(newPos);
      let text = player.name + " tung được " + dice[0] + " + " + dice[1] + " và đến " + space.name + ".";
      if (space.type === "property" || space.type === "station" || space.type === "utility") {
        const ownerUid = room.propertyOwners?.[id];
        if (!ownerUid) {
          room.pending = {uid,index:newPos};
          text += " Mảnh đất này chưa có chủ. Bạn có muốn mua không?";
        } else if (ownerUid !== uid) {
          const owner = room.players[ownerUid];
          let rent = space.rent || 50;
          if (space.type === "station") {
            const stationCount = Object.keys(room.propertyOwners || {}).filter(key => {
              const i=Number(key.slice(1)); return SPACE_DATA[i]?.type==="station" && room.propertyOwners[key]===ownerUid;
            }).length;
            rent = 40 * Math.pow(2,Math.max(0,stationCount-1));
          } else if (space.type === "utility") {
            const utilityCount = Object.keys(room.propertyOwners || {}).filter(key => {
              const i=Number(key.slice(1)); return SPACE_DATA[i]?.type==="utility" && room.propertyOwners[key]===ownerUid;
            }).length;
            rent = total * (utilityCount > 1 ? 10 : 4);
          }
          const paid = Math.min(Number(player.cash||0),rent);
          player.cash -= paid;
          owner.cash = Number(owner.cash||0) + paid;
          text += " Trả " + money(rent) + " tiền thuê cho " + owner.name + ".";
          if (paid < rent) {
            player.cash = 0; player.bankrupt = true;
            room.status = "finished"; room.winner = ownerUid;
            text = player.name + " phá sản! " + owner.name + " chiến thắng.";
          }
        } else {
          text += " Đây là tài sản của bạn.";
        }
      } else if (space.type === "tax") {
        player.cash -= space.amount;
        text += " Bạn phải nộp " + money(space.amount) + " tiền thuế.";
        if (player.cash < 0) { player.cash=0; player.bankrupt=true; room.status="finished"; room.winner=otherPlayerUid(room); }
      } else if (space.type === "chance") {
        const card = CHANCE_CARDS[Math.floor(Math.random()*CHANCE_CARDS.length)];
        player.cash += card.amount;
        text += " " + card.text;
        if (player.cash < 0) { player.cash=0; player.bankrupt=true; room.status="finished"; room.winner=otherPlayerUid(room); }
      } else if (space.type === "gotojail") {
        player.position = 10; player.jailTurns = 1;
        text += " Bạn phải vào tù!";
      } else if (space.type === "start") {
        text += " Bạn dừng ngay tại Xuất phát.";
      } else if (space.type === "free") {
        text += " Nghỉ chân một lượt.";
      } else if (space.type === "jail") {
        text += " Bạn chỉ ghé thăm nhà tù.";
      }
      room.message = text;
      room.updatedAt = Date.now();
      return room;
    }, {applyLocally:false});
    if (!result.committed) notify("Chưa thể tung xúc xắc. Hãy kiểm tra lượt chơi.");
  } catch (error) {
    notify("Lỗi khi tung xúc xắc: " + explainFirebaseError(error));
  } finally {
    setBusy(false);
  }
}
async function releaseFromJail() {
  setBusy(true);
  try {
    const uid = currentUser.uid;
    await runTransaction(ref(db, `${ROOM_ROOT}/${currentRoomCode}`), (room) => {
      if (room === null) return room; // SDK chưa có dữ liệu: yêu cầu nạp từ server rồi gọi lại
      // lastRoll != null nghĩa là người chơi vừa bị đưa vào tù ngay trong lượt này: chưa được nộp phạt.
      if (!room || room.turnUid !== uid || room.status !== "playing" || room.lastRoll || room.pending) return;
      const player = room.players?.[uid];
      if (!player?.jailTurns) return;
      if (player.cash < JAIL_FEE) {
        player.jailTurns = 0;
        room.message = player.name + " không đủ tiền nộp phạt, được thả nhưng mất lượt.";
      } else {
        player.cash -= JAIL_FEE;
        player.jailTurns = 0;
        room.message = player.name + " đã nộp " + money(JAIL_FEE) + " và ra tù. Lượt này kết thúc.";
      }
      room.turnUid = Object.keys(room.players).find(id => id !== uid);
      room.turnNumber = Number(room.turnNumber||1)+1;
      room.lastRoll = null;
      room.updatedAt = Date.now();
      return room;
    }, {applyLocally:false});
  } catch (error) { notify("Không thể xử lý ra tù: "+explainFirebaseError(error)); }
  finally { setBusy(false); }
}
async function buyProperty() {
  if (!roomState?.pending) return;
  setBusy(true);
  try {
    const uid = currentUser.uid;
    await runTransaction(ref(db, `${ROOM_ROOT}/${currentRoomCode}`), (room) => {
      if (room === null) return room; // SDK chưa có dữ liệu: yêu cầu nạp từ server rồi gọi lại
      if (!room || room.turnUid !== uid || room.pending?.uid !== uid) return;
      const space = SPACE_DATA[room.pending.index];
      const player = room.players?.[uid];
      const key = getSpaceId(room.pending.index);
      if (!space?.price || !player || room.propertyOwners?.[key] || player.cash < space.price) return;
      player.cash -= space.price;
      room.propertyOwners = room.propertyOwners || {};
      room.propertyOwners[key] = uid;
      room.pending = null;
      room.message = player.name + " đã mua " + space.name + " với giá " + money(space.price) + ".";
      room.updatedAt = Date.now();
      return room;
    }, {applyLocally:false});
  } catch (error) { notify("Không mua được đất: "+explainFirebaseError(error)); }
  finally { setBusy(false); }
}
async function passProperty() {
  setBusy(true);
  try {
    await runTransaction(ref(db, `${ROOM_ROOT}/${currentRoomCode}`), (room) => {
      if (room === null) return room; // SDK chưa có dữ liệu: yêu cầu nạp từ server rồi gọi lại
      if (!room || room.turnUid !== currentUser.uid || room.pending?.uid !== currentUser.uid) return;
      room.pending = null;
      room.message = room.players[currentUser.uid].name + " quyết định không mua mảnh đất này.";
      room.updatedAt = Date.now();
      return room;
    }, {applyLocally:false});
  } catch (error) { notify("Không thể bỏ qua: "+explainFirebaseError(error)); }
  finally { setBusy(false); }
}
async function endTurn() {
  setBusy(true);
  try {
    const uid = currentUser.uid;
    await runTransaction(ref(db, `${ROOM_ROOT}/${currentRoomCode}`), (room) => {
      if (room === null) return room; // SDK chưa có dữ liệu: yêu cầu nạp từ server rồi gọi lại
      if (!room || room.status !== "playing" || room.turnUid !== uid || room.pending || !room.lastRoll) return;
      const player = room.players?.[uid];
      const nextUid = Object.keys(room.players||{}).find(id => id !== uid);
      room.turnUid = nextUid;
      room.turnNumber = Number(room.turnNumber||1)+1;
      room.lastRoll = null;
      room.message = "Đến lượt " + (room.players?.[nextUid]?.name || "người chơi tiếp theo") + ".";
      room.updatedAt = Date.now();
      return room;
    }, {applyLocally:false});
  } catch (error) { notify("Không thể kết thúc lượt: "+explainFirebaseError(error)); }
  finally { setBusy(false); }
}

$("createRoomButton").addEventListener("click", createRoom);
$("joinRoomButton").addEventListener("click", joinRoom);
$("rollButton").addEventListener("click", rollDice);
$("endTurnButton").addEventListener("click", endTurn);
$("leaveRoomButton").addEventListener("click", () => leaveRoom());
$("board").addEventListener("click", (event) => {
  // Trên điện thoại ô quá nhỏ để hiện tên: chạm vào ô để xem thông tin.
  const cell = event.target.closest(".space");
  if (cell && roomState) notify(describeSpace(Number(cell.dataset.index)));
});
$("copyRoomButton").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(currentRoomCode);
    notify("Đã sao chép mã phòng " + currentRoomCode + ".");
  } catch { notify("Mã phòng của bạn: " + currentRoomCode); }
});
$("roomCodeInput").addEventListener("input", e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,"").slice(0,6); });
let connectionPromise = null;
let firebaseError = "";
// apiKey của Firebase Web App là thông tin công khai (không phải khóa bí mật). Cho phép thử khóa khác
// bằng ?apiKey=... trên địa chỉ trang để kiểm tra nhanh mà không cần sửa code.
function getFirebaseConfig() {
  const override = new URLSearchParams(location.search).get("apiKey");
  return /^AIza[\w-]{35}$/.test(override || "") ? {...DEFAULT_FIREBASE_CONFIG, apiKey: override} : DEFAULT_FIREBASE_CONFIG;
}
async function connectGame() {
  if (connectionPromise) return connectionPromise;
  setConnection(false, "Đang kết nối...");
  connectionPromise = connectFirebase(getFirebaseConfig()).then(() => {
    firebaseError = "";
    setMessage("lobbyMessage", "Đã kết nối máy chủ. Bạn có thể tạo phòng hoặc nhập mã phòng.");
  }).catch((error) => {
    firebaseError = explainFirebaseError(error);
    setConnection(false, "Chưa kết nối");
    setMessage("lobbyMessage", "Máy chủ online chưa kết nối được: " + firebaseError, true);
    console.error("Firebase connect failed:", error);
    throw error;
  }).finally(() => { connectionPromise = null; });
  return connectionPromise;
}
$("connectionBadge").addEventListener("click", () => { if (!db) connectGame().catch(() => {}); });
async function boot() {
  try { await connectGame(); } catch { return; }
  await resumeLastRoom();
}
boot();
