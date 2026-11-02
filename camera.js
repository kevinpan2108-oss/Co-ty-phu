// Camera theo quân cờ. Chỉ là hiển thị phía trình duyệt: không đọc/ghi Firebase và không đổi vị trí quân cờ.
// Camera là một phép biến đổi 2D (translate + scale, gốc ở góc trên trái) áp lên .board-wrap.

export const CAMERA = Object.freeze({
  followScale: 1.45,   // zoom khi đi theo quân cờ
  focusScale: 1.8,     // zoom nhẹ tại ô đích (vẫn thấy ô xung quanh)
  maxScale: 2.2,
  zoomInMs: 650,
  focusMs: 520,
  zoomOutMs: 1000
});

const clampNumber = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Tính camera để điểm `focus` (toạ độ gốc, chưa zoom) nằm đúng vị trí `anchor` trong khung nhìn,
// đồng thời không cho tấm bàn cờ trượt ra khỏi khung (bounds = hộp bao của bàn cờ ở camera gốc).
export function solveCamera({ focus, viewport, anchor, scale, bounds }) {
  const s = clampNumber(Number(scale) || 1, 1, CAMERA.maxScale);
  let tx = anchor.x - focus.x * s;
  let ty = anchor.y - focus.y * s;
  if (bounds) {
    const axis = (t, viewLen, bStart, bLen) => {
      const size = bLen * s;
      if (size <= viewLen) return (viewLen - size) / 2 - bStart * s; // bàn nhỏ hơn khung: căn giữa
      return clampNumber(t, viewLen - (bStart + bLen) * s, -bStart * s); // bàn lớn hơn khung: luôn phủ kín khung
    };
    tx = axis(tx, viewport.w, bounds.x, bounds.w);
    ty = axis(ty, viewport.h, bounds.y, bounds.h);
  }
  return { tx, ty, scale: s };
}

// Quy đổi điểm trên màn hình về toạ độ gốc của bàn cờ (camera = identity).
// `stageMatrix`: phép biến đổi của .stage (xoay 90° ở màn hình dọc); `cam`: camera đang hiển thị.
export function screenToBase(point, stageMatrix, cam) {
  const inv = stageMatrix.inverse();
  const local = inv.transformPoint(new DOMPoint(point.x, point.y));
  const s = cam.scale || 1;
  return { x: (local.x - cam.tx) / s, y: (local.y - cam.ty) / s };
}
export function readCamera(el) {
  const m = new DOMMatrix(getComputedStyle(el).transform);
  return { tx: m.e, ty: m.f, scale: m.a || 1 };
}

export function createCamera({ stage, wrap, board, onChange, reduceMotion = false }) {
  const state = { mode: "overview", seq: 0, enabled: !reduceMotion, cells: new Map(), bounds: null, manualUntilNextMove: false };
  let timers = [];

  const stageMatrix = () => new DOMMatrix(getComputedStyle(stage).transform);
  const viewport = () => ({ w: stage.clientWidth, h: stage.clientHeight });
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const setMode = (mode) => {
    state.mode = mode;
    stage.dataset.camera = mode;
    onChange?.(mode);
  };
  const apply = (cam, ms, easing) => {
    wrap.style.transition = ms > 0 ? `transform ${ms}ms ${easing}` : "none";
    wrap.style.transform = cam.scale === 1 && cam.tx === 0 && cam.ty === 0 ? "" : `translate(${cam.tx.toFixed(2)}px,${cam.ty.toFixed(2)}px) scale(${cam.scale.toFixed(4)})`;
    stage.dataset.cameraScale = cam.scale.toFixed(2);
  };
  // Đo vị trí gốc của mọi ô một lần (đảo ngược camera hiện hành) rồi dùng lại cho tới khi đổi kích thước.
  const measure = () => {
    state.cells.clear();
    const cam = readCamera(wrap);
    const m = stageMatrix();
    document.querySelectorAll("#board .space").forEach((cell) => {
      const r = cell.getBoundingClientRect();
      state.cells.set(Number(cell.dataset.index), screenToBase({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, m, cam));
    });
    const b = board.getBoundingClientRect();
    const tl = screenToBase({ x: b.left, y: b.top }, m, cam);
    const br = screenToBase({ x: b.right, y: b.bottom }, m, cam);
    const corners = [tl, br, screenToBase({ x: b.right, y: b.top }, m, cam), screenToBase({ x: b.left, y: b.bottom }, m, cam)];
    const xs = corners.map((c) => c.x), ys = corners.map((c) => c.y);
    state.bounds = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };
  const cellBase = (index) => {
    if (!state.cells.size || !state.bounds) measure();
    return state.cells.get(Number(index)) || null;
  };
  // Vị trí quân cờ trong khung nhìn: lệch về bên trái để bảng sự kiện (bên phải) không che ô đang focus.
  const anchorFor = (v, withPanel) => ({ x: v.w * (withPanel ? 0.38 : 0.5), y: v.h * 0.5 });
  const cameraFor = (index, scale, withPanel) => {
    const focus = cellBase(index);
    if (!focus) return null;
    const v = viewport();
    return solveCamera({ focus, viewport: v, anchor: anchorFor(v, withPanel), scale, bounds: state.bounds });
  };

  return {
    state,
    get mode() { return state.mode; },
    setEnabled(value) { state.enabled = !!value && !reduceMotion; if (!state.enabled) this.overview(0); },
    invalidate() { state.cells.clear(); state.bounds = null; },
    // Bắt đầu một hành trình mới: mọi hẹn giờ của hành trình cũ bị huỷ, hành trình mới nhất luôn thắng.
    beginSequence() { state.seq += 1; clearTimers(); state.manualUntilNextMove = false; return state.seq; },
    isCurrent(seq) { return seq === state.seq; },
    follow(index, { ms = CAMERA.zoomInMs, scale = CAMERA.followScale, ease = "cubic-bezier(.45,.05,.4,1)", seq = state.seq } = {}) {
      if (!state.enabled || state.manualUntilNextMove || seq !== state.seq) return false;
      const cam = cameraFor(index, scale, true);
      if (!cam) return false;
      setMode("follow");
      apply(cam, ms, ease);
      return true;
    },
    focus(index, { ms = CAMERA.focusMs, seq = state.seq } = {}) {
      if (!state.enabled || state.manualUntilNextMove || seq !== state.seq) return false;
      const cam = cameraFor(index, CAMERA.focusScale, true);
      if (!cam) return false;
      setMode("focus");
      apply(cam, ms, "cubic-bezier(.2,.8,.2,1)");
      return true;
    },
    overview(ms = CAMERA.zoomOutMs) {
      clearTimers();
      state.seq += 1;
      setMode("overview");
      apply({ tx: 0, ty: 0, scale: 1 }, ms, "cubic-bezier(.45,.05,.4,1)");
    },
    // Người chơi bấm "Toàn cảnh": giữ toàn cảnh cho tới khi có một lượt di chuyển mới.
    manualOverview() {
      this.overview(700);
      state.manualUntilNextMove = true;
    },
    later(fn, ms) { return later(fn, ms); },
    // Dùng cho test/diagnostic: camera hiện hành đọc trực tiếp từ DOM.
    current() { return readCamera(wrap); }
  };
}
