// Bộ mô phỏng tối giản cho Firebase Realtime Database Security Rules.
// KHÔNG phải emulator chính thức: chỉ đánh giá .read/.write/.validate theo cây rules của game.
import { readFileSync } from "node:fs";

if (!String.prototype.matches) {
  Object.defineProperty(String.prototype, "matches", { value(re) { return re.test(String(this)); } });
}

const NONLEAF = Object.freeze({ nonLeaf: true });

export function normalize(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) value = Object.fromEntries(value.map((v, i) => [String(i), v]));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const n = normalize(v);
      if (n !== null) out[k] = n;
    }
    return Object.keys(out).length ? out : null;
  }
  return value;
}

function at(root, path) {
  let cur = root;
  for (const k of path) {
    if (cur === null || typeof cur !== "object") return null;
    cur = cur[k] ?? null;
  }
  return cur ?? null;
}

class Snap {
  constructor(root, path = []) { this.root = root; this.path = path; }
  get value() { return at(this.root, this.path); }
  child(k) { return new Snap(this.root, k === null || k === undefined ? ["\u0000none"] : [...this.path, String(k)]); }
  parent() { return new Snap(this.root, this.path.slice(0, -1)); }
  exists() { return this.value !== null; }
  val() { const v = this.value; return v !== null && typeof v === "object" ? NONLEAF : v; }
  hasChild(k) { const v = this.value; return v !== null && typeof v === "object" && k !== null && k !== undefined && String(k) in v; }
  hasChildren(list) {
    const v = this.value;
    if (v === null || typeof v !== "object") return false;
    return list ? list.every((k) => k in v) : Object.keys(v).length > 0;
  }
  isString() { return typeof this.value === "string"; }
  isNumber() { return typeof this.value === "number"; }
  isBoolean() { return typeof this.value === "boolean"; }
}

const compiled = new Map();
function evaluate(expr, scope) {
  let fn = compiled.get(expr);
  if (!fn) {
    const js = expr.replace(/(?<![=!<>])==(?!=)/g, "===").replace(/!=(?!=)/g, "!==");
    fn = new Function("auth", "data", "newData", "$roomId", "$uid", "$spaceId", `return !!(${js});`);
    compiled.set(expr, fn);
  }
  try {
    return fn(scope.auth, scope.data, scope.newData, scope.vars.$roomId, scope.vars.$uid, scope.vars.$spaceId);
  } catch {
    return false; // lỗi khi đánh giá rule => Firebase từ chối
  }
}

export function loadRules(file) {
  const rules = JSON.parse(readFileSync(file, "utf8")).rules;
  const roomRule = rules.rooms.$roomId;

  function validateTree(rule, newRoot, oldRoot, path, scope) {
    if (at(newRoot, path) === null) return true;
    if (rule[".validate"] !== undefined) {
      const ok = evaluate(rule[".validate"], { ...scope, data: new Snap(oldRoot, path), newData: new Snap(newRoot, path) });
      if (!ok) return false;
    }
    const value = at(newRoot, path);
    if (value !== null && typeof value === "object") {
      for (const key of Object.keys(value)) {
        let child = rule[key];
        let vars = scope.vars;
        if (!child) {
          const wild = Object.keys(rule).find((k) => k.startsWith("$"));
          if (wild) { child = rule[wild]; vars = { ...vars, [wild]: key }; }
        }
        if (child && !validateTree(child, newRoot, oldRoot, [...path, key], { ...scope, vars })) return false;
      }
    }
    return true;
  }

  return {
    canRead(uid) { return evaluate(roomRule[".read"], { auth: uid ? { uid } : null, data: new Snap(null), newData: new Snap(null), vars: {} }); },
    // Trả về { ok, reason } cho thao tác ghi cả phòng rooms/<roomId> = newRoom (null = xóa phòng)
    write(uid, roomId, oldRoom, newRoom) {
      const oldRoot = normalize(oldRoom);
      const newRoot = normalize(newRoom);
      const scope = { auth: uid ? { uid } : null, vars: { $roomId: roomId } };
      const writeOk = evaluate(roomRule[".write"], { ...scope, data: new Snap(oldRoot), newData: new Snap(newRoot) });
      if (!writeOk) return { ok: false, reason: ".write" };
      if (newRoot !== null && !validateTree(roomRule, newRoot, oldRoot, [], scope)) return { ok: false, reason: ".validate" };
      return { ok: true };
    }
  };
}
