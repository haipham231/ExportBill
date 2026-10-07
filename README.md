# ExportBill — Tính tiền buổi dạy & xuất hóa đơn

Phần mềm nhỏ cho gia sư / giáo viên dạy thêm: khai báo **lịch cố định** của từng lớp,
phần mềm tự sinh các buổi dạy theo tháng, tính tiền và **xuất hóa đơn (PDF) hoặc CSV**.

Chạy hoàn toàn trong trình duyệt, không cần cài đặt, không cần mạng.
Dữ liệu lưu ngay trên máy (localStorage của trình duyệt).

## Cách chạy

Mở trực tiếp: nhấp đúp vào `index.html`.

Hoặc chạy qua máy chủ cục bộ (khuyến nghị — dữ liệu được giữ ổn định hơn):

```bash
python3 -m http.server 8787
```

rồi mở http://localhost:8787

> Nên dùng **một trình duyệt cố định** (VD: luôn mở bằng Chrome). Dữ liệu gắn với
> trình duyệt đó; mở bằng trình duyệt khác sẽ không thấy dữ liệu cũ.

## Dùng thế nào

1. **Cài đặt** — đã điền sẵn `NGUYEN THU HA`, `VPBank – 2420001013` và mã QR VietQR;
   bổ sung số điện thoại nếu muốn. Giá mặc định mỗi buổi: 500.000đ.
2. **Lớp học → + Thêm lớp** — đặt tên lớp, chọn các thứ trong tuần (VD: Thứ 2, Thứ 3),
   khung giờ (18:00–19:30) và giá mỗi buổi.
3. **Lịch & Hóa đơn** — chọn tháng, phần mềm tự liệt kê mọi buổi dạy và cộng tiền.

### Xuất hóa đơn

| Nút | Kết quả |
|---|---|
| 🧾 ở từng dòng | Hóa đơn riêng cho đúng một buổi |
| **Xuất bill các buổi đã chọn** | Gộp các buổi đã tick thành một hóa đơn |
| **Xuất bill riêng từng lớp** | Mỗi lớp một tờ hóa đơn (in ra là mỗi tờ một trang) |
| **Xuất bill cả tháng** | Một hóa đơn gồm toàn bộ buổi trong tháng |
| **CSV** | Bảng dữ liệu mở bằng Excel / Google Sheets |

Ở cửa sổ xem trước, bấm **In / Lưu PDF** → trong hộp thoại in chọn
*Đích đến: Lưu thành PDF* (Save as PDF).

### Thanh toán

Cuối mỗi hóa đơn có khối thanh toán gồm số tài khoản, số tiền phải trả và **mã QR VietQR**
để phụ huynh quét chuyển khoản.

Mã đang dùng (`assets/qr-vpbank.png`) là mã **tĩnh** của VPBank – 2420001013 – NGUYEN THU HA:
dùng lại được cho mọi tháng, không gắn sẵn số tiền nên phụ huynh tự nhập theo dòng
*Số tiền* in ngay cạnh mã.

Đổi sang tài khoản khác: **Cài đặt → Đổi ảnh QR** (ảnh dưới 1MB), và sửa lại dòng
*Thông tin thanh toán*. Không muốn in QR thì bấm **Bỏ QR khỏi bill**.

## Điều chỉnh từng buổi

- **Sửa giá một buổi** — gõ thẳng vào ô tiền trên dòng đó. Gõ tắt được: `500k`, `1tr2`, `1,5tr`.
  Buổi đã sửa có nhãn *Giá riêng*; bấm ⟲ để quay lại giá của lớp.
- **Nghỉ một buổi** — bấm ⊘. Buổi đó không tính tiền, vẫn được ghi chú ở cuối hóa đơn.
- **Dạy thêm / dạy bù** — nút **+ Buổi dạy thêm**, chọn ngày bất kỳ ngoài lịch cố định.
- **Lớp học theo giai đoạn** — đặt *Bắt đầu từ ngày* / *Kết thúc ngày* để lịch chỉ sinh
  trong khoảng đó. Lớp đã nghỉ hẳn thì bấm **Tạm ngưng**.

## Sao lưu

Dữ liệu nằm trong trình duyệt, nên **xoá lịch sử duyệt web có thể làm mất dữ liệu**.
Vào **Cài đặt → Tải file sao lưu** để lưu một file `.json`, và **Khôi phục từ file**
khi cần mang sang máy khác.

## Cấu trúc mã nguồn

```
index.html             giao diện
css/styles.css         giao diện + định dạng trang in
assets/qr-vpbank.png   mã QR VietQR in trên hóa đơn
js/utils.js            ngày tháng, tiền tệ, đọc số thành chữ
js/store.js            lưu trữ, sinh buổi dạy từ lịch cố định
js/invoice.js          dựng hóa đơn, xuất CSV
js/app.js              kết nối giao diện
```
