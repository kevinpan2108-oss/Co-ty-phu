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

## Chơi online hai người

Firebase đã được cấu hình sẵn trong game. Người chơi **không cần nhập Firebase Web App JSON**.

1. Mở link game trên cả hai thiết bị.
2. Người thứ nhất nhập tên và bấm **Tạo phòng mới**.
3. Chia sẻ mã phòng 6 ký tự cho người thứ hai.
4. Người thứ hai nhập mã đó và bấm **Tham gia**.

Game tự đăng nhập Anonymous và kết nối Realtime Database khi tải trang. Nếu không kết nối được, trạng thái lỗi sẽ hiện ngay trên màn hình chính; không có hộp thoại cấu hình thủ công.

**Quản trị dự án:** Authentication → Anonymous phải được bật và Realtime Database phải được tạo. Rules đang dùng nằm trong [firebase-database.rules.json](./firebase-database.rules.json); cần Publish file này trong Firebase Console. Đây là MVP chơi với bạn bè, chưa phải hệ thống chống gian lận.

### Khắc phục lỗi kết nối

Khi mở game, góc trên phải phải hiện **Đã kết nối**. Nếu không, thông báo ở sảnh nêu nguyên nhân kèm mã lỗi Firebase (bấm vào huy hiệu kết nối hoặc nút Tạo/Tham gia để thử lại):

| Thông báo | Cách xử lý |
| --- | --- |
| `apiKey Firebase không đúng` (`auth/api-key-not-valid`) | `apiKey` trong `DEFAULT_FIREBASE_CONFIG` (`app.js`) sai ký tự. **Sao chép dạng văn bản** từ Firebase Console → Project settings → General → Your apps; không gõ lại từ ảnh chụp vì dễ nhầm `I`/`l`, `w`/`W`, `q`/`g`, `f`/`F`. |
| `Chưa bật đăng nhập Ẩn danh` (`auth/operation-not-allowed`) | Authentication → Sign-in method → **Anonymous** → Enable. |
| `Firebase Rules từ chối thao tác` | Realtime Database → Rules → dán nội dung `firebase-database.rules.json` → **Publish**. |
| `apiKey đang bị giới hạn tên miền` | Google Cloud Console → APIs & Services → Credentials → API key → thêm tên miền GitHub Pages của game vào *Website restrictions*. |

Để thử nhanh một `apiKey` khác mà không sửa code, mở game với `?apiKey=AIza...` ở cuối địa chỉ trang.

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
