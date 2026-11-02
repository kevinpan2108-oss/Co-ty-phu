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
export function quadCenter(points) {
  if (!Array.isArray(points) || points.length < 3) throw new TypeError("quadCenter requires at least three points");
  const total = points.reduce((sum, point) => ({ x: sum.x + Number(point.x), y: sum.y + Number(point.y) }), { x: 0, y: 0 });
  return { x: total.x / points.length, y: total.y / points.length };
}

export function boundsFromPoints(points) {
  if (!Array.isArray(points) || points.length < 3) throw new TypeError("boundsFromPoints requires at least three points");
  const xs = points.map((point) => Number(point.x));
  const ys = points.map((point) => Number(point.y));
  if (![...xs, ...ys].every(Number.isFinite)) throw new TypeError("boundsFromPoints received a non-finite coordinate");
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}


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
  // Đọc đúng tứ giác sau phối cảnh. getBoundingClientRect() chỉ trả hình chữ nhật
  // bao ngoài nên không thể dùng tâm AABB làm tâm ô trên một mặt phẳng đang nghiêng.
  const geometryMarkers = new WeakMap();
  const readQuad = (element) => {
    try {
      const quads = element.getBoxQuads?.({ box: "border" });
      if (quads?.length) {
        const q = quads[0];
        return [q.p1, q.p2, q.p3, q.p4].map((p) => ({ x: p.x, y: p.y }));
      }
    } catch { /* trình duyệt không hỗ trợ getBoxQuads: đo bằng điểm neo DOM */ }

    let markers = geometryMarkers.get(element);
    if (!markers) {
      markers = Array.from({ length: 4 }, () => {
        const marker = document.createElement("i");
        marker.className = "camera-geometry-marker";
        marker.setAttribute("aria-hidden", "true");
        Object.assign(marker.style, {
          position: "absolute", width: "0", height: "0", padding: "0", margin: "0",
          border: "0", pointerEvents: "none", visibility: "hidden", zIndex: "-1"
        });
        element.append(marker);
        return marker;
      });
      geometryMarkers.set(element, markers);
    }

    const style = getComputedStyle(element);
    const bl = parseFloat(style.borderLeftWidth) || 0;
    const br = parseFloat(style.borderRightWidth) || 0;
    const bt = parseFloat(style.borderTopWidth) || 0;
    const bb = parseFloat(style.borderBottomWidth) || 0;
    const right = element.clientWidth + br;
    const bottom = element.clientHeight + bb;
    const positions = [
      { left: -bl, top: -bt },
      { left: right, top: -bt },
      { left: right, top: bottom },
      { left: -bl, top: bottom }
    ];
    markers.forEach((marker, i) => {
      marker.style.left = positions[i].left + "px";
      marker.style.top = positions[i].top + "px";
    });
    return markers.map((marker) => {
      const r = marker.getBoundingClientRect();
      return { x: r.left, y: r.top };
    });
  };
  const toBase = (point, matrix, cam) => screenToBase(point, matrix, cam);
  // Đo vị trí các ô và bốn góc thật một lần; invalidate() yêu cầu đo lại sau resize/xoay máy.
  const measure = () => {
    state.cells.clear();
    const cam = readCamera(wrap);
    const matrix = stageMatrix();
    document.querySelectorAll("#board .space").forEach((cell) => {
      const center = quadCenter(readQuad(cell));
      state.cells.set(Number(cell.dataset.index), toBase(center, matrix, cam));
    });
    const projectedCorners = readQuad(board).map((point) => toBase(point, matrix, cam));
    state.bounds = boundsFromPoints(projectedCorners);
  };
  const cellBase = (index) => {
    if (!state.cells.size || !state.bounds) measure();
    return state.cells.get(Number(index)) || null;
  };
  // Vị trí quân cờ trong khung nhìn: lệch về bên trái để bảng sự kiện (bên phải) không che ô đang focus.
  // Event Panel nay o giua; giu quan co lech ve ben trai de khong bi bang su kien che mat.
  const anchorFor = (v, withPanel) => ({ x: v.w * (withPanel ? 0.2 : 0.5), y: v.h * 0.5 });
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
