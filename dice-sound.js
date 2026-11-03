// Âm thanh va chạm xúc xắc, tổng hợp bằng Web Audio (không cần tệp âm thanh).
import { DICE_IMPACTS, DICE_IMPACT_VOLUME, DICE_SHAKES, DICE_ANIM_MS } from "./dice-roll.js";

let ctx = null, noise = null;
let muted = false;
try { muted = localStorage.getItem("ctp-muted") === "1"; } catch {}

export function isMuted() { return muted; }
export function setMuted(value) {
  muted = !!value;
  try { localStorage.setItem("ctp-muted", muted ? "1" : "0"); } catch {}
}
function audio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}
function noiseBuffer(c) {
  if (noise) return noise;
  noise = c.createBuffer(1, Math.floor(c.sampleRate * 0.3), c.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}
// Một tiếng "cộp" của xúc xắc nhựa/gỗ chạm mặt bàn: xung nhiễu lọc dải + tiếng thịch trầm.
function knock(c, at, vol, pitch = 1) {
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c);
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1900 * pitch; bp.Q.value = 1.1;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * 0.8), at + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(at, Math.random() * 0.15, 0.1);
  const o = c.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(150 * pitch, at); o.frequency.exponentialRampToValueAtTime(55, at + 0.1);
  const og = c.createGain();
  og.gain.setValueAtTime(0.0001, at);
  og.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * 0.55), at + 0.004);
  og.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
  o.connect(og).connect(c.destination);
  o.start(at); o.stop(at + 0.14);
}
function chime(c, at) {
  [880, 1320].forEach((f, i) => {
    const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at + i * 0.07);
    g.gain.exponentialRampToValueAtTime(0.12, at + i * 0.07 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + i * 0.07 + 0.35);
    o.connect(g).connect(c.destination); o.start(at + i * 0.07); o.stop(at + i * 0.07 + 0.4);
  });
}
// Phát âm thanh khớp mốc thời gian của hoạt cảnh (bắt đầu cùng lúc với animation).
export function playDiceSound() {
  if (muted) return;
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + 0.02;
  const s = (ms) => t0 + ms / 1000;
  DICE_SHAKES.forEach((ms, i) => { knock(c, s(ms), 0.16, 1.2 + i * 0.08); knock(c, s(ms + 20), 0.12, 1.4); });
  DICE_IMPACTS.forEach((ms, i) => {
    knock(c, s(ms), 0.75 * DICE_IMPACT_VOLUME[i], 1 - i * 0.05);
    knock(c, s(ms + 28), 0.6 * DICE_IMPACT_VOLUME[i], 1.12 - i * 0.05); // viên thứ hai chạm sau một chút
  });
  [2140, 2200, 2265].forEach((ms) => knock(c, s(ms), 0.1, 1.5));    // lăn lách cách rồi dừng
  chime(c, s(DICE_ANIM_MS + 20));
}
