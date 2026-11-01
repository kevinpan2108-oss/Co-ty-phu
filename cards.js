// Two distinct decks: Chance focuses on unexpected events; Fortune on regional luck.
export const CHANCE_CARDS = Object.freeze([
  { id: "harvest-sale", text: "Mùa trái cây bội thu, thương lái thu mua tận vườn.", kind: "money", amount: 100 },
  { id: "flood-dike", text: "Nước lớn tràn bờ, phải gia cố bờ bao.", kind: "money", amount: -80 },
  { id: "festival-prize", text: "Trúng giải tại hội chợ nông sản.", kind: "money", amount: 150 },
  { id: "boat-engine", text: "Ghe hỏng máy giữa sông, phải sửa chữa.", kind: "money", amount: -50 },
  { id: "floating-market", text: "Bán hàng ở chợ nổi được giá.", kind: "money", amount: 60 },
  { id: "bridge-fund", text: "Góp quỹ xây cầu cho bà con.", kind: "payEachPlayer", amount: 50 },
  { id: "tourism", text: "Khách du lịch ghé thăm vườn nhà.", kind: "money", amount: 120 },
  { id: "storm-repair", text: "Mưa dông làm hư hại nhà cửa.", kind: "repair", perHouse: 25, perHotel: 100 },
  { id: "market-dues", text: "Nộp phí chợ theo số tài sản đang sở hữu.", kind: "payPerAsset", amount: 15 },
  { id: "community-gift", text: "Được đối thủ chia sẻ lộc buôn bán.", kind: "collectFromEach", amount: 40 },
  { id: "jail-pass", text: "Nhặt được thẻ miễn vào tù. Giữ lại để dùng một lần.", kind: "jailPass" },
  { id: "go-to-jail", text: "Vi phạm quy định bến sông. Đi thẳng vào tù, không nhận tiền Xuất phát.", kind: "goToJail" }
]);

export const FORTUNE_CARDS = Object.freeze([
  { id: "lucky-orchard", text: "Vườn trái cây trúng mùa, thu hoạch vượt kế hoạch.", kind: "money", amount: 180 },
  { id: "lucky-lottery", text: "Vé số miền Tây trúng thưởng.", kind: "money", amount: 100 },
  { id: "broken-roof", text: "Mái nhà dột sau cơn mưa, sửa chữa theo số nhà đang xây.", kind: "repair", perHouse: 20, perHotel: 80 },
  { id: "local-donation", text: "Nhận khoản hỗ trợ từ quỹ phát triển du lịch.", kind: "money", amount: 120 },
  { id: "water-fee", text: "Thanh toán phí sử dụng hạ tầng theo số tài sản.", kind: "payPerAsset", amount: 10 },
  { id: "neighbor-help", text: "Người chơi còn lại hỗ trợ bạn một khoản vốn nhỏ.", kind: "collectFromEach", amount: 60 },
  { id: "lucky-fee", text: "Được miễn một phần phí cầu phà.", kind: "money", amount: 70 },
  { id: "kindness", text: "Bạn san sẻ lộc cho người chơi còn lại.", kind: "payEachPlayer", amount: 30 },
  { id: "jail-pass", text: "Được tặng thẻ ra tù miễn phí.", kind: "jailPass" },
  { id: "go-to-jail", text: "Gặp sự cố trên chuyến đò, phải ghé đồn bến sông.", kind: "goToJail" }
]);

export function drawCard(type, random = Math.random) {
  const deck = type === "fortune" ? FORTUNE_CARDS : CHANCE_CARDS;
  const sample = Number(random());
  const safe = Number.isFinite(sample) ? Math.max(0, Math.min(0.999999999, sample)) : 0;
  return deck[Math.floor(safe * deck.length)];
}
