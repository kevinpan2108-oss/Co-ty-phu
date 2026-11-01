import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { artSvg, animalFor, shortName } from "./board-art.js?v=1";
import { shouldComputerBuy } from "./computer-player.js?v=1";
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
const PLAYER_ID_KEY = "ctp-player-id";
const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const FALLBACK_COLOR = "#b9b59b";
const START_CASH = 1500;
const SALARY = 200;
const JAIL_FEE = 50;
const TOKEN_COLORS = ["#0e7c86", "#e8402a"];
// Dữ liệu bàn cờ lưu theo "đơn vị": 1 đơn vị = UNIT_VND đồng (xem money()). Giữ nguyên thang số
// để dữ liệu trong database và Firebase Rules không phải đổi khi đổi cách hiển thị tiền.
const SPACE_DATA = [
  {name:"XUẤT PHÁT",type:"start",icon:"🏁",corner:true,info:"Mỗi lần đi qua hoặc dừng lại, nhận 2.000.000₫."},
  {name:"Làng nổi Tân Lập",icon:"🛶",type:"property",price:60,rent:10,color:"#8d7b68",group:"Long An",info:"Khu du lịch sinh thái giữa rừng tràm ở Mộc Hóa, Long An; mùa nước nổi đi xuồng len giữa rừng."},
  {name:"CƠ HỘI",type:"chance",icon:"🥥",info:"Rút một thẻ Cơ hội: có thể được tiền, cũng có thể mất tiền."},
  {name:"Chợ nổi Cái Bè",icon:"🍍",type:"property",price:60,rent:20,color:"#c9824b",group:"Tiền Giang",info:"Chợ nổi trên sông Tiền, ghe thuyền chở đầy trái cây."},
  {name:"THUẾ NÔNG SẢN",type:"tax",icon:"🌾",amount:100,info:"Nộp thuế sau mỗi vụ mùa."},
  {name:"Bến phà Rạch Miễu",type:"station",price:200,rent:40,color:"#2f5d6b",icon:"⛴️",info:"Nơi phà từng nối Tiền Giang với Bến Tre trước khi có cầu."},
  {name:"Chùa Vĩnh Tràng",icon:"🏯",type:"property",price:100,rent:30,color:"#c9824b",group:"Tiền Giang",info:"Ngôi chùa cổ ở Mỹ Tho, kiến trúc pha trộn Á – Âu."},
  {name:"CƠ HỘI",type:"chance",icon:"🥥",info:"Rút một thẻ Cơ hội: có thể được tiền, cũng có thể mất tiền."},
  {name:"Làng kẹo dừa",icon:"🥥",type:"property",price:100,rent:40,color:"#4fb0a8",group:"Bến Tre",info:"Kẹo dừa là đặc sản nổi tiếng của xứ dừa Bến Tre."},
  {name:"Cồn Phụng",icon:"🏝️",type:"property",price:120,rent:50,color:"#4fb0a8",group:"Bến Tre",info:"Cồn nhỏ giữa sông Tiền, gắn với Đạo Dừa, nay là điểm du lịch."},
  {name:"VÀO TÙ / THĂM TÙ",type:"jail",icon:"🔒",corner:true,info:"Chỉ ghé thăm thì không sao."},
  {name:"Ao Bà Om",icon:"🌳",type:"property",price:140,rent:60,color:"#b04a6e",group:"Trà Vinh",info:"Ao vuông cổ giữa rừng cây sao, dầu cổ thụ của người Khmer Trà Vinh."},
  {name:"Điện lực Miền Tây",type:"utility",price:150,rent:50,color:"#e8d9a0",icon:"💡",info:"Điện sáng đèn cho cả vùng sông nước."},
  {name:"Chùa Âng",icon:"🛕",type:"property",price:140,rent:70,color:"#b04a6e",group:"Trà Vinh",info:"Ngôi chùa Khmer cổ, kiến trúc tinh xảo, nằm cạnh Ao Bà Om."},
  {name:"Cù lao An Bình",icon:"🌴",type:"property",price:160,rent:80,color:"#e394a8",group:"Vĩnh Long",info:"Cù lao giữa sông Tiền với vườn trái cây và nhà vườn."},
  {name:"Bến Ninh Kiều",type:"station",price:200,rent:40,color:"#2f5d6b",icon:"🚤",info:"Bến sông thơ mộng của thành phố Cần Thơ."},
  {name:"Chợ nổi Trà Ôn",icon:"🛶",type:"property",price:180,rent:90,color:"#e394a8",group:"Vĩnh Long",info:"Chợ nổi họp trên sông Hậu, ghe xuồng tấp nập từ sáng sớm."},
  {name:"CƠ HỘI",type:"chance",icon:"🥥",info:"Rút một thẻ Cơ hội: có thể được tiền, cũng có thể mất tiền."},
  {name:"Làng hoa Sa Đéc",icon:"🌸",type:"property",price:180,rent:100,color:"#f0a05a",group:"Đồng Tháp",info:"Làng hoa kiểng lâu đời của Đồng Tháp, rực rỡ nhất dịp Tết."},
  {name:"Tràm Chim",icon:"🌿",type:"property",price:200,rent:110,color:"#f0a05a",group:"Đồng Tháp",info:"Vườn quốc gia ở Đồng Tháp, nơi sếu đầu đỏ về trú đông."},
  {name:"CHỢ NỔI CÁI RĂNG",type:"free",icon:"🛶",corner:true,info:"Nghỉ chân ở chợ nổi Cái Răng, Cần Thơ, nơi mua bán trái cây ngay trên sông."},
  {name:"Nhà cổ Bình Thủy",icon:"🏛️",type:"property",price:220,rent:120,color:"#2f7fc1",group:"Cần Thơ",info:"Ngôi nhà cổ trăm năm tuổi ở Cần Thơ, kiến trúc kết hợp Đông – Tây."},
  {name:"CƠ HỘI",type:"chance",icon:"🥥",info:"Rút một thẻ Cơ hội: có thể được tiền, cũng có thể mất tiền."},
  {name:"Vườn cò Bằng Lăng",icon:"🐦",type:"property",price:220,rent:130,color:"#2f7fc1",group:"Cần Thơ",info:"Sân chim ở Thốt Nốt, Cần Thơ, hàng ngàn con cò về đậu mỗi chiều."},
  {name:"Chợ nổi Ngã Bảy",icon:"🛶",type:"property",price:240,rent:140,color:"#7bb661",group:"Hậu Giang",info:"Chợ nổi ở Ngã Bảy, Hậu Giang, nơi nhiều dòng sông rạch gặp nhau."},
  {name:"Bến tàu Rạch Giá",type:"station",price:200,rent:40,color:"#2f5d6b",icon:"🚢",info:"Cửa ngõ đường biển của Kiên Giang, tàu từ đây ra đảo."},
  {name:"Chùa Dơi",icon:"🦇",type:"property",price:260,rent:150,color:"#e0654b",group:"Sóc Trăng",info:"Chùa Khmer nổi tiếng với đàn dơi quạ đậu trên cây."},
  {name:"Chùa Kh'Leang",icon:"🛕",type:"property",price:260,rent:160,color:"#e0654b",group:"Sóc Trăng",info:"Ngôi chùa Khmer cổ ở Sóc Trăng."},
  {name:"Nhà máy nước Cửu Long",type:"utility",price:150,rent:50,color:"#e8d9a0",icon:"💧",info:"Nước sạch cho bà con vùng sông Cửu Long."},
  {name:"Nhà Công tử Bạc Liêu",icon:"🏠",type:"property",price:280,rent:170,color:"#e8c85a",group:"Bạc Liêu",info:"Ngôi nhà gắn với giai thoại Công tử Bạc Liêu giàu có một thời."},
  {name:"ĐI THẲNG VÀO TÙ",type:"gotojail",icon:"🚓",corner:true,info:"Dừng ở đây là bị đưa thẳng vào tù."},
  {name:"Điện gió Bạc Liêu",icon:"🌬️",type:"property",price:300,rent:180,color:"#e8c85a",group:"Bạc Liêu",info:"Những cánh quạt khổng lồ quay trên biển Bạc Liêu."},
  {name:"Rừng tràm Trà Sư",icon:"🌳",type:"property",price:300,rent:190,color:"#3f9a63",group:"An Giang",info:"Rừng tràm xanh mướt phủ bèo, đi xuồng len giữa rừng ở An Giang."},
  {name:"CƠ HỘI",type:"chance",icon:"🥥",info:"Rút một thẻ Cơ hội: có thể được tiền, cũng có thể mất tiền."},
  {name:"Núi Sam Châu Đốc",icon:"⛰️",type:"property",price:320,rent:200,color:"#3f9a63",group:"An Giang",info:"Ngọn núi nổi lên giữa đồng bằng ở Châu Đốc, An Giang."},
  {name:"Cảng Hà Tiên",type:"station",price:200,rent:40,color:"#2f5d6b",icon:"⚓",info:"Cảng nhỏ ở vùng biển Kiên Giang, gần biên giới Campuchia."},
  {name:"CƠ HỘI",type:"chance",icon:"🥥",info:"Rút một thẻ Cơ hội: có thể được tiền, cũng có thể mất tiền."},
  {name:"Đảo Phú Quốc",icon:"🏝️",type:"property",price:350,rent:220,color:"#1fb5c9",group:"Kiên Giang",info:"Đảo ngọc ngoài khơi Kiên Giang, nổi tiếng với nước mắm, hồ tiêu và biển xanh."},
  {name:"PHÍ CẦU PHÀ",type:"tax",icon:"🧾",amount:100,info:"Qua sông phải trả phí cầu phà."},
  {name:"Mũi Cà Mau",icon:"🧭",type:"property",price:400,rent:250,color:"#7c6bb5",group:"Cà Mau",info:"Điểm cực Nam của Tổ quốc, nơi đất liền gặp biển."}
];
const CHANCE_CARDS = [
  {text:"Mùa trái cây bội thu, thương lái đến tận vườn thu mua.",amount:100},
  {text:"Nước lớn tràn bờ, phải sửa lại bờ bao.",amount:-80},
  {text:"Trúng thưởng tại hội chợ nông sản.",amount:150},
  {text:"Ghe bị hỏng máy giữa sông, tốn tiền sửa.",amount:-50},
  {text:"Bán dưa hấu ở chợ nổi được giá.",amount:60},
  {text:"Đóng góp xây cầu khỉ cho bà con.",amount:-100},
  {text:"Khách du lịch ghé homestay vườn nhà.",amount:120},
  {text:"Mùa nước nổi, mua lưới để giăng bắt cá linh.",amount:-60}
];

