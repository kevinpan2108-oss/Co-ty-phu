# Ghi chú bàn giao (cho người/AI làm tiếp)

Nhánh làm việc: `feat/mekong-theme` (từ `feat/online-mvp`). **Không sửa trực tiếp `main` hay `feat/online-mvp`**: làm trên nhánh riêng rồi mở Pull Request.
Ràng buộc của dự án (xem `CLAUDE_REVIEW.md`): chỉ 2 người chơi, ưu tiên tiếng Việt, **không** thanh toán, quảng cáo, tài khoản/mật khẩu, chat, giao dịch giữa người chơi, AI đối thủ.

## Đã làm
- **Kết nối:** không dùng Firebase Authentication. Mỗi trình duyệt tự sinh mã người chơi (`localStorage`), chỉ cần Realtime Database. Rules ở `firebase-database.rules.json` (Publish thủ công trong Firebase Console mỗi khi file đổi).
- **Tiền Việt:** dữ liệu lưu theo *đơn vị*, 1 đơn vị = 10.000₫ (`UNIT_VND`, hàm `money()`/`moneyShort()` trong `app.js`). Đổi cách hiển thị thì không phải đổi Rules hay dữ liệu phòng. Giá/tiền thuê trong `SPACE_DATA` vẫn là số đơn vị.
- **Chủ đề miền Tây:** 40 ô đặt tên theo địa danh ĐBSCL, nhóm màu theo tỉnh; thẻ Cơ hội; bảng màu sông nước (biến CSS ở đầu `style.css`); cảnh hoàng hôn trên sông (SVG trong `index.html`, `.scene`).
- **Hiệu ứng** (`runEffects()` trong `app.js`, chỉ là hiển thị, không ghi lên database): xúc xắc lăn, quân cờ nhảy từng ô, tiền cộng/trừ bay lên, dấu chủ sở hữu khi mua đất, pháo giấy khi thắng, rung nhẹ + tiêu đề tab khi đến lượt. Tôn trọng `prefers-reduced-motion`.

## Quy tắc khi sửa code
- **Mỗi lần sửa `app.js` hoặc `style.css`, tăng `?v=` ở hai thẻ trong `index.html`** (đang là `mekong3`), nếu không điện thoại sẽ dùng bản cũ trong bộ nhớ đệm.
- Mọi dữ liệu lấy từ database (tên, màu, xúc xắc...) phải qua `escapeHtml()` / `safeColor()` / `Number()` trước khi đưa vào HTML.
- Giữ `SPACE_DATA` đủ 40 ô; chỉ số ô là khóa của `propertyOwners` (`s0`..`s39`) nên **không đổi thứ tự ô** khi có phòng đang chơi.
- Đổi cấu trúc dữ liệu phòng thì phải đổi cả `firebase-database.rules.json` và `tests/rules.test.js`.

## Kiểm thử
```
npm run check
npm test                              # smoke + hành vi Rules (bộ mô phỏng tối giản)
npm i --no-save playwright && npx playwright install chromium
node tests/e2e/two-player.cjs ./shots # 2 trình duyệt + Firebase giả lập + ảnh chụp mobile/desktop
```
Chưa từng chạy với Firebase Emulator hay Firebase thật trong môi trường tự động: hãy thử 2 thiết bị thật sau mỗi thay đổi lớn.

## Việc có thể làm tiếp (theo thứ tự gợi ý)
1. Xem lại ảnh chụp mobile (390px, 360px) sau mỗi thay đổi giao diện; tên ô bị ẩn dưới 560px (chạm ô để xem chi tiết).
2. Hộp thoại hiện thẻ Cơ hội khi rút (hiện chỉ có dòng chữ ở khung Hành động).
3. Nút "Chơi lại" khi ván kết thúc (hiện phải rời phòng và tạo phòng mới).
4. Âm thanh (xúc xắc, mua đất, thắng) có nút tắt tiếng, mặc định tắt.
5. Dọn phòng cũ; báo cho người còn lại khi một người rời phòng giữa ván.
6. Chống gian lận cần Cloud Functions (hiện người chơi tự tính tiền/xúc xắc ở trình duyệt; ai biết mã phòng đều sửa được phòng đó).
