// Hình vẽ công trình đặc trưng của từng địa danh (SVG 64x64, đứng thẳng trên ô khi xem 3D).
// Chỉ là hình minh họa vẽ tay; không dùng ảnh bên ngoài.
const SH = '<ellipse cx="32" cy="58" rx="24" ry="4" fill="#000" opacity=".25"/>';
const ROOF = "#c8452d", GOLD = "#f2b632", WALL = "#f6e7c1", WOOD = "#7a4a2b", LEAF = "#2f8a4a", WATER = "#3aa0b0";
const palm = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 Q-2 -14 1 -26" stroke="#6b4129" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M1 -26 q-14 -2 -20 6 q10 -2 20 -6 M1 -26 q14 -2 20 6 q-10 -2 -20 -6 M1 -26 q-8 -12 -16 -10 q10 0 16 10 M1 -26 q8 -12 16 -10 q-10 0 -16 10" fill="${LEAF}"/><circle cx="-1" cy="-24" r="2.4" fill="#8a5a2b"/><circle cx="3" cy="-23" r="2.4" fill="#8a5a2b"/></g>`;
const boat = (x, y, c, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 0 H14 Q10 8 0 8 H-8 Q-12 8 -14 0Z" fill="${c}"/><path d="M-14 0 q-3 -3 -3 -6 q4 2 5 6z" fill="${c}"/><path d="M-8 0 Q0 -12 10 0Z" fill="${GOLD}"/></g>`;
const wave = '<path d="M6 54 q6 -4 12 0 t12 0 t12 0 t12 0" fill="none" stroke="#bfeaf0" stroke-width="2" opacity=".8"/>';

const ARTS = {
  // Chợ nổi: ghe có cây bẹo treo trái cây
  market: (c) => `${SH}<ellipse cx="32" cy="52" rx="26" ry="6" fill="${WATER}"/>${wave}
    <path d="M10 46 H54 Q48 56 32 56 Q16 56 10 46Z" fill="${c}"/><path d="M10 46 q-4 -4 -4 -8 q6 2 8 8z" fill="${c}"/>
    <path d="M18 46 Q32 28 48 46Z" fill="${GOLD}"/><path d="M33 10 V46" stroke="${WOOD}" stroke-width="2.5"/>
    <circle cx="33" cy="14" r="4" fill="#f58a1f"/><circle cx="33" cy="22" r="3.5" fill="#7bc043"/><circle cx="33" cy="29" r="3.5" fill="#e8402a"/><path d="M33 8 l9 3 l-9 3z" fill="#e8402a"/>`,
  // Làng nổi / nhà sàn giữa rừng tràm
  stilt: (c) => `${SH}<ellipse cx="32" cy="53" rx="26" ry="6" fill="${WATER}"/>${wave}
    <path d="M14 30 L32 14 L50 30Z" fill="#b38b4d"/><rect x="18" y="30" width="28" height="14" fill="${WALL}"/><rect x="28" y="34" width="8" height="10" fill="${WOOD}"/>
    <path d="M18 44 V56 M30 44 V56 M46 44 V56" stroke="${WOOD}" stroke-width="3"/>${palm(8, 50, .6)}<path d="M40 56 q10 -6 20 0" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  // Chùa Việt: mái cong hai tầng
  pagoda: (c) => `${SH}<rect x="16" y="40" width="32" height="17" fill="${WALL}"/><rect x="28" y="46" width="8" height="11" rx="3" fill="${WOOD}"/>
    <path d="M6 41 Q32 34 58 41 L52 36 H12Z" fill="${ROOF}"/><rect x="20" y="26" width="24" height="12" fill="${WALL}"/>
    <path d="M12 27 Q32 20 52 27 L46 22 H18Z" fill="${ROOF}"/><path d="M32 22 V10" stroke="${GOLD}" stroke-width="2"/><circle cx="32" cy="9" r="3" fill="${GOLD}"/><rect x="16" y="40" width="32" height="3" fill="${c}"/>`,
  // Chùa Khmer: mái nhọn vàng nhiều tầng
  khmer: (c) => `${SH}<rect x="14" y="40" width="36" height="17" fill="#fff1c8"/><rect x="14" y="40" width="36" height="4" fill="${c}"/>
    <rect x="27" y="47" width="10" height="10" rx="5" fill="#c8452d"/>
    <path d="M10 40 L32 30 L54 40Z" fill="${GOLD}"/><path d="M18 31 L32 20 L46 31Z" fill="#e89a1f"/><path d="M24 22 L32 8 L40 22Z" fill="${GOLD}"/><path d="M32 2 V8" stroke="${GOLD}" stroke-width="2"/>
    <path d="M10 40 q-2 -4 0 -7 M54 40 q2 -4 0 -7" stroke="#c8452d" stroke-width="2.5" fill="none"/>`,
  // Dừa & lò kẹo
  coconut: (c) => `${SH}${palm(18, 56, 1.15)}${palm(46, 56, .9)}<rect x="24" y="44" width="16" height="12" fill="${WALL}"/><path d="M20 45 L32 34 L44 45Z" fill="#b38b4d"/><rect x="29" y="48" width="6" height="8" fill="${WOOD}"/><circle cx="32" cy="42" r="3" fill="${c}"/>`,
  // Cù lao / đảo có cọ và cát
  island: (c) => `${SH}<ellipse cx="32" cy="54" rx="27" ry="6" fill="${WATER}"/><ellipse cx="32" cy="52" rx="18" ry="5" fill="#f1d9a0"/>${palm(26, 52, 1.1)}${palm(40, 53, .8)}<path d="M40 40 q8 -8 14 -2" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  // Làng hoa sen / hoa kiểng
  lotus: (c) => `${SH}<ellipse cx="32" cy="52" rx="27" ry="7" fill="${WATER}"/>
    <ellipse cx="20" cy="52" rx="8" ry="3" fill="#4da35a"/><ellipse cx="46" cy="54" rx="7" ry="2.5" fill="#4da35a"/>
    <path d="M32 52 V34" stroke="#3f8a4a" stroke-width="3"/><path d="M32 36 q-16 -2 -14 -16 q10 4 14 16z M32 36 q16 -2 14 -16 q-10 4 -14 16z M32 36 q-8 -10 0 -24 q8 14 0 24z" fill="${c}"/><path d="M32 36 q-4 -10 0 -18 q4 8 0 18z" fill="#fff" opacity=".45"/>`,
  // Chim, cò: vườn cò, rừng tràm
  birds: (c) => `${SH}<path d="M8 56 Q20 44 32 56Z" fill="#276f3a"/><path d="M26 56 Q40 38 56 56Z" fill="${LEAF}"/><path d="M14 52 V34 M44 50 V28" stroke="${WOOD}" stroke-width="3"/>
    <ellipse cx="14" cy="32" rx="9" ry="7" fill="#2f8a4a"/><ellipse cx="44" cy="26" rx="11" ry="8" fill="#3d9f55"/>
    <g fill="#fff"><ellipse cx="26" cy="24" rx="6" ry="3.2"/><path d="M31 23 l8 -6 l-1 8z"/><path d="M20 24 l-6 -5 l2 6z"/><path d="M26 27 V34" stroke="#f2a31f" stroke-width="1.5"/></g><path d="M38 14 l6 -4 M38 14 l5 3" stroke="${c}" stroke-width="2"/>`,
  // Biệt thự kiểu Pháp
  villa: (c) => `${SH}<rect x="8" y="30" width="48" height="27" fill="#fbf0d0"/><path d="M5 31 L32 12 L59 31Z" fill="${ROOF}"/><rect x="26" y="40" width="12" height="17" rx="6" fill="${WOOD}"/>
    <rect x="12" y="36" width="8" height="10" fill="${c}"/><rect x="44" y="36" width="8" height="10" fill="${c}"/><circle cx="32" cy="24" r="4" fill="#fff" stroke="${WOOD}" stroke-width="1.5"/><rect x="8" y="30" width="48" height="3" fill="#e8d4a0"/>`,
  // Điện gió
  wind: (c) => `${SH}<ellipse cx="32" cy="52" rx="26" ry="6" fill="${WATER}"/><path d="M29 52 L31 20 H33 L35 52Z" fill="#f4f6f8"/>
    <g transform="translate(32 20)"><circle r="3" fill="#dfe6ea"/><path d="M0 0 L-3 -17 L3 -17Z" fill="#fff"/><path d="M0 0 L15 9 L12 14Z" fill="#fff"/><path d="M0 0 L-15 9 L-12 14Z" fill="#fff"/></g>
    <g transform="translate(12 34) scale(.5)"><path d="M-2 22 L0 0 H2 L4 22Z" fill="#f4f6f8"/></g><rect x="26" y="50" width="12" height="3" fill="${c}"/>`,
  // Núi / đồi có chùa
  hill: (c) => `${SH}<path d="M2 57 Q24 8 46 40 Q54 30 62 57Z" fill="#5f9f5a"/><path d="M2 57 Q24 8 46 40 L34 57Z" fill="#4d8a4c"/>
    <rect x="22" y="22" width="14" height="9" fill="${WALL}"/><path d="M18 23 Q29 16 40 23 L36 19 H22Z" fill="${ROOF}"/><circle cx="52" cy="50" r="2" fill="${c}"/>`,
  // Mũi Cà Mau: mũi tàu + đước
  cape: (c) => `${SH}<ellipse cx="32" cy="53" rx="27" ry="6" fill="${WATER}"/>${wave}
    <path d="M6 56 Q24 40 58 46 L58 56Z" fill="#3b7d4b"/><path d="M14 50 l-4 -10 l6 6 M22 48 l-2 -12 l5 9 M30 47 l2 -11 l3 11" stroke="#276f3a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M44 44 V12" stroke="${WOOD}" stroke-width="2.5"/><path d="M44 12 H58 L54 18 L58 24 H44Z" fill="#da251d"/><path d="M51 14.5 l1.3 3 l3 .2 l-2.3 2 l.8 3 l-2.8 -1.7 l-2.8 1.7 l.8 -3 l-2.3 -2 l3 -.2z" fill="${GOLD}" transform="scale(.7) translate(21 6)"/>`,
  // Bến phà / cảng
  ferry: (c) => `${SH}<ellipse cx="32" cy="52" rx="27" ry="7" fill="${WATER}"/>${wave}
    <path d="M6 44 H58 L52 54 H12Z" fill="${c}"/><rect x="14" y="34" width="36" height="10" fill="#f6f1e4"/><rect x="20" y="26" width="22" height="9" fill="#fff"/>
    <rect x="17" y="37" width="6" height="4" fill="#6bb7c4"/><rect x="27" y="37" width="6" height="4" fill="#6bb7c4"/><rect x="37" y="37" width="6" height="4" fill="#6bb7c4"/><rect x="38" y="16" width="5" height="10" fill="#e8402a"/>`,
  // Nhà máy điện / nước
  power: (c) => `${SH}<path d="M32 8 L20 56 M32 8 L44 56 M24 36 H40 M27 24 H37" stroke="#4a5a63" stroke-width="3" fill="none"/><path d="M14 20 H50" stroke="#4a5a63" stroke-width="3"/><path d="M26 30 l7 -9 h-4 l6 -9 l-4 11 h4z" fill="${GOLD}" transform="translate(-2 6)"/><circle cx="14" cy="20" r="2" fill="${c}"/><circle cx="50" cy="20" r="2" fill="${c}"/>`,
  water: (c) => `${SH}<rect x="26" y="34" width="12" height="23" fill="#9aa8ad"/><ellipse cx="32" cy="22" rx="17" ry="14" fill="#6bb7c4"/><path d="M15 22 Q32 30 49 22" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/><path d="M32 12 q6 8 0 14 q-6 -6 0 -14z" fill="#fff" opacity=".85"/><rect x="22" y="53" width="20" height="4" fill="${c}"/>`
};

// Tên ô → kiểu hình. Ô không có trong bảng dùng biểu tượng emoji của ô.
export const ART_BY_NAME = {
  "Làng nổi Tân Lập": ["stilt"], "Chợ nổi Cái Bè": ["market", "#e2573a"], "Chùa Vĩnh Tràng": ["pagoda"],
  "Làng kẹo dừa": ["coconut"], "Cồn Phụng": ["island"], "Ao Bà Om": ["khmer"], "Chùa Âng": ["khmer"],
  "Cù lao An Bình": ["island"], "Chợ nổi Trà Ôn": ["market", "#2f7fc1"], "Làng hoa Sa Đéc": ["lotus", "#f06292"],
  "Tràm Chim": ["birds"], "Nhà cổ Bình Thủy": ["villa"], "Vườn cò Bằng Lăng": ["birds"],
  "Chợ nổi Ngã Bảy": ["market", "#7bb661"], "Chùa Dơi": ["khmer"], "Chùa Kh'Leang": ["khmer"],
  "Nhà Công tử Bạc Liêu": ["villa"], "Điện gió Bạc Liêu": ["wind"], "Rừng tràm Trà Sư": ["birds"],
  "Núi Sam Châu Đốc": ["hill"], "Đảo Phú Quốc": ["island"], "Mũi Cà Mau": ["cape"],
  "Bến phà Rạch Miễu": ["ferry", "#2f5d6b"], "Bến Ninh Kiều": ["ferry", "#2f7fc1"], "Bến tàu Rạch Giá": ["ferry", "#1fb5c9"],
  "Cảng Hà Tiên": ["ferry", "#7c6bb5"], "Điện lực Miền Tây": ["power", "#e8c85a"], "Nhà máy nước Cửu Long": ["water", "#2f7fc1"]
};
export function artSvg(name, fallbackColor = "#c8452d") {
  const entry = ART_BY_NAME[name];
  if (!entry || !ARTS[entry[0]]) return "";
  const color = entry[1] || fallbackColor;
  return `<svg class="art-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${ARTS[entry[0]](color)}</svg>`;
}

// Quân cờ đại diện: mỗi người một con vật (suy ra từ màu quân, không cần đổi dữ liệu trong database).
const ANIMALS = { "#0e7c86": "🐧", "#e8402a": "🐶", "#d6f06b": "🐧", "#f18e72": "🐶" };
const SPARE = ["🐱", "🐸", "🐼", "🦆"];
export function animalFor(color, index = 0) {
  return ANIMALS[String(color).toLowerCase()] || SPARE[index % SPARE.length];
}

// Tên ngắn in trên ô cờ (tên đầy đủ hiện khi chạm vào ô).
const SHORT_NAMES = {
  "Làng nổi Tân Lập": "Tân Lập", "Chợ nổi Cái Bè": "Cái Bè", "Chùa Vĩnh Tràng": "Vĩnh Tràng", "Làng kẹo dừa": "Kẹo dừa",
  "Cồn Phụng": "Cồn Phụng", "Ao Bà Om": "Ao Bà Om", "Chùa Âng": "Chùa Âng", "Cù lao An Bình": "An Bình",
  "Chợ nổi Trà Ôn": "Trà Ôn", "Làng hoa Sa Đéc": "Sa Đéc", "Tràm Chim": "Tràm Chim", "Nhà cổ Bình Thủy": "Bình Thủy",
  "Vườn cò Bằng Lăng": "Bằng Lăng", "Chợ nổi Ngã Bảy": "Ngã Bảy", "Chùa Dơi": "Chùa Dơi", "Chùa Kh'Leang": "Kh'Leang",
  "Nhà Công tử Bạc Liêu": "Công tử", "Điện gió Bạc Liêu": "Điện gió", "Rừng tràm Trà Sư": "Trà Sư", "Núi Sam Châu Đốc": "Núi Sam",
  "Đảo Phú Quốc": "Phú Quốc", "Mũi Cà Mau": "Cà Mau", "Bến phà Rạch Miễu": "Rạch Miễu", "Bến Ninh Kiều": "Ninh Kiều",
  "Bến tàu Rạch Giá": "Rạch Giá", "Cảng Hà Tiên": "Hà Tiên", "Điện lực Miền Tây": "Điện lực", "Nhà máy nước Cửu Long": "Nước",
  "THUẾ NÔNG SẢN": "Thuế", "PHÍ CẦU PHÀ": "Phí phà"
};
export function shortName(name) { return SHORT_NAMES[name] || name; }


// Token lựa chọn mang nét đời thường Việt Nam.
export const TOKEN_OPTIONS = Object.freeze([
  { id: "penguin", label: "Chim cánh cụt" },
  { id: "puppy", label: "Cún con" },
  { id: "plastic-chair", label: "Ghế nhựa Việt Nam" },
  { id: "vietnamese-coffee", label: "Cà phê sữa đá" }
]);
const TOKEN_MARKUP = {
  penguin: '<span class="token-emoji" aria-hidden="true">🐧</span>',
  puppy: '<span class="token-emoji" aria-hidden="true">🐶</span>',
  "plastic-chair": `<svg class="token-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M20 8 Q18 7 17 12 L17 31 Q17 34 21 35 L45 35 Q49 34 48 30 L46 12 Q45 7 41 8Z" fill="#ed493d" stroke="#8e2725" stroke-width="3" stroke-linejoin="round"/>
    <path d="M13 32 Q12 29 17 29 H47 Q52 29 51 34 L48 42 H17Z" fill="#f15a49" stroke="#8e2725" stroke-width="3" stroke-linejoin="round"/>
    <path d="M19 40 L17 56 Q17 59 21 59 H24 L27 42 M45 40 L47 56 Q47 59 43 59 H40 L37 42" fill="#d93732" stroke="#8e2725" stroke-width="3" stroke-linejoin="round"/>
    <path d="M20 46 H44" stroke="#ff9a87" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M25 14 V27 M39 14 V27" stroke="#ff9a87" stroke-width="2" stroke-linecap="round" opacity=".85"/>
  </svg>`,
  "vietnamese-coffee": `<svg class="token-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M39 10 L48 3" stroke="#a94e25" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M17 16 H49 L45 57 Q44 60 41 60 H24 Q21 60 20 57Z" fill="#dff6f6" fill-opacity=".72" stroke="#517c86" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M20 34 H46 L44 55 H23Z" fill="#80502d"/>
    <path d="M20 34 Q31 30 46 34 V40 Q34 44 21 39Z" fill="#c18a55"/>
    <path d="M23 42 Q30 37 37 43 T44 44 L43 54 H23Z" fill="#704127"/>
    <path d="M26 30 L32 24 L38 31 L35 36 H27Z" fill="#f8ffff" fill-opacity=".9" stroke="#b8d5d7" stroke-width="1"/>
    <path d="M38 28 L43 24 L47 30 L43 35 H39Z" fill="#f8ffff" fill-opacity=".9" stroke="#b8d5d7" stroke-width="1"/>
    <path d="M16 15 H50 Q52 15 51 18 H15 Q14 16 16 15Z" fill="#f4ffff" stroke="#517c86" stroke-width="2"/>
    <path d="M23 39 Q29 43 36 39" fill="none" stroke="#e9d4b2" stroke-width="2" stroke-linecap="round"/>
  </svg>`
};
export function tokenMarkup(tokenId) {
  return TOKEN_MARKUP[tokenId] || TOKEN_MARKUP.penguin;
}
export function tokenLabel(tokenId) {
  return TOKEN_OPTIONS.find((token) => token.id === tokenId)?.label || TOKEN_OPTIONS[0].label;
}
