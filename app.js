import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { animalFor, shortName, TOKEN_OPTIONS, tokenMarkup, tokenLabel } from "./board-art.js?v=2";
import { shouldComputerBuy } from "./computer-player.js?v=1";
import { CHANCE_CARDS, FORTUNE_CARDS, drawCard } from "./cards.js?v=1";
import {
  HOUSE_RENT_MULTIPLIERS, calculateDiceMove, propertyGroupIndices, ownsCompleteGroup, getHouseCost, getBuildingLabel,
  buildEligibility, sellHouseEligibility, mortgageEligibility, mortgageValue, redemptionCost,
  calcRent as calculateAssetRent, hasLiquidationOptions, finalDiceSpin,
  doublesOutcome, jailRollOutcome, jailStatus, isAuctionable, cashSnapshot, cashDeltas, appendEventLog, JAIL_MAX_ATTEMPTS
} from "./economy.js?v=2";
import { cubeTransform } from "./dice-visuals.js?v=1";
import { playDiceRoll, DICE_ANIM_MS } from "./dice-roll.js?v=2";
import { playDiceSound, isMuted, setMuted } from "./dice-sound.js?v=2";
import { createCamera, CAMERA } from "./camera.js?v=2";
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
const TOKEN_PREF_KEY = "ctp-token-choice";
const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const FALLBACK_COLOR = "#b9b59b";
const START_CASH = 1500;
const SALARY = 200;
const JAIL_FEE = 50;
const TOKEN_COLORS = ["#0e7c86", "#e8402a"];
const AUCTION_INCREMENT = 10; // 100.000₫ mỗi lần nâng giá
// Dữ liệu bàn cờ lưu theo "đơn vị": 1 đơn vị = UNIT_VND đồng (xem money()). Giữ nguyên thang số
// để dữ liệu trong database và Firebase Rules không phải đổi khi đổi cách hiển thị tiền.
const SPACE_DATA = [
  {name:"XUẤT PHÁT",type:"start",icon:"🏁",corner:true,info:"Mỗi lần đi qua hoặc dừng lại, nhận 2.000.000₫."},
  {name:"Làng nổi Tân Lập",icon:"🛶",type:"property",price:60,rent:2,color:"#8d5a3b",group:"Đầu nguồn",houseCost:50,info:"Khu du lịch sinh thái giữa rừng tràm ở Mộc Hóa, Long An; mùa nước nổi đi xuồng len giữa rừng."},
  {name:"CƠ HỘI",type:"chance",icon:"🥥",info:"Rút một thẻ Cơ hội: tiền thưởng, chi phí sửa chữa, phí theo tài sản hoặc sự kiện bất ngờ."},
  {name:"Chợ nổi Cái Bè",icon:"🍍",type:"property",price:60,rent:4,color:"#8d5a3b",group:"Đầu nguồn",houseCost:50,info:"Chợ nổi trên sông Tiền, ghe thuyền chở đầy trái cây."},
  {name:"THUẾ NÔNG SẢN",type:"tax",icon:"🌾",amount:100,info:"Nộp thuế sau mỗi vụ mùa."},
  {name:"Bến phà Rạch Miễu",type:"station",price:200,rent:40,color:"#2f5d6b",icon:"⛴️",info:"Nơi phà từng nối Tiền Giang với Bến Tre trước khi có cầu."},
  {name:"Chùa Vĩnh Tràng",icon:"🏯",type:"property",price:100,rent:6,color:"#7ec8e3",group:"Xứ dừa",houseCost:50,info:"Ngôi chùa cổ ở Mỹ Tho, kiến trúc pha trộn Á – Âu."},
  {name:"KHÍ VẬN",type:"fortune",icon:"🍀",info:"Rút thẻ Khí vận: may mắn hoặc thử thách từ miền sông nước."},
  {name:"Làng kẹo dừa",icon:"🥥",type:"property",price:100,rent:6,color:"#7ec8e3",group:"Xứ dừa",houseCost:50,info:"Kẹo dừa là đặc sản nổi tiếng của xứ dừa Bến Tre."},
  {name:"Cồn Phụng",icon:"🏝️",type:"property",price:120,rent:8,color:"#7ec8e3",group:"Xứ dừa",houseCost:50,info:"Cồn nhỏ giữa sông Tiền, gắn với Đạo Dừa, nay là điểm du lịch."},
  {name:"VÀO TÙ / THĂM TÙ",type:"jail",icon:"🔒",corner:true,info:"Chỉ ghé thăm thì không sao."},
  {name:"Ao Bà Om",icon:"🌳",type:"property",price:140,rent:10,color:"#d4568f",group:"Sắc Khmer",houseCost:100,info:"Ao vuông cổ giữa rừng cây sao, dầu cổ thụ của người Khmer Trà Vinh."},
  {name:"Điện lực Miền Tây",type:"utility",price:150,rent:50,color:"#e8d9a0",icon:"💡",info:"Điện sáng đèn cho cả vùng sông nước."},
  {name:"Chùa Âng",icon:"🛕",type:"property",price:140,rent:10,color:"#d4568f",group:"Sắc Khmer",houseCost:100,info:"Ngôi chùa Khmer cổ, kiến trúc tinh xảo, nằm cạnh Ao Bà Om."},
  {name:"Cù lao An Bình",icon:"🌴",type:"property",price:160,rent:12,color:"#d4568f",group:"Sắc Khmer",houseCost:100,info:"Cù lao giữa sông Tiền với vườn trái cây và nhà vườn."},
  {name:"Bến Ninh Kiều",type:"station",price:200,rent:40,color:"#2f5d6b",icon:"🚤",info:"Bến sông thơ mộng của thành phố Cần Thơ."},
  {name:"Chợ nổi Trà Ôn",icon:"🛶",type:"property",price:180,rent:14,color:"#f0903c",group:"Chợ nổi",houseCost:100,info:"Chợ nổi họp trên sông Hậu, ghe xuồng tấp nập từ sáng sớm."},
  {name:"CƠ HỘI",type:"chance",icon:"🥥",info:"Rút một thẻ Cơ hội: tiền thưởng, chi phí sửa chữa, phí theo tài sản hoặc sự kiện bất ngờ."},
  {name:"Làng hoa Sa Đéc",icon:"🌸",type:"property",price:180,rent:14,color:"#f0903c",group:"Chợ nổi",houseCost:100,info:"Làng hoa kiểng lâu đời của Đồng Tháp, rực rỡ nhất dịp Tết."},
  {name:"Tràm Chim",icon:"🌿",type:"property",price:200,rent:16,color:"#f0903c",group:"Chợ nổi",houseCost:100,info:"Vườn quốc gia ở Đồng Tháp, nơi sếu đầu đỏ về trú đông."},
  {name:"CHỢ NỔI CÁI RĂNG",type:"free",icon:"🛶",corner:true,info:"Nghỉ chân ở chợ nổi Cái Răng, Cần Thơ, nơi mua bán trái cây ngay trên sông."},
  {name:"Nhà cổ Bình Thủy",icon:"🏛️",type:"property",price:220,rent:18,color:"#d93a2b",group:"Tây Đô",houseCost:150,info:"Ngôi nhà cổ trăm năm tuổi ở Cần Thơ, kiến trúc kết hợp Đông – Tây."},
  {name:"KHÍ VẬN",type:"fortune",icon:"🍀",info:"Rút thẻ Khí vận: may mắn hoặc thử thách từ miền sông nước."},
  {name:"Vườn cò Bằng Lăng",icon:"🐦",type:"property",price:220,rent:18,color:"#d93a2b",group:"Tây Đô",houseCost:150,info:"Sân chim ở Thốt Nốt, Cần Thơ, hàng ngàn con cò về đậu mỗi chiều."},
  {name:"Chợ nổi Ngã Bảy",icon:"🛶",type:"property",price:240,rent:20,color:"#d93a2b",group:"Tây Đô",houseCost:150,info:"Chợ nổi ở Ngã Bảy, Hậu Giang, nơi nhiều dòng sông rạch gặp nhau."},
  {name:"Bến tàu Rạch Giá",type:"station",price:200,rent:40,color:"#2f5d6b",icon:"🚢",info:"Cửa ngõ đường biển của Kiên Giang, tàu từ đây ra đảo."},
  {name:"Chùa Dơi",icon:"🦇",type:"property",price:260,rent:22,color:"#f2d03a",group:"Miền duyên hải",houseCost:150,info:"Chùa Khmer nổi tiếng với đàn dơi quạ đậu trên cây."},
  {name:"Chùa Kh'Leang",icon:"🛕",type:"property",price:260,rent:22,color:"#f2d03a",group:"Miền duyên hải",houseCost:150,info:"Ngôi chùa Khmer cổ ở Sóc Trăng."},
  {name:"Nhà máy nước Cửu Long",type:"utility",price:150,rent:50,color:"#e8d9a0",icon:"💧",info:"Nước sạch cho bà con vùng sông Cửu Long."},
  {name:"Nhà Công tử Bạc Liêu",icon:"🏠",type:"property",price:280,rent:24,color:"#f2d03a",group:"Miền duyên hải",houseCost:150,info:"Ngôi nhà gắn với giai thoại Công tử Bạc Liêu giàu có một thời."},
  {name:"ĐI THẲNG VÀO TÙ",type:"gotojail",icon:"🚓",corner:true,info:"Dừng ở đây là bị đưa thẳng vào tù."},
  {name:"Điện gió Bạc Liêu",icon:"🌬️",type:"property",price:300,rent:26,color:"#2f9a58",group:"Rừng tràm biên giới",houseCost:200,info:"Những cánh quạt khổng lồ quay trên biển Bạc Liêu."},
  {name:"Rừng tràm Trà Sư",icon:"🌳",type:"property",price:300,rent:26,color:"#2f9a58",group:"Rừng tràm biên giới",houseCost:200,info:"Rừng tràm xanh mướt phủ bèo, đi xuồng len giữa rừng ở An Giang."},
  {name:"CƠ HỘI",type:"chance",icon:"🥥",info:"Rút một thẻ Cơ hội: tiền thưởng, chi phí sửa chữa, phí theo tài sản hoặc sự kiện bất ngờ."},
  {name:"Núi Sam Châu Đốc",icon:"⛰️",type:"property",price:320,rent:28,color:"#2f9a58",group:"Rừng tràm biên giới",houseCost:200,info:"Ngọn núi nổi lên giữa đồng bằng ở Châu Đốc, An Giang."},
  {name:"Cảng Hà Tiên",type:"station",price:200,rent:40,color:"#2f5d6b",icon:"⚓",info:"Cảng nhỏ ở vùng biển Kiên Giang, gần biên giới Campuchia."},
  {name:"KHÍ VẬN",type:"fortune",icon:"🍀",info:"Rút thẻ Khí vận: may mắn hoặc thử thách từ miền sông nước."},
  {name:"Đảo Phú Quốc",icon:"🏝️",type:"property",price:350,rent:35,color:"#2455a8",group:"Đất mũi biển đảo",houseCost:200,info:"Đảo ngọc ngoài khơi Kiên Giang, nổi tiếng với nước mắm, hồ tiêu và biển xanh."},
  {name:"PHÍ CẦU PHÀ",type:"tax",icon:"🧾",amount:100,info:"Qua sông phải trả phí cầu phà."},
  {name:"Mũi Cà Mau",icon:"🧭",type:"property",price:400,rent:50,color:"#2455a8",group:"Đất mũi biển đảo",houseCost:200,info:"Điểm cực Nam của Tổ quốc, nơi đất liền gặp biển."}
];
// Bộ thẻ Cơ hội và Khí vận nằm riêng trong cards.js để dễ cân bằng và kiểm thử.

