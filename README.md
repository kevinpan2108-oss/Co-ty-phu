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
- [ ] Kiểm thử thực tế hai thiết bị với Firebase project.
- [ ] Cân bằng luật, hoàn thiện giao dịch và xử lý tình huống phá sản.
- [ ] Review độc lập trước khi merge vào `main`.

## Chạy thử giao diện

Mở `index.html` bằng VS Code Live Server hoặc một static web server. Đây là ứng dụng JavaScript thuần, Firebase SDK được tải qua CDN.

## Bật chế độ online (cần Firebase)

1. Vào [Firebase Console](https://console.firebase.google.com/) và tạo một project.
2. Trong **Authentication → Sign-in method**, bật **Anonymous**.
3. Vào **Realtime Database → Create Database** và tạo database.
4. Mở tab **Rules** của Realtime Database, thay nội dung bằng file [firebase-database.rules.json](./firebase-database.rules.json), sau đó bấm **Publish**.
5. Vào **Project settings → General → Your apps**, đăng ký một Web App nếu chưa có, rồi sao chép Firebase Web App config.
6. Game đã được cấu hình sẵn Firebase Web App config trong `app.js`; khi mở trang, game tự kết nối và đăng nhập Anonymous. Không cần dán config thủ công.
7. Cả hai người chơi cần sử dụng cùng Firebase config; mỗi người tạo tài khoản Anonymous riêng tự động khi mở game.

**Lưu ý:** cấu hình Firebase Web App là thông tin client-side, không phải service-account key. Tuy nhiên database rules vẫn rất quan trọng. Rules hiện tại giới hạn thao tác ghi vào các phòng theo trạng thái thành viên, nhưng cả hai người chơi đều có thể sửa trạng thái phòng từ trình duyệt. Đây là MVP chơi vui với bạn bè, chưa phải hệ thống chống gian lận.

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
