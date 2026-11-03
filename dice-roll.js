// Hoạt cảnh đổ xúc xắc kiểu Monopoly (Marmalade): xuất hiện + rung → tung lên → rơi, nảy ba nhịp → lăn chậm dần → dừng đúng mặt.
// Phần tính keyframe là hàm thuần (dễ kiểm thử); phần phát dùng Web Animations API và không xoay vô hạn.
import { cubeTransform } from "./dice-visuals.js";

export const DICE_ANIM_MS = 2340; // từ lúc xuất hiện đến lúc dừng hẳn
// Mốc thời gian (ms) của các cú chạm bàn, dùng chung cho hình và âm thanh.
export const DICE_IMPACTS = Object.freeze([1330, 1800, 2040]);
export const DICE_IMPACT_VOLUME = Object.freeze([1, 0.6, 0.34]);
export const DICE_SHAKES = Object.freeze([330, 410, 490]);

const RISE = "cubic-bezier(.2,.7,.4,1)";   // lên: chậm dần (trọng lực)
const FALL = "cubic-bezier(.5,0,1,.6)";    // rơi: nhanh dần
const SETTLE = "cubic-bezier(.2,.6,.3,1)"; // lăn nốt: giảm tốc êm

// t(ms), x, y (đơn vị cạnh xúc xắc; y âm = lên cao), góc xoay còn lại (x, y), easing đoạn kế tiếp.
// Góc xoay giảm dần về 0: xúc xắc quay nhanh khi bay, chậm dần khi lăn, dừng đúng mặt.
function timeline(dir) {
  const k = dir;
  return [
    { t: 0,    x: 0,         y: 1.0,  o: 0, sx: 0,    sy: 0,    e: SETTLE },
    { t: 240,  x: 0,         y: 1.0,  o: 1, sx: 0,    sy: 0,    e: "linear" },
    { t: 330,  x: 0.05 * k,  y: 1.0,  o: 1, sx: 9,    sy: -7,   e: "linear" },
    { t: 410,  x: -0.05 * k, y: 0.98, o: 1, sx: -8,   sy: 8,    e: "linear" },
    { t: 490,  x: 0.04 * k,  y: 1.0,  o: 1, sx: 6,    sy: -6,   e: "linear" },
    { t: 550,  x: 0,         y: 1.0,  o: 1, sx: 0,    sy: 0,    e: RISE },
    { t: 1050, x: 0.2 * k,  y: -2.4, o: 1, sx: 900,  sy: 1080, e: FALL },
    { t: 1330, x: 0.55 * k, y: 0,    o: 1, sx: 520,  sy: 700,  e: "linear", sq: 0 },
    { t: 1370, x: 0.6 * k,  y: 0,    o: 1, sx: 500,  sy: 680,  e: RISE, sq: 0.1 },
    { t: 1580, x: 0.52 * k, y: -1.0, o: 1, sx: 330,  sy: 480,  e: FALL },
    { t: 1800, x: 0.42 * k, y: 0,    o: 1, sx: 250,  sy: 360,  e: "linear", sq: 0 },
    { t: 1835, x: 0.4 * k,  y: 0,    o: 1, sx: 240,  sy: 345,  e: RISE, sq: 0.06 },
    { t: 1930, x: 0.36 * k, y: -0.38, o: 1, sx: 150, sy: 210,  e: FALL },
    { t: 2040, x: 0.3 * k,  y: 0,    o: 1, sx: 110,  sy: 140,  e: RISE, sq: 0.03 },
    { t: 2110, x: 0.26 * k, y: -0.1, o: 1, sx: 60,   sy: 80,   e: SETTLE },
    { t: 2340, x: 0,         y: 0,    o: 1, sx: 0,    sy: 0,    e: "linear", sq: 0 },
  ];
}
const lift = (y) => Math.max(0, -y);

// Trả về { fly, spin, shadow }: ba mảng keyframe cho cùng một viên (offset 0..1).
export function buildDieKeyframes(value, index, ds = 60) {
  const dir = index === 0 ? -1 : 1;
  const tl = timeline(dir);
  const fly = [], spin = [], shadow = [];
  for (const p of tl) {
    const offset = p.t / DICE_ANIM_MS;
    const h = lift(p.y);
    const scale = 1 + 0.35 * Math.min(1, h / 2.4);
    const q = p.sq || 0;
    const easing = p.e;
    fly.push({ offset, easing, opacity: p.o, transform: `translate(${(p.x * ds).toFixed(1)}px,${(p.y * ds).toFixed(1)}px) scale(${(scale * (1 + q)).toFixed(3)},${(scale * (1 - q)).toFixed(3)})` });
    const sign = index === 0 ? 1 : -1;
    spin.push({ offset, easing, transform: cubeTransform(value, [p.sx * sign, p.sy * (index === 0 ? 1 : 0.85)]) });
    const gy = Math.max(0, p.y) * ds;
    shadow.push({ offset, easing, opacity: p.o * 0.42 / (1 + h * 0.9), transform: `translate(${(p.x * ds).toFixed(1)}px,${gy.toFixed(1)}px) scale(${(1 / (1 + h * 0.5)).toFixed(3)})` });
  }
  return { fly, spin, shadow };
}

// Phát hoạt cảnh trên stage đã có hai .die-slot. Trả về mảng Animation (để dừng/hủy khi cần).
export function playDiceRoll(stage, result) {
  const slots = [...stage.querySelectorAll(".die-slot")];
  const anims = [];
  slots.forEach((slot, i) => {
    const wrap = slot.querySelector(".cube-wrap"), cube = slot.querySelector(".cube"), shadow = slot.querySelector(".die-shadow");
    if (!wrap || !cube || typeof wrap.animate !== "function") return;
    const ds = wrap.getBoundingClientRect().width || 60;
    const k = buildDieKeyframes(result[i], i, ds);
    const opt = { duration: DICE_ANIM_MS, fill: "both", delay: i * 30 };
    cube.style.transition = "none";
    anims.push(wrap.animate(k.fly, opt), cube.animate(k.spin, opt));
    if (shadow) anims.push(shadow.animate(k.shadow, opt));
  });
  return anims;
}
