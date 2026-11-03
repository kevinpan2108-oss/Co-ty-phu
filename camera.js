// Cinematic camera theo token, giữ toàn bộ trạng thái ở trình duyệt.
// Camera bám vào tọa độ chiếu thực của ô trên bàn nghiêng; không ghi vị trí camera lên Firebase.

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

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

export function quadCenter(points) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new TypeError("quadCenter requires at least three points");
  }
  const total = points.reduce((sum, point) => ({
    x: sum.x + Number(point.x),
    y: sum.y + Number(point.y)
  }), { x: 0, y: 0 });
  return { x: total.x / points.length, y: total.y / points.length };
}

export function boundsFromPoints(points) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new TypeError("boundsFromPoints requires at least three points");
  }
  const xs = points.map((point) => Number(point.x));
  const ys = points.map((point) => Number(point.y));
  if (![...xs, ...ys].every(Number.isFinite)) {
    throw new TypeError("boundsFromPoints received a non-finite coordinate");
  }
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// Khi dựng overview có thể giới hạn bàn trong viewport. Khi theo token, bỏ giới hạn này:
// camera phải được phép đưa các cạnh bàn ra ngoài màn hình để giữ quân cờ đúng điểm nhìn.
export function solveCamera({
  focus, viewport, anchor, scale, bounds, constrainToBounds = true
}) {
  const s = clampNumber(Number(scale) || 1, 1, CAMERA.maxScale);
  let tx = anchor.x - focus.x * s;
  let ty = anchor.y - focus.y * s;

  if (bounds && constrainToBounds) {
    const axis = (translation, viewLength, start, length) => {
      const scaledLength = length * s;
      if (scaledLength <= viewLength) {
        return (viewLength - scaledLength) / 2 - start * s;
      }
      return clampNumber(
        translation,
        viewLength - (start + length) * s,
        -start * s
      );
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
  const markerCache = new WeakMap();

  const stageMatrix = () => {
    const value = getComputedStyle(stage).transform;
    return new DOMMatrix(value && value !== "none" ? value : undefined);
  };
  const viewport = () => ({ w: stage.clientWidth, h: stage.clientHeight });
  const clearTimers = () => {
    timers.forEach((timer) => clearTimeout(timer));
    timers = [];
  };
  const later = (fn, ms) => {
    const timer = setTimeout(fn, Math.max(0, ms));
    timers.push(timer);
    return timer;
  };
  const setMode = (mode) => {
    state.mode = mode;
    stage.dataset.camera = mode;
    onChange?.(mode);
  };
  const apply = (cam, ms, easing) => {
    wrap.style.transition = ms > 0
      ? "transform " + ms + "ms " + easing
      : "none";
    const identity = cam.scale === 1 && cam.tx === 0 && cam.ty === 0;
    wrap.style.transform = identity
      ? ""
      : "translate3d(" + cam.tx.toFixed(2) + "px," +
        cam.ty.toFixed(2) + "px,0) scale(" + cam.scale.toFixed(4) + ")";
    stage.dataset.cameraScale = cam.scale.toFixed(3);
    stage.dataset.cameraX = cam.tx.toFixed(1);
    stage.dataset.cameraY = cam.ty.toFixed(1);
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
  const measuredFor = (tilt) => state.measured.get(String(tilt)) || measure(tilt);
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
    manualOverview() {
      this.overview(700);
      state.manualUntilNextMove = true;
    },
    later(fn, ms) {
      return later(fn, ms);
    },
    current() {
      return readCamera(wrap);
    }
  };
}
