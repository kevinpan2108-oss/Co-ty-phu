// Pure game-economy rules shared by the online game and unit tests.
export const HOUSE_RENT_MULTIPLIERS = Object.freeze([5, 15, 45, 80, 125]);

export function calculateDiceMove(position, dice) {
  const from = ((Math.trunc(Number(position) || 0) % 40) + 40) % 40;
  const first = Number(dice?.[0]);
  const second = Number(dice?.[1]);
  if (!Number.isInteger(first) || !Number.isInteger(second) || first < 1 || first > 6 || second < 1 || second > 6) {
    throw new TypeError("Mỗi viên xí ngầu phải có giá trị từ 1 đến 6.");
  }
  const steps = first + second;
  return { from, to: (from + steps) % 40, steps, passesStart: from + steps >= 40, dice: [first, second] };
}

// Chỉ các ô property có cùng group mới thuộc một bộ màu để xây nhà.
export function propertyGroupIndices(spaceData, group) {
  if (!group) return [];
  return spaceData.map((space, index) => space?.type === "property" && space.group === group ? index : -1).filter((index) => index >= 0);
}

export function ownsCompleteGroup(spaceData, owners, group, uid) {
  const cells = propertyGroupIndices(spaceData, group);
  return cells.length >= 2 && cells.every((index) => owners?.["s" + index] === uid);
}

export function getHouseCost(spaceData, index) {
  const space = spaceData[Number(index)];
  if (!space || space.type !== "property" || !space.group) return 0;
  const cells = propertyGroupIndices(spaceData, space.group);
  if (cells.length < 2) return 0;
  const cheapest = Math.min(...cells.map((cell) => Number(spaceData[cell]?.price || 0)));
  if (!Number.isFinite(cheapest) || cheapest <= 0) return 0;
  return Math.max(50, Math.ceil((cheapest / 2) / 10) * 10);
}

export function getBuildingLabel(count) {
  const value = Math.max(0, Math.min(5, Math.trunc(Number(count) || 0)));
  if (value === 5) return "Khách sạn";
  if (value > 0) return value + (value === 1 ? " căn nhà" : " căn nhà");
  return "Đất trống";
}

export function buildEligibility(spaceData, owners, houses, mortgages, uid, index, cash = Infinity) {
  const space = spaceData[Number(index)];
  if (!space || space.type !== "property" || !space.group) return { ok: false, reason: "Chỉ xây được trên đất thuộc một bộ màu." };
  const cells = propertyGroupIndices(spaceData, space.group);
  if (cells.length < 2) return { ok: false, reason: "Tỉnh này chỉ có một ô đất nên chưa thể xây nhà." };
  if (!ownsCompleteGroup(spaceData, owners, space.group, uid)) return { ok: false, reason: "Bạn cần sở hữu toàn bộ đất của tỉnh " + space.group + " trước khi xây." };
  if (cells.some((cell) => Number(mortgages?.["s" + cell] || 0) > 0)) return { ok: false, reason: "Hãy giải chấp toàn bộ đất trong bộ màu trước khi xây." };
  const counts = cells.map((cell) => Math.max(0, Math.min(5, Number(houses?.["s" + cell] || 0))));
  const current = Number(houses?.["s" + index] || 0);
  const minimum = Math.min(...counts);
  const maximum = Math.max(...counts);
  if (maximum >= 5) return { ok: false, reason: "Bộ màu này đã có khách sạn tối đa." };
  if (current !== minimum) return { ok: false, reason: "Phải xây đều: hãy xây ở ô đang có ít nhà nhất trong tỉnh." };
  const cost = getHouseCost(spaceData, index);
  if (Number(cash) < cost) return { ok: false, reason: "Bạn cần " + cost + " đơn vị tiền để xây nhà/khách sạn." , cost };
  return { ok: true, cost, current, next: current + 1, maximum, minimum };
}