let firebaseApp = null;
let db = null;
let currentUser = null;
let currentRoomCode = null;
let roomState = null;
let unsubscribeRoom = null;
let busy = false;
const COMPUTER_UID = "computer-opponent";
let computerGame = false;
let computerBusy = false;
let computerTimer = null;

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
// 1 đơn vị dữ liệu = 10.000₫ (xem chú thích ở SPACE_DATA): 1.500 đơn vị = 15.000.000₫.
const UNIT_VND = 10000;
function money(units) {
  return Math.round(Number(units || 0) * UNIT_VND).toLocaleString("vi-VN") + "₫";
}
// Dạng ngắn cho ô cờ nhỏ: 600k, 1,2tr, 4tr.
function moneyShort(units) {
  const vnd = Number(units || 0) * UNIT_VND;
  return vnd >= 1000000
    ? (vnd / 1000000).toLocaleString("vi-VN", {maximumFractionDigits:1}) + "tr"
    : Math.round(vnd / 1000) + "k";
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
// ===== Luật tiền thuê (hàm thuần túy, có test trong tests/board.test.js) =====
// Các ô đất cùng tỉnh (cùng "group"). Chỉ tỉnh có từ 2 ô đất trở lên mới có thưởng sở hữu cả tỉnh.
function provinceCells(group) {
  return SPACE_DATA.map((sp, i) => (sp.type === "property" && sp.group === group ? i : -1)).filter((i) => i >= 0);
}
function ownsWholeProvince(owners, group, uid) {
  const cells = group && uid ? provinceCells(group) : [];
  return cells.length >= 2 && cells.every((i) => owners?.[getSpaceId(i)] === uid);
}
function calcRent(space, owners, ownerUid, diceTotal) {
  const countOwned = (type) => Object.keys(owners || {}).filter((key) => SPACE_DATA[Number(key.slice(1))]?.type === type && owners[key] === ownerUid).length;
  let rent = space.rent || 50;
  let wholeProvince = false;
  if (space.type === "station") rent = 40 * Math.pow(2, Math.max(0, countOwned("station") - 1));
  else if (space.type === "utility") rent = diceTotal * (countOwned("utility") > 1 ? 10 : 4);
  else if (space.type === "property" && ownsWholeProvince(owners, space.group, ownerUid)) { rent *= 2; wholeProvince = true; }
  return {rent, wholeProvince};
}
let cellInfoTimer = null;
function showCellInfo(index, seconds = 7) {
  const space = SPACE_DATA[index];
  const box = $("cellInfo");
  if (!space || !box) return;
  const ownerUid = roomState?.propertyOwners?.[getSpaceId(index)];
  const owner = ownerUid ? roomState?.players?.[ownerUid] : null;
  const chips = [];
  if (space.price) chips.push("Giá " + money(space.price));
  if (space.type === "station") chips.push("Thuê từ " + money(40) + ", gấp đôi mỗi bến sở hữu thêm");
  else if (space.type === "utility") chips.push("Thuê 4× điểm xúc xắc (10× nếu có cả hai công ty)");
  else if (space.rent) chips.push("Thuê " + money(space.rent));
  if (space.type === "tax") chips.push("Nộp " + money(space.amount));
  if (owner) chips.push("Chủ: " + owner.name);
  const count = space.type === "property" ? provinceCells(space.group).length : 0;
  const bonus = count >= 2 ? `Sở hữu đủ ${count} ô của ${space.group}: tiền thuê gấp đôi.` : "";
  box.innerHTML = `<div class="cell-info-head">${space.group ? `<i style="background:${safeColor(space.color)}"></i><span>${escapeHtml(space.group)}</span>` : ""}<strong>${escapeHtml(space.icon || "")} ${escapeHtml(space.name)}</strong></div>
    ${space.info ? `<p>${escapeHtml(space.info)}</p>` : ""}
    ${chips.length ? `<div class="cell-info-chips">${chips.map((c) => `<span>${escapeHtml(c)}</span>`).join("")}</div>` : ""}
    ${bonus ? `<p class="cell-info-bonus">${escapeHtml(bonus)}</p>` : ""}`;
  box.classList.add("show");
  clearTimeout(cellInfoTimer);
  cellInfoTimer = setTimeout(() => box.classList.remove("show"), seconds * 1000);
}
function describeSpace(index) {
  const space = SPACE_DATA[index];
  if (!space) return "";
  const ownerUid = roomState?.propertyOwners?.[getSpaceId(index)];
  const owner = ownerUid ? roomState?.players?.[ownerUid] : null;
  const parts = [space.name];
  if (space.group) parts.push(space.group);
  if (space.price) parts.push("giá " + money(space.price));
  if (space.type === "station") parts.push("thuê " + money(40) + ", gấp đôi cho mỗi bến sở hữu thêm");
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
  ["createRoomButton","joinRoomButton","playComputerButton"].forEach((id) => {
    const button = $(id);
    if (button) button.disabled = value;
  });
  if (roomState && !(computerGame && computerBusy)) renderRoom();
}
function notify(text) {
  $("gameNotice").textContent = text || "";
  setTimeout(() => { if ($("gameNotice").textContent === text) $("gameNotice").textContent = ""; }, 5500);
}

function explainFirebaseError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || error || "");
  if (code === "database/unreachable") return "Không kết nối được tới cơ sở dữ liệu của game.";
  if (/permission[_ ]denied/i.test(code + message)) return "Firebase Rules từ chối thao tác. Hãy Publish file firebase-database.rules.json trong Realtime Database → Rules.";
  return (code ? "[" + code + "] " : "") + message;
}
// Không dùng đăng nhập Firebase: mỗi trình duyệt tự sinh một mã người chơi và lưu trên máy.
// Nhờ vậy game chỉ cần đúng một kết nối (tới Realtime Database) và không cần bật Authentication.
function getPlayerId() {
  let id = store("get", PLAYER_ID_KEY);
  if (!/^p[a-z0-9]{23}$/.test(id || "")) {
    const bytes = crypto.getRandomValues(new Uint8Array(23));
    id = "p" + Array.from(bytes, (b) => (b % 36).toString(36)).join("");
    store("set", PLAYER_ID_KEY, id);
  }
  return id;
}
async function disconnectFirebase() {
  if (currentRoomCode && !computerGame) leaveRoom();
  const app = firebaseApp;
  firebaseApp = null; db = null; currentUser = null;
  if (app) { try { await deleteApp(app); } catch { /* app đã bị đóng */ } }
}
async function connectFirebase(config) {
  if (!config?.databaseURL || !config?.projectId) {
    throw new Error("Thiếu databaseURL hoặc projectId trong Firebase config.");
  }
  await disconnectFirebase();
  setConnection(false, "Đang kết nối...");
  firebaseApp = initializeApp(config, APP_NAME);
  db = getDatabase(firebaseApp);
  let everConnected = false;
  // Chờ tới khi Realtime Database báo đã kết nối (tối đa 10 giây), sau đó vẫn theo dõi online/offline.
  await new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(Object.assign(new Error("Hết thời gian chờ kết nối cơ sở dữ liệu."), {code:"database/unreachable"}));
    }, 10000);
    onValue(ref(db, ".info/connected"), (snapshot) => {
      const online = snapshot.val() === true;
      everConnected = everConnected || online;
      setConnection(online, online ? "Đã kết nối" : everConnected ? "Mất kết nối, đang thử lại..." : "Đang kết nối...");
      if (online && !settled) { settled = true; clearTimeout(timer); resolve(); }
    });
  });
  currentUser = {uid:getPlayerId()};
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
function showGameView() {
  $("lobbyView").classList.add("hidden");
  $("gameView").classList.remove("hidden");
  // The lobby button can remain focused after its section is hidden on mobile.
  // Blur it and reset scroll so the game controls are not clipped above the viewport.
  if (document.activeElement && typeof document.activeElement.blur === "function") {
    document.activeElement.blur();
  }
  window.scrollTo(0, 0);
}
function openRoom(code) {
  computerGame = false;
  computerBusy = false;
  if (computerTimer) clearTimeout(computerTimer);
  computerTimer = null;
  $("copyRoomButton").hidden = false;
  if (unsubscribeRoom) unsubscribeRoom();
  currentRoomCode = code;
  store("set", LAST_ROOM_KEY, code);
  setMessage("lobbyMessage", "");
  roomState = null;
  showGameView();
  $("roomCodeLabel").textContent = code;
  $("centerStatus").textContent = "Đang kết nối phòng...";
  unsubscribeRoom = onValue(ref(db, `${ROOM_ROOT}/${code}`), (snapshot) => {
    if (!snapshot.exists()) {
      leaveRoom("Phòng không còn tồn tại.");
      return;
    }
    const previous = roomState;
    roomState = snapshot.val();
    runEffects(previous, roomState);
    renderRoom();
  }, (error) => {
    notify("Không thể đọc phòng: " + explainFirebaseError(error));
  });
}
async function updateCurrentRoom(updater) {
  if (!computerGame) {
    return runTransaction(ref(db, `${ROOM_ROOT}/${currentRoomCode}`), updater, {applyLocally:false});
  }
  if (!roomState) return {committed:false};
  const previous = roomState;
  const draft = JSON.parse(JSON.stringify(roomState));
  const next = updater(draft);
  if (!next) return {committed:false};
  roomState = next;
  if (!computerBusy) {
    runEffects(previous, roomState);
    renderRoom();
  }
  return {committed:true,snapshot:{exists:()=>true,val:()=>roomState}};
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
  if (computerTimer) clearTimeout(computerTimer);
  computerTimer = null;
  computerBusy = false;
  computerGame = false;
  $("copyRoomButton").hidden = false;
  resetEffects();
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
    const div = document.createElement("div");
    div.className = "space" + (space.corner ? " corner" : "") + (owner ? " owned" : "") + (stampUntil[index] > Date.now() ? " stamp" : "") + (space.corner ? "" : row === 0 ? " side-top" : row === 10 ? " side-bottom" : col === 0 ? " side-left" : " side-right");
    if (owner) div.style.setProperty("--owner", safeColor(owner.color));
    div.style.gridRow = String(row+1);
    div.style.gridColumn = String(col+1);
    const icon = space.icon || "";  // ô đất thường không có biểu tượng để chừa chỗ cho giá tiền
    const colorBar = space.color || (space.type === "property" ? "#9b8067" : "transparent");
    const price = space.price ? moneyShort(space.price) : space.amount ? moneyShort(space.amount) : "";
    const description = describeSpace(index);
    div.dataset.index = String(index);
    div.title = description;
    div.setAttribute("aria-label", description);
    div.innerHTML = `
      <span class="space-color" style="background:${colorBar}"></span>
      ${icon ? `<span class="space-icon">${icon}</span>` : ""}
      <span class="space-art">${artSvg(space.name, colorBar) || `<b class="art-emoji">${icon}</b>`}</span>
      <span class="space-text"><span class="space-name">${escapeHtml(space.corner ? space.name : shortName(space.name))}</span>${price && !space.corner ? `<span class="space-price">${price}</span>` : ""}</span>
      <span class="space-players">${tokensHtml(index)}</span>
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
    return `<div class="player-card ${isTurn?"active":""}" data-uid="${escapeHtml(uid)}">
      <div class="player-head"><i class="player-dot" style="background:${safeColor(p.color)}"></i><span class="player-name">${escapeHtml(p.name)}</span>${isMe?'<span class="you-label">Bạn</span>':""}</div>
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
    return `<div class="property-row"><i class="property-swatch" style="background:${space.color || "#b9b59b"}"></i><div><strong>${escapeHtml(space.name)}</strong><small>${space.group ? escapeHtml(space.group) + " · " : ""}${escapeHtml(player?.name || "Người chơi")} · ${space.type === "station" ? "Thuê từ " + money(40) : space.type === "utility" ? "Thuê 4× xúc xắc" : "Thuê " + money(space.rent || 50)}</small></div></div>`;
  }).join("");
}
function renderActions() {
  const mine = myPlayer();
  const isMyTurn = roomState.turnUid === currentUser.uid;
  const playing = roomState.status === "playing" && getPlayerEntries(roomState).length === 2;
  const pending = roomState.pending;
  const dice = roomState.lastRoll;
  if (!diceAnimating) $("diceResult").innerHTML = dice ? diceHtml(dice) : diceHtml([0, 0]);
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
  $("rollButton").textContent = canPayJail ? "🔓 Nộp " + money(JAIL_FEE) + " để ra tù" : "🎲 Tung xúc xắc";
  $("rollButton").disabled = busy || !playing || !isMyTurn || !!pending || !!dice || roomState.status === "finished";
  document.title = roomState.status === "playing" && isMyTurn ? "● Đến lượt bạn - Cờ Tỷ Phú Online" : "Cờ Tỷ Phú Online";
  if (roomState.status === "waiting") {
    $("centerStatus").textContent = "Chờ người chơi thứ hai";
  } else if (roomState.status === "finished") {
    $("centerStatus").textContent = "Ván đấu kết thúc";
  } else if (computerGame && roomState.turnUid === COMPUTER_UID) {
    $("centerStatus").textContent = "Máy đang suy nghĩ...";
  } else {
    $("centerStatus").textContent = isMyTurn ? "Đến lượt bạn" : "Đợi đối thủ...";
  }
  if (roomState.status === "finished" && roomState.winner) {
    $("actionMessage").textContent = "🏆 " + (roomState.players?.[roomState.winner]?.name || "Người chơi") + " chiến thắng!";
  }
}
// ===== Hiệu ứng (chỉ là hiển thị phía trình duyệt, không ghi gì lên database) =====
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
const displayPos = {};            // uid -> ô đang hiển thị khi quân đang nhảy
const moveTimers = {};            // uid -> timer của bước nhảy
const stampUntil = {};            // chỉ số ô -> thời điểm hết hiệu ứng "vừa mua"
function dieHtml(v) {
  const n = Math.min(6, Math.max(0, Math.floor(Number(v)) || 0));
  return `<span class="die" data-v="${n}">${"<i></i>".repeat(9)}</span>`;
}
function diceHtml(d) { return dieHtml(d?.[0]) + dieHtml(d?.[1]); }
let autoEndKey = null;
let autoEndTimer = null;
const AUTO_END_MS = 2000;
let movingUid = null;
let diceAnimating = false;
let diceTimer = null;
const DICE_MS = 900;
const HOP_MS = 190;