let firebaseApp = null;
let db = null;
let currentUser = null;
let currentRoomCode = null;
let roomState = null;
let unsubscribeRoom = null;
let busy = false;
let camera = null;
let cameraRestored = false;
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
// Dạng ngắn cho ô cờ nhỏ: 600k, 1.2M, 4M.
function moneyShort(units) {
  const vnd = Number(units || 0) * UNIT_VND;
  return vnd >= 1000000
    ? (Math.round(vnd / 100000) / 10).toString() + "M"
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
const TOKEN_IDS = TOKEN_OPTIONS.map((token) => token.id);
let selectedToken = TOKEN_IDS.includes(store("get", TOKEN_PREF_KEY)) ? store("get", TOKEN_PREF_KEY) : "penguin";
function renderTokenPicker() {
  const picker = $("tokenPicker");
  if (!picker) return;
  picker.innerHTML = TOKEN_OPTIONS.map((token) => {
    const active = token.id === selectedToken;
    return `<button class="token-option${active ? " selected" : ""}" type="button" data-token="${token.id}" aria-pressed="${active}">
      <span class="token-option-art">${tokenMarkup(token.id)}</span>
      <span class="token-option-label">${token.label}</span>
    </button>`;
  }).join("");
}
function chooseToken(tokenId) {
  if (!TOKEN_IDS.includes(tokenId)) return;
  selectedToken = tokenId;
  store("set", TOKEN_PREF_KEY, tokenId);
  renderTokenPicker();
}
function playerTokenId(player, index = 0) {
  if (TOKEN_IDS.includes(player?.token)) return player.token;
  return animalFor(player?.color, index) === "🐶" ? "puppy" : "penguin";
}
function alternateToken(tokenId) {
  return TOKEN_OPTIONS.find((token) => token.id !== tokenId)?.id || "puppy";
}
function isOpeningRollPhase(state) {
  return !!state && state.status === "playing" && Number(state.openingRound || 0) > 0 && !state.startPlayerUid;
}
function canAdvanceTurn(state) {
  // Phòng cũ không có openingRound được xem như đã bắt đầu từ trước.
  return !!state && (!Number(state.openingRound || 0) || !!state.startPlayerUid);
}
function compareOpeningRolls(a, b) {
  const total = (dice) => (Number(dice?.[0]) || 0) + (Number(dice?.[1]) || 0);
  return Math.sign(total(a) - total(b));
}
function houseMap(room = roomState) { return room?.houses || {}; }
function mortgageMap(room = roomState) { return room?.mortgages || {}; }
function rentForRoom(room, index, diceTotal) {
  const space = SPACE_DATA[Number(index)];
  const ownerUid = room?.propertyOwners?.[getSpaceId(index)];
  return calculateAssetRent(SPACE_DATA, space, room?.propertyOwners, ownerUid, diceTotal, index, houseMap(room), mortgageMap(room));
}
function ownedAssetCount(room, uid) {
  return Object.entries(room?.propertyOwners || {}).filter(([, owner]) => owner === uid).length;
}
function buildingRepairCost(room, uid, perHouse, perHotel) {
  return Object.entries(room?.houses || {}).reduce((sum, [id, rawCount]) => {
    const index = Number(String(id).slice(1));
    if (room?.propertyOwners?.[id] !== uid || SPACE_DATA[index]?.type !== "property") return sum;
    const count = Math.max(0, Math.min(5, Number(rawCount) || 0));
    return sum + (count === 5 ? perHotel : count * perHouse);
  }, 0);
}
function chargePlayer(room, uid, amount, creditorUid = "", reason = "", options = {}) {
  const player = room?.players?.[uid];
  const due = Math.max(0, Math.round(Number(amount) || 0));
  if (!player || due <= 0) return { paid: 0, remaining: 0 };
  if (room.debt && room.debt.uid !== uid) return { paid: 0, remaining: due, blocked: true };
  const paid = Math.min(Math.max(0, Number(player.cash) || 0), due);
  player.cash = Math.max(0, Number(player.cash || 0) - paid);
  if (creditorUid && room.players?.[creditorUid]) room.players[creditorUid].cash += paid;
  const remaining = due - paid;
  if (remaining > 0) {
    room.debt = {
      uid,
      amount: Number(room.debt?.amount || 0) + remaining,
      creditorUid: creditorUid || room.debt?.creditorUid || "",
      reason: [room.debt?.reason, reason].filter(Boolean).join("; ").slice(0, 120),
      ...(options.resumeJail || room.debt?.resumeJail ? {resumeJail:true} : {})
    };
  }
  return { paid, remaining };
}
function applyDebtFunds(room, uid, funds) {
  const player = room?.players?.[uid];
  let amount = Math.max(0, Math.round(Number(funds) || 0));
  if (!player || amount <= 0) return;
  const debt = room.debt;
  if (debt?.uid === uid) {
    const paid = Math.min(amount, Math.max(0, Number(debt.amount) || 0));
    if (debt.creditorUid && room.players?.[debt.creditorUid]) room.players[debt.creditorUid].cash += paid;
    debt.amount -= paid;
    amount -= paid;
    if (debt.amount <= 0) {
      const resumeJail = debt.resumeJail === true;
      room.debt = null;
      // Trả đủ phí ra tù: người chơi được ra tù và tiếp tục tung xúc xắc trong cùng lượt.
      if (resumeJail) player.jailTurns = 0;
      room.message = player.name + " đã thanh toán đủ khoản nợ" + (resumeJail ? ", ra tù và có thể tung xúc xắc." : " và có thể tiếp tục ván chơi.");
    } else {
      room.message = player.name + " đã trả " + money(paid) + ". Còn nợ " + money(debt.amount) + ".";
    }
  }
  player.cash = Math.max(0, Number(player.cash || 0)) + amount;
}
function applyCardEffect(room, uid, card) {
  const player = room?.players?.[uid];
  if (!player || !card) return "Không rút được thẻ.";
  const otherUid = Object.keys(room.players || {}).find((id) => id !== uid);
  const amount = Math.abs(Number(card.amount) || 0);
  switch (card.kind) {
    case "money":
      if (Number(card.amount) >= 0) player.cash += amount;
      else chargePlayer(room, uid, amount, "", card.text);
      return card.text + (Number(card.amount) >= 0 ? " Nhận " : " Chi ") + money(amount) + ".";
    case "payEachPlayer":
      if (otherUid) chargePlayer(room, uid, amount, otherUid, card.text);
      return card.text + " Chia " + money(amount) + " cho người chơi còn lại.";
    case "collectFromEach":
      if (otherUid) chargePlayer(room, otherUid, amount, uid, card.text);
      return card.text + " Nhận " + money(amount) + " từ người chơi còn lại.";
    case "payPerAsset": {
      const bill = amount * ownedAssetCount(room, uid);
      if (bill) chargePlayer(room, uid, bill, "", card.text);
      return card.text + " Phí tính theo tài sản: " + money(bill) + ".";
    }
    case "collectPerAsset": {
      const reward = amount * ownedAssetCount(room, uid);
      player.cash += reward;
      return card.text + " Nhận " + money(reward) + ".";
    }
    case "repair": {
      const bill = buildingRepairCost(room, uid, Number(card.perHouse) || 0, Number(card.perHotel) || 0);
      if (bill) chargePlayer(room, uid, bill, "", card.text);
      return card.text + " Chi phí sửa nhà/khách sạn: " + money(bill) + ".";
    }
    case "jailPass":
      player.jailPasses = Number(player.jailPasses || 0) + 1;
      return card.text + " Bạn đang có " + player.jailPasses + " thẻ miễn vào tù.";
    case "goToJail": {
      sendToJail(room, uid, Number(player.position || 0));
      return card.text;
    }
    default:
      return card.text || "Thẻ Khí vận đã được áp dụng.";
  }
}
function canDeclareBankruptcy(room, uid) {
  return !!room?.debt && room.debt.uid === uid &&
    !hasLiquidationOptions(SPACE_DATA, room.propertyOwners, room.houses || {}, room.mortgages || {}, uid);
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
function showCellInfo(index) {
  const space = SPACE_DATA[index];
  const box = $("cellInfo");
  if (!space || !box) return;
  const ownerUid = roomState?.propertyOwners?.[getSpaceId(index)];
  const owner = ownerUid ? roomState?.players?.[ownerUid] : null;
  const chips = [];
  if (space.price) chips.push("Giá " + money(space.price));
  if (space.type === "station" || space.type === "utility" || space.type === "property") {
    const diceTotal = roomState?.lastRoll?.reduce((sum, value) => sum + Number(value || 0), 0) || 7;
    const rent = owner ? rentForRoom(roomState, index, diceTotal) : null;
    if (rent?.mortgaged) chips.push("Đang cầm cố · Tạm ngưng thu tiền thuê");
    else if (rent) chips.push("Thuê hiện tại " + money(rent.rent));
    else if (space.type === "station") chips.push("Thuê từ " + money(40) + ", tăng gấp đôi theo số bến");
    else if (space.type === "utility") chips.push("Thuê theo điểm xúc xắc: 4× hoặc 10×");
    else chips.push("Thuê cơ bản " + money(space.rent));
  }
  if (space.type === "tax") chips.push("Nộp " + money(space.amount));
  if (owner) chips.push("Chủ: " + owner.name);
  const houses = Number(roomState?.houses?.[getSpaceId(index)] || 0);
  if (houses === 5) chips.push("Có khách sạn");
  else if (houses > 0) chips.push("Có " + houses + " căn nhà");
  if (Number(roomState?.mortgages?.[getSpaceId(index)] || 0) > 0) chips.push("Khoản cầm cố " + money(roomState.mortgages[getSpaceId(index)]));
  const count = space.type === "property" ? propertyGroupIndices(SPACE_DATA, space.group).length : 0;
  const bonus = count >= 2 ? `Sở hữu đủ ${count} ô của ${space.group}: tiền thuê gấp đôi khi chưa xây nhà. Xây đều để tăng tiền thuê.` : "";
  box.innerHTML = `<button class="cell-info-close" type="button" aria-label="Đóng thông tin ô">×</button><div class="cell-info-head">${space.group ? `<i style="background:${safeColor(space.color)}"></i><span>${escapeHtml(space.group)}</span>` : ""}<strong>${escapeHtml(space.icon || "")} ${escapeHtml(space.name)}</strong></div>
    ${space.info ? `<p>${escapeHtml(space.info)}</p>` : ""}
    ${chips.length ? `<div class="cell-info-chips">${chips.map((c) => `<span>${escapeHtml(c)}</span>`).join("")}</div>` : ""}
    ${bonus ? `<p class="cell-info-bonus">${escapeHtml(bonus)}</p>` : ""}`;
  // Giữ thông tin đến khi người chơi tự đóng (nút ×) hoặc chạm sang ô khác.
  box.classList.add("show");
}
function describeSpace(index) {
  const space = SPACE_DATA[index];
  if (!space) return "";
  const ownerUid = roomState?.propertyOwners?.[getSpaceId(index)];
  const owner = ownerUid ? roomState?.players?.[ownerUid] : null;
  const parts = [space.name];
  if (space.group) parts.push(space.group);
  if (space.price) parts.push("giá " + money(space.price));
  if (owner) parts.push("chủ: " + owner.name);
  const houses = Number(roomState?.houses?.[getSpaceId(index)] || 0);
  if (houses) parts.push(houses === 5 ? "có khách sạn" : "có " + houses + " căn nhà");
  if (Number(roomState?.mortgages?.[getSpaceId(index)] || 0) > 0) parts.push("đang cầm cố, tạm ngưng thu tiền thuê");
  if (space.type === "station") parts.push("thuê " + money(40) + ", tăng gấp đôi theo số bến không cầm cố");
  else if (space.type === "utility") parts.push("thuê 4× điểm xúc xắc, 10× nếu có cả hai công ty không cầm cố");
  else if (space.rent) parts.push("thuê cơ bản " + money(space.rent));
  if (space.type === "tax") parts.push("nộp " + money(space.amount));
  if (space.type === "chance") parts.push("rút thẻ Cơ hội");
  if (space.type === "fortune") parts.push("rút thẻ Khí vận");
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
  cameraRestored = false;
  camera?.invalidate();
  camera?.overview(0);
  requestAnimationFrame(() => requestAnimationFrame(() => camera?.premeasure()));
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
          [uid]:{uid,name,color:TOKEN_COLORS[0],token:selectedToken,cash:START_CASH,position:0,jailTurns:0,jailPasses:0}
        },
        propertyOwners:{},
        houses:{},
        mortgages:{},
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
        room.players[uid] = {uid,name:joinName,color:TOKEN_COLORS[1],token:selectedToken,cash:START_CASH,position:0,jailTurns:0,jailPasses:0};
        room.joinerUid = uid;
        room.status = "playing";
        room.openingRound = 1;
        room.openingRolls = {};
        room.message = "Cả hai người chơi hãy tung hai viên xí ngầu để chọn người đi trước.";
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
    const id = getSpaceId(index);
    const ownerUid = roomState?.propertyOwners?.[id];
    const owner = ownerUid ? roomState?.players?.[ownerUid] : null;
    const houseCount = Number(roomState?.houses?.[id] || 0);
    const mortgaged = Number(roomState?.mortgages?.[id] || 0) > 0;
    const div = document.createElement("div");
    div.className = "space" + (space.corner ? " corner" : "") + (owner ? " owned" : "") +
      (mortgaged ? " mortgaged" : "") + (houseCount ? " built" : "") +
      (stampUntil[index] > Date.now() ? " stamp" : "") +
      (space.corner ? "" : row === 0 ? " side-top" : row === 10 ? " side-bottom" : col === 0 ? " side-left" : " side-right");
    if (owner) div.style.setProperty("--owner", safeColor(owner.color));
    div.style.gridRow = String(row+1);
    div.style.gridColumn = String(col+1);
    const colorBar = space.color || (space.type === "property" ? "#9b8067" : "transparent");
    const price = space.price ? moneyShort(space.price) : space.amount ? moneyShort(space.amount) : "";
    const name = space.corner ? space.name : shortName(space.name);
    const nameScale = Math.max(.58, Math.min(1, 16 / Math.max(16, name.length)));
    const description = describeSpace(index);
    const buildingMark = houseCount === 5 ? "🏨" : houseCount > 0 ? "🏠".repeat(houseCount) : "";
    div.dataset.index = String(index);
    div.title = description;
    div.setAttribute("aria-label", description);
    const bar = space.corner || !space.color ? "" : `<span class="space-color" style="background:${colorBar}"></span>`;
    const kindIcon = space.type === "property" ? "" : escapeHtml(space.icon || "");
    // Mặt ô xoay theo cạnh bàn (chữ quay ra ngoài như bàn cờ thật); quân cờ, cờ chủ và công trình nằm ngoài lớp xoay.
    div.innerHTML = `
      <span class="sp-face">
        ${bar}
        ${buildingMark ? `<span class="space-buildings" aria-label="${houseCount === 5 ? "Khách sạn" : houseCount + " căn nhà"}">${buildingMark}</span>` : ""}
        <span class="space-text" style="--name-scale:${nameScale.toFixed(2)}">${kindIcon ? `<span class="sp-icon" aria-hidden="true">${kindIcon}</span>` : ""}<span class="space-name">${escapeHtml(name)}</span>${price && !space.corner ? `<span class="space-price">${price}</span>` : ""}</span>
        ${mortgaged ? '<span class="space-mortgage-mark" title="Đang cầm cố">C</span>' : ""}
      </span>
      ${owner ? `<span class="space-owner-mark" title="Tài sản của ${escapeHtml(owner.name)}" aria-hidden="true"></span>` : ""}
      <span class="space-players">${tokensHtml(index)}</span>
    `;
    board.insertBefore(div, center);
  });
  center.style.zIndex = "0";
}
function renderPlayers() {
  const entries = getPlayerEntries(roomState);
  $("playersPanel").innerHTML = entries.map(([uid,p]) => {
    const isTurn = !isOpeningRollPhase(roomState) && roomState.turnUid === uid;
    const isMe = uid === currentUser.uid;
    const tokenId = playerTokenId(p, entries.findIndex(([id]) => id === uid));
    const space = SPACE_DATA[Number(p.position)]?.name || "—";
    return `<div class="player-card ${isTurn?"active":""}" data-uid="${escapeHtml(uid)}" style="--pc:${safeColor(p.color)}"><span class="player-avatar" data-token="${tokenId}" aria-label="${escapeHtml(tokenLabel(tokenId))}">${tokenMarkup(tokenId)}</span><div class="player-info">
      <div class="player-head"><i class="player-dot" style="background:${safeColor(p.color)}"></i><span class="player-name">${escapeHtml(p.name)}</span>${isMe?'<span class="you-label">Bạn</span>':""}</div>
      <div class="player-cash">${money(p.cash)}</div>
      <p class="player-position">${escapeHtml(space)} ${jailStatus(p).label ? "· " + jailStatus(p).label : ""}</p>
    </div></div>`;
  }).join("");
  const turnPlayer = roomState.players?.[roomState.turnUid];
  const waitingForOpponent = roomState.status === "waiting";
  $("turnName").textContent = waitingForOpponent ? "Chờ đối thủ..." : isOpeningRollPhase(roomState) ? "Đang chọn lượt" : turnPlayer?.name || "Chờ đối thủ...";
  // Màu quân cờ phụ thuộc vào việc là người tạo hay người vào phòng, nên chú giải phải lấy màu thật.
  const opponent = roomState.players?.[otherPlayerUid()];
  
  
}
function renderProperties() {
  const ownerMap = roomState.propertyOwners || {};
  const owned = Object.entries(ownerMap).map(([id,uid]) => {
    const index = Number(id.slice(1));
    return {space:SPACE_DATA[index],uid,index,id};
  }).filter(item => item.space);
  const debt = roomState.debt;
  let canBuildAny = false;
  const rows = owned.map(({space,uid,index,id}) => {
    const player = roomState.players?.[uid];
    const houses = Number(roomState.houses?.[id] || 0);
    const mortgage = Number(roomState.mortgages?.[id] || 0);
    const isMine = uid === currentUser.uid;
    const canManage = isMine && (!debt || debt.uid === uid) &&
      (debt?.uid === uid || (roomState.turnUid === uid && !roomState.pending && !roomState.auction));
    const canBuildNow = isMine && roomState.status === "playing" &&
      roomState.turnUid === uid && !debt && !roomState.pending && !roomState.auction;
    const controls = [];

    if (canManage && houses > 0) {
      const sell = sellHouseEligibility(SPACE_DATA, ownerMap, roomState.houses || {}, uid, index);
      if (sell.ok) controls.push(`<button type="button" class="deed-action sell-house" data-deed-action="sell-house" data-index="${index}">Bán ${houses === 5 ? "khách sạn" : "nhà"} +${money(sell.refund)}</button>`);
    }

    // Luôn giải thích trạng thái xây nhà trên đất của mình; chỉ bật nút khi đủ điều kiện.
    if (isMine && space.type === "property") {
      const build = buildEligibility(SPACE_DATA, ownerMap, roomState.houses || {}, roomState.mortgages || {}, uid, index, player?.cash);
      if (canBuildNow && build.ok) {
        canBuildAny = true;
        controls.push(`<button type="button" class="deed-action build-house" data-deed-action="build-house" data-build-index="${index}" data-index="${index}" title="Xây nhà tại ${escapeHtml(space.name)} với chi phí ${money(build.cost)}">🏠 Xây ${houses === 4 ? "khách sạn" : "nhà"} · ${money(build.cost)}</button>`);
      } else {
        let reason = build.reason || "Chưa đủ điều kiện xây nhà.";
        let label = reason;
        if (!canBuildNow) {
          if (roomState.status !== "playing") label = "Chỉ xây khi ván đang diễn ra";
          else if (debt) label = debt.uid === uid ? "Thanh toán nợ trước khi xây" : "Chờ xử lý khoản nợ hiện tại";
          else if (roomState.pending || roomState.auction) label = "Hoàn tất mua/đấu giá trước khi xây";
          else if (roomState.turnUid !== uid) label = "Chờ lượt của bạn để xây";
          else label = "Chưa thể xây lúc này";
        } else if (/sở hữu toàn bộ đất|trọn bộ/i.test(reason)) {
          label = "🏠 Cần sở hữu đủ bộ màu";
        } else if (/giải chấp/i.test(reason)) {
          label = "🔓 Giải chấp cả bộ trước";
        } else if (/xây đều/i.test(reason)) {
          label = "⚖️ Xây đều: chọn ô ít nhà nhất";
        } else if (/đủ tiền/i.test(reason)) {
          label = "💰 Chưa đủ tiền xây";
        } else if (/khách sạn tối đa/i.test(reason)) {
          label = "🏨 Đã đạt tối đa công trình";
        }
        controls.push(`<span class="deed-status build-status" data-build-status="${index}" title="${escapeHtml(reason)}">${escapeHtml(label)}</span>`);
      }
    }

    if (canManage && mortgage > 0) {
      const redeem = redemptionCost(mortgage);
      if (!debt && roomState.turnUid === uid && !roomState.pending && !roomState.auction && Number(player?.cash || 0) >= redeem) {
        controls.push(`<button type="button" class="deed-action redeem-asset" data-deed-action="redeem-asset" data-index="${index}">Giải chấp · ${money(redeem)}</button>`);
      } else {
        controls.push(`<span class="deed-status mortgage-status">Đang cầm cố · ${money(mortgage)}</span>`);
      }
    } else if (canManage) {
      const mort = mortgageEligibility(SPACE_DATA, ownerMap, roomState.houses || {}, roomState.mortgages || {}, uid, index);
      if (mort.ok) controls.push(`<button type="button" class="deed-action mortgage-asset" data-deed-action="mortgage-asset" data-index="${index}">Cầm cố +${money(mort.amount)}</button>`);
    }

    const buildingText = houses === 5 ? "Khách sạn" : houses > 0 ? houses + " căn nhà" : "Chưa xây";
    const mortgageText = mortgage > 0 ? " · Đang cầm cố" : "";
    const detail = `${space.group ? escapeHtml(space.group) + " · " : ""}${escapeHtml(player?.name || "Người chơi")} · ${buildingText}${mortgageText}`;
    return `<div class="property-row ${isMine ? "mine" : "opponent"}" style="--owner:${safeColor(player?.color)}">
      <i class="property-swatch" style="background:${safeColor(space.color || player?.color)}"></i>
      <div class="property-row-main"><strong>${escapeHtml(space.name)}</strong><small>${detail}</small></div>
      <div class="property-row-actions">${controls.join("")}</div>
    </div>`;
  });
  $("propsButton")?.classList.toggle("has-build", canBuildAny);
  const debtNote = debt?.uid === currentUser.uid
    ? `<div class="debt-banner"><strong>Đang nợ ${money(debt.amount)}</strong><span>${escapeHtml(debt.reason || "Khoản thanh toán chưa đủ")}. Bán nhà hoặc cầm cố thêm tài sản để trả nợ.</span></div>`
    : "";
  if (!rows.length) {
    $("propertyList").innerHTML = debtNote + '<div class="empty-properties">Chưa có bất động sản nào được mua.<br>Hãy tung xúc xắc để sở hữu mảnh đất đầu tiên!</div>';
    return;
  }
  $("propertyList").innerHTML = debtNote + rows.join("");
}
function renderActions() {
  const mine = myPlayer();
  const uid = currentUser.uid;
  const isMyTurn = roomState.turnUid === uid;
  const playing = roomState.status === "playing" && getPlayerEntries(roomState).length === 2;
  const pending = roomState.pending;
  const auction = roomState.auction;
  const dice = roomState.lastRoll;
  if (!diceAnimating) $("diceResult").innerHTML = dice ? diceHtml(dice) : diceHtml([0, 0]);

  const buttons = $("pendingActions");
  buttons.innerHTML = "";
  const openingPhase = isOpeningRollPhase(roomState);
  const myOpeningRoll = roomState.openingRolls?.[uid];
  if (openingPhase) {
    buttons.innerHTML = "";
    if (myOpeningRoll) {
      const sum = Number(myOpeningRoll[0] || 0) + Number(myOpeningRoll[1] || 0);
      $("actionMessage").textContent = `Bạn đã tung ${myOpeningRoll[0]} + ${myOpeningRoll[1]} = ${sum}. Đợi người chơi còn lại tung xí ngầu.`;
    } else {
      $("actionMessage").textContent = Number(roomState.openingRound) > 1
        ? `Hòa điểm! Vòng ${roomState.openingRound}: cả hai hãy tung lại để chọn người đi trước.`
        : "Mỗi người tung hai viên xí ngầu. Ai có tổng cao hơn sẽ đi trước.";
    }
  } else if (auction && SPACE_DATA[auction.index]) {
    const space = SPACE_DATA[auction.index];
    const leader = auction.highestUid ? roomState.players?.[auction.highestUid] : null;
    if (auction.turnUid === uid) {
      const bid = document.createElement("button");
      bid.className = "primary-button";
      bid.textContent = (leader ? "Nâng giá " : "Ra giá ") + money(nextAuctionBid(auction));
      bid.disabled = busy || mine.cash < nextAuctionBid(auction);
      bid.addEventListener("click", placeAuctionBid);
      const pass = document.createElement("button");
      pass.className = "secondary-button";
      pass.textContent = leader ? "Bỏ lượt" : "Bỏ đấu giá";
      pass.disabled = busy;
      pass.addEventListener("click", passAuction);
      buttons.append(bid, pass);
      $("actionMessage").textContent = leader
        ? space.name + " · Giá cao nhất " + money(auction.currentBid) + " (" + (leader.name || "người chơi") + "). Nâng giá hoặc bỏ lượt."
        : space.name + " đang đấu giá · Giá mở " + money(AUCTION_INCREMENT) + ". Ra giá hoặc bỏ đấu giá.";
    } else {
      const bidder = roomState.players?.[auction.turnUid]?.name || "đối thủ";
      $("actionMessage").textContent = space.name + " đang đấu giá. " +
        (leader ? "Giá cao nhất " + money(auction.currentBid) + " của " + leader.name + ". " : "Chưa có giá trả. ") +
        bidder + " đang quyết định.";
    }
  } else if (pending?.uid === uid && SPACE_DATA[pending.index]) {
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
    buttons.append(buy, pass);
    $("actionMessage").textContent = roomState.message || ("Bạn đang ở " + space.name + ". Mua tài sản hoặc bỏ qua.");
  } else {
    $("actionMessage").textContent = roomState.message || (roomState.status === "waiting" ? "Đang chờ người chơi thứ hai..." : "Đến lượt bạn!");
  }
  const jailed = Number(mine?.jailTurns || 0) > 0 && isMyTurn && !dice && !pending && !auction && !roomState.debt && playing;
  if (jailed) {
    const pay = document.createElement("button");
    pay.className = "secondary-button";
    pay.dataset.jail = "pay";
    pay.textContent = "💰 Nộp phạt " + money(JAIL_FEE);
    pay.disabled = busy;
    pay.addEventListener("click", () => leaveJail("fee"));
    buttons.append(pay);
    if (Number(mine.jailPasses || 0) > 0) {
      const card = document.createElement("button");
      card.className = "secondary-button";
      card.dataset.jail = "card";
      card.textContent = "🎟️ Dùng thẻ ra tù (" + mine.jailPasses + ")";
      card.disabled = busy;
      card.addEventListener("click", () => leaveJail("card"));
      buttons.append(card);
    }
    $("actionMessage").textContent = "Bạn đang bị giam (lần " + mine.jailTurns + "/" + JAIL_MAX_ATTEMPTS + "). Nộp phạt, dùng thẻ hoặc thử tung đôi để ra tù.";
  }

  const canPayJail = Number(mine?.jailTurns || 0) > 0 && !dice;
  if (openingPhase) {
    $("rollButton").textContent = myOpeningRoll ? "⏳ Đợi đối thủ tung..." : "🎲 Tung xí ngầu chọn lượt";
    $("rollButton").disabled = busy || !playing || !!myOpeningRoll;
  } else {
    $("rollButton").textContent = canPayJail ? "🎲 Thử tung đôi (" + mine.jailTurns + "/" + JAIL_MAX_ATTEMPTS + ")" : roomState.extraRoll && isMyTurn ? "🎲 Tung thêm (được đôi)" : "🎲 Tung xúc xắc";
    $("rollButton").disabled = busy || !playing || !isMyTurn || !!pending || !!auction || !!dice || roomState.status === "finished";
  }
  document.title = roomState.status === "playing" && !openingPhase && isMyTurn ? "● Đến lượt bạn - Cờ Tỷ Phú Online" : "Cờ Tỷ Phú Online";
  if (roomState.status === "waiting") {
    $("centerStatus").textContent = "Chờ người chơi thứ hai";
  } else if (roomState.status === "finished") {
    $("centerStatus").textContent = "Ván đấu kết thúc";
  } else if (openingPhase) {
    const ownRoll = roomState.openingRolls?.[uid];
    $("centerStatus").textContent = ownRoll
      ? "Đã tung xí ngầu · Đợi đối thủ"
      : Number(roomState.openingRound) > 1 ? `Hòa điểm · Tung lại vòng ${roomState.openingRound}` : "Tung xí ngầu chọn người đi trước";
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
let movingUid = null;
let diceAnimating = false;
let diceTimer = null;
let diceFinishTimer = null;
let diceAnimationId = 0;
// Tổng thời gian đổ xúc xắc: 2,34 giây hoạt cảnh + ~0,4 giây nêu bật kết quả rồi quân cờ mới đi.
const DICE_MS = 2750;
const HOP_MS = 190;

function tokensHtml(index) {
  return getPlayerEntries(roomState)
    .filter(([uid, p]) => (displayPos[uid] ?? Number(p.position)) === index)
    .map(([uid, p], i) => {
      const tokenId = playerTokenId(p, i);
      return `<i class="token${movingUid === uid ? " moving" : ""}" title="${escapeHtml(p.name)}" style="--tc:${safeColor(p.color)}"><b class="token-glyph" data-token="${tokenId}">${tokenMarkup(tokenId)}</b></i>`;
    })
    .join("");
}
function renderTokens() {
  document.querySelectorAll("#board .space").forEach((cell) => {
    const holder = cell.querySelector(".space-players");
    if (holder) holder.innerHTML = tokensHtml(Number(cell.dataset.index));
  });
}
function resetEffects() {
  clearTimeout(holdTimer); holdTimer = null; eventHoldUntil = 0; epSeenId = 0; epMinimized = false;
  cameraRestored = false;
  camera?.overview(0);
  clearInterval(diceTimer);
  clearTimeout(diceFinishTimer);
  diceTimer = null;
  diceFinishTimer = null;
  diceAnimationId += 1;
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
function animateMove(uid, from, to, delay, expectedSteps = null, cam = null) {
  const distance = Number.isInteger(expectedSteps) ? expectedSteps : (to - from + 40) % 40;
  if (reduceMotion || distance < 1 || distance > 12 || (from + distance) % 40 !== to) return 0;
  // Có lượt di chuyển mới hơn cho cùng quân cờ: bỏ hành trình dang dở, lượt mới nhất luôn thắng.
  clearTimeout(moveTimers[uid]);
  displayPos[uid] = from;
  let step = 0;
  const tick = () => {
    step++;
    movingUid = uid;
    displayPos[uid] = (from + step) % 40;
    const cell = document.querySelector(`#board .space[data-index="${displayPos[uid]}"]`);
    if (cell) { cell.classList.remove("pass", "land"); void cell.offsetWidth; cell.classList.add(step >= distance ? "land" : "pass"); }
    if (step >= distance) {
      delete displayPos[uid];
      delete moveTimers[uid];
      movingUid = null;
      renderTokens();
      cam?.land(to);
      return;
    }
    renderTokens();
    cam?.step(displayPos[uid]);
    moveTimers[uid] = setTimeout(tick, HOP_MS);
  };
  moveTimers[uid] = setTimeout(tick, delay);
  return delay + distance * HOP_MS;
}
function cubeHtml() {
  const faces = [1, 2, 3, 4, 5, 6].map((n) => `<span class="die face" data-v="${n}">${"<i></i>".repeat(9)}</span>`).join("");
  return `<div class="die-slot"><i class="die-shadow"></i><div class="cube-wrap"><div class="cube">${faces}</div></div></div>`;
}
function setCube(el, value, spin) {
  el.style.transform = cubeTransform(value, spin);
}
// Hai khối xúc xắc 3D lăn giữa bàn cờ rồi dừng đúng mặt. Cộng thêm bội số của 360° nên mặt cuối không đổi.
function animateDice(finalDice) {
  const box = $("diceResult");
  const stage = $("diceStage");
  const result = [0, 1].map((i) => {
    const value = Number(finalDice?.[i]);
    return Number.isInteger(value) && value >= 1 && value <= 6 ? value : 1;
  });
  const total = result[0] + result[1];

  // Vô hiệu hóa mọi animation cũ trước khi bắt đầu animation mới.
  clearInterval(diceTimer);
  clearTimeout(diceFinishTimer);
  diceTimer = null;
  diceFinishTimer = null;
  const animationId = ++diceAnimationId;

  // Dừng hẳn: nêu bật tổng điểm (và "Đôi!"), giữ một nhịp để người chơi đọc rồi mới cho quân cờ đi.
  const land = () => {
    if (animationId !== diceAnimationId || !stage) return;
    stage.classList.remove("rolling");
    stage.classList.add("landed");
    if (!stage.querySelector(".dice-total")) {
      const dbl = result[0] === result[1] ? '<span class="dice-double">ĐÔI!</span>' : "";
      stage.querySelector(".dice-row")?.insertAdjacentHTML("beforeend", `<b class="dice-total">${dbl}${total}</b>`);
    }
  };
  const finish = () => {
    // Timer cũ không được phép dừng một lượt xúc xắc mới hơn.
    if (animationId !== diceAnimationId) return;
    clearInterval(diceTimer);
    clearTimeout(diceFinishTimer);
    diceTimer = null;
    diceFinishTimer = null;
    diceAnimating = false;
    box.classList.remove("rolling");
    box.innerHTML = diceHtml(result);
    if (stage) {
      land();
      setTimeout(() => {
        if (animationId === diceAnimationId) stage.className = "dice-stage";
      }, 900);
    }
  };

  if (reduceMotion) {
    finish();
    return;
  }

  diceAnimating = true;
  box.classList.add("rolling");
  const face = () => 1 + Math.floor(Math.random() * 6);
  const shuffle = () => { box.innerHTML = diceHtml([face(), face()]); };
  shuffle();
  diceTimer = setInterval(shuffle, 90);

  // Luôn đặt giờ kết thúc trước khi dựng khối 3D. Nếu dựng mặt xúc xắc bị lỗi,
  // animation vẫn phải tự dừng và hiện kết quả cuối cùng.
  diceFinishTimer = setTimeout(finish, DICE_MS);

  try {
    if (stage) {
      stage.className = "dice-stage show rolling";
      stage.innerHTML = `<div class="dice-row">${cubeHtml()}${cubeHtml()}</div>`;
      playDiceRoll(stage, result);
      playDiceSound();
      setTimeout(land, DICE_ANIM_MS + 40);
    }
  } catch (error) {
    console.error("Không thể dựng hiệu ứng xúc xắc 3D:", error);
    finish();
  }
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
  const openingRolled = next.openingLastRoll &&
    JSON.stringify(previous.openingLastRoll || null) !== JSON.stringify(next.openingLastRoll);
  const rolled = !previous.lastRoll && next.lastRoll;
  if (openingRolled) animateDice(next.openingLastRoll.dice);
  else if (rolled) animateDice(next.lastRoll);
  let holdMs = rolled ? DICE_MS : 0;
  // Qua lượt (hoặc tung thêm do được đôi): camera từ từ trở về toàn cảnh.
  if (Number(next.turnNumber) !== Number(previous.turnNumber) && !rolled) camera?.overview();
  for (const [uid, now] of getPlayerEntries(next)) {
    const before = previous.players?.[uid];
    if (!before) continue;
    let delay = (rolled || openingRolled) ? DICE_MS : 0;
    if (Number(before.position) !== Number(now.position)) {
      const move = next.lastMove;
      const exactSteps = move?.uid === uid &&
        Number(move.from) === Number(before.position) &&
        Number(move.to) === Number(now.position) ? Number(move.steps) : null;
      const route = planCameraRoute(Number(before.position), Number(now.position), exactSteps, delay);
      const startDelay = delay + (route.follow ? CAMERA.zoomInMs : 0);
      const end = animateMove(uid, Number(before.position), Number(now.position), startDelay, exactSteps, route.follow ? route.hooks : null);
      if (end) delay = end;
      else if (route.teleport) { delay += route.teleport(delay); }
      holdMs = Math.max(holdMs, delay + (end || route.follow ? CAMERA.focusMs : 0));
    }
    if (Number(before.cash) !== Number(now.cash)) floatDelta(uid, Number(now.cash) - Number(before.cash), delay);
  }
  if (holdMs > 0) {
    eventHoldUntil = Date.now() + holdMs + 150;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { holdTimer = null; if (roomState) { renderActions(); renderEventPanel(); } }, holdMs + 170);
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
// ===== Camera theo quân cờ (chỉ ở trình duyệt, không ghi gì lên Firebase) =====
function planCameraRoute(from, to, steps, diceDelay) {
  if (!camera || !camera.state.enabled) return { follow: false };
  const distance = Number.isInteger(steps) ? steps : (to - from + 40) % 40;
  const hops = !reduceMotion && distance >= 1 && distance <= 12 && (from + distance) % 40 === to;
  const seq = camera.beginSequence();
  if (!hops) {
    // Dịch chuyển thẳng (vào tù): bỏ qua hành trình, focus thẳng vào ô đích.
    return { follow: false, teleport: (delay) => { camera.later(() => camera.focus(to, { seq }), delay); return CAMERA.focusMs; } };
  }
  camera.later(() => camera.follow(from, { seq, ms: CAMERA.zoomInMs }), diceDelay);
  return {
    follow: true,
    hooks: {
      step: (cell) => camera.follow(cell, { seq, ms: HOP_MS + 60, ease: "cubic-bezier(.3,.1,.6,.9)" }),
      land: (cell) => camera.focus(cell, { seq })
    }
  };
}
// Tải lại trang / vào lại phòng giữa lúc đang có sự kiện: đưa camera tới ô đang xử lý (không phát lại hành trình).
function restoreCameraAfterReload() {
  if (cameraRestored || !camera || !roomState) return;
  cameraRestored = true;
  const e = currentTurnEvent();
  if (!camera.state.enabled || !e || !Number.isInteger(e.index) || roomState.status !== "playing" || !roomState.lastRoll) return;
  const seq = camera.beginSequence();
  camera.later(() => camera.focus(e.index, { ms: 700, seq }), 350);
}

// ===== Bảng sự kiện =====
let epMinimized = false;
let epSeenId = 0;
let eventHoldUntil = 0;
let holdTimer = null;
function currentTurnEvent() {
  const e = roomState?.event;
  return e && Number(e.turn) === Number(roomState.turnNumber) ? e : null;
}
function eventLogList(room = roomState) {
  const log = room?.log;
  if (!log) return [];
  return (Array.isArray(log) ? log : Object.keys(log).sort((a, b) => a - b).map((k) => log[k])).filter(Boolean);
}
function eventReason(e, uid, delta) {
  const actor = uid === e.uid;
  switch (e.kind) {
    case "buy": return "mua tài sản";
    case "auction": return delta < 0 ? "thắng đấu giá" : "đấu giá";
    case "tax": return "nộp thuế";
    case "chance": return "thẻ Cơ hội";
    case "fortune": return "thẻ Khí vận";
    case "jail": return "phí ra tù";
    case "start": return "Xuất phát";
    case "property": case "station": case "utility":
      return actor ? (delta < 0 ? "trả tiền thuê" : "nhận tiền") : "nhận tiền thuê";
    default: return "";
  }
}
const MASCOT_SVG = `<svg class="deed-mascot" viewBox="0 0 90 130" aria-hidden="true" focusable="false">
  <ellipse cx="45" cy="124" rx="26" ry="5" fill="rgba(0,0,0,.25)"/>
  <path d="M26 62 Q24 112 30 120 H62 Q68 112 64 62 Q45 52 26 62Z" fill="#2b5aa8"/>
  <path d="M45 56 V118" stroke="#1d3f7c" stroke-width="2"/>
  <circle cx="45" cy="64" r="2" fill="#f2c14e"/><circle cx="45" cy="80" r="2" fill="#f2c14e"/><circle cx="45" cy="96" r="2" fill="#f2c14e"/>
  <path d="M62 66 Q82 58 84 40" fill="none" stroke="#2b5aa8" stroke-width="9" stroke-linecap="round"/>
  <circle cx="84" cy="36" r="6" fill="#f0c49a"/>
  <path d="M28 70 Q18 84 22 98" fill="none" stroke="#2b5aa8" stroke-width="9" stroke-linecap="round"/>
  <circle cx="22" cy="100" r="6" fill="#f0c49a"/>
  <rect x="30" y="118" width="12" height="8" rx="3" fill="#4a3320"/><rect x="48" y="118" width="12" height="8" rx="3" fill="#4a3320"/>
  <circle cx="45" cy="40" r="17" fill="#f0c49a"/>
  <path d="M30 44 Q45 66 60 44 Q45 54 30 44Z" fill="#f5f5f5"/>
  <path d="M38 36 q2 -2 4 0 M48 36 q2 -2 4 0" stroke="#3a2a1a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M40 48 Q45 52 50 48" stroke="#8a4b2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M4 32 L45 -2 L86 32 Q45 24 4 32Z" fill="#e7c36b" stroke="#b58b2b" stroke-width="1.5"/>
  <path d="M16 28 L45 6 M30 28 L45 6 M60 28 L45 6 M74 28 L45 6" stroke="#c9a14a" stroke-width="1" fill="none"/>
  <path d="M36 30 Q45 40 54 30" stroke="#c0392b" stroke-width="1.4" fill="none"/>
</svg>`;
function textColorFor(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "#111";
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? "#111" : "#fff";
}
// Thẻ địa danh như game gốc: giá mua, giá cầm cố, bảng tiền thuê theo nhà/khách sạn, giá xây.
function deedHtml(index, banner) {
  const space = SPACE_DATA[index];
  if (!space || !space.price) return "";
  const row = (k, v, hl) => `<div class="deed-row${hl ? " hl" : ""}"><span>${k}</span><b>${v}</b></div>`;
  let rows = row("Giá mua", money(space.price), true) + row("Cầm cố", money(mortgageValue(space)));
  if (space.type === "property") {
    rows += row("Thuê", money(space.rent)) + row("Cả nhóm màu", money(space.rent * 2));
    HOUSE_RENT_MULTIPLIERS.forEach((m, i) => { rows += row(i < 4 ? `Với ${i + 1} nhà` : "Khách sạn", money(space.rent * m)); });
    rows += row("Xây mỗi nhà", money(getHouseCost(SPACE_DATA, index)));
  } else if (space.type === "station") {
    rows += [1, 2, 3, 4].map((n) => row(`Có ${n} bến`, money(40 * 2 ** (n - 1)))).join("");
  } else if (space.type === "utility") {
    rows += row("Có 1 công ty", "4× xúc xắc") + row("Có 2 công ty", "10× xúc xắc");
  }
  const bg = space.color || "#9b8067";
  return `${banner ? `<div class="deed-banner">${escapeHtml(banner)}</div>` : ""}<div class="deed">
    <div class="deed-head" style="background:${safeColor(bg)};color:${textColorFor(bg)}">${escapeHtml(space.name)}</div>${rows}</div>`;
}
// Bỏ câu "Bạn tung được x + y = n bước và đến ..." (đã có ở thanh trạng thái), chỉ giữ nội dung lá bài.
function cardOnlyText(text) {
  const t = String(text || "");
  const m = t.match(/(?:CƠ HỘI|KHÍ VẬN)\.\s*([\s\S]+)$/i);
  return (m ? m[1] : t).trim();
}
function renderEventPanel() {
  const panel = $("eventPanel");
  if (!panel || !roomState || !currentUser) return;
  const e = currentTurnEvent();
  const holding = Date.now() < eventHoldUntil;
  const uid = currentUser.uid;
  const players = roomState.players || {};
  const nameOf = (id) => players[id]?.name || "Người chơi";
  if (e && e.id !== epSeenId) { epSeenId = e.id; epMinimized = false; }
  const quiet = !!e && (e.kind === "buy" || e.kind === "auction"); // mua/đấu giá xong không hiện thẻ thông báo
  panel.classList.toggle("idle", !e || holding || quiet);
  panel.classList.toggle("min", epMinimized);
  $("epMinButton").setAttribute("aria-expanded", String(!epMinimized));
  $("epMinButton").textContent = epMinimized ? "▴" : "▾";
  const space = e && Number.isInteger(e.index) ? SPACE_DATA[e.index] : null;
  $("epIcon").textContent = space?.icon || "🎲";
  $("epTitle").textContent = holding && e ? nameOf(e.uid) + " đang di chuyển…" : space ? space.name : "Lượt chơi";
  const money$ = $("epMoney"), bal = $("epBalances"), confirmRow = $("epConfirmRow");
  money$.innerHTML = ""; bal.innerHTML = ""; confirmRow.innerHTML = "";
  const deed = $("epDeed"); deed.innerHTML = "";
  if (holding) {
    $("actionMessage").textContent = "🎲 Quân cờ đang di chuyển…";
    $("pendingActions").innerHTML = "";
    return;
  }
  // Thẻ địa danh khi có quyền mua / đấu giá; thẻ Cơ hội, Khí vận hiện nội dung lá bài.
  const deedIndex = roomState.auction ? Number(roomState.auction.index) : roomState.pending ? Number(roomState.pending.index) : -1;
  if (deedIndex >= 0 && SPACE_DATA[deedIndex]) {
    deed.innerHTML = deedHtml(deedIndex, roomState.auction ? "Đấu giá" : "Đang bán") +
      `<div class="deed-bubble">${money(roomState.auction ? Number(roomState.auction.currentBid) || AUCTION_INCREMENT : SPACE_DATA[deedIndex].price)}</div>` + MASCOT_SVG;
  } else if (e && (e.kind === "chance" || e.kind === "fortune")) {
    deed.innerHTML = `<div class="deed card-event ${e.kind === "chance" ? "is-chance" : "is-chest"}"><div class="deed-head">${e.kind === "chance" ? "Cơ hội" : "Khí vận"}</div><div class="deed-info">${escapeHtml(cardOnlyText(e.text))}</div></div>` + MASCOT_SVG;
  }
  // Tiền cộng/trừ, lý do, người trả và người nhận.
  if (e?.deltas) {
    const rows = Object.entries(e.deltas).filter(([, d]) => Number(d) !== 0);
    money$.innerHTML = rows.map(([id, d]) => {
      const cls = d > 0 ? "gain" : "loss";
      const why = eventReason(e, id, d);
      return `<li class="${cls === "loss" ? "loss" : ""}"><span>${escapeHtml(nameOf(id))}${why ? ` <small>· ${escapeHtml(why)}</small>` : ""}</span><b class="${cls}">${d > 0 ? "+" : "−"}${money(Math.abs(d))}</b></li>`;
    }).join("");
    const payer = rows.find(([, d]) => d < 0), receiver = rows.find(([, d]) => d > 0);
    if (payer && receiver && (e.kind === "property" || e.kind === "station" || e.kind === "utility" || e.kind === "chance" || e.kind === "fortune") && payer[0] !== receiver[0]) {
      const amount = Math.min(Math.abs(payer[1]), receiver[1]);
      money$.insertAdjacentHTML("beforeend", `<li class="ep-flow-row"><span class="ep-flow">💸 ${escapeHtml(nameOf(payer[0]))} trả cho ${escapeHtml(nameOf(receiver[0]))} ${money(amount)}</span></li>`);
    }
  }
  if (e) {
    bal.innerHTML = Object.entries(players).map(([id, p]) => `<span style="--pc:${safeColor(p.color)}">${escapeHtml(p.name)}: ${money(p.cash)}</span>`).join("");
  }
  // Nút xác nhận: chỉ người đang đến lượt, và chỉ khi sự kiện đã xử lý xong (không còn mua/đấu giá/nợ).
  const mine = players[uid];
  const playing = roomState.status === "playing" && getPlayerEntries(roomState).length === 2;
  const resolved = !roomState.pending && !roomState.auction && !roomState.debt;
  const addButton = (cls, text, handler, attrs = {}) => {
    const b = document.createElement("button");
    b.className = cls; b.type = "button"; b.textContent = text;
    Object.entries(attrs).forEach(([k, v]) => b.setAttribute(k, v));
    b.addEventListener("click", handler);
    confirmRow.append(b);
    return b;
  };
  if (roomState.debt?.uid === uid && playing) {
    addButton("secondary-button", "📋 Mở Sổ đất", () => { $("propsModal").hidden = false; });
    if (canDeclareBankruptcy(roomState, uid)) addButton("danger-button", "🏳️ Phá sản", () => declareBankruptcy(), { id: "bankruptButton" });
  }
  // Không còn nút "Kết thúc lượt": sau khi sự kiện xử lý xong và đã hiện đủ thời gian đọc thì tự qua lượt.
  if (canAutoAdvance()) scheduleAutoAdvance(); else cancelAutoAdvance();
}
// Thời gian đọc trước khi tự qua lượt: thẻ Cơ hội/Khí vận dài hơn thì chờ lâu hơn (4–9 giây), sự kiện khác 3,2 giây.
function autoAdvanceMs() {
  const e = currentTurnEvent();
  if (e && (e.kind === "chance" || e.kind === "fortune")) return Math.max(4500, Math.min(9000, 2200 + cardOnlyText(e.text).length * 60));
  return 3200;
}
let autoAdvTimer = null, autoAdvKey = "";
function canAutoAdvance() {
  if (!roomState || !currentUser) return false;
  const uid = currentUser.uid;
  const playing = roomState.status === "playing" && getPlayerEntries(roomState).length === 2;
  const resolved = !roomState.pending && !roomState.auction && !roomState.debt;
  return playing && roomState.turnUid === uid && !!roomState.lastRoll && resolved && canAdvanceTurn(roomState) && Date.now() >= eventHoldUntil && $("propsModal")?.hidden !== false;
}
function cancelAutoAdvance() { clearTimeout(autoAdvTimer); autoAdvTimer = null; autoAdvKey = ""; $("eventPanel")?.classList.remove("counting"); }
function scheduleAutoAdvance() {
  const key = JSON.stringify([roomState.turnUid, roomState.eventSeq || 0, roomState.doublesCount || 0, roomState.lastRoll]);
  if (autoAdvKey === key) return;
  clearTimeout(autoAdvTimer);
  autoAdvKey = key;
  const ms = autoAdvanceMs(), panel = $("eventPanel");
  if (panel) { panel.classList.remove("counting"); panel.style.setProperty("--adv-ms", ms + "ms"); void panel.offsetWidth; panel.classList.add("counting"); }
  autoAdvTimer = setTimeout(() => {
    autoAdvTimer = null;
    if (!canAutoAdvance() || busy) { autoAdvKey = ""; return; }
    endTurn();
  }, ms);
}
function renderHistory() {
  const players = roomState?.players || {};
  const list = eventLogList().slice().reverse();
  $("historyList").innerHTML = list.length ? list.map((e) => {
    const space = Number.isInteger(e.index) ? SPACE_DATA[e.index] : null;
    const d = Object.entries(e.deltas || {}).map(([id, v]) => `<span class="hl-d ${v > 0 ? "gain" : "loss"}">${escapeHtml(players[id]?.name || "")} ${v > 0 ? "+" : "−"}${money(Math.abs(v))}</span>`).join("");
    return `<li><small>Lượt ${Number(e.turn) || ""} · ${escapeHtml(players[e.uid]?.name || "")}${space ? " · " + escapeHtml(space.name) : ""}</small>${escapeHtml(e.text || "")}<div>${d}</div></li>`;
  }).join("") : '<li>Chưa có sự kiện nào.</li>';
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
  renderEventPanel();
  restoreCameraAfterReload();
}

async function rollOpeningDice() {
  if (!roomState || busy || !isOpeningRollPhase(roomState)) return;
  const uid = currentUser.uid;
  const dice = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
  setBusy(true);
  try {
    const result = await updateCurrentRoom((room) => {
      if (room === null) return room;
      if (!room || !isOpeningRollPhase(room) || !room.players?.[uid] || room.openingRolls?.[uid]) return;
      const round = Number(room.openingRound || 1);
      room.openingRolls = room.openingRolls || {};
      room.openingRolls[uid] = dice;
      room.openingLastRoll = {uid,round,dice};
      const playerIds = Object.keys(room.players || {});
      if (playerIds.length === 2 && playerIds.every((playerUid) => room.openingRolls?.[playerUid])) {
        const [firstUid, secondUid] = playerIds;
        const comparison = compareOpeningRolls(room.openingRolls[firstUid], room.openingRolls[secondUid]);
        if (comparison === 0) {
          room.openingRound = round + 1;
          room.openingRolls = {};
          room.message = `Hai người hòa điểm. Cùng tung lại ở vòng ${room.openingRound} để chọn người đi trước.`;
        } else {
          const winnerUid = comparison > 0 ? firstUid : secondUid;
          const winner = room.players[winnerUid];
          room.startPlayerUid = winnerUid;
          room.turnUid = winnerUid;
          room.turnNumber = 1;
          room.message = `${winner.name} thắng lượt tung xí ngầu và được đi trước!`;
        }
      } else {
        room.message = room.players[uid].name + " đã tung xí ngầu. Đang chờ người chơi còn lại...";
      }
      room.updatedAt = Date.now();
      return room;
    });
    if (!result?.committed) notify("Chưa ghi nhận được lượt tung. Hãy thử lại.");
  } catch (error) {
    notify("Không tung được xí ngầu chọn lượt: " + explainFirebaseError(error));
  } finally {
    setBusy(false);
  }
  if (computerGame && !computerBusy) scheduleComputerTurn();
}
// Ghi một sự kiện (đồng bộ qua Firebase) để Bảng sự kiện và lịch sử hiển thị trên cả hai máy.
// Số tiền cộng/trừ được tính bằng cách so sánh số dư trước và sau thao tác, nên không thể lệch với tiền thật.
function recordEvent(room, uid, index, beforeCash, kind) {
  const text = String(room.message || "").slice(0, 300);
  const seq = Math.max(0, Math.trunc(Number(room.eventSeq) || 0)) + 1;
  const event = {
    id: seq,
    uid,
    kind: kind || "info",
    text,
    turn: Number(room.turnNumber || 1),
    cash: cashSnapshot(room.players),
    at: Date.now()
  };
  if (Number.isInteger(index) && index >= 0 && index < 40) event.index = index;
  const deltas = cashDeltas(beforeCash, event.cash);
  if (Object.keys(deltas).length) event.deltas = deltas;
  room.eventSeq = seq;
  room.event = event;
  room.log = appendEventLog(room.log, event);
  return event;
}
// Kết quả sau khi quân cờ đã đứng ở ô đích: mua/thuê/thuế/thẻ/vào tù. Trả về câu thông báo.
function resolveLanding(room, uid, move, drawnCard, message) {
  const player = room.players[uid];
  const space = SPACE_DATA[move.to];
  const id = getSpaceId(move.to);
  if (space.type === "property" || space.type === "station" || space.type === "utility") {
    const ownerUid = room.propertyOwners?.[id];
    if (!ownerUid) {
      room.pending = {uid,index:move.to};
      message += " Tài sản này chưa có chủ. Bạn có muốn mua không?";
    } else if (ownerUid !== uid) {
      const owner = room.players[ownerUid];
      const rentInfo = rentForRoom(room, move.to, move.steps);
      if (rentInfo.rent > 0) {
        const payment = chargePlayer(room, uid, rentInfo.rent, ownerUid, "Tiền thuê " + space.name);
        message += " Tiền thuê " + money(rentInfo.rent) + " cho " + owner.name +
          (rentInfo.houses === 5 ? " (khách sạn)" : rentInfo.houses > 0 ? " (" + rentInfo.houses + " nhà)" : rentInfo.wholeProvince ? " (sở hữu trọn nhóm màu, thuê gấp đôi)" : "") + ".";
        if (payment.remaining > 0) message += " Bạn còn thiếu " + money(payment.remaining) + " và cần xử lý nợ.";
      } else if (rentInfo.mortgaged) {
        message += " Tài sản đang cầm cố nên tạm thời không thu tiền thuê.";
      }
    } else {
      message += " Đây là tài sản của bạn.";
    }
  } else if (space.type === "tax") {
    const payment = chargePlayer(room, uid, space.amount, "", "Thuế " + space.name);
    message += " Nộp thuế " + money(space.amount) + ".";
    if (payment.remaining > 0) message += " Bạn còn thiếu " + money(payment.remaining) + " và cần xử lý nợ.";
  } else if (space.type === "chance" || space.type === "fortune") {
    message += " " + applyCardEffect(room, uid, drawnCard);
  } else if (space.type === "gotojail") {
    sendToJail(room, uid, move.from);
    message += " Bạn bị đưa thẳng vào tù, không nhận tiền Xuất phát.";
  } else if (space.type === "start") {
    message += " Bạn dừng ngay tại Xuất phát.";
  } else if (space.type === "free") {
    message += " Nghỉ chân tại chợ nổi Cái Răng.";
  } else if (space.type === "jail") {
    message += " Bạn chỉ ghé thăm nhà tù (không bị giam).";
  }
  return message;
}
function sendToJail(room, uid, from, kind = "teleport") {
  const player = room.players[uid];
  player.position = 10;
  player.jailTurns = 1;
  room.extraRoll = false;
  room.doublesCount = 0;
  room.lastMove = {uid,from,to:10,steps:0,kind,turnNumber:Number(room.turnNumber || 1)};
}
async function rollDice() {
  if (!roomState || busy || roomState.debt) return;
  if (isOpeningRollPhase(roomState)) return rollOpeningDice();
  const mine = myPlayer();
  if (mine?.jailTurns) return rollInJail();
  setBusy(true);
  try {
    // Chọn kết quả một lần bên ngoài transaction. Nếu Firebase phải chạy lại updater,
    // cùng một bộ xúc xắc và cùng một thẻ vẫn được dùng, không phát sinh kết quả lệch.
    const dice = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    const planned = calculateDiceMove(mine.position, dice);
    const landing = SPACE_DATA[planned.to];
    const drawnCard = landing?.type === "chance" || landing?.type === "fortune"
      ? drawCard(landing.type)
      : null;
    const uid = currentUser.uid;
    const result = await updateCurrentRoom((room) => {
      if (room === null) return room;
      if (!room || room.status !== "playing" || room.turnUid !== uid || room.pending || room.auction || room.lastRoll || room.debt) return;
      const player = room.players?.[uid];
      if (!player || player.jailTurns || Number(player.position || 0) !== planned.from) return;
      const move = calculateDiceMove(player.position, dice);
      if (move.to !== planned.to || move.steps !== dice[0] + dice[1]) return;
      const before = cashSnapshot(room.players);
      const doubles = doublesOutcome(room.doublesCount, dice);
      room.lastRoll = [...dice];
      room.pending = null;
      room.doublesCount = doubles.count;
      room.extraRoll = doubles.extraRoll;
      let message = player.name + " tung được " + dice[0] + " + " + dice[1] + " = " + move.steps;
      if (doubles.goToJail) {
        sendToJail(room, uid, move.from);
        message += " — đôi lần thứ ba liên tiếp! Bạn bị đưa thẳng vào tù, không di chuyển.";
        room.message = message.slice(0, 300);
        recordEvent(room, uid, 10, before, "jail");
        room.updatedAt = Date.now();
        return room;
      }
      if (move.passesStart) player.cash += SALARY;
      player.position = move.to;
      room.lastMove = {uid,from:move.from,to:move.to,steps:move.steps,dice:[...dice],turnNumber:Number(room.turnNumber || 1)};
      message += " bước và đến " + SPACE_DATA[move.to].name + ".";
      if (move.passesStart) message += " Đi qua Xuất phát, nhận " + money(SALARY) + ".";
      message = resolveLanding(room, uid, move, drawnCard, message);
      if (player.jailTurns) room.extraRoll = false;
      else if (doubles.extraRoll) message += " Tung đôi nên bạn được tung thêm một lần!";
      room.message = message.slice(0, 300);
      recordEvent(room, uid, Number(player.position), before, SPACE_DATA[move.to].type);
      room.updatedAt = Date.now();
      return room;
    });
    if (!result.committed) notify("Chưa thể tung xúc xắc. Hãy kiểm tra lượt chơi hoặc khoản nợ đang xử lý.");
  } catch (error) {
    notify("Lỗi khi tung xúc xắc: " + explainFirebaseError(error));
  } finally {
    setBusy(false);
  }
}
// Người đang bị giam chọn "thử tung đôi".
async function rollInJail() {
  setBusy(true);
  try {
    const uid = currentUser.uid;
    const mine = myPlayer();
    const dice = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    const planned = calculateDiceMove(mine.position, dice);
    const landing = SPACE_DATA[planned.to];
    const drawnCard = landing?.type === "chance" || landing?.type === "fortune" ? drawCard(landing.type) : null;
    const result = await updateCurrentRoom((room) => {
      if (room === null) return room;
      if (!room || room.status !== "playing" || room.turnUid !== uid || room.pending || room.auction || room.lastRoll || room.debt) return;
      const player = room.players?.[uid];
      if (!player?.jailTurns || Number(player.position) !== planned.from) return;
      const before = cashSnapshot(room.players);
      const outcome = jailRollOutcome(player.jailTurns, dice);
      room.lastRoll = [...dice];
      room.pending = null;
      room.doublesCount = 0;
      room.extraRoll = false;
      let message = player.name + " thử tung đôi trong tù: " + dice[0] + " + " + dice[1] + ".";
      if (!outcome.move) {
        player.jailTurns = outcome.nextAttempt;
        message += " Không ra đôi nên vẫn bị giam (lần " + outcome.nextAttempt + "/" + JAIL_MAX_ATTEMPTS + "). Lượt này kết thúc.";
        room.message = message.slice(0, 300);
        recordEvent(room, uid, 10, before, "jail");
        room.updatedAt = Date.now();
        return room;
      }
      const move = calculateDiceMove(player.position, dice);
      if (outcome.payFee) {
        const payment = chargePlayer(room, uid, JAIL_FEE, "", "Phí ra tù sau 3 lần không tung đôi");
        message += " Đã 3 lần không ra đôi nên phải nộp " + money(JAIL_FEE) + " rồi di chuyển.";
        if (payment.remaining > 0) message += " Bạn còn thiếu " + money(payment.remaining) + " và cần xử lý nợ.";
      } else {
        message += " Ra đôi! Bạn được ra tù và đi " + move.steps + " bước (không được tung thêm).";
      }
      player.jailTurns = 0;
      if (move.passesStart) player.cash += SALARY;
      player.position = move.to;
      room.lastMove = {uid,from:move.from,to:move.to,steps:move.steps,dice:[...dice],turnNumber:Number(room.turnNumber || 1)};
      message += " Đến " + SPACE_DATA[move.to].name + ".";
      message = resolveLanding(room, uid, move, drawnCard, message);
      room.extraRoll = false;
      room.message = message.slice(0, 300);
      recordEvent(room, uid, Number(player.position), before, SPACE_DATA[move.to].type);
      room.updatedAt = Date.now();
      return room;
    });
    if (!result.committed) notify("Chưa thể thử tung đôi. Hãy kiểm tra lượt chơi.");
  } catch (error) { notify("Lỗi khi thử tung đôi: " + explainFirebaseError(error)); }
  finally { setBusy(false); }
}
// Ra tù bằng cách nộp phạt hoặc dùng thẻ. Sau đó vẫn là lượt của người chơi: họ tung xúc xắc bình thường.
async function leaveJail(method) {
  setBusy(true);
  try {
    const uid = currentUser.uid;
    const result = await updateCurrentRoom((room) => {
      if (room === null) return room;
      if (!room || room.turnUid !== uid || room.status !== "playing" || room.lastRoll || room.pending || room.auction || room.debt) return;
      const player = room.players?.[uid];
      if (!player?.jailTurns) return;
      const before = cashSnapshot(room.players);
      if (method === "card") {
        if (Number(player.jailPasses || 0) <= 0) return;
        player.jailPasses -= 1;
        player.jailTurns = 0;
        room.message = player.name + " dùng thẻ miễn vào tù và ra tù miễn phí. Hãy tung xúc xắc!";
      } else {
        const payment = chargePlayer(room, uid, JAIL_FEE, "", "Phí ra tù", {resumeJail:true});
        if (payment.remaining > 0) {
          room.message = player.name + " chưa đủ " + money(JAIL_FEE) + " để nộp phạt. Hãy bán nhà hoặc cầm cố tài sản để trả nợ.";
          recordEvent(room, uid, 10, before, "jail");
          room.updatedAt = Date.now();
          return room;
        }
        player.jailTurns = 0;
        room.message = player.name + " đã nộp " + money(JAIL_FEE) + " và ra tù. Hãy tung xúc xắc!";
      }
      recordEvent(room, uid, 10, before, "jail");
      room.updatedAt = Date.now();
      return room;
    });
    if (result && result.committed === false) notify("Chưa thể ra tù lúc này.");
  } catch (error) { notify("Không thể xử lý ra tù: " + explainFirebaseError(error)); }
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
      if (!room || room.turnUid !== uid || room.pending?.uid !== uid || room.debt) return;
      const space = SPACE_DATA[room.pending.index];
      const player = room.players?.[uid];
      const key = getSpaceId(room.pending.index);
      if (!space?.price || !player || room.auction || room.propertyOwners?.[key] || player.cash < space.price) return;
      const before = cashSnapshot(room.players);
      const boughtIndex = Number(room.pending.index);
      player.cash -= space.price;
      room.propertyOwners = room.propertyOwners || {};
      room.propertyOwners[key] = uid;
      room.pending = null;
      room.message = player.name + " đã mua " + space.name + " với giá " + money(space.price) + ".";
      recordEvent(room, uid, boughtIndex, before, "buy");
      room.updatedAt = Date.now();
      return room;
    });
  } catch (error) { notify("Không mua được đất: "+explainFirebaseError(error)); }
  finally { setBusy(false); }
}
async function buildHouse(index) {
  if (busy) return;
  setBusy(true);
  let failureReason = "Không thể xây nhà ở thời điểm này.";
  let successMessage = "";
  try {
    const uid = currentUser.uid;
    const result = await updateCurrentRoom((room) => {
      if (room === null) return room;
      if (!room) { failureReason = "Không tìm thấy phòng chơi."; return; }
      if (room.status !== "playing") { failureReason = "Ván chơi chưa bắt đầu hoặc đã kết thúc."; return; }
      if (room.turnUid !== uid) { failureReason = "Chỉ được xây nhà trong lượt của bạn."; return; }
      if (room.pending) { failureReason = "Hãy xử lý giao dịch mua đất trước khi xây nhà."; return; }
      if (room.auction) { failureReason = "Hãy hoàn tất đấu giá trước khi xây nhà."; return; }
      if (room.debt) { failureReason = "Hãy thanh toán khoản nợ trước khi xây nhà."; return; }

      const player = room.players?.[uid];
      if (!player) { failureReason = "Không tìm thấy thông tin người chơi."; return; }
      const check = buildEligibility(SPACE_DATA, room.propertyOwners, room.houses || {}, room.mortgages || {}, uid, index, player.cash);
      if (!check.ok) { failureReason = check.reason; return; }

      player.cash -= check.cost;
      room.houses = room.houses || {};
      const key = getSpaceId(index);
      room.houses[key] = Number(room.houses[key] || 0) + 1;
      const label = room.houses[key] === 5 ? "khách sạn" : "căn nhà";
      successMessage = "Đã xây " + label + " tại " + SPACE_DATA[index].name + " với chi phí " + money(check.cost) + ".";
      room.message = player.name + " xây " + label + " tại " + SPACE_DATA[index].name + " với chi phí " + money(check.cost) + ".";
      room.updatedAt = Date.now();
      return room;
    });
    if (result?.committed === false) notify("Chưa thể xây: " + failureReason);
    else if (result?.committed) notify(successMessage || "Xây nhà thành công.");
  } catch (error) {
    notify("Không xây được nhà: " + explainFirebaseError(error));
  } finally {
    setBusy(false);
  }
}
async function sellHouse(index) {
  if (busy) return;
  setBusy(true);
  try {
    const uid = currentUser.uid;
    const result = await updateCurrentRoom((room) => {
      if (room === null) return room;
      if (!room || room.status !== "playing" || room.pending || room.auction ||
          (room.debt ? room.debt.uid !== uid : room.turnUid !== uid)) return;
      const check = sellHouseEligibility(SPACE_DATA, room.propertyOwners, room.houses || {}, uid, index);
      if (!check.ok) return;
      const key = getSpaceId(index);
      room.houses[key] = Number(room.houses[key] || 0) - 1;
      if (room.houses[key] <= 0) delete room.houses[key];
      applyDebtFunds(room, uid, check.refund);
      if (room.debt?.uid === uid) room.message = "Đã bán một công trình tại " + SPACE_DATA[index].name + ", thu về " + money(check.refund) + ". Còn nợ " + money(room.debt.amount) + ".";
      else room.message = "Đã bán một công trình tại " + SPACE_DATA[index].name + ", thu về " + money(check.refund) + ".";
      room.updatedAt = Date.now();
      return room;
    });
    if (result?.committed === false) notify("Chưa bán được nhà. Hãy bán đều từ ô đang có nhiều nhà nhất.");
  } catch (error) { notify("Không bán được nhà: " + explainFirebaseError(error)); }
  finally { setBusy(false); }
}
async function mortgageAsset(index) {
  if (busy) return;
  setBusy(true);
  try {
    const uid = currentUser.uid;
    const result = await updateCurrentRoom((room) => {
      if (room === null) return room;
      if (!room || room.status !== "playing" || room.pending || room.auction ||
          (room.debt ? room.debt.uid !== uid : room.turnUid !== uid)) return;
      const check = mortgageEligibility(SPACE_DATA, room.propertyOwners, room.houses || {}, room.mortgages || {}, uid, index);
      if (!check.ok) return;
      const key = getSpaceId(index);
      room.mortgages = room.mortgages || {};
      room.mortgages[key] = check.amount;
      applyDebtFunds(room, uid, check.amount);
      room.message = room.debt?.uid === uid
        ? "Đã cầm cố " + SPACE_DATA[index].name + ", nhận " + money(check.amount) + ". Còn nợ " + money(room.debt.amount) + "."
        : "Đã cầm cố " + SPACE_DATA[index].name + " và nhận " + money(check.amount) + ". Tài sản tạm ngưng thu tiền thuê.";
      room.updatedAt = Date.now();
      return room;
    });
    if (result?.committed === false) notify("Chưa thể cầm cố. Hãy bán hết nhà trong cùng nhóm màu trước.");
  } catch (error) { notify("Không cầm cố được tài sản: " + explainFirebaseError(error)); }
  finally { setBusy(false); }
}
async function redeemAsset(index) {
  if (busy || roomState?.debt) return;
  setBusy(true);
  try {
    const uid = currentUser.uid;
    const result = await updateCurrentRoom((room) => {
      if (room === null) return room;
      if (!room || room.status !== "playing" || room.turnUid !== uid || room.pending || room.auction || room.debt) return;
      const key = getSpaceId(index);
      const amount = Number(room.mortgages?.[key] || 0);
      const cost = redemptionCost(amount);
      const player = room.players?.[uid];
      if (!amount || !player || player.cash < cost) return;
      player.cash -= cost;
      delete room.mortgages[key];
      room.message = player.name + " đã giải chấp " + SPACE_DATA[index].name + " với chi phí " + money(cost) + ".";
      room.updatedAt = Date.now();
      return room;
    });
    if (result?.committed === false) notify("Chưa thể giải chấp. Cần đủ tiền gốc và phí 10%.");
  } catch (error) { notify("Không giải chấp được tài sản: " + explainFirebaseError(error)); }
  finally { setBusy(false); }
}
async function declareBankruptcy(skipConfirm = false) {
  if (busy || !canDeclareBankruptcy(roomState, currentUser?.uid)) return;
  if (!skipConfirm && !window.confirm("Bạn đã hết khả năng bán nhà và cầm cố tài sản. Tuyên bố phá sản và kết thúc ván?")) return;
  setBusy(true);
  try {
    const uid = currentUser.uid;
    const result = await updateCurrentRoom((room) => {
      if (room === null) return room;
      if (!room || room.status !== "playing" || room.debt?.uid !== uid ||
          hasLiquidationOptions(SPACE_DATA, room.propertyOwners, room.houses || {}, room.mortgages || {}, uid)) return;
      const debtor = room.players?.[uid];
      const creditorUid = room.debt.creditorUid || "";
      const creditor = creditorUid && room.players?.[creditorUid] ? creditorUid : "";
      debtor.cash = 0;
      debtor.bankrupt = true;
      for (const [key, ownerUid] of Object.entries(room.propertyOwners || {})) {
        if (ownerUid !== uid) continue;
        if (creditor) room.propertyOwners[key] = creditor;
        else {
          delete room.propertyOwners[key];
          delete room.houses?.[key];
          delete room.mortgages?.[key];
        }
      }
      room.debt = null;
      room.status = "finished";
      room.winner = creditor || Object.keys(room.players || {}).find((id) => id !== uid);
      room.message = debtor.name + " không thể thanh toán và đã phá sản. " +
        (room.players?.[room.winner]?.name || "Người chơi còn lại") + " chiến thắng.";
      room.updatedAt = Date.now();
      return room;
    });
    if (result?.committed === false) notify("Bạn vẫn còn tài sản có thể thanh lý. Hãy bán nhà hoặc cầm cố trước.");
  } catch (error) { notify("Không thể xử lý phá sản: " + explainFirebaseError(error)); }
  finally { setBusy(false); }
}
function handleDeedAction(event) {
  const button = event.target.closest("button[data-deed-action]");
  if (!button) return;
  const index = Number(button.dataset.index);
  switch (button.dataset.deedAction) {
    case "build-house": buildHouse(index); break;
    case "sell-house": sellHouse(index); break;
    case "mortgage-asset": mortgageAsset(index); break;
    case "redeem-asset": redeemAsset(index); break;
  }
}
// Mọi tài sản chưa có chủ (đất, bến, công ty tiện ích) đều được đấu giá khi người chơi bỏ qua quyền mua.
function isAuctionSpace(space) {
  return isAuctionable(space);
}
function nextAuctionBid(auction) {
  return Number(auction?.currentBid || 0) + AUCTION_INCREMENT;
}
function closeAuction(room, winnerUid = null) {
  const auction = room.auction;
  const space = SPACE_DATA[Number(auction?.index)];
  const amount = Number(auction?.currentBid || 0);
  if (winnerUid && space && amount > 0 && !room.propertyOwners?.[getSpaceId(auction.index)]) {
    const winner = room.players?.[winnerUid];
    if (winner && Number(winner.cash || 0) >= amount) {
      winner.cash -= amount;
      room.propertyOwners = room.propertyOwners || {};
      room.propertyOwners[getSpaceId(auction.index)] = winnerUid;
      room.message = winner.name + " thắng đấu giá " + space.name + " với giá " + money(amount) + ".";
    } else {
      room.message = "Đấu giá " + (space?.name || "tài sản") + " không thành công vì người trả giá cao nhất không đủ tiền.";
    }
  } else {
    room.message = "Không có người trả giá cho " + (space?.name || "tài sản") + ". Ô này vẫn chưa có chủ.";
  }
  room.auction = null;
  room.updatedAt = Date.now();
}
async function passProperty() {
  setBusy(true);
  try {
    const uid = currentUser.uid;
    await updateCurrentRoom((room) => {
      if (room === null) return room;
      if (!room || room.turnUid !== uid || room.pending?.uid !== uid || room.auction || room.debt) return;
      const index = Number(room.pending.index);
      const space = SPACE_DATA[index];
      const before = cashSnapshot(room.players);
      room.pending = null;
      if (isAuctionSpace(space)) {
        const nextUid = Object.keys(room.players || {}).find((id) => id !== uid);
        room.auction = {
          index,
          openedByUid: uid,
          turnUid: nextUid,
          currentBid: 0,
          highestUid: "",
          passedUid: ""
        };
        room.message = room.players[uid].name + " bỏ mua " + space.name + ". Bắt đầu đấu giá, giá mở " + money(AUCTION_INCREMENT) + ".";
      } else {
        room.message = room.players[uid].name + " quyết định không mua " + (space?.name || "tài sản") + ".";
      }
      recordEvent(room, uid, index, before, "auction");
      room.updatedAt = Date.now();
      return room;
    });
  } catch (error) { notify("Không thể bỏ qua: " + explainFirebaseError(error)); }
  finally { setBusy(false); }
  if (computerGame && !computerBusy) scheduleComputerTurn();
}
async function placeAuctionBid() {
  if (!roomState?.auction || busy) return;
  setBusy(true);
  try {
    const uid = currentUser.uid;
    const result = await updateCurrentRoom((room) => {
      if (room === null) return room;
      const auction = room?.auction;
      if (!room || room.status !== "playing" || !auction || auction.turnUid !== uid || room.pending || room.debt) return;
      const amount = nextAuctionBid(auction);
      const player = room.players?.[uid];
      if (!player || player.cash < amount) return;
      const space = SPACE_DATA[Number(auction.index)];
      if (!isAuctionSpace(space) || room.propertyOwners?.[getSpaceId(auction.index)]) return;
      const before = cashSnapshot(room.players);
      auction.currentBid = amount;
      auction.highestUid = uid;
      auction.passedUid = "";
      auction.turnUid = Object.keys(room.players || {}).find((id) => id !== uid);
      room.message = player.name + " trả giá " + money(amount) + " cho " + space.name + ".";
      recordEvent(room, uid, Number(auction.index), before, "auction");
      room.updatedAt = Date.now();
      return room;
    });
    if (result && result.committed === false) notify("Bạn chưa thể nâng giá. Kiểm tra lượt đấu giá và số dư.");
  } catch (error) { notify("Không thể trả giá: " + explainFirebaseError(error)); }
  finally { setBusy(false); }
  if (computerGame && !computerBusy) scheduleComputerTurn();
}
async function passAuction() {
  if (!roomState?.auction || busy) return;
  setBusy(true);
  try {
    const uid = currentUser.uid;
    const result = await updateCurrentRoom((room) => {
      if (room === null) return room;
      const auction = room?.auction;
      if (!room || room.status !== "playing" || !auction || auction.turnUid !== uid || room.pending || room.debt) return;
      const before = cashSnapshot(room.players);
      const auctionIndex = Number(auction.index);
      if (auction.highestUid && auction.highestUid !== uid) {
        closeAuction(room, auction.highestUid);
        recordEvent(room, room.turnUid, auctionIndex, before, "auction");
      } else if (!auction.highestUid && auction.passedUid && auction.passedUid !== uid) {
        closeAuction(room, null);
        recordEvent(room, room.turnUid, auctionIndex, before, "auction");
      } else {
        const nextUid = Object.keys(room.players || {}).find((id) => id !== uid);
        auction.passedUid = uid;
        auction.turnUid = nextUid;
        room.message = room.players[uid].name + " bỏ lượt đấu giá. " +
          (room.players?.[nextUid]?.name || "Người chơi còn lại") + " được quyền trả giá.";
        recordEvent(room, uid, auctionIndex, before, "auction");
        room.updatedAt = Date.now();
      }
      return room;
    });
    if (result && result.committed === false) notify("Không thể bỏ lượt đấu giá. Hãy kiểm tra lượt hiện tại.");
  } catch (error) { notify("Không thể bỏ đấu giá: " + explainFirebaseError(error)); }
  finally { setBusy(false); }
  if (computerGame && !computerBusy) scheduleComputerTurn();
}

async function endTurn() {
  setBusy(true);
  try {
    const uid = currentUser.uid;
    await updateCurrentRoom((room) => {
      if (room === null) return room;
      if (!room || room.status !== "playing" || room.debt || !canAdvanceTurn(room) || room.turnUid !== uid || room.pending || room.auction || !room.lastRoll) return;
      const nextUid = Object.keys(room.players || {}).find((id) => id !== uid);
      // Tung đôi: giữ nguyên người chơi, chỉ mở lại quyền tung xúc xắc.
      if (room.extraRoll === true && !room.players?.[uid]?.jailTurns) {
        room.extraRoll = false;
        room.turnNumber = Number(room.turnNumber || 1) + 1;
        room.lastRoll = null;
        room.message = (room.players?.[uid]?.name || "Người chơi") + " tung đôi nên được tung thêm một lần.";
        room.updatedAt = Date.now();
        return room;
      }
      room.turnUid = nextUid;
      room.turnNumber = Number(room.turnNumber || 1) + 1;
      room.lastRoll = null;
      room.extraRoll = false;
      room.doublesCount = 0;
      room.message = "Đến lượt " + (room.players?.[nextUid]?.name || "người chơi tiếp theo") + ".";
      room.updatedAt = Date.now();
      return room;
    });
  } catch (error) { notify("Không thể kết thúc lượt: " + explainFirebaseError(error)); }
  finally { setBusy(false); }
  if (computerGame && !computerBusy) scheduleComputerTurn();
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
      [humanUid]:{uid:humanUid,name:cleanName($("playerName").value,"Bạn"),color:TOKEN_COLORS[0],token:selectedToken,cash:START_CASH,position:0,jailTurns:0,jailPasses:0},
      [COMPUTER_UID]:{uid:COMPUTER_UID,name:"Máy Miền Tây",color:TOKEN_COLORS[1],token:alternateToken(selectedToken),cash:START_CASH,position:0,jailTurns:0,jailPasses:0,isComputer:true}
    },
    propertyOwners:{},
    houses:{},
    mortgages:{},
    turnUid:humanUid,
    turnNumber:1,
    openingRound:1,
    openingRolls:{},
    lastRoll:null,
    pending:null,
    message:"Tung hai viên xí ngầu để chọn người đi trước!",
    createdAt:Date.now(),
    updatedAt:Date.now()
  };
  store("remove", LAST_ROOM_KEY);
  showGameView();
  $("copyRoomButton").hidden = true;
  $("roomCodeLabel").textContent = "VỚI MÁY";
  renderRoom();
  scheduleComputerTurn();
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
function computerAuctionMaxBid(index) {
  const computer = roomState?.players?.[COMPUTER_UID];
  const space = SPACE_DATA[index];
  if (!computer || !isAuctionSpace(space)) return 0;
  const reserve = space.type === "station" ? 300 : 220;
  const cashLimit = Math.floor(Math.max(0, Number(computer.cash || 0) - reserve) / AUCTION_INCREMENT) * AUCTION_INCREMENT;
  const valueLimit = Math.floor((Number(space.price || 0) * 1.2) / AUCTION_INCREMENT) * AUCTION_INCREMENT;
  return Math.max(0, Math.min(cashLimit, valueLimit));
}
function isComputerActionDue(state, computerUid = COMPUTER_UID) {
  if (!state || state.status !== "playing") return false;
  if (state.debt) return state.debt.uid === computerUid;
  if (isOpeningRollPhase(state)) {
    const humanUid = state.creatorUid;
    return !!state.openingRolls?.[humanUid] && !state.openingRolls?.[computerUid];
  }
  // Trong phiên đấu giá, chỉ xét người đang được quyền trả giá; không dùng turnUid
  // của lượt chơi gốc để gọi máy lặp khi tới lượt người thật.
  if (state.auction) return state.auction.turnUid === computerUid;
  return state.turnUid === computerUid;
}
async function resolveComputerDebt() {
  const uid = COMPUTER_UID;
  if (roomState?.debt?.uid !== uid) return;
  // Thanh lý công trình trước, sau đó mới cầm cố đất.
  for (let index = 0; index < SPACE_DATA.length; index++) {
    if (sellHouseEligibility(SPACE_DATA, roomState.propertyOwners, roomState.houses || {}, uid, index).ok) {
      await sellHouse(index);
      return;
    }
  }
  for (let index = 0; index < SPACE_DATA.length; index++) {
    if (mortgageEligibility(SPACE_DATA, roomState.propertyOwners, roomState.houses || {}, roomState.mortgages || {}, uid, index).ok) {
      await mortgageAsset(index);
      return;
    }
  }
  await declareBankruptcy(true);
}
function scheduleComputerTurn() {
  if (!computerGame || computerBusy || computerTimer || !isComputerActionDue(roomState)) return;
  computerTimer = setTimeout(() => {
    computerTimer = null;
    playComputerTurn().catch((error) => notify("Máy chưa đi được: " + (error?.message || error)));
  }, 750);
}

