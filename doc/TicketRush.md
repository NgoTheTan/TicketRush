1. Tên dự án - TicketRush
Hệ thống đặt vé online.

2. Mô tả Tổng quan
TicketRush là nền tảng phân phối vé điện tử do một Đơn vị tổ chức sự kiện tự xây dựng và
vận hành. Hệ thống cho phép đơn vị này đăng tải các sự kiện âm nhạc/giải trí, thiết lập sơ
đồ ghế ngồi trực quan và mở bán vé trực tuyến cho khán giả.
Trọng tâm của dự án là xây dựng một hệ thống có khả năng chịu tải tốt, xử lý chính xác tình
huống hàng ngàn người dùng cùng truy cập để giành được một số lượng vé giới hạn trong
một khoảng thời gian ngắn (flash sale).

3. Chức năng cho từng vai trò nghiệp vụ
Hệ thống gồm 2 vai trò nghiệp vụ:
● Customer (Khán giả):
○ Tìm kiếm, xem thông tin sự kiện và sơ đồ chỗ ngồi.

○ Chọn ghế, giữ chỗ (trong thời gian quy định) và thực hiện thanh toán.
○ Nhận và quản lý vé điện tử (QR Code).
● Admin (Chủ hệ thống kiêm Ban tổ chức): Có toàn quyền quản trị nền tảng.
○ Tạo mới sự kiện, cấu hình sơ đồ ghế (chia khu vực, gán giá tiền cho từng
loại ghế).
○ Theo dõi biến động doanh thu, tình trạng lấp đầy ghế theo thời gian thực
(Real-time Dashboard).
○ Thống kê khán giả theo độ tuổi, giới tính giúp ban tổ chức nắm được thị hiếu
của khách hàng.
4. Yêu cầu kỹ thuật
4.1. Trải nghiệm Sơ đồ ghế
● Frontend phải xây dựng được giao diện chọn ghế trực quan.
● Khi Admin thiết lập sự kiện, họ có thể khai báo một "Ma trận ghế" (Ví dụ: Khu A có
10 hàng, mỗi hàng 15 ghế). Khán giả click vào ghế để chọn.
● Giao diện tự động cập nhật trạng thái ghế (ví dụ: đang màu xanh chuyển sang màu
xám vì có người khác vừa giữ chỗ) mà không cần f5 lại trang (sử dụng Polling hoặc
WebSockets).
4.2. Tranh chấp Dữ liệu (Database Concurrency)
Đây là yêu cầu quan trọng đảm bảo một ghế không bán cho nhiều người:
● Bắt buộc áp dụng cơ chế Database Transaction / Row Locking khi xử lý hành động
"Click giữ ghế".
● Đảm bảo tuyệt đối không xảy ra "Race Condition": Nếu 2 người cùng click vào ghế
VIP-A1 lúc 09:00:00.001, chỉ 1 người được giữ ghế thành công.

4.3. Quản lý Vòng đời Vé
● Vé trải qua các trạng thái: Available -> Locked (Đang giữ chỗ để chờ thanh toán)
-> Sold (Đã thanh toán) / Released (Hết hạn giữ chỗ, nhả lại ra thị trường).
● Khán giả chỉ có 10 phút để thanh toán. Cần có một cơ chế (Cronjob hoặc
Background Worker) để quét và tự động "nhả" (release) các ghế đã quá thời gian
khóa mà chưa thanh toán.
● Lưu ý: KHÔNg phải làm chức năng thanh toán thật (liên thông với một cổng thanh
toán nào đó). Chức năng Thanh toán (Checkout) chỉ cần hiện ra đơn hàng (vé mua
thành công), bấm “XÁC NHẬN” thì coi như thanh toán thành công.
4.4. Thử thách Nâng cao: Hàng chờ Ảo (Virtual Queue)
Thiết kế thuật toán Virtual Queue:

● Khi lưu lượng truy cập đột biến vượt quá sức chịu đựng của Database, hệ thống
không bị sập mà tự động chuyển người dùng vào một trang "Phòng chờ" (Waiting
Room).
● Giao diện hiển thị: "Bạn đang ở vị trí thứ 105 trong hàng đợi. Vui lòng không tải lại
trang..."
● Hệ thống sẽ lần lượt cấp token/quyền truy cập đặt vé cho từng nhóm người dùng (ví
dụ 50 người/lượt) vào màn hình chọn ghế.
—----- Hết —----