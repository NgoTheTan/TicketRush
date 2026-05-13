# TicketRush - Nền tảng tạo sự kiện và đặt vé online

## Các thành viên và đóng góp
Nhật Triều <br>
Thế Tân <br>
Hoàng Nhân

## Giới thiệu chung


## Tính năng chính


## Công nghệ sử dụng


## Hướng dẫn chạy
### 1. Chạy backend:
+ Tải postgres -> Mở pgAdmin4, mở cột trái đến khi hiển thị connected server. Nếu là lần đầu mở lên, tạo dtb 'ems' chạy schema.sql và sửa application.properties theo username, password như khi bạn cài postgres (không được gõ thừa blank đằng sau chuỗi kí tự). 
+ Chạy terminal:
cd TicketRush-backend 
.\mvnw.cmd spring-boot:run

### 2. Chạy frontend:
Admin: cd TicketRush-admin => npm run dev => Mở http://localhost:5174/
Customer: cd TicketRush-frontend => npm install => npm run dev => Mở http://localhost:5173/
(Bạn không nên mở 2 link trên trong cùng 1 tài khoản chrome, và nên đăng xuất sau khi sử dụng)

## Ảnh giao diện và ghi chú khác

