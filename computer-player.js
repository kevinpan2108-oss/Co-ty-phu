// Purchase strategy for the local computer opponent.
// Values use the same in-game units as SPACE_DATA (1 unit = 10,000 VND).
export function shouldComputerBuy(space, cash, ownedSpaces = []) {
  const price = Number(space?.price || 0);
  const available = Number(cash || 0);
  if (!price || available < price) return false;

  const remaining = available - price;
  const completesGroup = Boolean(space.group) &&
    ownedSpaces.some((owned) => owned?.group === space.group);

  // Prefer completing a color group when the computer can keep a modest reserve.
  if (completesGroup && remaining >= 120) return true;

  // Cheap properties are useful early, even when the remaining cash is limited.
  if (space.type === "property" && price <= 100 && remaining >= 100) return true;

  // Keep more cash in reserve for stations and utilities because their return is less certain.
  const reserve = space.type === "property" ? 250 : 350;
  return remaining >= reserve;
}
