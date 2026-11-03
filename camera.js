// Camera theo quân cờ. Chỉ là hiển thị phía trình duyệt: không đọc/ghi Firebase và không đổi vị trí quân cờ.
// Camera là một phép biến đổi 2D (translate + scale, gốc ở góc trên trái) áp lên .board-wrap.

export const CAMERA = Object.freeze({
  followScale: 1.45,   // zoom khi đi theo quân cờ
  focusScale: 1.8,     // zoom nhẹ tại ô đích (vẫn thấy ô xung quanh)
  followTilt: 38,      // độ nghiêng bàn cờ (độ) khi đi theo quân cờ; toàn cảnh nhìn thẳng từ trên xuống (0°)
  focusTilt: 44,
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

export function readCamera(el) {
  const m = new DOMMatrix(getComputedStyle(el).transform);
  return { tx: m.e, ty: m.f, scale: m.a || 1 };
}

export function createCamera({ stage, wrap, board, onChange, reduceMotion = false }) {
  const state = { mode: "overview", seq: 0, enabled: !reduceMotion, measured: new Map(), manualUntilNextMove: false };
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
  // Đo vị trí gốc (trong hệ toạ độ của .board-wrap, chưa zoom/dịch) của mọi ô ở một độ nghiêng nhất định.
  // Tạm tắt transition + camera để đọc layout đồng bộ trong cùng một khung hình rồi khôi phục (không vẽ ra màn hình).
  const measure = (tilt) => {
    const key = String(tilt);
    const saved = { wt: wrap.style.transition, wf: wrap.style.transform, bt: board.style.transition, rx: board.style.getPropertyValue("--rx") };
    wrap.style.transition = "none"; wrap.style.transform = "none";
    board.style.transition = "none"; board.style.setProperty("--rx", tilt + "deg");
    const m = stageMatrix().inverse();
    const toLocal = (x, y) => { const p = m.transformPoint(new DOMPoint(x, y)); return { x: p.x, y: p.y }; };
    const cells = new Map();
    document.querySelectorAll("#board .space").forEach((cell) => {
      const r = cell.getBoundingClientRect();
      cells.set(Number(cell.dataset.index), toLocal(r.left + r.width / 2, r.top + r.height / 2));
    });
    const b = board.getBoundingClientRect();
    const pts = [toLocal(b.left, b.top), toLocal(b.right, b.top), toLocal(b.left, b.bottom), toLocal(b.right, b.bottom)];
    const xs = pts.map((c) => c.x), ys = pts.map((c) => c.y);
    const bounds = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    void wrap.offsetWidth;
    wrap.style.transition = saved.wt; wrap.style.transform = saved.wf;
    board.style.transition = saved.bt; if (saved.rx) board.style.setProperty("--rx", saved.rx); else board.style.removeProperty("--rx");
    state.measured.set(key, { cells, bounds });
    return state.measured.get(key);
  };
  // Số đo lấy lúc bàn cờ chưa dựng xong (thiếu ô) không được giữ lại: đo lại cho tới khi đủ 40 ô.
  const measuredFor = (tilt) => {
    const hit = state.measured.get(String(tilt));
    return hit && hit.cells.size >= 40 && hit.bounds.w > 0 ? hit : measure(tilt);
  };
  // Vị trí quân cờ trong khung nhìn: lệch về bên trái để bảng sự kiện (bên phải) không che ô đang focus.
  const anchorFor = (v, withPanel) => ({ x: v.w * (withPanel ? 0.34 : 0.5), y: v.h * 0.52 });
  const cameraFor = (index, scale, tilt, withPanel) => {
    const m = measuredFor(tilt);
    const focus = m.cells.get(Number(index));
    if (!focus) return null;
    const v = viewport();
    return solveCamera({ focus, viewport: v, anchor: anchorFor(v, withPanel), scale, bounds: m.bounds });
  };
  const setTilt = (deg, ms, easing) => {
    board.style.transition = ms > 0 ? `transform ${ms}ms ${easing}` : "none";
    board.style.setProperty("--rx", deg + "deg");
  };

  return {
    state,
    get mode() { return state.mode; },
    setEnabled(value) { state.enabled = !!value && !reduceMotion; if (!state.enabled) this.overview(0); },
    invalidate() { state.measured.clear(); },
    premeasure() { [0, CAMERA.followTilt, CAMERA.focusTilt].forEach(measure); },
    // Bắt đầu một hành trình mới: mọi hẹn giờ của hành trình cũ bị huỷ, hành trình mới nhất luôn thắng.
    beginSequence() { state.seq += 1; clearTimers(); state.manualUntilNextMove = false; return state.seq; },
    isCurrent(seq) { return seq === state.seq; },
    follow(index, { ms = CAMERA.zoomInMs, scale = CAMERA.followScale, ease = "cubic-bezier(.45,.05,.4,1)", seq = state.seq } = {}) {
      if (!state.enabled || state.manualUntilNextMove || seq !== state.seq) return false;
      const cam = cameraFor(index, scale, CAMERA.followTilt, true);
      if (!cam) return false;
      setMode("follow");
      setTilt(CAMERA.followTilt, ms, ease);
      apply(cam, ms, ease);
      return true;
    },
    focus(index, { ms = CAMERA.focusMs, seq = state.seq } = {}) {
      if (!state.enabled || state.manualUntilNextMove || seq !== state.seq) return false;
      const cam = cameraFor(index, CAMERA.focusScale, CAMERA.focusTilt, true);
      if (!cam) return false;
      setMode("focus");
      setTilt(CAMERA.focusTilt, ms, "cubic-bezier(.2,.8,.2,1)");
      apply(cam, ms, "cubic-bezier(.2,.8,.2,1)");
      return true;
    },
    overview(ms = CAMERA.zoomOutMs) {
      clearTimers();
      state.seq += 1;
      setMode("overview");
      setTilt(0, ms, "cubic-bezier(.45,.05,.4,1)");
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
