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
2. **Lớp học → + Thêm lớp** — đặt tên lớp rồi chọn các thứ trong tuần. Mỗi thứ chọn xong
   sẽ hiện một dòng riêng để đặt **khung giờ và giá cho đúng thứ đó**:

   | | | |
   |---|---|---|
   | Thứ 2 | 18:00 – 19:30 | 500.000đ |
   | Thứ 3 | 08:00 – 10:00 | 700.000đ |

   Ô giá để trống thì lấy *Giá mặc định mỗi buổi* của lớp. Bấm **＋** ở cuối dòng để thêm
   ca thứ hai trong cùng một thứ (VD: thứ 7 học cả sáng lẫn chiều).
3. **Lịch & Hóa đơn** — chọn tháng, phần mềm tự liệt kê mọi buổi dạy và cộng tiền.

### Xuất hóa đơn

| Nút | Kết quả |
|---|---|
| 🧾 ở từng dòng | Hóa đơn riêng cho đúng một buổi |
| **Xuất bill các buổi đã chọn** | Gộp các buổi đã tick thành một hóa đơn |
| **Xuất bill riêng từng lớp** | Mỗi lớp một tờ hóa đơn (in ra là mỗi tờ một trang) |
| **Xuất bill cả tháng** | Một hóa đơn gồm toàn bộ buổi trong tháng |
| **Nhiều tháng…** | Chọn nhiều tháng bất kỳ rồi xuất chung (xem bên dưới) |
| **CSV** | Bảng dữ liệu mở bằng Excel / Google Sheets |

Ở cửa sổ xem trước, bấm **In / Lưu PDF** → trong hộp thoại in chọn
*Đích đến: Lưu thành PDF* (Save as PDF).

## Nhận xét cho bé

Hai mức, đều in kèm ở cuối hóa đơn:

- **Từng buổi** — bấm nút **💬 Nhận xét** ở cuối dòng buổi đó. Nhận xét hiện ngay dưới tên lớp trong lịch,
  và lên hóa đơn thành một dòng kèm ngày học. Buổi đã báo nghỉ thì nhận xét không in ra.
- **Cả tháng** — nút **✍️ Nhận xét tháng** trên thanh công cụ: chọn lớp, chọn *Xếp loại*
  (Tốt / Khá / Trung bình / Cần cố gắng — bấm lại để bỏ chọn) và viết nhận xét chung.
  Mỗi lớp mỗi tháng một nhận xét riêng.

Ở cửa sổ xem trước có ô **Kèm nhận xét** để bật/tắt trước khi in — tiện khi chỉ muốn gửi
riêng phần tiền. Hóa đơn gộp nhiều lớp thì không in nhận xét chung của tháng (vì mỗi lớp
một nhận xét khác nhau), nhưng nhận xét từng buổi vẫn theo đúng buổi của nó.

### Xuất nhiều tháng một lần

Bấm **Nhiều tháng…** để mở bảng chọn:

- Chọn **bao nhiêu tháng cũng được và không cần liền nhau** — ví dụ tháng 7 và tháng 9.
- **Chấm xanh** trên ô tháng = tháng đó có buổi học. Đổi năm bằng `‹ ›`, các tháng đã chọn
  ở năm khác vẫn được giữ.
- **Tháng không có buổi học vẫn chọn và xuất được.** Trên hóa đơn, tháng đó hiện thành một
  mục riêng ghi *"Tháng này không có buổi học nào."*, còn tháng có buổi thì vẫn là bảng
  chi tiết như thường.

Hai kiểu xuất:

| Kiểu | Kết quả |
|---|---|
| **Gộp 1 hóa đơn** | Một tờ, mỗi tháng một mục có dòng *Cộng tháng* riêng, cuối cùng là *Tổng cộng* của tất cả các tháng |
| **Mỗi tháng 1 tờ** | Mỗi tháng một hóa đơn riêng, in ra là mỗi tháng một trang |

Nhận xét của giáo viên cũng tách theo từng tháng trên hóa đơn gộp.

### Thanh toán

Cuối mỗi hóa đơn có khối thanh toán gồm số tài khoản, số tiền phải trả và **mã QR VietQR**
để phụ huynh quét chuyển khoản.

Mã đang dùng (`assets/qr-vpbank.png`) là mã **tĩnh** của VPBank – 2420001013 – NGUYEN THU HA:
dùng lại được cho mọi tháng, không gắn sẵn số tiền nên phụ huynh tự nhập theo dòng
*Số tiền* in ngay cạnh mã.

Đổi sang tài khoản khác: **Cài đặt → Đổi ảnh QR** (ảnh dưới 1MB), và sửa lại dòng
*Thông tin thanh toán*. Không muốn in QR thì bấm **Bỏ QR khỏi bill**.

## Điều chỉnh từng buổi

Mỗi dòng trong tab **Lịch & Hóa đơn** đều sửa trực tiếp được — không cần mở hộp thoại nào.

- **Đổi giờ một buổi** — gõ thẳng vào hai ô giờ. Hiểu cả `8h`, `18h30`, `7:30`.
  Buổi lệch lịch cố định có nhãn *Giờ riêng*, và số giờ bên dưới tên lớp tự tính lại.
- **Đổi giá một buổi** — gõ vào ô tiền. Gõ tắt được: `500k`, `1tr2`, `1,5tr`.
  Buổi đã sửa có nhãn *Giá riêng*.
- **Bỏ chỉnh riêng** — bấm ⟲ để buổi đó quay về đúng giờ và giá của lớp.
- **Nghỉ một buổi** — bấm ⊘. Buổi đó không tính tiền, vẫn được ghi chú ở cuối hóa đơn.
- **Lớp học theo giai đoạn** — đặt *Bắt đầu từ ngày* / *Kết thúc ngày* để lịch chỉ sinh
  trong khoảng đó. Lớp đã nghỉ hẳn thì bấm **Tạm ngưng**.

### Nhiều ca trong một ngày

Hai cách, tuỳ việc nó lặp lại hay chỉ một lần:

- **Lặp hàng tuần** — vào *Lớp học → Sửa*, bấm **＋** ở dòng của thứ đó để thêm ca thứ hai.
- **Chỉ một lần** — bấm **+ thêm giờ** ở tiêu đề ngày trong tab *Lịch & Hóa đơn*. Giờ bắt đầu
  được gợi ý nối tiếp ca trước, dài bằng ca thường, và đặt giá riêng được.

Ngày có từ hai ca trở lên sẽ được đánh số **Ca 1/2**, **Ca 2/2**… cả trên màn hình lẫn
trên hóa đơn, nên phụ huynh nhìn là biết ngày đó học mấy ca, mỗi ca từ mấy giờ tới mấy
giờ và bao nhiêu tiền. Chân bảng hóa đơn ghi cả *Tổng số buổi* và *Tổng số giờ*.

Nút **+ Ca dạy thêm** ở thanh trên cùng làm việc tương tự nhưng cho ngày bất kỳ
(tiện khi dạy bù vào ngày không có trong lịch cố định).

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
