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
- Bàn cờ phẳng, sáng, tràn màn hình điện thoại (bản 3D đã bỏ vì khó nhìn); nút Tung xúc xắc dính đáy màn hình. CSS ở cuối `style.css`.
- `board-art.js`: hình SVG công trình theo tên ô (`ART_BY_NAME`) và con vật theo màu quân (`animalFor`: xanh = 🐧, đỏ = 🐶). Không đổi dữ liệu database nên không cần đăng lại Rules.
- Đã bỏ nút "Kết thúc lượt": `scheduleAutoEnd()` tự gọi `endTurn()` sau ~2 giây khi đã tung xúc xắc và không còn việc chờ mua/bỏ qua.
- Xúc xắc có chấm thật, ném lên giữa bàn ở cả hai máy (`#diceStage`), quân nhảy cung với gợn sóng từng ô.
- Khi đổi CSS/JS nhớ tăng `?v=` trong `index.html` (hiện `cell4`).

## Cập nhật: màn hình game toàn màn hình nằm ngang (kiểu Monopoly mobile)
- `#gameView` là lớp `position:fixed` phủ cả màn hình, bên trong `.stage`. Trên điện thoại cầm dọc, `.stage` tự xoay 90° bằng CSS; khi bấm Tạo phòng/Vào phòng/Chơi với máy sẽ thử `requestFullscreen` + khóa ngang (`enterGameScreen`).
- Bàn cờ 3D xéo (`rotateX(60deg) rotateZ(-45deg)`), kích thước tính theo `cqh/cqw` của `.stage`. Chữ + giá nằm trên mặt bàn, công trình và quân cờ là hình đứng (đối xoay ngược). Khối CSS cuối `style.css` bắt đầu bằng "Màn hình game kiểu Monopoly mobile".
- Thẻ người chơi ở hai góc trên, nút Tung xúc xắc ở góc dưới phải, Sổ đất / Mã phòng / Rời ở góc dưới trái; Sổ đất mở trong cửa sổ `#propsModal`.
- Xúc xắc là hai khối 3D lăn rồi dừng đúng mặt (`animateDice`, `CUBE_ROT`). Đừng đặt animation `transform` lên nút Tung xúc xắc vì Playwright coi là "không ổn định".
- `?v=` hiện là `land5`.


## Gameplay polish: mặt ô gọn, token nhỏ, xúc xắc ném, đấu giá
- Các ô không còn render SVG công trình nổi trên mặt bàn; tên và giá được ưu tiên. Quân chim cánh cụt/cún con thu nhỏ để giảm che chữ.
- Xúc xắc 3D có đường bay từ góc dưới phải vào giữa bàn; bỏ mảng sao trắng và viền ngoài ở từng mặt xúc xắc.
- Khi bỏ mua bến phà (station) hoặc công ty điện/nước (utility), mở đấu giá hai người: mỗi lượt tăng 100.000₫ hoặc bỏ lượt; ai cao nhất thắng, cả hai bỏ thì tài sản để trống. Máy Miền Tây cũng tự trả giá theo giới hạn ngân sách.
- firebase-database.rules.json bổ sung kiểm tra cấu trúc auction; dữ liệu phòng cũ không có trường auction vẫn tương thích.
- Query cache CSS/JS: auction1.


## Cập nhật: nhánh feat/monopoly-rules-camera (luật Monopoly + camera + Event Panel + giao diện kiểu Marmalade)
**Phải làm thủ công:** Publish lại `firebase-database.rules.json` trong Firebase Console (có trường mới: `doublesCount`, `extraRoll`, `eventSeq`, `event`, `log`, auction cho mọi tài sản). Phòng cũ vẫn tương thích (trường mới đều tùy chọn).
- Dữ liệu: `SPACE_DATA` giữ nguyên 40 chỉ số ô, nhưng `group/color/rent/houseCost` được chia lại thành 8 nhóm (ô 1,3 | 6,8,9 | 11,13,14 | 16,18,19 | 21,23,24 | 26,27,29 | 31,32,34 | 37,39). Không cần migration phòng.
- `economy.js`: thêm `doublesOutcome`, `jailRollOutcome`, `jailStatus`, `isAuctionable`, `cashSnapshot/cashDeltas`, `appendEventLog`. App: `rollDice`, `rollInJail`, `leaveJail`, `resolveLanding`, `sendToJail`, `recordEvent`.
- Trạng thái phòng mới: `doublesCount` (0-2), `extraRoll`, `event` (sự kiện của lượt hiện tại), `log` (≤20), `eventSeq`. `endTurn()` do người chơi bấm **Đã xem**; máy tự bấm sau ~1,8 giây. Đã bỏ `scheduleAutoEnd`.
- `camera.js`: `solveCamera` (thuần túy, có unit test), `createCamera`. Camera áp transform lên `.board-wrap` và đặt `--rx` (độ nghiêng) cho `.board`; đo toạ độ ô bằng `getBoundingClientRect` ở từng độ nghiêng rồi cache (`premeasure` khi vào ván, `invalidate` khi đổi cỡ). Mỗi hành trình có `seq` — hành trình mới nhất luôn thắng. Dữ liệu camera chỉ nằm trên `#stage[data-camera]`.
- Giao diện: khối CSS cuối `style.css` ("Giao diện kiểu Monopoly mobile"). Ô cờ có `.sp-face` xoay theo cạnh. `?v=` hiện là `mm2`.
- Lỗi phát hiện khi làm: người chơi thật trước đây không có nút Phá sản (chỉ máy gọi `declareBankruptcy`) — đã thêm vào Bảng sự kiện khi hết khả năng thanh lý.
- Kiểm thử đã chạy: `npm run check`, `npm test`, `npm run test:e2e` (Playwright, Firebase giả + Rules mô phỏng). **Chưa** kiểm thử hai điện thoại thật với Firebase thật, chưa chạy Firebase Emulator; cần làm trước khi phát hành.
- Chưa làm: rời phòng giữa ván vẫn chỉ thoát cục bộ (đối thủ không được báo); nhân vật/âm thanh ngoài phần đã mô tả.