async function playComputerTurn() {
  const auctionTurn = roomState?.auction?.turnUid === COMPUTER_UID;
  if (!computerGame || computerBusy || !isComputerActionDue(roomState) || !currentUser) return;
  const humanUid = currentUser.uid;
  const before = JSON.parse(JSON.stringify(roomState));
  computerBusy = true;
  currentUser.uid = COMPUTER_UID;
  try {
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (roomState.debt?.uid === COMPUTER_UID) {
      await resolveComputerDebt();
    } else if (isOpeningRollPhase(roomState)) {
      await rollOpeningDice();
    } else if (roomState.auction?.turnUid === COMPUTER_UID) {
      const index = Number(roomState.auction.index);
      if (nextAuctionBid(roomState.auction) <= computerAuctionMaxBid(index)) await placeAuctionBid();
      else await passAuction();
    } else if (roomState.turnUid === COMPUTER_UID && roomState.lastRoll && !roomState.pending && !roomState.auction) {
      await endTurn();
    } else if (roomState.turnUid === COMPUTER_UID) {
      const cp = roomState.players?.[COMPUTER_UID];
      if (cp?.jailTurns && !roomState.lastRoll) {
        if (Number(cp.jailPasses || 0) > 0) await leaveJail("card");
        else if (Number(cp.cash || 0) >= JAIL_FEE + 300) await leaveJail("fee");
      }
      await rollDice();
      if (!roomState || roomState.status !== "playing" || roomState.turnUid !== COMPUTER_UID) return;
      if (roomState.pending?.uid === COMPUTER_UID) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        const index = Number(roomState.pending.index);
        if (computerShouldBuy(index)) await buyProperty();
        else await passProperty();
      }
      if (roomState && roomState.status === "playing" && !roomState.debt &&
          roomState.turnUid === COMPUTER_UID && roomState.lastRoll && !roomState.pending && !roomState.auction) {
        await new Promise((resolve) => setTimeout(resolve, 1800));
        await endTurn();
      }
    }
  } catch (error) {
    notify("Máy gặp trục trặc khi đi lượt: " + (error?.message || error));
  } finally {
    currentUser.uid = humanUid;
    computerBusy = false;
    if (roomState) {
      runEffects(before, roomState);
      renderRoom();
      scheduleComputerTurn();
    }
  }
}

