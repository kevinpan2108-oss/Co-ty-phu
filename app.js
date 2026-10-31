import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

// Public Firebase Web App configuration for this game.
// Realtime Database is hosted in asia-southeast1 (Singapore).
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAECssZ_j6yvb9aYAgqw6yh9kFFadIJFW8",
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
const START_CASH = 1500;
const SALARY = 200;
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
  ["createRoomButton","joinRoomButton","rollButton","endTurnButton"].forEach((id) => {
    const el = $(id);
    if (el) {
      el.disabled = value;
      el.dataset.busy = value ? "1" : "0";
    }
  });
  if (roomState) renderRoom();
}
function notify(text) {
  $("gameNotice").textContent = text || "";
  setTimeout(() => { if ($("gameNotice").textContent === text) $("gameNotice").textContent = ""; }, 5500);
}

function parseFirebaseConfig(raw) {
  let text = String(raw || "").trim();
  text = text.replace(/^.*?=\s*(?=\{)/s, "").replace(/;\s*$/, "");
  text = text.replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":');
  text = text.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(text);
}
async function connectFirebase(config) {
  if (!config?.apiKey || !config?.databaseURL || !config?.projectId || !config?.appId) {
    throw new Error("Thiếu apiKey, databaseURL, projectId hoặc appId trong Firebase config.");
  }
  const appName = "co-ty-phu-" + config.projectId + "-" + Date.now();
  firebaseApp = initializeApp(config, appName);
  auth = getAuth(firebaseApp);
  db = getDatabase(firebaseApp);
  setConnection(false, "Đang kết nối...");
  const credential = await signInAnonymously(auth);
  currentUser = credential.user;
  setConnection(true, "Đã kết nối");
  return currentUser;
}
async function requireConnection() {
  if (db && currentUser) return true;
  const stored = localStorage.getItem("ctp-firebase-config");
  $("firebaseConfigInput").value = stored || JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2);
  $("settingsDialog").showModal();
  setMessage("settingsMessage", "Cần cấu hình Firebase trước khi tạo hoặc tham gia phòng.");
  return false;
}
function openRoom(code) {
  if (unsubscribeRoom) unsubscribeRoom();
  currentRoomCode = code;
  roomState = null;
  $("lobbyView").classList.add("hidden");
  $("gameView").classList.remove("hidden");
  $("roomCodeLabel").textContent = code;
  $("centerStatus").textContent = "ĐANG KẾT NỐI PHÒNG...";
  unsubscribeRoom = onValue(ref(db, `${ROOM_ROOT}/${code}`), (snapshot) => {
    if (!snapshot.exists()) {
      notify("Phòng không còn tồn tại.");
      leaveRoom();
      return;
    }
    roomState = snapshot.val();
    renderRoom();
  }, (error) => {
    notify("Không thể đọc phòng: " + error.message);
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
    const name = $("playerName").value.trim().slice(0,18) || "Người chơi 1";
    const uid = currentUser.uid;
    let code = null;

    // Reserve the room atomically so a generated code can never overwrite another room.
    for (let attempt = 0; attempt < 10; attempt++) {
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
      const roomRef = ref(db, `${ROOM_ROOT}/${candidate}`);
      const result = await runTransaction(roomRef, (existing) => {
        if (existing !== null) return;
        return room;
      }, {applyLocally:false});
      if (result.committed) {
        code = candidate;
        break;
      }
    }

    if (!code) throw new Error("Chưa tạo được mã phòng trống. Vui lòng thử lại.");
    openRoom(code);
  } catch (error) {
    setMessage("lobbyMessage", "Không tạo được phòng: " + error.message, true);
  } finally {
    setBusy(false);
  }
}
async function joinRoom() {
  if (busy) return;
  setBusy(true);
  try {
    if (!(await requireConnection())) return;
    const code = $("roomCodeInput").value.trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
      setMessage("lobbyMessage", "Mã phòng cần có 6 ký tự (không gồm I, O, 0, 1).", true);
      return;
    }
    const name = $("playerName").value.trim().slice(0,18) || "Người chơi 2";
    const roomRef = ref(db, `${ROOM_ROOT}/${code}`);
    const result = await runTransaction(roomRef, (room) => {
      if (!room) return;
      const uid = currentUser.uid;
      if (room.players?.[uid]) return room;
      if (room.status !== "waiting" || room.joinerUid) return;
      if (!room.creatorUid || room.creatorUid === uid) return;
      room.players = room.players || {};
      room.players[uid] = {uid,name,color:TOKEN_COLORS[1],cash:START_CASH,position:0,jailTurns:0};
      room.joinerUid = uid;
      room.status = "playing";
      room.message = name+" đã tham gia. Cuộc chơi bắt đầu!";
      room.updatedAt = Date.now();
      return room;
    }, {applyLocally:false});
    if (!result.committed || !result.snapshot.exists() || !result.snapshot.val().players?.[currentUser.uid]) {
      throw new Error("Phòng không tồn tại, đã đủ 2 người hoặc ván đã bắt đầu.");
    }
    openRoom(code);
  } catch (error) {
    setMessage("lobbyMessage", error.message, true);
  } finally {
    setBusy(false);
  }
}
function leaveRoom() {
  if (unsubscribeRoom) unsubscribeRoom();
  unsubscribeRoom = null;
  currentRoomCode = null;
  roomState = null;
  $("gameView").classList.add("hidden");
  $("lobbyView").classList.remove("hidden");
  $("gameNotice").textContent = "";
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
    div.innerHTML = `
      <span class="space-color" style="background:${colorBar}"></span>
      ${icon ? `<span class="space-icon">${icon}</span>` : ""}
      <span class="space-name">${escapeHtml(space.name)}</span>
      ${price && !space.corner ? `<span class="space-price">${price}</span>` : ""}
      ${owner ? `<span class="owned-mark" style="background:${owner.color}"></span>` : ""}
      <span class="space-players">${tokens.map(([,p])=>`<i class="token" title="${escapeHtml(p.name)}" style="background:${p.color}"></i>`).join("")}</span>
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
      <div class="player-head"><i class="player-dot" style="background:${p.color}"></i><span class="player-name">${escapeHtml(p.name)}</span>${isMe?'<span class="you-label">BẠN</span>':""}</div>
      <div class="player-cash">${money(p.cash)}</div>
      <p class="player-position">${escapeHtml(space)} ${p.jailTurns ? "· Đang ở tù" : ""}</p>
    </div>`;
  }).join("");
  const turnPlayer = roomState.players?.[roomState.turnUid];
  $("turnName").textContent = turnPlayer ? turnPlayer.name : "Chờ đối thủ...";
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
    return `<div class="property-row"><i class="property-swatch" style="background:${space.color || "#b9b59b"}"></i><div><strong>${escapeHtml(space.name)}</strong><small>${escapeHtml(player?.name || "Người chơi")} · Thuê ${money(space.rent || 50)}</small></div></div>`;
  }).join("");
}
function renderActions() {
  const mine = myPlayer();
  const isMyTurn = roomState.turnUid === currentUser.uid;
  const playing = roomState.status === "playing" && getPlayerEntries(roomState).length === 2;
  const pending = roomState.pending;
  const dice = roomState.lastRoll;
  $("diceResult").innerHTML = dice ? `<span>${dice[0]}</span><span>${dice[1]}</span>` : "<span>⚄</span><span>⚄</span>";
  $("actionMessage").textContent = roomState.message || (roomState.status === "waiting" ? "Đang chờ người chơi thứ hai..." : "Đến lượt bạn!");
  const buttons = $("pendingActions");
  buttons.innerHTML = "";
  if (pending?.uid === currentUser.uid) {
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
  const jailed = Number(mine?.jailTurns || 0) > 0;
  $("rollButton").textContent = jailed ? "🔓 Trả $50 để ra tù" : "🎲 Tung xúc xắc";
  $("rollButton").disabled = busy || !playing || !isMyTurn || !!pending || roomState.status === "finished";
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
    notify("Lỗi khi tung xúc xắc: " + error.message);
  } finally {
    setBusy(false);
  }
}
async function releaseFromJail() {
  if (busy) return;
  setBusy(true);
  try {
    const uid = currentUser.uid;
    await runTransaction(ref(db, `${ROOM_ROOT}/${currentRoomCode}`), (room) => {
      if (!room || room.turnUid !== uid || room.status !== "playing") return;
      const player = room.players?.[uid];
      if (!player?.jailTurns) return;
      if (player.cash < 50) {
        player.jailTurns = 0;
        room.message = player.name + " không đủ tiền nộp phạt, được thả nhưng mất lượt.";
      } else {
        player.cash -= 50;
        player.jailTurns = 0;
        room.message = player.name + " đã nộp $50 và ra tù. Lượt này kết thúc.";
      }
      room.turnUid = Object.keys(room.players).find(id => id !== uid);
      room.turnNumber = Number(room.turnNumber||1)+1;
      room.lastRoll = null;
      room.updatedAt = Date.now();
      return room;
    }, {applyLocally:false});
  } catch (error) { notify("Không thể xử lý ra tù: "+error.message); }
  finally { setBusy(false); }
}
async function buyProperty() {
  if (busy || !roomState?.pending) return;
  setBusy(true);
  try {
    const uid = currentUser.uid;
    await runTransaction(ref(db, `${ROOM_ROOT}/${currentRoomCode}`), (room) => {
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
  } catch (error) { notify("Không mua được đất: "+error.message); }
  finally { setBusy(false); }
}
async function passProperty() {
  if (busy) return;
  setBusy(true);
  try {
    await runTransaction(ref(db, `${ROOM_ROOT}/${currentRoomCode}`), (room) => {
      if (!room || room.turnUid !== currentUser.uid || room.pending?.uid !== currentUser.uid) return;
      room.pending = null;
      room.message = room.players[currentUser.uid].name + " quyết định không mua mảnh đất này.";
      room.updatedAt = Date.now();
      return room;
    }, {applyLocally:false});
  } catch (error) { notify("Không thể bỏ qua: "+error.message); }
  finally { setBusy(false); }
}
async function endTurn() {
  if (busy) return;
  setBusy(true);
  try {
    const uid = currentUser.uid;
    await runTransaction(ref(db, `${ROOM_ROOT}/${currentRoomCode}`), (room) => {
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
  } catch (error) { notify("Không thể kết thúc lượt: "+error.message); }
  finally { setBusy(false); }
}

$("createRoomButton").addEventListener("click", createRoom);
$("joinRoomButton").addEventListener("click", joinRoom);
$("rollButton").addEventListener("click", rollDice);
$("endTurnButton").addEventListener("click", endTurn);
$("leaveRoomButton").addEventListener("click", leaveRoom);
$("copyRoomButton").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(currentRoomCode);
    notify("Đã sao chép mã phòng " + currentRoomCode + ".");
  } catch { notify("Mã phòng của bạn: " + currentRoomCode); }
});
$("roomCodeInput").addEventListener("input", e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,"").slice(0,6); });
$("settingsButton").addEventListener("click", () => {
  const stored = localStorage.getItem("ctp-firebase-config");
  $("firebaseConfigInput").value = stored || JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2);
  $("settingsDialog").showModal();
});
$("saveConfigButton").addEventListener("click", async () => {
  try {
    const config = { ...DEFAULT_FIREBASE_CONFIG, ...parseFirebaseConfig($("firebaseConfigInput").value), apiKey: DEFAULT_FIREBASE_CONFIG.apiKey };
    localStorage.setItem("ctp-firebase-config", JSON.stringify(config));
    setMessage("settingsMessage","Đang kết nối Firebase...");
    await connectFirebase(config);
    $("settingsDialog").close();
    setMessage("lobbyMessage","Đã kết nối Firebase. Bạn có thể tạo hoặc tham gia phòng.");
  } catch (error) {
    setMessage("settingsMessage",error.message,true);
  }
});
$("clearConfigButton").addEventListener("click", () => {
  localStorage.removeItem("ctp-firebase-config");
  $("firebaseConfigInput").value = "";
  db = null; auth = null; currentUser = null;
  setConnection(false,"Chưa cấu hình");
  setMessage("settingsMessage","Đã xóa cấu hình trên thiết bị này.");
});
$("settingsDialog").addEventListener("click", e => {
  if (e.target === $("settingsDialog")) $("settingsDialog").close();
});

async function boot() {
  const stored = localStorage.getItem("ctp-firebase-config");
  try {
    const savedConfig = stored ? parseFirebaseConfig(stored) : {};
    // Keep saved project settings, but always use the verified API key bundled with this game.
    const config = { ...DEFAULT_FIREBASE_CONFIG, ...savedConfig, apiKey: DEFAULT_FIREBASE_CONFIG.apiKey };
    localStorage.setItem("ctp-firebase-config", JSON.stringify(config));
    await connectFirebase(config);
    setMessage("lobbyMessage","Đã kết nối Firebase. Bạn có thể tạo hoặc tham gia phòng.");
  } catch (error) {
    setConnection(false,"Lỗi kết nối");
    setMessage("lobbyMessage","Firebase chưa kết nối được: "+error.message,true);
  }
}
boot();