function tokensHtml(index) {
  return getPlayerEntries(roomState)
    .filter(([uid, p]) => (displayPos[uid] ?? Number(p.position)) === index)
    .map(([uid, p], i) => `<i class="token${movingUid === uid ? " moving" : ""}" title="${escapeHtml(p.name)}" style="--tc:${safeColor(p.color)}"><b>${animalFor(p.color, i)}</b></i>`)
    .join("");
}
function renderTokens() {
  document.querySelectorAll("#board .space").forEach((cell) => {
    const holder = cell.querySelector(".space-players");
    if (holder) holder.innerHTML = tokensHtml(Number(cell.dataset.index));
  });
}
function resetEffects() {
  autoEndKey = null; clearTimeout(autoEndTimer);
  clearInterval(diceTimer);
  diceAnimating = false;
  movingUid = null;
  for (const uid of Object.keys(moveTimers)) { clearTimeout(moveTimers[uid]); delete moveTimers[uid]; }
  for (const uid of Object.keys(displayPos)) delete displayPos[uid];
  for (const key of Object.keys(stampUntil)) delete stampUntil[key];
  document.title = "Cờ Tỷ Phú Online";
  const stage = $("diceStage");
  if (stage) stage.className = "dice-stage";
}
// Quân cờ nhảy từng ô tới đích. Đi quá xa (vào tù) thì dịch chuyển thẳng.
function animateMove(uid, from, to, delay) {
  const dist = (to - from + 40) % 40;
  if (reduceMotion || dist === 0 || dist > 12) return 0;
  displayPos[uid] = from;
  let step = 0;
  const tick = () => {
    step++;
    movingUid = uid;
    displayPos[uid] = (from + step) % 40;
    const cell = document.querySelector(`#board .space[data-index="${displayPos[uid]}"]`);
    if (cell) { cell.classList.remove("pass", "land"); void cell.offsetWidth; cell.classList.add(step >= dist ? "land" : "pass"); }
    if (step >= dist) {
      delete displayPos[uid];
      delete moveTimers[uid];
      movingUid = null;
      renderTokens();
      return;
    }
    renderTokens();
    moveTimers[uid] = setTimeout(tick, HOP_MS);
  };
  moveTimers[uid] = setTimeout(tick, delay);
  return delay + dist * HOP_MS;
}
function animateDice(finalDice) {
  const box = $("diceResult");
  const stage = $("diceStage");
  const finish = () => {
    clearInterval(diceTimer);
    diceAnimating = false;
    box.classList.remove("rolling");
    box.innerHTML = diceHtml(finalDice);
    if (stage) {
      stage.className = "dice-stage show landed";
      stage.innerHTML = `<div class="dice-row">${diceHtml(finalDice)}<b class="dice-total">${(Number(finalDice[0]) || 0) + (Number(finalDice[1]) || 0)}</b></div>`;
      setTimeout(() => { stage.className = "dice-stage"; }, 1300);
    }
  };
  if (reduceMotion) return;
  diceAnimating = true;
  box.classList.add("rolling");
  const face = () => 1 + Math.floor(Math.random() * 6);
  const shuffle = () => { const d = [face(), face()]; box.innerHTML = diceHtml(d); if (stage) stage.innerHTML = `<div class="dice-row">${diceHtml(d)}</div>`; };
  if (stage) stage.className = "dice-stage show rolling";
  shuffle();
  clearInterval(diceTimer);
  diceTimer = setInterval(shuffle, 90);
  setTimeout(finish, DICE_MS);
}
function floatDelta(uid, delta, delay) {
  if (!delta) return;
  setTimeout(() => {
    const card = document.querySelector(`.player-card[data-uid="${CSS.escape(uid)}"]`);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const el = document.createElement("span");
    el.className = "float-delta " + (delta > 0 ? "gain" : "loss");
    el.textContent = (delta > 0 ? "+" : "−") + money(Math.abs(delta));
    el.style.left = Math.max(8, rect.right - 12) + "px";
    el.style.top = (rect.top + 10) + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }, delay);
}
const CONFETTI = ["🌾", "🪷", "🥥", "🎉", "🍍", "✨"];
function confetti() {
  if (reduceMotion) return;
  const layer = document.createElement("div");
  layer.className = "confetti";
  layer.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 40; i++) {
    const bit = document.createElement("span");
    bit.textContent = CONFETTI[i % CONFETTI.length];
    bit.style.left = Math.random() * 100 + "%";
    bit.style.animationDuration = 2.6 + Math.random() * 2.4 + "s";
    bit.style.animationDelay = Math.random() * 0.9 + "s";
    bit.style.fontSize = 18 + Math.random() * 16 + "px";
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 6500);
}
// So sánh trạng thái cũ và mới của phòng để chọn hiệu ứng. Lần nhận dữ liệu đầu tiên (previous = null,
// ví dụ tải lại trang) không chạy hiệu ứng nào.
function runEffects(previous, next) {
  if (!previous || !next) return;
  const rolled = !previous.lastRoll && next.lastRoll;
  if (rolled) animateDice(next.lastRoll);
  for (const [uid, now] of getPlayerEntries(next)) {
    const before = previous.players?.[uid];
    if (!before) continue;
    let delay = rolled ? DICE_MS : 0;
    if (Number(before.position) !== Number(now.position)) {
      delay = animateMove(uid, Number(before.position), Number(now.position), delay) || delay;
    }
    if (Number(before.cash) !== Number(now.cash)) floatDelta(uid, Number(now.cash) - Number(before.cash), delay);
  }
  for (const key of Object.keys(next.propertyOwners || {})) {
    if (previous.propertyOwners?.[key]) continue;
    const index = Number(key.slice(1));
    stampUntil[index] = Date.now() + 1000;
  }
  if (next.status === "finished" && previous.status !== "finished") confetti();
  if (next.status === "playing" && next.turnUid === currentUser?.uid && previous.turnUid !== currentUser?.uid) {
    try { navigator.vibrate?.(80); } catch { /* không hỗ trợ rung */ }
  }
}