## Làm lại giao diện theo mẫu Marmalade (mm3)
- Giữa bàn: thành phố 3D nhìn từ trên (SVG sinh bằng script, màu nhà khớp 8 nhóm), đường, ray, công viên, đài phun nước. Giữ SVG nhẹ (dùng pattern cửa sổ) vì SVG nặng làm camera E2E trễ.
- Tường rào gỗ nâu quanh bàn, ô xanh bạc hà, thẻ người chơi ruy băng mũi tên, banner tím "Đang bán", thẻ địa danh khung đôi nghiêng, thẻ Cơ hội/Khí vận trắng khung đen + linh vật Bác Ba.
- Chưa kiểm thử trên điện thoại thật.

## Cập nhật: thẻ mua đất gọn + chuyển lượt có nhịp nghỉ
- Thẻ "Đang bán" gọn: bảng giá ở trên, hàng dưới là số tiền + nút Mua/Bỏ qua (CSS khối mm15, không còn bị cắt đáy).
- Chuyển lượt: khi quyền chơi chuyển sang người khác, có nhịp nghỉ `HANDOFF_MS = 1500` rồi mới bật nút tung xí ngầu của người tiếp theo (`handoffUntil`/`turnGateUntil` trong app.js); máy cũng chờ cổng này. Tung thêm do đôi vẫn thuộc lượt hiện tại nên không bị chèn nhịp nghỉ.

## Cập nhật: quân cờ SVG + góc quay thấp
- Chim cánh cụt và cún con vẽ lại bằng SVG (hết emoji phụ thuộc máy), cùng phong cách với ghế nhựa/cà phê; đế màu người chơi to hơn (CSS mm16).
- Góc quay mới "Góc thấp" (nút 🎥 ở HUD, lưu trong localStorage `coTyPhu.cameraView`): `CAMERA_VIEWS` trong camera.js (nghiêng 64–67°, zoom 2.05–2.2×, neo quân thấp hơn). Không xoay bàn quanh trục Z vì chữ trên ô sẽ bị ngược.

## Cập nhật: đồ hoạ phong cách Việt Nam (mm17)
- Cảnh giữa bàn vẽ lại thành làng quê Cửu Long nhìn từ trên: sông + chợ nổi (ghe, nón lá, cây bẹo), cầu khỉ, nhà ngói/nhà lá, chùa Việt, chùa Khmer, ao sen, dừa/tre, sân trống đồng Đông Sơn ở tâm. SVG sinh bằng `python3 tools/gen-center-scene.py` (ghi đè `<svg class="city">` trong index.html; sửa script rồi chạy lại, đừng sửa tay).
- Thẻ/bảng: tông đỏ thẫm–vàng, hồi văn, thẻ Cơ hội (đỏ) / Khí vận (xanh lục) có hoa văn và ✿; banner "Đang bán" và thanh trạng thái đổi từ tím sang đỏ–vàng (CSS khối mm17).
- Chưa làm: nhà/khách sạn trên ô (nhà ngói/đình), viền bàn hoạ tiết trống đồng.

## Cập nhật: bỏ thanh thông báo đỏ + đổ bóng 3D (mm18)
- `#statusBar` giờ ẩn về mặt hình ảnh (vẫn giữ trong DOM, `role=status`, cho trình đọc màn hình và E2E); thông tin lượt đã có ở bảng sự kiện và nhãn giữa bàn.
- Ô cờ có cạnh dày xếp lớp bằng box-shadow, bàn cờ là khối gỗ dày có bóng đổ chéo, khu giữa lõm xuống, quân cờ có bóng tiếp đất và bóng đổ lệch.

## Cập nhật: giấy tờ đất kiểu Monopoly Marmalade (mm19)
- `deedHtml` (app.js) dựng thẻ giấy trắng khung đôi (`.deed.deed-paper` > `.deed-frame`): ô tên theo màu nhóm, một cột nhãn–giá, dòng "Giá mua" nổi xanh nhạt, biểu tượng nhà xanh có số và khách sạn đỏ, dòng "Xây nhà / Xây khách sạn" dưới đường kẻ.
- Panel mua/đấu giá không còn nền: thẻ nghiêng nhẹ bên trái, bong bóng giá (số tiền trừ + còn lại) và nút Mua/Bỏ qua xếp dọc bên phải, linh vật Bác Ba đứng góc dưới, ruy băng "Đang bán/Đấu giá" cắt ngang mép trên.
- Lưu ý CSS: các luật mm15 dùng `:has(.deed:not(.card-event))` nên khối mm19 phải dùng cùng độ ưu tiên (`.deed.deed-paper:not(.card-event)`).