export function sellHouseEligibility(spaceData, owners, houses, uid, index) {
  const space = spaceData[Number(index)];
  if (!space || space.type !== "property" || !space.group || owners?.["s" + index] !== uid) {
    return { ok: false, reason: "Đây không phải đất của bạn." };
  }
  const cells = propertyGroupIndices(spaceData, space.group);
  const counts = cells.map((cell) => Number(houses?.["s" + cell] || 0));
  const current = Number(houses?.["s" + index] || 0);
  if (current <= 0) return { ok: false, reason: "Ô đất này chưa có nhà để bán." };
  if (current < Math.max(...counts)) return { ok: false, reason: "Phải bán nhà đồng đều: chỉ bán ở ô đang có nhiều nhà nhất." };
  const cost = getHouseCost(spaceData, index);
  return { ok: true, refund: Math.floor(cost / 2), current, next: current - 1 };
}

export function mortgageEligibility(spaceData, owners, houses, mortgages, uid, index) {
  const space = spaceData[Number(index)];
  if (!space || !["property", "station", "utility"].includes(space.type) || !space.price) return { ok: false, reason: "Ô này không thể cầm cố." };
  if (owners?.["s" + index] !== uid) return { ok: false, reason: "Tài sản này không thuộc về bạn." };
  if (Number(mortgages?.["s" + index] || 0) > 0) return { ok: false, reason: "Tài sản này đang được cầm cố." };
  if (space.type === "property" && space.group) {
    const cells = propertyGroupIndices(spaceData, space.group);
    if (cells.some((cell) => Number(houses?.["s" + cell] || 0) > 0)) {
      return { ok: false, reason: "Bạn phải bán hết nhà/khách sạn trong tỉnh " + space.group + " trước khi cầm cố đất." };
    }
  }
  return { ok: true, amount: Math.floor(Number(space.price) / 2) };
}

export function mortgageValue(space) {
  return Math.floor(Math.max(0, Number(space?.price) || 0) / 2);
}

export function redemptionCost(mortgageAmount) {
  const principal = Math.max(0, Number(mortgageAmount) || 0);
  return Math.ceil(principal * 1.1);
}

export function calcRent(spaceData, space, owners, ownerUid, diceTotal, index, houses = {}, mortgages = {}) {
  if (!space || !ownerUid) return { rent: 0, wholeProvince: false, houses: 0, mortgaged: false };
  const id = "s" + Number(index);
  if (Number(mortgages?.[id] || 0) > 0) return { rent: 0, wholeProvince: false, houses: 0, mortgaged: true };
  const countOwned = (type) => Object.keys(owners || {}).filter((key) =>
    owners[key] === ownerUid &&
    spaceData[Number(key.slice(1))]?.type === type &&
    Number(mortgages?.[key] || 0) <= 0
  ).length;
  let rent = Number(space.rent || 50);
  let wholeProvince = false;
  const houseCount = Math.max(0, Math.min(5, Number(houses?.[id] || 0)));
  if (space.type === "station") {
    rent = 40 * Math.pow(2, Math.max(0, countOwned("station") - 1));
  } else if (space.type === "utility") {
    rent = Math.max(0, Number(diceTotal) || 0) * (countOwned("utility") > 1 ? 10 : 4);
  } else if (space.type === "property" && space.group) {
    wholeProvince = ownsCompleteGroup(spaceData, owners, space.group, ownerUid);
    if (houseCount > 0) rent *= HOUSE_RENT_MULTIPLIERS[houseCount - 1];
    else if (wholeProvince) rent *= 2;
  }
  return { rent: Math.round(rent), wholeProvince, houses: houseCount, mortgaged: false };
}

export function hasLiquidationOptions(spaceData, owners, houses, mortgages, uid) {
  if (!uid) return false;
  const owned = Object.entries(owners || {}).filter(([, ownerUid]) => ownerUid === uid);
  if (owned.some(([id]) => Number(houses?.[id] || 0) > 0)) return true;
  return owned.some(([id]) => {
    const index = Number(id.slice(1));
    return mortgageEligibility(spaceData, owners, houses, mortgages, uid, index).ok;
  });
}

export function finalDiceSpin(index) {
  const i = Number(index) === 1 ? 1 : 0;
  // Both axes use complete turns. 540° is 180° modulo 360 and flips the visible face.
  return [720 + 360 * i, 720 + 360 * (1 - i)];
}
