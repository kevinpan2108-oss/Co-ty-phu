// Pure helpers for the synchronized event panel and event-history view.
export function currentTurnEvent(room) {
  const event = room?.event;
  return event && Number(event.turn) === Number(room.turnNumber) ? event : null;
}

export function eventLogList(room) {
  const log = room?.log;
  if (!log) return [];
  return (Array.isArray(log) ? log : Object.keys(log).sort((a, b) => Number(a) - Number(b)).map((key) => log[key])).filter(Boolean);
}

export function eventReason(event, uid, delta) {
  if (!event) return "";
  const actor = uid === event.uid;
  switch (event.kind) {
    case "buy": return "mua tài sản";
    case "auction": return Number(delta) < 0 ? "thắng đấu giá" : "đấu giá";
    case "tax": return "nộp thuế";
    case "chance": return "thẻ Cơ hội";
    case "fortune": return "thẻ Khí vận";
    case "jail": return "phí ra tù";
    case "start": return "Xuất phát";
    case "build": return "xây nhà/khách sạn";
    case "sellHouse": return "bán nhà/khách sạn";
    case "mortgage": return "cầm cố tài sản";
    case "redeem": return "giải chấp tài sản";
    case "bankruptcy": return "phá sản";
    case "property":
    case "station":
    case "utility":
      return actor ? (Number(delta) < 0 ? "trả tiền thuê" : "nhận tiền") : "nhận tiền thuê";
    default: return "";
  }
}