function renderRoom() {
  if (!roomState || !currentUser) return;
  $("roomCodeLabel").textContent = computerGame ? "VỚI MÁY" : currentRoomCode;
  $("gameModeLabel").textContent = computerGame ? "Chế độ đơn" : "Phòng";
  $("gameTitle").textContent = computerGame ? "Đại chiến với máy" : "Đại chiến bất động sản";
  $("copyRoomButton").hidden = computerGame;
  renderPlayers();
  renderBoard();
  renderProperties();
  renderActions();
  scheduleAutoEnd();
}

async function rollDice() {
  if (!roomState || busy) return;
  const mine = myPlayer();
  if (mine?.jailTurns) return releaseFromJail();
  setBusy(true);
  try {
    const dice = [1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];
    const uid = currentUser.uid;
    const result = await updateCurrentRoom((room) => {
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
          const {rent, wholeProvince} = calcRent(space, room.propertyOwners, ownerUid, total);
          const paid = Math.min(Number(player.cash||0),rent);
          player.cash -= paid;
          owner.cash = Number(owner.cash||0) + paid;
          text += " Trả " + money(rent) + " tiền thuê cho " + owner.name + (wholeProvince ? " (chủ sở hữu đủ các ô của " + space.group + " nên thuê gấp đôi)" : "") + ".";
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
        text += " " + card.text + (card.amount >= 0 ? " Nhận " : " Trả ") + money(Math.abs(card.amount)) + ".";
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
    });
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
    await updateCurrentRoom((room) => {
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
    });
  } catch (error) { notify("Không thể xử lý ra tù: "+explainFirebaseError(error)); }
  finally { setBusy(false); }
  if (computerGame && !computerBusy) scheduleComputerTurn();
}
async function buyProperty() {
  if (!roomState?.pending) return;
  setBusy(true);
  try {
    const uid = currentUser.uid;
    await updateCurrentRoom((room) => {
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
    });
  } catch (error) { notify("Không mua được đất: "+explainFirebaseError(error)); }
  finally { setBusy(false); }
}
async function passProperty() {
  setBusy(true);
  try {
    await updateCurrentRoom((room) => {
      if (room === null) return room; // SDK chưa có dữ liệu: yêu cầu nạp từ server rồi gọi lại
      if (!room || room.turnUid !== currentUser.uid || room.pending?.uid !== currentUser.uid) return;
      room.pending = null;
      room.message = room.players[currentUser.uid].name + " quyết định không mua mảnh đất này.";
      room.updatedAt = Date.now();
      return room;
    });
  } catch (error) { notify("Không thể bỏ qua: "+explainFirebaseError(error)); }
  finally { setBusy(false); }
}
async function endTurn() {
  setBusy(true);
  try {
    const uid = currentUser.uid;
    await updateCurrentRoom((room) => {
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
    });
  } catch (error) { notify("Không thể kết thúc lượt: "+explainFirebaseError(error)); }
  finally { setBusy(false); }
  if (computerGame && !computerBusy) scheduleComputerTurn();
}

