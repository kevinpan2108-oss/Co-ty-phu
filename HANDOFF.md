# Ghi chú bàn giao – Cờ Tỷ Phú Miền Tây

## Trạng thái nhánh

- Nhánh tính năng đang làm: `feat/mekong-board-polish`.
- Nhánh nền online: `feat/online-mvp`.
- Không sửa trực tiếp `main` hoặc `feat/online-mvp`; tiếp tục trên nhánh tính năng và mở Pull Request về `feat/online-mvp`.
- Bản GitHub Pages hiện lấy từ `feat/online-mvp`, do đó nhánh tính năng chưa tự động xuất hiện trên link công khai trước khi được đưa vào nhánh xuất bản.

## Phạm vi game đã thống nhất

Có hai chế độ:
1. **Online 2 người:** hai người thật dùng mã phòng 6 ký tự và Firebase Realtime Database.
2. **Chơi với máy:** người chơi đấu với “Máy Miền Tây” cục bộ; không tạo phòng Firebase. Yêu cầu chơi với máy là yêu cầu mới của chủ dự án và **ghi đè ràng buộc cũ trong `CLAUDE_REVIEW.md` cấm AI đối thủ**. Không được xóa chế độ này.

Không có tài khoản/mật khẩu, chat, thanh toán, quảng cáo hoặc giao dịch giữa người chơi.

## Nội dung và giao diện đã có

- Bàn cờ 40 ô; 22 bất động sản thuộc đủ 13 tỉnh/thành ĐBSCL trong bộ dữ liệu.
- Sở hữu đủ bất động sản thuộc cùng tỉnh thì tiền thuê ô đó nhân đôi.
- Dữ liệu địa danh có icon, giới thiệu và màu nhóm theo tỉnh.
- Khung thông tin khi chạm ô; cảnh sông nước, khung bàn cờ và màu chủ đề miền Tây.
- Xúc xắc lăn, quân cờ nhảy từng ô, tiền bay, dấu sở hữu, pháo giấy khi thắng; tôn trọng `prefers-reduced-motion`.
- Đối thủ máy có chiến lược giữ tiền và ưu tiên hoàn thiện nhóm tỉnh; logic nằm trong `computer-player.js`.

## Kết quả kiểm thử mới nhất

- `npm run check`: đạt.
- `npm test`: **63/63** đạt.
- `npm run test:e2e`: **34/34** đạt ở GitHub Actions (hai trình duyệt Chromium + Firebase giả lập).
- E2E bao gồm tạo/tham gia phòng, từ chối người thứ ba, đồng bộ xúc xắc và tài sản, hiệu ứng quân cờ, chế độ chơi với máy, và viewport 390px/360px.
- Chưa phải kiểm thử Firebase Emulator hay hai điện thoại thật.
- E2E đã phát hiện và sửa lỗi focus/scroll khi chuyển từ sảnh sang bàn cờ: nút xúc xắc từng bị nằm phía trên viewport trên Android 360px. `showGameView()` trong `app.js` làm mờ nút sảnh đang focus và đưa trang về đầu trước khi hiển thị game.

## Quy tắc khi sửa

- Sau mỗi lần sửa `app.js` hoặc `style.css`, tăng query version ở hai thẻ CSS/JS trong `index.html`.
- Dữ liệu từ database phải qua `escapeHtml()`, `safeColor()` hoặc `Number()` trước khi đưa vào HTML.
- Giữ đúng 40 ô và không đổi thứ tự index vì `propertyOwners` dùng khóa `s0`.. `s39`.
- Đổi cấu trúc dữ liệu phòng phải cập nhật `firebase-database.rules.json` và `tests/rules.test.js`.
- Mọi thay đổi hành vi nên có unit test hoặc E2E; workflow `.github/workflows/validate.yml` đã chạy cả npm test và Playwright E2E.

## Lệnh kiểm thử

```bash
npm run check
npm test
npm install --no-save playwright
npx playwright install chromium
npm run test:e2e
```

## Việc nên làm tiếp

1. Kiểm thử online trên hai điện thoại với Firebase thật sau khi merge vào nhánh xuất bản.
2. Xem lại ảnh chụp mobile (390px, 360px) sau mỗi thay đổi lớn.
3. Thêm hộp thoại/thẻ trực quan khi rút Cơ hội (hiện nội dung ở khung Hành động).
4. Cân nhắc nút “Chơi lại” khi ván kết thúc.
5. Âm thanh xúc xắc/mua đất/thắng có nút tắt, mặc định tắt.
6. Dọn phòng cũ; báo người còn lại khi một người rời phòng giữa ván.
7. Chống gian lận cần Cloud Functions vì client hiện tự tính tiền/xúc xắc.

## Cập nhật: bàn cờ 3D, công trình, quân con vật (nhánh feat/mekong-board-polish)
- Bàn cờ xem 3D xéo (nút "Xem phẳng/Xem 3D", mặc định phẳng trên điện thoại ≤800px). CSS ở cuối `style.css`.
- `board-art.js`: hình SVG công trình theo tên ô (`ART_BY_NAME`) và con vật theo màu quân (`animalFor`: xanh = 🐧, đỏ = 🐶). Không đổi dữ liệu database nên không cần đăng lại Rules.
- Đã bỏ nút "Kết thúc lượt": `scheduleAutoEnd()` tự gọi `endTurn()` sau ~2 giây khi đã tung xúc xắc và không còn việc chờ mua/bỏ qua.
- Xúc xắc có chấm thật, ném lên giữa bàn ở cả hai máy (`#diceStage`), quân nhảy cung với gợn sóng từng ô.
- Khi đổi CSS/JS nhớ tăng `?v=` trong `index.html` (hiện `iso8`).