$("tokenPicker").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-token]");
  if (button) chooseToken(button.dataset.token);
});
renderTokenPicker();
$("createRoomButton").addEventListener("click", createRoom);
$("joinRoomButton").addEventListener("click", joinRoom);
$("playComputerButton").addEventListener("click", startComputerGame);
$("rollButton").addEventListener("click", rollDice);
camera = createCamera({
  stage: $("stage"), wrap: document.querySelector("#gameView .board-wrap"), board: $("board"), reduceMotion,
  onChange: (mode) => { $("camOverviewButton").hidden = mode === "overview"; }
});
$("camOverviewButton").addEventListener("click", () => camera.manualOverview());
window.addEventListener("resize", () => camera.invalidate());
window.addEventListener("orientationchange", () => camera.invalidate());
$("epMinButton").addEventListener("click", () => { epMinimized = !epMinimized; renderEventPanel(); });
$("epHistoryButton").addEventListener("click", () => { renderHistory(); $("historyModal").hidden = false; });
$("historyClose").addEventListener("click", () => { $("historyModal").hidden = true; });
$("historyModal").addEventListener("click", (event) => { if (event.target === $("historyModal")) $("historyModal").hidden = true; });
$("cellInfo").addEventListener("click", (event) => { if (event.target.closest(".cell-info-close")) $("cellInfo").classList.remove("show"); });
$("propsButton").addEventListener("click", () => { cancelAutoAdvance(); $("propsModal").hidden = false; });
$("propertyList").addEventListener("click", handleDeedAction);
$("propsClose").addEventListener("click", () => { $("propsModal").hidden = true; renderEventPanel(); });
$("propsModal").addEventListener("click", (event) => { if (event.target === $("propsModal")) { $("propsModal").hidden = true; renderEventPanel(); } });
// Trên điện thoại: vào toàn màn hình và khóa ngang (nếu trình duyệt cho phép; nếu không giao diện tự xoay bằng CSS).
function enterGameScreen() {
  if (window.innerWidth > 900) return;
  try { document.documentElement.requestFullscreen?.({ navigationUI: "hide" })?.then(() => screen.orientation?.lock?.("landscape")).catch(() => {}); } catch { /* bỏ qua */ }
}
for (const id of ["createRoomButton", "joinRoomButton", "playComputerButton"]) $(id).addEventListener("click", enterGameScreen);
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

// Nút bật/tắt âm thanh xúc xắc (nhớ lựa chọn trên máy này).
{
  const soundBtn = $("soundButton");
  if (soundBtn) {
    const sync = () => { soundBtn.querySelector("span").textContent = isMuted() ? "🔇" : "🔊"; };
    sync();
    soundBtn.addEventListener("click", () => { setMuted(!isMuted()); sync(); });
  }
}
