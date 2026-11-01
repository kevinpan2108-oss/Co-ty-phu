# Cờ Tỷ Phú Miền Tây

Web game tiếng Việt với bàn cờ lấy cảm hứng từ Đồng bằng sông Cửu Long. Có hai cách chơi:

- **Chơi online 2 người:** tạo phòng, chia sẻ mã 6 ký tự và đồng bộ ván qua Firebase Realtime Database.
- **Chơi với máy:** đấu với đối thủ cục bộ “Máy Miền Tây”; không tạo phòng và không cần một người thứ hai.

## Nội dung và giao diện

- Bàn cờ 40 ô với địa danh thuộc đủ 13 tỉnh/thành ĐBSCL trong bộ dữ liệu game.
- 22 ô bất động sản, chia nhóm theo tỉnh; sở hữu toàn bộ ô của một tỉnh sẽ được nhân đôi tiền thuê.
- Khung thông tin ô: tên địa danh, giới thiệu, giá mua, tiền thuê và thưởng sở hữu trọn tỉnh.
- Phong cách miền Tây sông nước, cảnh hoàng hôn, khung bàn cờ và bảng màu riêng.
- Xúc xắc có hiệu ứng lăn; quân cờ di chuyển từng ô; hiệu ứng tiền, dấu chủ sở hữu và pháo giấy khi thắng.
- Tôn trọng cài đặt giảm chuyển động của thiết bị.

## Chơi online hai người

Firebase đã được cấu hình sẵn trong game. Người chơi **không cần nhập Firebase Web App JSON và không cần đăng nhập**.

1. Mở link game trên cả hai thiết bị.
2. Người thứ nhất nhập tên và bấm **Tạo phòng mới**.
3. Chia sẻ mã phòng 6 ký tự cho người thứ hai.
4. Người thứ hai nhập mã đó và bấm **Tham gia**.

Mỗi trình duyệt tự sinh một mã người chơi lưu trên máy và kết nối tới Realtime Database. Khi mở trang, góc trên phải phải hiện **Đã kết nối**.

**Quản trị Firebase:** cần Realtime Database được tạo và Rules được Publish. Rules nằm trong [firebase-database.rules.json](./firebase-database.rules.json). Vào Realtime Database → Rules → dán nội dung file → **Publish**. Phải Publish lại mỗi khi file này thay đổi.

**Giới hạn bảo mật:** đây là MVP chơi với bạn bè. Vì không dùng Firebase Authentication, Rules không thể xác minh danh tính thực của người ghi dữ liệu; ai biết mã phòng có thể đọc và sửa dữ liệu phòng đó, dù không thể liệt kê danh sách phòng. Không dùng cho dữ liệu nhạy cảm hoặc giải đấu có thưởng.

## Chơi với máy

Tại sảnh, nhập tên rồi chọn **Chơi với máy**. Bạn đi trước; máy tự tung xúc xắc, tự mua hoặc bỏ qua bất động sản theo chiến lược giữ tiền và ưu tiên hoàn thành nhóm tỉnh. Chế độ này chạy cục bộ trên thiết bị, không tạo phòng Firebase.

## Chạy thử và kiểm thử

Cần Node.js 22+.

```bash
npm run check
npm test
npm install --no-save playwright
npx playwright install chromium
npm run test:e2e
```

- Unit/smoke tests kiểm tra dữ liệu 40 ô, 13 tỉnh, tiền thuê, chiến lược máy, và mô phỏng Rules.
- E2E mở hai trình duyệt Chromium độc lập để kiểm tra luồng online giả lập, hiệu ứng, giao diện 390px/360px và chế độ chơi với máy.
- Bộ mô phỏng Rules không thay thế Firebase Emulator / Rules Playground. Chưa thể thay thế bước thử trực tiếp trên hai thiết bị với Firebase thật.

## Nhánh và phát hành

- Nhánh tính năng hiện tại: `feat/mekong-board-polish`.
- Nhánh nền online: `feat/online-mvp`.
- Không sửa trực tiếp `main` hoặc `feat/online-mvp`; mở Pull Request từ nhánh tính năng về `feat/online-mvp`.
- GitHub Pages hiện được cấu hình xuất bản bản thử nghiệm từ `feat/online-mvp`; vì vậy thay đổi trên nhánh tính năng chỉ lên link online sau khi được đưa vào nhánh xuất bản.
- Mỗi lần sửa `app.js` hoặc `style.css`, nhớ tăng query version ở hai thẻ CSS/JS trong `index.html` để tránh cache điện thoại.

## Công nghệ

- HTML, CSS, JavaScript ES Modules
- Firebase Realtime Database (chế độ online)
- GitHub Actions, Node.js tests và Playwright E2E
