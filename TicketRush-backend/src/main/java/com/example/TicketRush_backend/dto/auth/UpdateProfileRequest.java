package com.example.TicketRush_backend.dto.auth;

import com.example.TicketRush_backend.enums.Gender;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class UpdateProfileRequest {

    @Size(min = 2, max = 255, message = "Họ tên phải từ 2 đến 255 ký tự")
    private String fullName;

    @Pattern(regexp = "^[0-9]{10,11}$", message = "Số điện thoại không hợp lệ")
    private String phone;

    @Past(message = "Ngày sinh phải là ngày trong quá khứ")
    private LocalDate dateOfBirth;

    private Gender gender;

    /** Đổi mật khẩu — để null nếu không muốn đổi */
    @Size(min = 8, message = "Mật khẩu mới phải có ít nhất 8 ký tự")
    private String newPassword;

    /** Bắt buộc khi đổi mật khẩu — xác thực mật khẩu cũ */
    private String currentPassword;
}
