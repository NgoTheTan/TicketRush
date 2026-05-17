# TicketRush - Nền tảng tạo sự kiện và đặt vé online

## Các thành viên và đóng góp
23021740 - Triều: Backend <br>
Tân: Admin <br>
Nhân: Customer

## Giới thiệu chung


## Tính năng chính


## Công nghệ sử dụng


## Hướng dẫn chạy
### 1. Chạy backend:
+ Tải postgres -> Mở pgAdmin4, mở cột trái đến khi hiển thị connected server. Nếu là lần đầu mở lên, tạo dtb 'ems' chạy schema.sql và sửa application.properties theo username, password như khi bạn cài postgres (không được gõ thừa blank đằng sau chuỗi kí tự). 
+ Nếu muốn gửi OTP qua Resend: copy `TicketRush-backend/.env.example` thành `TicketRush-backend/.env`, đặt `RESEND_API_KEY` bằng API key của Resend và chỉnh `MAIL_FROM`. Khi chưa có `RESEND_API_KEY`, backend sẽ log OTP trong terminal để dev local.
+ Chạy terminal:
cd TicketRush-backend 
.\mvnw.cmd spring-boot:run

### 2. Chạy frontend:
Admin: cd TicketRush-admin => npm run dev => Mở http://localhost:5174/ <br>
Customer: cd TicketRush-frontend => npm install => npm run dev => Mở http://localhost:5173/ <br>
(Bạn không nên mở 2 link trên trong cùng 1 tài khoản chrome, và nên đăng xuất sau khi sử dụng) <br>

## Ảnh giao diện và ghi chú khác

