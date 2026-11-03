// Kiểm thử đầu-cuối: 2 trình duyệt chơi chung một Firebase GIẢ LẬP (có áp dụng firebase-database.rules.json thật
// qua tests/support/rules-sim.mjs). Không cần Firebase thật hay mạng tới Google.
// Chạy:  npm i --no-save playwright && npx playwright install chromium
//        node tests/e2e/two-player.cjs [thư-mục-lưu-ảnh-chụp]
// E2E: 2 trình duyệt + Firebase giả lập dùng chung dữ liệu, áp dụng file Rules thật qua bộ mô phỏng.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const REPO = path.resolve(__dirname, "../..");
const OUT = process.argv[2];
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  → " + extra : "")); };

// ---- máy chủ tĩnh
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let file = path.join(REPO, url.pathname === "/" ? "index.html" : url.pathname);
  if (!file.startsWith(REPO) || !fs.existsSync(file)) { res.writeHead(404); return res.end("nf"); }
  const ext = path.extname(file);
  res.writeHead(200, { "content-type": { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" }[ext] || "text/plain" });
  res.end(fs.readFileSync(file));
});

// ---- CSDL giả lập + Rules thật
let simPromise;
const store = { rooms: {} };
const getVal = (p) => { const m = p.match(/^rooms\/([A-Z0-9]+)$/); return m ? store.rooms[m[1]] ?? null : null; };

const MOCK = {
  app: `export const initializeApp=(config,name)=>({config,name});export const deleteApp=async()=>{};`,
  auth: `export const getAuth=(app)=>({app});
export const signInAnonymously=async()=>{ if(window.__authError){const e=new Error("Firebase: Error ("+window.__authError+")");e.code=window.__authError;throw e;} return {user:{uid:window.__uid}}; };`,
  db: `
const clone=(v)=>v===undefined||v===null?null:JSON.parse(JSON.stringify(v));
const snap=(v)=>({exists:()=>v!==null,val:()=>clone(v)});
export const getDatabase=()=>({});
export const ref=(db,path)=>({path});
window.__listening=window.__listening||new Set();
export const get=async(r)=>snap(clone(await window.__dbGet(r.path)));
export const set=async(r,v)=>{ await window.__dbSet(window.__uid,r.path,clone(v)); };
export const onValue=(r,cb,errCb)=>{
  if(r.path===".info/connected"){cb({val:()=>!window.__offline});return()=>{};}
  let last,stop=false; window.__listening.add(r.path);
  const tick=async()=>{ if(stop)return; try{const v=clone(await window.__dbGet(r.path));const j=JSON.stringify(v);if(j!==last){last=j;cb(snap(v));}}catch(e){errCb&&errCb(e);} setTimeout(tick,60); };
  tick(); return()=>{stop=true;window.__listening.delete(r.path);};
};
export const runTransaction=async(r,fn)=>{
  // Giống SDK thật: nếu chưa có listener trên đường dẫn này thì giá trị đoán đầu tiên là null.
  let guess=window.__listening.has(r.path)?clone(await window.__dbGet(r.path)):null;
  for(let i=0;i<25;i++){
    const res=fn(clone(guess));
    if(res===undefined) return {committed:false,snapshot:snap(clone(await window.__dbGet(r.path)))};
    const out=await window.__dbCas(window.__uid,r.path,JSON.stringify(guess),clone(res));
    if(out.ok) return {committed:true,snapshot:snap(clone(res))};
    if(out.denied){const e=new Error("PERMISSION_DENIED: Permission denied");e.code="PERMISSION_DENIED";throw e;}
    guess=out.current;
  }
  throw new Error("maxretry");
};`
};

// Không còn nút kết thúc lượt: chờ ván tự qua lượt sau khi hiện sự kiện.
async function confirmTurn(p) {
  const before = await p.page.evaluate(() => document.getElementById("turnName").textContent);
  await p.page.waitForFunction((b) => document.getElementById("turnName").textContent !== b, before, { timeout: 12000 });
}
async function newPlayer(browser, uid, opts = {}) {
  const context = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 }, deviceScaleFactor: 1, isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => { errors.push(String(e)); console.log("PAGEERROR", String(e).slice(0, 300)); });
  await page.addInitScript(({ uid, offline }) => { window.__uid = uid; window.__offline = !!offline; }, { uid, offline: opts.offline });
  const { loadRules } = await simPromise;
  await page.exposeFunction("__dbGet", (p) => getVal(p));
  await page.exposeFunction("__dbSet", (u, p, v) => { const code = p.split("/")[1]; const r = rules.write(u, code, getVal(p), v); if (!r.ok) throw new Error("PERMISSION_DENIED " + r.reason); if (v === null) delete store.rooms[code]; else store.rooms[code] = v; });
  await page.exposeFunction("__dbCas", (u, p, expectedJson, v) => {
    const code = p.split("/")[1]; const cur = getVal(p);
    if (JSON.stringify(cur) !== expectedJson) return { ok: false, current: cur };
    const r = rules.write(u, code, cur, v);
    if (!r.ok) return { ok: false, denied: true, reason: r.reason };
    store.rooms[code] = v; return { ok: true };
  });
  await page.route("https://www.gstatic.com/firebasejs/13.1.0/*", (route) => {
    const f = route.request().url().split("/").pop();
    const body = f.startsWith("firebase-app") ? MOCK.app : f.startsWith("firebase-auth") ? MOCK.auth : MOCK.db;
    route.fulfill({ contentType: "text/javascript", body });
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  return { page, context, errors };
}

let rules;
(async () => {
  const mod = await import(REPO + "/tests/support/rules-sim.mjs");
  rules = mod.loadRules(REPO + "/firebase-database.rules.json");
  simPromise = Promise.resolve({ loadRules: mod.loadRules });
  await new Promise((r) => server.listen(8123, r));
  const browser = await chromium.launch();
  const URL0 = "http://localhost:8123/";
  const A = "uidAAAAAAAAAAAAAAAAAAAAAAAAA", B = "uidBBBBBBBBBBBBBBBBBBBBBBBBB", C = "uidCCCCCCCCCCCCCCCCCCCCCCCCC";
  const text = (page, sel) => page.locator(sel).innerText();

  // ===== 1. Database không kết nối được → báo rõ + tự phục hồi
  {
    const p = await newPlayer(browser, A, { offline: true });
    await p.page.route(/firebasedatabase\.app/, (r) => r.abort());
    await p.page.goto(URL0); await p.page.waitForTimeout(12500);
    const msg = await text(p.page, "#lobbyMessage");
    check("database bị chặn → nêu đúng máy chủ bị chặn + cách xử lý", /firebasedatabase\.app/.test(msg) && /VPN/.test(msg), msg.slice(0, 150));
    check("khi chưa kết nối vẫn không treo nút Tạo phòng", !(await p.page.locator("#createRoomButton").isDisabled()));
    await p.page.evaluate(() => { window.__offline = false; });
    await p.page.unroute(/firebasedatabase\.app/);
    await p.page.fill("#playerName", "An"); await p.page.click("#createRoomButton");
    await p.page.waitForSelector("#gameView:not(.hidden)", { timeout: 6000 }).catch(() => {});
    check("khi mạng trở lại, bấm Tạo phòng tự kết nối lại và tạo được phòng", await p.page.locator("#gameView").isVisible());
    await p.context.close();
    store.rooms = {};
  }

  // ===== 2. Hai người chơi
  const pa = await newPlayer(browser, A), pb = await newPlayer(browser, B), pc = await newPlayer(browser, C);
  for (const p of [pa, pb, pc]) { await p.page.goto(URL0); }
  await pa.page.waitForTimeout(500);
  if (OUT) await pa.page.screenshot({ path: `${OUT}/desktop-lobby.png` });
  check("kết nối thành công, huy hiệu 'Đã kết nối'", /Đã kết nối/.test(await text(pa.page, "#connectionBadge")));
  await pa.page.click('#tokenPicker [data-token="plastic-chair"]');
  await pb.page.click('#tokenPicker [data-token="vietnamese-coffee"]');
  check("người chơi chọn được ghế nhựa Việt Nam", await pa.page.locator('#tokenPicker [data-token="plastic-chair"]').getAttribute("aria-pressed") === "true");
  check("người chơi chọn được cà phê sữa đá", await pb.page.locator('#tokenPicker [data-token="vietnamese-coffee"]').getAttribute("aria-pressed") === "true");
  await pa.page.fill("#playerName", "An"); await pa.page.click("#createRoomButton");
  await pa.page.waitForSelector("#gameView:not(.hidden)");
  const code = (await text(pa.page, "#roomCodeLabel")).trim();
  check("tạo phòng: mã 6 ký tự hợp lệ", /^[A-HJ-NP-Z2-9]{6}$/.test(code), code);
  check("chủ phòng thấy trạng thái chờ", /Chờ người chơi/i.test(await text(pa.page, "#centerStatus")));

  await pb.page.fill("#roomCodeInput", "ZZZZZZ"); await pb.page.fill("#playerName", "Bình"); await pb.page.click("#joinRoomButton"); await pb.page.waitForTimeout(500);
  check("mã phòng không tồn tại → báo rõ", /Không tìm thấy phòng/.test(await text(pb.page, "#lobbyMessage")), await text(pb.page, "#lobbyMessage"));
  await pb.page.fill("#roomCodeInput", "ABC"); await pb.page.click("#joinRoomButton"); await pb.page.waitForTimeout(200);
  check("mã phòng sai định dạng → báo rõ", /6 ký tự/.test(await text(pb.page, "#lobbyMessage")));
  await pb.page.fill("#roomCodeInput", code); await pb.page.click("#joinRoomButton");
  await pb.page.waitForSelector("#gameView:not(.hidden)", { timeout: 4000 }).catch(() => {});
  check("người thứ hai tham gia được (transaction không bị hủy vì dữ liệu null)", await pb.page.locator("#gameView").isVisible(), await text(pb.page, "#lobbyMessage"));
  await pa.page.waitForTimeout(400);
  check("cả hai vào bước tung xí ngầu chọn người đi trước", /Tung xí ngầu chọn người đi trước/i.test(await text(pa.page, "#centerStatus")) && /Tung xí ngầu chọn người đi trước/i.test(await text(pb.page, "#centerStatus")));
  check("bàn cờ có cả thẻ Cơ hội và Khí vận", (await pa.page.locator("#board .space[data-index='2']").getAttribute("title")).includes("rút thẻ Cơ hội") && (await pa.page.locator("#board .space[data-index='7']").getAttribute("title")).includes("rút thẻ Khí vận"));
  check("token ghế nhựa và cà phê được lưu theo từng người", await pa.page.locator('.player-avatar[data-token="plastic-chair"]').count() === 1 && await pa.page.locator('.player-avatar[data-token="vietnamese-coffee"]').count() === 1);
  await pa.page.evaluate(() => { Math.random = () => 0.5; });
  await pa.page.click("#rollButton");
  await pa.page.waitForFunction(() => /Đã tung xí ngầu/.test(document.querySelector("#centerStatus")?.textContent || ""), null, { timeout:4000 });
  check("người đã tung không thể tung lần hai trong cùng vòng", await pa.page.locator("#rollButton").isDisabled());
  await pb.page.evaluate(() => { Math.random = () => 0.5; });
  await pb.page.click("#rollButton");
  await pa.page.waitForFunction(() => /Hòa điểm/.test(document.querySelector("#centerStatus")?.textContent || ""), null, { timeout:5000 });
  check("hai người hòa điểm thì mở vòng tung lại", /Vòng 2/.test(await text(pa.page, "#actionMessage")) && !(await pa.page.locator("#rollButton").isDisabled()));
  await pa.page.waitForFunction(() => !document.querySelector("#diceStage")?.classList.contains("show"), null, { timeout:4000 });
  await pa.page.evaluate(() => { Math.random = () => 0.99; });
  await pa.page.click("#rollButton");
  await pa.page.waitForFunction(() => /Đã tung xí ngầu/.test(document.querySelector("#centerStatus")?.textContent || ""), null, { timeout:4000 });
  await pa.page.waitForFunction(() => !document.querySelector("#diceStage")?.classList.contains("show"), null, { timeout:4000 });
  await pb.page.evaluate(() => { Math.random = () => 0.01; });
  await pb.page.click("#rollButton");
  await pa.page.waitForFunction(() => document.querySelector("#rollButton")?.disabled === false && document.querySelector("#turnName")?.textContent.trim() === "An", null, { timeout: 6000 });
  check("An thắng lượt xí ngầu và được đi trước", /Đến lượt bạn/i.test(await text(pa.page, "#centerStatus")) && /Đợi đối thủ/i.test(await text(pb.page, "#centerStatus")));

  await pc.page.fill("#roomCodeInput", code); await pc.page.fill("#playerName", "Chi"); await pc.page.click("#joinRoomButton"); await pc.page.waitForTimeout(600);
  check("người thứ ba bị từ chối", !(await pc.page.locator("#gameView").isVisible()) && /đã đủ 2 người/.test(await text(pc.page, "#lobbyMessage")), await text(pc.page, "#lobbyMessage"));

  const tokenInfo = await pa.page.evaluate(() => [...document.querySelectorAll(".token b")].map((b) => { const r = b.getBoundingClientRect(); const s = getComputedStyle(b); return [b.dataset.token, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), s.visibility, s.fontSize]; }));
  check("quân ghế nhựa và ly cà phê hiển thị trên bàn", tokenInfo.length === 2 && tokenInfo.some((x) => x[0] === "plastic-chair") && tokenInfo.some((x) => x[0] === "vietnamese-coffee") && tokenInfo.every((x) => x[3] > 8 && x[4] > 8), JSON.stringify(tokenInfo));
  check("token gọn trong ô cờ", tokenInfo.every((x) => x[3] < 46 && x[4] < 46), JSON.stringify(tokenInfo));
  check("chỉ người có lượt được bấm Tung xúc xắc", !(await pa.page.locator("#rollButton").isDisabled()) && (await pb.page.locator("#rollButton").isDisabled()));
  // Chờ hiệu ứng của lượt tung chọn người đi trước kết thúc ở cả hai trình duyệt.
  // Nếu không, interval xáo xúc xắc cũ có thể tiêu thụ Math.random mà bài test sắp cố định.
  await Promise.all([pa, pb].map(async ({ page }) => {
    await page.waitForFunction(() => {
      const stage = document.querySelector("#diceStage");
      const result = document.querySelector("#diceResult");
      return !stage?.classList.contains("show") && !result?.classList.contains("rolling");
    }, null, { timeout: 5000 });
  }));
  // Tung xúc xắc [1,2] → ô 3 (Đường Đồng Khởi, $60)
  await pa.page.evaluate(() => { const q = [0, 0.2]; Math.random = () => (q.length ? q.shift() : 0.5); });
  const cellOverviewBefore = await pb.page.evaluate(() => { const r = document.querySelector(".space[data-index='3']").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await pa.page.click("#rollButton");
  const sawRolling = await pb.page.waitForSelector("#diceResult.rolling", { timeout: 2000 }).then(() => true).catch(() => false);
  check("hiệu ứng: xúc xắc lăn hiện ở máy của đối thủ", sawRolling, sawRolling ? "" : await pa.page.evaluate(() => document.getElementById("gameNotice")?.textContent || ""));
  const sawStage = await pb.page.waitForSelector("#diceStage.show", { timeout: 2000 }).then(() => true).catch(() => false);
  const stageInfo = await pb.page.evaluate(() => { const s = document.getElementById("diceStage"); const r = s.getBoundingClientRect(); const d = s.querySelector(".die"); const dr = d ? d.getBoundingClientRect() : null; return JSON.stringify({ cls: s.className, op: getComputedStyle(s).opacity, rect: [r.x, r.y, r.width, r.height].map(Math.round), die: dr && [dr.x, dr.y, dr.width, dr.height].map(Math.round), n: s.querySelectorAll(".die").length }); });
  check("hiệu ứng: xúc xắc ném lên giữa bàn cờ ở máy đối thủ", sawStage, stageInfo);
  const diceStyle = await pb.page.evaluate(() => {
    const stage = document.getElementById("diceStage");
    const face = stage.querySelector(".die.face");
    return { burst: getComputedStyle(stage, "::before").display, border: face ? getComputedStyle(face).borderTopWidth : null };
  });
  check("xúc xắc không còn tia trắng hoặc viền trắng", diceStyle.burst === "none" && diceStyle.border === "0px", JSON.stringify(diceStyle));
  // ===== Camera theo quân cờ (máy đối thủ B chỉ quan sát; camera không ghi gì lên Firebase) =====
  const stageState = (page) => page.evaluate(() => { const st = document.getElementById("stage"); return { mode: st.dataset.camera || "", scale: Number(st.dataset.cameraScale || 1), tf: document.querySelector("#gameView .board-wrap").style.transform }; });
  check("giai đoạn 1: đang tung xúc xắc thì camera giữ toàn cảnh", (await stageState(pb.page)).mode !== "follow");
  const sawFollow = await pb.page.waitForFunction(() => { const st = document.getElementById("stage"); return st.dataset.camera === "follow" && Number(st.dataset.cameraScale) > 1.3; }, null, { timeout: 6000, polling: 20 }).then(() => true).catch(() => false);
  check("giai đoạn 2: camera zoom vào và đi theo quân cờ ở máy đối thủ", sawFollow);
  const insideStage = (page) => page.evaluate(() => {
    const st = document.getElementById("stage").getBoundingClientRect();
    return [...document.querySelectorAll(".token b")].every((b) => { const r = b.getBoundingClientRect(); return r.left >= st.left && r.right <= st.right && r.top >= st.top && r.bottom <= st.bottom; });
  });
  check("quân cờ luôn nằm trong màn hình khi camera đang theo", await insideStage(pb.page));
  const sawHop = await pb.page.waitForFunction(() => document.querySelector(".token.moving"), null, { timeout: 4000, polling: 20 }).then(() => true).catch(() => false);
  if (OUT) { await pb.page.screenshot({ path: `${OUT}/dice-live.png` }); await pb.page.evaluate(() => { const s = document.getElementById("diceStage"); s.className = "dice-stage show"; s.innerHTML = '<div class="dice-row"><span class="die" data-v="4">' + "<i></i>".repeat(9) + '</span><span class="die" data-v="6">' + "<i></i>".repeat(9) + '</span><b class="dice-total">10</b></div>'; });     await pb.page.waitForTimeout(100); await pb.page.screenshot({ path: `${OUT}/desktop-dice.png`, clip: { x: 280, y: 220, width: 720, height: 480 } }); console.log("stage@shot", await pb.page.evaluate(() => { const s = document.getElementById("diceStage"); const d = s.querySelector(".die"); const r = d && d.getBoundingClientRect(); return s.className + " " + JSON.stringify(r && [r.x, r.y, r.width, r.height].map(Math.round)); })); }
  check("hiệu ứng: quân cờ nhảy từng ô", sawHop, sawHop ? "" : await pb.page.evaluate(() => JSON.stringify({tokens: document.querySelectorAll(".token").length, pass: document.querySelectorAll(".space.pass,.space.land").length, ds: document.getElementById("diceStage")?.className})));
  const sawFocus = await pb.page.waitForFunction(() => document.getElementById("stage").dataset.camera === "focus", null, { timeout: 6000, polling: 20 }).then(() => true).catch(() => false);
  check("giai đoạn 3: tới ô đích camera dừng lại và focus", sawFocus);
  await pb.page.waitForTimeout(900);
  const focusInfo = await pb.page.evaluate(() => {
    const st = document.getElementById("stage");
    const sr = st.getBoundingClientRect();
    const token = [...document.querySelectorAll(".space[data-index='3'] .token b")][0];
    const tr = token?.getBoundingClientRect();
    const pr = document.getElementById("eventPanel").getBoundingClientRect();
    const hit = tr && !(tr.right < pr.left || tr.left > pr.right || tr.bottom < pr.top || tr.top > pr.bottom);
    const cell = document.querySelector(".space[data-index='3']").getBoundingClientRect();
    const cellHit = !(cell.right < pr.left || cell.left > pr.right || cell.bottom < pr.top || cell.top > pr.bottom);
    return { mode: st.dataset.camera, scale: Number(st.dataset.cameraScale), tokenIn: !!tr && tr.left >= sr.left && tr.right <= sr.right && tr.top >= sr.top && tr.bottom <= sr.bottom, tokenUnderPanel: !!hit, cellUnderPanel: cellHit };
  });
  check("tại ô đích zoom nhẹ (1.5–2.2×), không zoom quá gần", focusInfo.scale >= 1.5 && focusInfo.scale <= 2.2, JSON.stringify(focusInfo));
  check("giai đoạn 4: bảng sự kiện không che quân cờ hoặc ô đang focus", focusInfo.tokenIn && !focusInfo.tokenUnderPanel && !focusInfo.cellUnderPanel, JSON.stringify(focusInfo));
  // Camera chỉ là phép biến đổi hiển thị: toạ độ gốc của ô không đổi.
  check("camera không làm lệch quân cờ/ô cờ trong Firebase (vị trí vẫn là ô 3)", store.rooms[code].players[store.rooms[code].creatorUid].position === 3 && !JSON.stringify(store.rooms[code]).includes("camera"));
  await pa.page.waitForTimeout(1800);
  const faces = (page) => page.$$eval("#diceResult .die", (els) => els.map((e) => e.dataset.v).join(","));
  const diceA = await faces(pa.page), diceB = await faces(pb.page);
  check("hai bên thấy cùng xúc xắc", diceA === diceB && diceA === "1,2", JSON.stringify([diceA, diceB]));
  const exactMove = store.rooms[code].lastMove;
  check("xúc xắc 1+2 và quân cờ cùng đi đúng 3 bước đến ô 3",
    exactMove?.dice?.join(",") === "1,2" && exactMove.steps === 3 && exactMove.to === 3 &&
    store.rooms[code].players[store.rooms[code].creatorUid].position === 3,
    JSON.stringify(exactMove));
  check("A thấy nút Mua 600.000₫; B không thấy", /Mua 600\.000₫/.test(await text(pa.page, "#pendingActions")) && (await pb.page.locator("#pendingActions button").count()) === 0);
  if (OUT) { await pa.page.waitForTimeout(700); await pa.page.screenshot({ path: `${OUT}/deed-focus.png` }); }
  const buyBoxes = await pa.page.locator("#pendingActions button").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
  check("hộp Mua/Bỏ qua đã gọn, không che mặt bàn", buyBoxes.length === 2 && buyBoxes.every(([w,h]) => w <= 105 && h <= 38), JSON.stringify(buyBoxes));
  check("không còn nút Kết thúc lượt", (await pa.page.locator("#endTurnButton").count()) === 0);
  check("lượt chưa chuyển khi A chưa quyết định mua", /Mua/.test(await text(pa.page, "#pendingActions")) && (await pb.page.locator("#rollButton").isDisabled()));
  await pa.page.click("#pendingActions .primary-button");
  const sawFloat = await pb.page.waitForSelector(".float-delta.loss", { timeout: 2000 }).then(() => true).catch(() => false);
  check("hiệu ứng: số tiền trừ bay lên", sawFloat);
  const sawStamp = await pb.page.waitForSelector(".space.stamp", { timeout: 2000 }).then(() => true).catch(() => false);
  check("hiệu ứng: ô vừa mua có dấu chủ sở hữu", sawStamp);
  await pa.page.waitForTimeout(500);
  check("mua đất: tiền A còn 14.400.000₫, hai bên thấy chủ sở hữu", /14\.400\.000₫/.test(await text(pa.page, "#playersPanel")) && /14\.400\.000₫/.test(await text(pb.page, "#playersPanel")) && (await pb.page.locator("#propertyList .property-row").count()) === 1);
  check("ô đã mua được viền/chấm chủ sở hữu nổi bật", await pa.page.locator("#board .space[data-index='3'].owned .space-owner-mark").count() === 1 &&
    await pb.page.locator("#board .space[data-index='3'].owned .space-owner-mark").count() === 1);
  const tileFit = await pa.page.locator("#board .space .space-name").first().evaluate(el => ({
    clamp:getComputedStyle(el).webkitLineClamp,
    wrap:getComputedStyle(el).overflowWrap,
    width:el.getBoundingClientRect().width
  }));
  check("tên ô cờ giới hạn hai dòng, không ngắt giữa từ", tileFit.clamp === "2" && tileFit.wrap === "normal" && tileFit.width > 0, JSON.stringify(tileFit));
  // Mua xong không hiện thẻ thông báo; thanh trạng thái nêu kết quả, ván tự qua lượt sau ~2,8 giây.
  await pa.page.waitForFunction(() => /đã mua|Chợ nổi/i.test(document.getElementById("actionMessage")?.textContent || ""), null, { timeout: 9000 });
  await pa.page.waitForTimeout(900);
  check("mua xong: không có thẻ thông báo, không có nút kết thúc lượt, chưa qua lượt ngay", /An/.test(await text(pa.page, "#turnName")) && (await pb.page.locator("#rollButton").isDisabled()) && (await pa.page.locator("#confirmEventButton").count()) === 0 && !(await pa.page.locator("#eventPanel").isVisible()));
  check("tiền và số dư cập nhật sau khi mua", (await text(pa.page, "#playersPanel")).includes("14.400.000₫"));
  await confirmTurn(pa);
  await pb.page.waitForFunction(() => document.getElementById("stage").dataset.camera === "overview", null, { timeout: 4000, polling: 50 }).catch(() => {});
  await pb.page.waitForTimeout(1200);
  const cellBaseAfter = await pb.page.evaluate(() => { const r = document.querySelector(".space[data-index='3']").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  check("giai đoạn 5: sang lượt mới camera trở về toàn cảnh (cả hai máy)", (await stageState(pb.page)).mode === "overview" && (await stageState(pb.page)).tf === "" && (await stageState(pa.page)).mode === "overview");
  check("toạ độ ô cờ ở toàn cảnh không đổi sau khi zoom/nghiêng rồi trở về (≤ 3px)", Math.abs(cellOverviewBefore[0] - cellBaseAfter[0]) <= 3 && Math.abs(cellOverviewBefore[1] - cellBaseAfter[1]) <= 3, JSON.stringify([cellOverviewBefore, cellBaseAfter]));
  await pb.page.waitForFunction(() => document.querySelector("#rollButton")?.disabled === false, null, { timeout: 5000 }).catch(() => {});
  check("sau khi A xác nhận: quyền chuyển sang B", !(await pb.page.locator("#rollButton").isDisabled()) && (await pa.page.locator("#rollButton").isDisabled()) && /Bình/.test(await text(pa.page, "#turnName")));

  // B thử ghi trái phép khi không có lượt (rules phải chặn)
  const denied = await pa.page.evaluate(async () => { try { const m = await import("https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js"); return "no-error"; } catch (e) { return String(e); } });
  const hack = await pb.page.evaluate(async (code) => { const out = await window.__dbCas(window.__uid, "rooms/" + code, JSON.stringify(await window.__dbGet("rooms/" + code)), { status: "playing" }); return out; }, code);
  check("ghi dữ liệu sai cấu trúc bị Rules chặn", hack.ok === false);

  // B tung [3,3] → ô 6 (Hai Bà Trưng) rồi bỏ qua
  // B đến bến phà (ô đặc biệt) và bỏ mua → A và B đấu giá lần lượt.
  await pb.page.evaluate(() => { const q = [0.2, 0.4]; Math.random = () => (q.length ? q.shift() : 0.5); });
  await pb.page.click("#rollButton");
  await pb.page.waitForFunction(() => /Mua/.test(document.querySelector("#pendingActions")?.textContent || ""), null, { timeout: 9000 });
  check("B đến bến phà và có lựa chọn mua", /Bến phà Rạch Miễu/.test(await text(pb.page, "#actionMessage")));
  await pb.page.locator("#pendingActions .secondary-button").click();
  await pa.page.waitForFunction(() => /Ra giá/.test(document.querySelector("#pendingActions")?.textContent || ""), null, { timeout: 9000 });
  check("bỏ mua bến phà mở phiên đấu giá", /đấu giá/i.test(await text(pa.page, "#actionMessage")));
  check("giá mở đấu giá là 100.000₫", (await text(pa.page, "#pendingActions")).includes("100.000₫"));
  await pa.page.locator("#pendingActions .primary-button").click();
  await pb.page.waitForFunction(() => /Nâng giá/.test(document.querySelector("#pendingActions")?.textContent || ""), null, { timeout: 9000 });
  check("người chơi còn lại được quyền nâng giá", (await text(pb.page, "#pendingActions")).includes("200.000₫"));
  await pb.page.locator("#pendingActions .primary-button").click();
  await pa.page.waitForFunction(() => /Bỏ lượt/.test(document.querySelector("#pendingActions")?.textContent || ""), null, { timeout: 9000 });
  await pa.page.locator("#pendingActions .secondary-button").click();
  await pb.page.waitForFunction(() => document.querySelector("#board .space[data-index='5'].owned"), null, { timeout: 9000 });
  check("người trả giá cao nhất sở hữu bến phà", await pb.page.locator("#board .space[data-index='5']").evaluate(el => el.classList.contains("owned")));
  check("tiền đấu giá 200.000₫ được trừ đúng", (await text(pb.page, "#playersPanel")).includes("14.800.000₫"));
  await confirmTurn(pb);
  await pa.page.waitForFunction(() => document.querySelector("#rollButton")?.disabled === false, null, { timeout: 5000 }).catch(() => {});
  check("sau đấu giá, B xác nhận và lượt trả cho A", !(await pa.page.locator("#rollButton").isDisabled()));

  // A đến công ty điện, cả hai cùng bỏ giá → ô không có chủ và lượt vẫn tự kết thúc.
  await pa.page.evaluate(() => { const q = [0.4, 0.9]; Math.random = () => (q.length ? q.shift() : 0.5); });
  await pa.page.click("#rollButton");
  await pa.page.waitForFunction(() => /Mua/.test(document.querySelector("#pendingActions")?.textContent || ""), null, { timeout: 9000 });
  check("A đến ô công ty điện", /Điện lực Miền Tây/.test(await text(pa.page, "#actionMessage")));
  await pa.page.locator("#pendingActions .secondary-button").click();
  await pb.page.waitForFunction(() => /Bỏ đấu giá/.test(document.querySelector("#pendingActions")?.textContent || ""), null, { timeout: 9000 });
  await pb.page.locator("#pendingActions .secondary-button").click();
  await pa.page.waitForFunction(() => /Bỏ đấu giá/.test(document.querySelector("#pendingActions")?.textContent || ""), null, { timeout: 9000 });
  await pa.page.locator("#pendingActions .secondary-button").click();
  await pa.page.waitForFunction(() => !document.querySelector("#pendingActions")?.textContent.includes("đấu giá"), null, { timeout: 9000 });
  check("cả hai bỏ đấu giá thì ô không có chủ", !(await pa.page.locator("#board .space[data-index='12']").evaluate(el => el.classList.contains("owned"))));
  await confirmTurn(pa);
  await pb.page.waitForFunction(() => document.querySelector("#rollButton")?.disabled === false, null, { timeout: 5000 }).catch(() => {});
  check("khi không ai trả giá, A xác nhận và ván chuyển lượt", !(await pb.page.locator("#rollButton").isDisabled()));

  // ===== 2b. Xây nhà/khách sạn và xử lý nợ bằng cầm cố =====
  {
    const room = store.rooms[code];
    const uidA = room.creatorUid;
    const uidB = room.joinerUid;
    store.rooms[code] = {
      ...room,
      status:"playing",
      turnUid:uidA,
      turnNumber:Number(room.turnNumber || 1) + 1,
      lastRoll:null,
      pending:null,
      auction:null,
      debt:null,
      propertyOwners:{...room.propertyOwners,s1:uidA,s3:uidA},
      houses:{},
      mortgages:{},
      players:{
        ...room.players,
        [uidA]:{...room.players[uidA],cash:1500},
        [uidB]:{...room.players[uidB],cash:1500}
      }
    };
    await pa.page.waitForSelector("#board .space[data-index='1'].owned", { timeout:4000 });
    await pa.page.click("#propsButton");
    await pa.page.waitForSelector('#propertyList [data-deed-action="build-house"][data-index="3"]', { timeout:4000 });
    check("sổ đất hiển thị nút xây khi đã sở hữu trọn bộ tỉnh", await pa.page.locator('#propertyList [data-deed-action="build-house"][data-index="3"]').count() === 1);
    await pa.page.locator('#propertyList [data-deed-action="build-house"][data-index="3"]').click();
    await pa.page.waitForSelector('#board .space[data-index="3"].built', { timeout:4000 });
    check("xây căn đầu tiên ở ô 3, bắt buộc chuyển sang ô 1 để xây đều", store.rooms[code].houses.s3 === 1 &&
      store.rooms[code].houses.s1 !== 1 &&
      await pa.page.locator('#propertyList [data-deed-action="build-house"][data-index="3"]').count() === 0);
    await pa.page.locator('#propertyList [data-deed-action="build-house"][data-index="1"]').click();
    await pa.page.waitForSelector('#board .space[data-index="1"].built', { timeout:4000 });
    await pa.page.waitForSelector('#propertyList [data-deed-action="sell-house"][data-index="3"]', { timeout:4000 });
    check("xây nhà đồng đều trên cả hai ô trong bộ màu", store.rooms[code].houses.s3 === 1 && store.rooms[code].houses.s1 === 1);
    check("tài sản có nhà không cho cầm cố", await pa.page.locator('#propertyList [data-deed-action="mortgage-asset"][data-index="3"]').count() === 0);
    await pa.page.locator('#propertyList [data-deed-action="sell-house"][data-index="3"]').click();
    await pa.page.waitForSelector('#board .space[data-index="3"]:not(.built)', { timeout:4000 });
    await pa.page.locator('#propertyList [data-deed-action="sell-house"][data-index="1"]').click();
    await pa.page.waitForSelector('#board .space[data-index="1"]:not(.built)', { timeout:4000 });
    check("bán công trình theo thứ tự đồng đều, nhận lại tiền", !store.rooms[code].houses.s3 && !store.rooms[code].houses.s1 && store.rooms[code].players[uidA].cash === 1450);

    // Giả lập khoản thiếu tiền thuê/thuế; dùng cầm cố tài sản để trả nợ trước.
    const beforeCreditor = store.rooms[code].players[uidB].cash;
    store.rooms[code] = {
      ...store.rooms[code],
      players:{...store.rooms[code].players,[uidA]:{...store.rooms[code].players[uidA],cash:0}},
      debt:{uid:uidA,amount:20,creditorUid:uidB,reason:"Tiền thuê"}
    };
    // Sổ đất là nơi quản lý tài sản và đã được mở ở phần kiểm tra xây nhà bên trên.
    // Khi phát sinh nợ, modal hiển thị banner số nợ cùng nút cầm cố trực tiếp.
    await pa.page.waitForSelector("#propsModal:not([hidden]) #propertyList .debt-banner", { timeout:4000 });
    check("sổ đất hiển thị khoản nợ và hướng xử lý", /Đang nợ 20/.test(await text(pa.page, "#propertyList")));
    await pa.page.waitForSelector('#propertyList [data-deed-action="mortgage-asset"][data-index="3"]', { timeout:4000 });
    await pa.page.locator('#propertyList [data-deed-action="mortgage-asset"][data-index="3"]').click();
    await pa.page.waitForSelector('#board .space[data-index="3"].mortgaged', { timeout:4000 });
    check("cầm cố đất trả nợ trước và chỉ giữ phần tiền thừa", !store.rooms[code].debt &&
      store.rooms[code].mortgages.s3 === 30 &&
      store.rooms[code].players[uidB].cash === beforeCreditor + 20 &&
      store.rooms[code].players[uidA].cash === 10);
    check("ô đang cầm cố có dấu hiệu riêng trên bàn", await pa.page.locator("#board .space[data-index='3'].mortgaged .space-mortgage-mark").count() === 1);
    await pa.page.locator("#propsClose").click();
  }

  // Ván kết thúc → pháo giấy
  store.rooms[code] = { ...store.rooms[code], status: "finished", winner: store.rooms[code].creatorUid };
  const sawConfetti = await pa.page.waitForSelector(".confetti", { timeout: 2500, state: "attached" }).then(() => true).catch(() => false);
  check("hiệu ứng: pháo giấy khi ván kết thúc", sawConfetti);
  store.rooms[code].status = "playing"; delete store.rooms[code].winner;
  // F5 (tải lại trang) vẫn vào lại phòng cũ
  await pa.page.reload(); await pa.page.waitForSelector("#gameView:not(.hidden)", { timeout: 5000 }).catch(() => {});
  check("tải lại trang → tự vào lại phòng đang chơi", await pa.page.locator("#gameView").isVisible() && (await text(pa.page, "#roomCodeLabel")).trim() === code);

  // ===== 3. Chống chèn HTML qua tên
  {
    const x = await newPlayer(browser, "uidXXXXXXXXXXXXXXXXXXXXXXXXX"); await x.page.goto(URL0); await x.page.waitForTimeout(400);
    await x.page.evaluate(() => { document.getElementById("playerName").maxLength = 100; });
    await x.page.fill("#playerName", "<b id=pwn>x</b>"); await x.page.click("#createRoomButton"); await x.page.waitForSelector("#gameView:not(.hidden)");
    check("tên chứa HTML được hiển thị như chữ thường (không chèn thẻ)", (await x.page.locator("#pwn").count()) === 0);
    await x.context.close();
  }

  // ===== 4. Đối thủ máy chạy hoàn chỉnh một lượt
  {
    const cpu = await newPlayer(browser, "uidCOMPUTEROPPONENT000000000");
    await cpu.page.goto(URL0);
    await cpu.page.waitForFunction(() => document.querySelector("#connectionBadge")?.classList.contains("online"), null, { timeout: 8000 });
    await cpu.page.fill("#playerName", "Minh");
    await cpu.page.click("#playComputerButton");
    await cpu.page.waitForSelector("#gameView:not(.hidden)");
    check("chế độ đấu với máy mở được bàn cờ riêng", await cpu.page.locator("#gameModeLabel").innerText().then(x => /đơn/i.test(x)) && (await text(cpu.page, "#roomCodeLabel")).includes("VỚI MÁY"));
    check("đối thủ Máy Miền Tây xuất hiện trên bảng tài sản", /Máy Miền Tây/.test(await text(cpu.page, "#playersPanel")));
    check("ván với máy bắt đầu bằng lượt tung chọn người đi trước", /Tung xí ngầu chọn người đi trước/.test(await text(cpu.page, "#centerStatus")));
    await cpu.page.evaluate(() => { const q = [0.99, 0.99]; Math.random = () => q.length ? q.shift() : 0.5; });
    await cpu.page.click("#rollButton");
    await cpu.page.waitForFunction(() => document.querySelector("#turnName")?.textContent.trim() === "Minh" && !document.querySelector("#rollButton")?.disabled, null, { timeout: 7000 });
    check("Máy Miền Tây cũng tung để phân định lượt nhưng người chơi thắng lượt này", /Đến lượt bạn/.test(await text(cpu.page, "#centerStatus")));
    // Đợi animation chọn lượt dừng hẳn để không tiêu thụ chuỗi ngẫu nhiên ở lượt kế tiếp.
    await cpu.page.waitForFunction(() => {
      const stage = document.querySelector("#diceStage");
      const result = document.querySelector("#diceResult");
      return !stage?.classList.contains("show") && !result?.classList.contains("rolling");
    }, null, { timeout: 5000 });
    // Người chơi đến bến phà, bỏ mua; Máy Miền Tây tự cân nhắc trả giá.
    await cpu.page.evaluate(() => { const q = [0.2, 0.4]; Math.random = () => q.length ? q.shift() : 0.5; });
    await cpu.page.click("#rollButton");
    await cpu.page.waitForFunction(() => /Mua/.test(document.querySelector("#pendingActions")?.textContent || ""), null, { timeout: 9000 });
    await cpu.page.locator("#pendingActions .secondary-button").click();
    await cpu.page.waitForFunction(() => /Nâng giá|Bỏ đấu giá/.test(document.querySelector("#pendingActions")?.textContent || ""), null, { timeout: 5000 });
    check("Máy Miền Tây tự tham gia đấu giá bến phà", /Nâng giá/.test(await text(cpu.page, "#pendingActions")));
    await cpu.page.locator("#pendingActions .secondary-button").click();
    await cpu.page.waitForFunction(() => document.querySelector("#board .space[data-index='5'].owned"), null, { timeout: 8000 });
    check("Máy thắng đấu giá khi người chơi bỏ lượt", await cpu.page.locator("#board .space[data-index='5']").evaluate(el => el.classList.contains("owned")));
    await confirmTurn(cpu);
    await cpu.page.waitForFunction(() =>
      document.querySelector("#rollButton")?.disabled === false &&
      document.querySelector("#turnName")?.textContent.trim() === "Minh" &&
      /Đến lượt bạn/i.test(document.querySelector("#centerStatus")?.textContent || ""),
      null,
      { timeout: 15000 }
    );
    check("máy tự xử lý đấu giá và hoàn tất lượt", true);
    await cpu.context.close();
  }

  // ===== 5. Giao diện điện thoại
  for (const [w, h, label] of [[390, 844, "iPhone 390"], [360, 740, "Android 360"]]) {
    const m = await newPlayer(browser, "uidMMMMMMMMMMMMMMMMMMMMMMMMM", { viewport: { width: w, height: h }, mobile: true });
    await m.page.goto(URL0); await m.page.waitForTimeout(500);
    const lobbyOverflow = await m.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await m.page.fill("#playerName", "Mobile"); await m.page.click("#createRoomButton"); await m.page.waitForSelector("#gameView:not(.hidden)");
    await m.page.waitForTimeout(400);
    const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const rollBox = await m.page.locator("#rollButton").boundingBox();
    check(label + ": không tràn ngang (sảnh/ván)", lobbyOverflow <= 0 && overflow <= 0, `sảnh ${lobbyOverflow}px, ván ${overflow}px`);
    check(label + ": nút Tung xúc xắc nằm trọn trong màn hình đầu, cao ≥ 40px", rollBox && rollBox.y >= 0 && rollBox.y + rollBox.height <= h && rollBox.height >= 40, rollBox ? `y=${Math.round(rollBox.y)}..${Math.round(rollBox.y + rollBox.height)}/${h}, cao ${Math.round(rollBox.height)}` : "không thấy");
    const inputFont = await m.page.evaluate(() => getComputedStyle(document.getElementById("playerName")).fontSize);
    if (OUT) { await m.page.screenshot({ path: `${OUT}/mobile-${w}.png` }); await m.page.evaluate(() => document.getElementById("lobbyView").classList.remove("hidden")); }
    await m.context.close();
  }
  // ===== Camera trên điện thoại ngang / dọc (stage xoay 90°) và nút Toàn cảnh =====
  for (const [label, vw, vh] of [["ngang 844x390", 844, 390], ["dọc 390x844 (xoay)", 390, 844], ["dọc 360x740 (xoay)", 360, 740], ["ngang 667x375", 667, 375]]) {
    await pa.page.setViewportSize({ width: vw, height: vh });
    await pa.page.waitForTimeout(500);
    const r = store.rooms[code];
    const uid = r.creatorUid;
    const from = Number(r.players[uid].position);
    const to = (from + 5) % 40;
    const turn = Number(r.turnNumber || 1);
    store.rooms[code] = { ...r, status: "playing", debt: null, pending: null, auction: null, turnUid: uid, lastRoll: [2, 3],
      lastMove: { uid, from, to, steps: 5, dice: [2, 3], turnNumber: turn }, eventSeq: 900, 
      event: { id: 900 + vw, uid, kind: "info", text: "Kiểm tra camera " + label, turn, index: to, cash: { [uid]: 1 }, at: Date.now() },
      players: { ...r.players, [uid]: { ...r.players[uid], position: to } } };
    const followed = await pa.page.waitForFunction(() => document.getElementById("stage").dataset.camera === "follow", null, { timeout: 8000, polling: 20 }).then(() => true).catch(() => false);
    const focused = await pa.page.waitForFunction(() => document.getElementById("stage").dataset.camera === "focus", null, { timeout: 8000, polling: 20 }).then(() => true).catch(() => false);
    await pa.page.waitForTimeout(800);
    const info = await pa.page.evaluate((to) => {
      const sr = document.getElementById("stage").getBoundingClientRect();
      const tok = document.querySelector(`.space[data-index="${to}"] .token b`)?.getBoundingClientRect();
      const wrapRect = document.getElementById("board").getBoundingClientRect();
      return { tokenIn: !!tok && tok.left >= sr.left && tok.right <= sr.right && tok.top >= sr.top && tok.bottom <= sr.bottom, boardStillVisible: wrapRect.right > sr.left + 40 && wrapRect.left < sr.right - 40 && wrapRect.bottom > sr.top + 40 && wrapRect.top < sr.bottom - 40, scale: Number(document.getElementById("stage").dataset.cameraScale), btn: !document.getElementById("camOverviewButton").hidden };
    }, to);
    check(`camera ${label}: theo quân cờ rồi focus, quân cờ trong khung, bàn cờ không biến mất`, followed && focused && info.tokenIn && info.boardStillVisible && info.btn, JSON.stringify(info));
    if (OUT) await pa.page.screenshot({ path: `${OUT}/camera-${vw}x${vh}.png` });
    await pa.page.click("#camOverviewButton");
    await pa.page.waitForTimeout(900);
    const back = await pa.page.evaluate(() => ({ mode: document.getElementById("stage").dataset.camera, tf: document.querySelector("#gameView .board-wrap").style.transform, btnHidden: document.getElementById("camOverviewButton").hidden }));
    check(`nút Toàn cảnh (${label}) đưa camera về toàn cảnh bất cứ lúc nào`, back.mode === "overview" && back.tf === "" && back.btnHidden, JSON.stringify(back));
  }
  // Hai thay đổi trạng thái đến sát nhau: hành trình mới nhất thắng, camera không kẹt.
  {
    const r = store.rooms[code]; const uid = r.creatorUid; const turn = Number(r.turnNumber || 1);
    const p0 = Number(r.players[uid].position);
    const hop = (n, id) => { const cur = store.rooms[code]; const f = Number(cur.players[uid].position); const t = (f + n) % 40; store.rooms[code] = { ...cur, lastRoll: [1, n - 1], lastMove: { uid, from: f, to: t, steps: n, dice: [1, n - 1], turnNumber: turn }, eventSeq: id, event: { id, uid, kind: "info", text: "move " + id, turn, index: t, cash: { [uid]: 1 }, at: Date.now() }, players: { ...cur.players, [uid]: { ...cur.players[uid], position: t } } }; return t; };
    await pa.page.setViewportSize({ width: 844, height: 390 }); await pa.page.waitForTimeout(400);
    hop(3, 1001); const last = hop(4, 1002);
    await pa.page.waitForFunction(() => document.getElementById("stage").dataset.camera === "focus", null, { timeout: 9000, polling: 50 }).catch(() => {});
    await pa.page.waitForTimeout(1500);
    const fin = await pa.page.evaluate((last) => { const sr = document.getElementById("stage").getBoundingClientRect(); const t = document.querySelector(`.space[data-index="${last}"] .token b`)?.getBoundingClientRect(); return { mode: document.getElementById("stage").dataset.camera, tokenIn: !!t && t.left >= sr.left && t.right <= sr.right && t.top >= sr.top && t.bottom <= sr.bottom, moving: document.querySelectorAll(".token.moving").length }; }, last);
    check("hai di chuyển liên tiếp: camera kết thúc ở ô đích mới nhất, không kẹt", fin.mode === "focus" && fin.tokenIn && fin.moving === 0, JSON.stringify(fin));
    await pa.page.click("#camOverviewButton");
    await pa.page.waitForTimeout(1100);
  }
  // ===== Tải lại trang giữa lúc đang xử lý sự kiện: camera quay lại ô đang xử lý, không phát lại hành trình =====
  {
    const r = store.rooms[code]; const uid = r.creatorUid; const turn = Number(r.turnNumber || 1);
    const at = Number(r.players[uid].position);
    store.rooms[code] = { ...r, status: "playing", debt: null, pending: null, auction: null, turnUid: uid, lastRoll: [3, 4],
      eventSeq: 2000, event: { id: 2000, uid, kind: "info", text: "Sự kiện chờ xác nhận sau khi tải lại", turn, index: at, cash: { [uid]: 1 }, at: Date.now() } };
    await pa.page.setViewportSize({ width: 1280, height: 900 });
    await pa.page.reload();
    await pa.page.waitForSelector("#gameView:not(.hidden)", { timeout: 15000 });
    const restored = await pa.page.waitForFunction(() => document.getElementById("stage").dataset.camera === "focus", null, { timeout: 8000, polling: 50 }).then(() => true).catch(() => false);
    check("tải lại trang giữa sự kiện: camera focus lại ô đang xử lý", restored);
    check("tải lại trang: không lặp hành trình cũ (không có quân đang nhảy)", (await pa.page.locator(".token.moving").count()) === 0);
    await pa.page.click("#camOverviewButton");
    await pa.page.waitForTimeout(900);
    store.rooms[code] = { ...store.rooms[code], turnNumber: turn + 1, lastRoll: null };
    await pa.page.waitForTimeout(600);
    check("sau khi tải lại vẫn qua lượt bình thường, camera ở toàn cảnh", (await stageState(pa.page)).mode === "overview");
  }
  if (OUT) {
    await pa.page.screenshot({ path: `${OUT}/desktop-game.png` });
    await pa.page.setViewportSize({ width: 844, height: 390 }); await pa.page.waitForTimeout(400);
    await pa.page.screenshot({ path: `${OUT}/landscape-844.png` });
    await pa.page.setViewportSize({ width: 390, height: 844 }); await pa.page.waitForTimeout(400);
    await pa.page.screenshot({ path: `${OUT}/portrait-rotated.png` });
  }

  const errs = [...pa.errors, ...pb.errors, ...pc.errors];
  check("không có lỗi JavaScript trên trang", errs.length === 0, errs.join(" | ").slice(0, 200));
  await browser.close(); server.close();
  const bad = results.filter((x) => !x).length;
  console.log(`\nE2E: ${results.length - bad}/${results.length} đạt`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
