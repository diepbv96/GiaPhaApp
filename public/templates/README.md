# Hướng dẫn dùng file mẫu nhập gia phả (`import-template.xlsx`)

File này dùng để nhập nhiều người và mối quan hệ vào cây gia phả cùng một lúc, thay vì
phải thêm từng người bằng tay. Chỉ tài khoản **Quản trị viên** hoặc **Biên tập viên**
mới có thể nhập file này (vào **"Nhập từ Excel"** trên trang chủ).

File mẫu có sẵn 18 người ví dụ, trải qua **4 đời** (ông bà tổ → con → cháu → chắt), minh
hoạ các trường hợp thường gặp:
- Một người có **hai vợ** (Bùi Văn Cha, Bùi Văn Con) và một người có **hai chồng**
  (Bùi Thị Út, tái hôn sau khi chồng đầu mất).
- Con gái lấy chồng ngoài dòng họ (Bùi Thị Cô + chồng) mà không cần khai thêm con cháu
  bên nhà chồng.
- Con cùng cha khác mẹ (Bùi Văn Em là con của kế mẫu, không cùng `Số thứ tự` với các con
  của vợ cả).

Bạn có thể xoá các dòng ví dụ và thay bằng dữ liệu thật của dòng họ mình.

## Cấu trúc file

Chỉ có **một sheet duy nhất**, tên là `CaThe`. Mỗi dòng là một người; mối quan hệ với
người khác được khai ngay trên dòng của người đó bằng các cột `Mã cha`, `Mã mẹ`,
`Mã vợ/chồng` — không cần sheet riêng cho mối quan hệ.

| Cột | Bắt buộc? | Ý nghĩa | Định dạng |
|---|---|---|---|
| `Mã số` | **Có** | Mã số tạm, tự đặt, chỉ dùng trong file này để các cột `Mã cha`/`Mã mẹ`/`Mã vợ/chồng` tham chiếu tới đúng người. Mỗi dòng phải có `Mã số` khác nhau (ví dụ: 1, 2, 3, ...). | Số hoặc chữ ngắn |
| `Họ tên` | **Có** | Họ và tên đầy đủ | Chữ |
| `Bí danh` | Không | Bí danh / tên gọi khác | Chữ |
| `Giới tính` | **Có** | Giới tính | Ghi đúng một trong ba giá trị: `Nam`, `Nữ`, hoặc `Không rõ` |
| `Ngày sinh` | Không | Ngày sinh | `YYYY-MM-DD` (VD: `1954-03-12`), hoặc `YYYY-MM` nếu chỉ biết tháng/năm, hoặc `YYYY` nếu chỉ biết năm. Để trống nếu không rõ. |
| `Đã mất` | Không | Còn sống hay đã mất | `Có`, `Không`, hoặc để trống. Nếu để trống: tự suy ra là `Có` khi có ghi `Ngày mất`, ngược lại là `Không`. |
| `Ngày mất` | Không | Ngày mất | Cùng định dạng như `Ngày sinh`. Chỉ được lưu khi `Đã mất` là `Có`. Để trống nếu còn sống hoặc không rõ. |
| `Ghi chú` | Không | Ghi chú | Chữ, **tối đa 100 ký tự** — dòng nào ghi dài hơn sẽ bị báo lỗi |
| `Số thứ tự` | Không | Số thứ tự giữa các anh/chị/em, theo cách gọi người Việt: **con cả là 2**, rồi 3, 4, 5... (không có "thứ nhất") | Số nguyên **từ 2 trở lên** (ghi "1" sẽ bị báo lỗi). Đây là số tự khai, **không** tự tính theo `Ngày sinh` — để trống nếu là con một hoặc không rõ thứ tự |
| `Mã cha` | Không | Mã số của cha (ở một dòng khác trong cùng file) | Phải khớp với một `Mã số` đã khai |
| `Mã mẹ` | Không | Mã số của mẹ (ở một dòng khác trong cùng file) | Phải khớp với một `Mã số` đã khai |
| `Mã vợ/chồng` | Không | Mã số của vợ/chồng. Ghi nhiều mã, ngăn cách bằng dấu phẩy, nếu người này có nhiều đời vợ/chồng (ví dụ: `4, 7`) | Phải khớp với `Mã số` đã khai. Chỉ cần khai ở một trong hai người — khai cả hai bên cũng không sao, hệ thống tự bỏ dòng trùng. |

**Anh/chị/em và con dâu/con rể không cần khai riêng** — hệ thống tự nhận biết: anh chị
em là những người có cùng `Mã cha`/`Mã mẹ`; con dâu/con rể là vợ/chồng của một người con
nhưng bản thân không có `Mã cha`/`Mã mẹ` trỏ tới cùng cặp cha mẹ đó.

**Lưu ý về trùng lặp**: nếu một dòng có `Họ tên` + `Ngày sinh` giống hoàn toàn với
một người đã có sẵn trong cây, hệ thống sẽ **không** tự nhập lại — dòng đó được đánh dấu
"Trùng lặp" để bạn kiểm tra lại sau khi nhập.

## Sau khi nhập

Hệ thống sẽ báo kết quả: bao nhiêu dòng (cá thể + mối quan hệ suy ra) thành công, bao
nhiêu lỗi (kèm lý do), và bao nhiêu bị đánh dấu trùng lặp. Các dòng hợp lệ vẫn được nhập
dù có dòng khác bị lỗi — bạn có thể sửa file và nhập lại riêng những dòng bị lỗi.