// Không còn nút "Kết thúc lượt": tung xúc xắc (và quyết định mua nếu có) xong là tự chuyển lượt
// sau khi hiệu ứng chạy xong.
function scheduleAutoEnd() {
  const ok = roomState && currentUser && roomState.status === "playing" && roomState.turnUid === currentUser.uid &&
    roomState.lastRoll && !roomState.pending && !computerBusy && currentUser.uid !== COMPUTER_UID;
  if (!ok) return;
  const key = currentRoomCode + ":" + roomState.turnNumber;
  if (autoEndKey === key) return;
  autoEndKey = key;
  clearTimeout(autoEndTimer);
  const fire = () => {
    if (!roomState || roomState.turnUid !== currentUser?.uid || !roomState.lastRoll || roomState.pending) return;
    if (busy) { autoEndTimer = setTimeout(fire, 400); return; }
    endTurn();
  };
  autoEndTimer = setTimeout(fire, AUTO_END_MS);
}

function startComputerGame() {
  if (busy) return;
  const humanUid = getPlayerId();
  currentUser = {uid:humanUid};
  computerGame = true;
  computerBusy = false;
  if (computerTimer) clearTimeout(computerTimer);
  computerTimer = null;
  if (unsubscribeRoom) unsubscribeRoom();
  unsubscribeRoom = null;
  currentRoomCode = "LOCAL-VS-COMPUTER";
  roomState = {
    status:"playing",
    creatorUid:humanUid,
    joinerUid:COMPUTER_UID,
    players:{
      [humanUid]:{uid:humanUid,name:cleanName($("playerName").value,"Bạn"),color:TOKEN_COLORS[0],cash:START_CASH,position:0,jailTurns:0},
      [COMPUTER_UID]:{uid:COMPUTER_UID,name:"Máy Miền Tây",color:TOKEN_COLORS[1],cash:START_CASH,position:0,jailTurns:0,isComputer:true}
    },
    propertyOwners:{},
    turnUid:humanUid,
    turnNumber:1,
    lastRoll:null,
    pending:null,
    message:"Bạn đi trước. Chúc bạn may mắn!",
    createdAt:Date.now(),
    updatedAt:Date.now()
  };
  store("remove", LAST_ROOM_KEY);
  showGameView();
  $("copyRoomButton").hidden = true;
  $("roomCodeLabel").textContent = "VỚI MÁY";
  renderRoom();
  document.title = "Đấu với máy - Cờ Tỷ Phú";
}
function computerShouldBuy(index) {
  const computer = roomState?.players?.[COMPUTER_UID];
  if (!computer) return false;
  const ownedSpaces = Object.entries(roomState.propertyOwners || {})
    .filter(([,ownerUid]) => ownerUid === COMPUTER_UID)
    .map(([key]) => SPACE_DATA[Number(key.slice(1))])
    .filter(Boolean);
  return shouldComputerBuy(SPACE_DATA[index], computer.cash, ownedSpaces);
}
function scheduleComputerTurn() {
  if (!computerGame || computerBusy || computerTimer ||
      roomState?.status !== "playing" || roomState.turnUid !== COMPUTER_UID) return;
  roomState.message = "Máy Miền Tây đang suy nghĩ nước đi...";
  renderRoom();
  computerTimer = setTimeout(() => {
    computerTimer = null;
    playComputerTurn().catch((error) => notify("Máy chưa đi được: " + (error?.message || error)));
  }, 750);
}
async function playComputerTurn() {
  if (!computerGame || computerBusy || roomState?.status !== "playing" ||
      roomState.turnUid !== COMPUTER_UID || !currentUser) return;
  const humanUid = currentUser.uid;
  const before = JSON.parse(JSON.stringify(roomState));
  computerBusy = true;
  currentUser.uid = COMPUTER_UID;
  try {
    await new Promise((resolve) => setTimeout(resolve, 650));
    await rollDice();
    if (!roomState || roomState.status !== "playing" || roomState.turnUid !== COMPUTER_UID) return;

    if (roomState.pending?.uid === COMPUTER_UID) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const index = Number(roomState.pending.index);
      if (computerShouldBuy(index)) await buyProperty();
      else await passProperty();
    }

    if (roomState && roomState.status === "playing" &&
        roomState.turnUid === COMPUTER_UID && roomState.lastRoll && !roomState.pending) {
      await new Promise((resolve) => setTimeout(resolve, 550));
      await endTurn();
    }
  } catch (error) {
    notify("Máy gặp trục trặc khi đi lượt: " + (error?.message || error));
  } finally {
    currentUser.uid = humanUid;
    computerBusy = false;
    if (roomState) {
      runEffects(before, roomState);
      renderRoom();
    }
  }
}

