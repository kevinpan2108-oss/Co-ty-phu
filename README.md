# Cờ Tỷ Phú Online

Web game giao dịch bất động sản bằng tiếng Việt, dành cho **2 người chơi online trong cùng một phòng**.

## Trạng thái MVP

Đang phát triển trên nhánh `feat/online-mvp`.

- [x] Giao diện responsive cho màn hình máy tính và điện thoại.
- [x] Tạo phòng 6 ký tự / tham gia phòng bằng mã.
- [x] Đồng bộ phòng và trạng thái lượt chơi bằng Firebase Realtime Database.
- [x] Bàn cờ 40 ô, xúc xắc, nhận lương khi qua Xuất phát.
- [x] Mua đất, trả tiền thuê, thuế, thẻ Cơ hội, nhà tù.
- [x] Workflow triển khai GitHub Pages.
- [x] Chế độ chơi đơn với máy: máy tự tung xúc xắc, xử lý lượt và cân nhắc mua tài sản.
- [ ] Kiểm thử thực tế hai thiết bị với Firebase project.
- [ ] Cân bằng luật, hoàn thiện giao dịch và xử lý tình huống phá sản.
- [ ] Review độc lập trước khi merge vào `main`.

## Chạy thử giao diện

Mở `index.html` bằng VS Code Live Server hoặc một static web server. Đây là ứng dụng JavaScript thuần, Firebase SDK được tải qua CDN.

## Chơi online hai người

Firebase đã được cấu hình sẵn trong game. Người chơi **không cần nhập Firebase Web App JSON**.

1. Mở link game trên cả hai thiết bị.
2. Người thứ nhất nhập tên và bấm **Tạo phòng mới**.
3. Chia sẻ mã phòng 6 ký tự cho người thứ hai.
4. Người thứ hai nhập mã đó và bấm **Tham gia**.

Game **không cần đăng nhập và không cần bật Authentication**: mỗi trình duyệt tự sinh một mã người chơi lưu trên máy và chỉ kết nối tới Realtime Database. Khi mở trang, góc trên phải phải hiện **Đã kết nối**.

**Quản trị dự án:** chỉ cần Realtime Database đã được tạo và Rules đã được Publish. Rules nằm trong [firebase-database.rules.json](./firebase-database.rules.json): vào Realtime Database → Rules → dán nội dung file → **Publish**. Phải Publish lại mỗi khi file này thay đổi, nếu không game báo "Firebase Rules từ chối thao tác".

**Giới hạn bảo mật (MVP chơi với bạn bè):** vì không đăng nhập nên Rules không biết ai đang ghi. Ai biết mã phòng 6 ký tự đều có thể đọc và sửa dữ liệu phòng đó (không liệt kê được danh sách phòng). Rules vẫn chặn: đổi người tạo/người vào, người thứ ba chiếm chỗ, mở lại ván đã kết thúc, giá trị ngoài phạm vi, mã HTML trong tên/màu. Không phải hệ thống chống gian lận.

### Khắc phục lỗi kết nối

| Thông báo | Cách xử lý |
| --- | --- |
| `Không kết nối được tới cơ sở dữ liệu của game` kèm tên máy chủ không truy cập được | Điện thoại/mạng đang chặn máy chủ database. Tắt VPN, ứng dụng chặn quảng cáo, DNS riêng (Cài đặt → Mạng → DNS riêng → Tắt/Tự động) hoặc đổi Wi-Fi/4G, rồi bấm vào chữ "Chưa kết nối" để thử lại. |
| `Firebase Rules từ chối thao tác` | Publish lại `firebase-database.rules.json` (xem trên). |
| `Không tìm thấy phòng` / `đã đủ 2 người` | Kiểm tra lại mã phòng; mỗi phòng chỉ nhận đúng 2 người. |

## Kiểm thử

```
npm run check   # kiểm tra cú pháp app.js
npm test        # smoke test + kiểm tra hành vi Firebase Rules (bộ mô phỏng tối giản)
```

Bộ mô phỏng Rules **không** thay thế Firebase Emulator / Rules Playground: hãy chạy thêm một trong hai trước khi phát hành.

## Deploy lên GitHub Pages

Workflow `.github/workflows/deploy.yml` tự deploy khi có push/merge vào `main`.

Để xuất bản bản thử nghiệm hiện tại mà chưa merge vào `main`:
1. Mở **Settings → Pages** trong repo.
2. Chọn **Source: Deploy from a branch**.
3. Chọn branch `feat/online-mvp` và folder `/(root)`, rồi nhấn **Save**.
4. GitHub Pages sẽ xuất bản trực tiếp `index.html` từ nhánh này. File `.nojekyll` đã được thêm để không xử lý mã nguồn JavaScript như trang Jekyll.

Khi game ổn định và được merge vào `main`, có thể chuyển nguồn xuất bản sang `main` hoặc quay lại **GitHub Actions**.

## Công nghệ

- HTML, CSS, JavaScript ES Modules
- Firebase Authentication (Anonymous)
- Firebase Realtime Database
- GitHub Actions + GitHub Pages
