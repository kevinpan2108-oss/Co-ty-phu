// Cinematic camera theo token, giữ toàn bộ trạng thái ở trình duyệt.
// Camera bám vào tọa độ chiếu thực của ô trên bàn nghiêng; không ghi vị trí camera lên Firebase.

export const CAMERA = Object.freeze({
  followScale: 1.58,
  focusScale: 2.12,
  maxScale: 2.45,
  zoomInMs: 560,
  stepMs: 150,
  focusMs: 430,
  zoomOutMs: 780,
  anchorX: 0.22,
  anchorY: 0.50
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

// Quy đổi tọa độ client về hệ tọa độ gốc của .board-wrap.
// Stage có thể được xoay 90 độ trên điện thoại; camera lại nằm ở lớp bên trong.
export function screenToBase(point, stageMatrix, cam) {
  const local = stageMatrix.inverse().transformPoint(new DOMPoint(point.x, point.y));
  const scale = cam.scale || 1;
  return {
    x: (local.x - cam.tx) / scale,
    y: (local.y - cam.ty) / scale
  };
}

export function readCamera(element) {
  const value = getComputedStyle(element).transform;
  const matrix = new DOMMatrix(value && value !== "none" ? value : undefined);
  return {
    tx: matrix.e,
    ty: matrix.f,
    scale: Math.hypot(matrix.a, matrix.b) || 1
  };
}

export function createCamera({ stage, wrap, board, onChange, reduceMotion = false }) {
  const state = {
    mode: "overview",
    seq: 0,
    enabled: !reduceMotion,
    cells: new Map(),
    bounds: null,
    manualUntilNextMove: false
  };
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

  // Đo bốn góc thật sau perspective. getBoundingClientRect() chỉ là AABB,
  // nên lấy tâm AABB sẽ làm camera lệch ở các ô sát bốn cạnh bàn.
  const readQuad = (element) => {
    try {
      const quads = element.getBoxQuads?.({ box: "border" });
      if (quads?.length) {
        const quad = quads[0];
        return [quad.p1, quad.p2, quad.p3, quad.p4]
          .map((point) => ({ x: point.x, y: point.y }));
      }
    } catch { /* Dùng các marker DOM nếu browser không hỗ trợ getBoxQuads. */ }

    let markers = markerCache.get(element);
    if (!markers) {
      markers = Array.from({ length: 4 }, () => {
        const marker = document.createElement("i");
        marker.className = "camera-geometry-marker";
        marker.setAttribute("aria-hidden", "true");
        Object.assign(marker.style, {
          position: "absolute",
          width: "0",
          height: "0",
          padding: "0",
          margin: "0",
          border: "0",
          pointerEvents: "none",
          visibility: "hidden",
          zIndex: "-1"
        });
        element.append(marker);
        return marker;
      });
      markerCache.set(element, markers);
    }

    const style = getComputedStyle(element);
    const left = parseFloat(style.borderLeftWidth) || 0;
    const rightBorder = parseFloat(style.borderRightWidth) || 0;
    const top = parseFloat(style.borderTopWidth) || 0;
    const bottomBorder = parseFloat(style.borderBottomWidth) || 0;
    const right = element.clientWidth + rightBorder;
    const bottom = element.clientHeight + bottomBorder;
    const positions = [
      { left: -left, top: -top },
      { left: right, top: -top },
      { left: right, top: bottom },
      { left: -left, top: bottom }
    ];
    markers.forEach((marker, index) => {
      marker.style.left = positions[index].left + "px";
      marker.style.top = positions[index].top + "px";
    });
    return markers.map((marker) => {
      const rect = marker.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    });
  };

  const toBase = (point, matrix, cam) => screenToBase(point, matrix, cam);

  const measure = () => {
    state.cells.clear();
    const cam = readCamera(wrap);
    const matrix = stageMatrix();

    document.querySelectorAll("#board .space").forEach((cell) => {
      const center = quadCenter(readQuad(cell));
      state.cells.set(
        Number(cell.dataset.index),
        toBase(center, matrix, cam)
      );
    });

    const projectedCorners = readQuad(board)
      .map((point) => toBase(point, matrix, cam));
    state.bounds = boundsFromPoints(projectedCorners);
  };

  const cellBase = (index) => {
    if (!state.cells.size || !state.bounds) measure();
    return state.cells.get(Number(index)) || null;
  };

  const cameraFor = (index, scale) => {
    const focus = cellBase(index);
    if (!focus) return null;
    const view = viewport();
    const anchor = {
      x: view.w * CAMERA.anchorX,
      y: view.h * CAMERA.anchorY
    };
    return solveCamera({
      focus,
      viewport: view,
      anchor,
      scale,
      bounds: state.bounds,
      constrainToBounds: false
    });
  };

  return {
    state,
    get mode() { return state.mode; },
    setEnabled(value) {
      state.enabled = !!value && !reduceMotion;
      if (!state.enabled) this.overview(0);
    },
    invalidate() {
      state.cells.clear();
      state.bounds = null;
    },
    beginSequence() {
      state.seq += 1;
      clearTimers();
      state.manualUntilNextMove = false;
      return state.seq;
    },
    isCurrent(seq) {
      return seq === state.seq;
    },
    follow(index, {
      ms = CAMERA.stepMs,
      scale = CAMERA.followScale,
      ease = "cubic-bezier(.22,.78,.25,1)",
      seq = state.seq
    } = {}) {
      if (!state.enabled || state.manualUntilNextMove || seq !== state.seq) return false;
      const cam = cameraFor(index, scale);
      if (!cam) return false;
      setMode("follow");
      apply(cam, ms, ease);
      return true;
    },
    focus(index, { ms = CAMERA.focusMs, seq = state.seq } = {}) {
      if (!state.enabled || state.manualUntilNextMove || seq !== state.seq) return false;
      const cam = cameraFor(index, CAMERA.focusScale);
      if (!cam) return false;
      setMode("focus");
      apply(cam, ms, "cubic-bezier(.18,.82,.24,1)");
      return true;
    },
    overview(ms = CAMERA.zoomOutMs) {
      clearTimers();
      state.seq += 1;
      setMode("overview");
      apply(
        { tx: 0, ty: 0, scale: 1 },
        ms,
        "cubic-bezier(.22,.68,.25,1)"
      );
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