$("createRoomButton").addEventListener("click", createRoom);
$("joinRoomButton").addEventListener("click", joinRoom);
$("playComputerButton").addEventListener("click", startComputerGame);
$("rollButton").addEventListener("click", rollDice);
$("leaveRoomButton").addEventListener("click", () => leaveRoom());
$("board").addEventListener("click", (event) => {
  // Trên điện thoại ô quá nhỏ để hiện tên: chạm vào ô để xem thông tin.
  const cell = event.target.closest(".space");
  if (cell && roomState) showCellInfo(Number(cell.dataset.index));
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
// "database/unreachable" nghĩa là điện thoại không nhận được phản hồi từ máy chủ database (VPN, ứng dụng chặn
// quảng cáo, Private DNS, mạng công ty/trường...). Dò thử để nói rõ máy chủ nào bị chặn.
async function probeFirebaseHosts() {
  const url = DEFAULT_FIREBASE_CONFIG.databaseURL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try { await fetch(url, {mode:"no-cors", cache:"no-store", signal:controller.signal}); return []; }
  catch { return [new URL(url).host]; }
  finally { clearTimeout(timer); }
}
async function explainNetworkFailure() {
  const blocked = await probeFirebaseHosts();
  return blocked.length
    ? " Thiết bị này không truy cập được: " + blocked.join(", ") + ". Hãy tắt VPN / ứng dụng chặn quảng cáo / DNS riêng (Private DNS), hoặc đổi sang Wi-Fi/4G khác rồi bấm vào chữ \"Chưa kết nối\" để thử lại."
    : " Máy chủ database vẫn truy cập được nhưng kết nối realtime bị chặn (thường do VPN hoặc mạng chặn WebSocket). Hãy thử mạng khác hoặc trình duyệt khác.";
}
async function connectGame() {
  if (connectionPromise) return connectionPromise;
  setConnection(false, "Đang kết nối...");
  connectionPromise = connectFirebase(DEFAULT_FIREBASE_CONFIG).then(() => {
    firebaseError = "";
    setMessage("lobbyMessage", "Đã kết nối máy chủ. Bạn có thể tạo phòng hoặc nhập mã phòng.");
  }).catch(async (error) => {
    firebaseError = explainFirebaseError(error);
    if (error?.code === "database/unreachable") firebaseError += await explainNetworkFailure();
    setConnection(false, "Chưa kết nối");
    setMessage("lobbyMessage", "Máy chủ online chưa kết nối được: " + firebaseError, true);
    console.error("Firebase connect failed:", error);
    throw error;
  }).finally(() => { connectionPromise = null; });
  return connectionPromise;
}
$("connectionBadge").addEventListener("click", () => { if (!db && !computerGame) connectGame().catch(() => {}); });
async function boot() {
  try { await connectGame(); } catch { return; }
  await resumeLastRoom();
}
boot();
