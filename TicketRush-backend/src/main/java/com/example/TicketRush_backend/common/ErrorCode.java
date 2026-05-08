package com.example.TicketRush_backend.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // ── Auth (1xxx) ───────────────────────────────────────────
    AUTH_TOKEN_MISSING      (HttpStatus.UNAUTHORIZED,   "AUTH_TOKEN_MISSING",       "Token xác thực không được cung cấp"),
    AUTH_TOKEN_INVALID      (HttpStatus.UNAUTHORIZED,   "AUTH_TOKEN_INVALID",       "Token không hợp lệ hoặc đã bị giả mạo"),
    AUTH_TOKEN_EXPIRED      (HttpStatus.UNAUTHORIZED,   "AUTH_TOKEN_EXPIRED",       "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"),
    AUTH_INSUFFICIENT_ROLE  (HttpStatus.FORBIDDEN,      "AUTH_INSUFFICIENT_ROLE",   "Bạn không có quyền thực hiện thao tác này"),
    AUTH_EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT,      "AUTH_EMAIL_ALREADY_EXISTS","Email này đã được sử dụng"),
    AUTH_INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED,   "AUTH_INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng"),
    AUTH_USER_NOT_FOUND     (HttpStatus.NOT_FOUND,      "AUTH_USER_NOT_FOUND",      "Tài khoản không tồn tại"),

    // ── Event (2xxx) ──────────────────────────────────────────
    EVENT_NOT_FOUND                  (HttpStatus.NOT_FOUND,             "EVENT_NOT_FOUND",                   "Sự kiện không tồn tại"),
    EVENT_NOT_ON_SALE                (HttpStatus.UNPROCESSABLE_ENTITY,  "EVENT_NOT_ON_SALE",                 "Sự kiện này hiện không mở bán"),
    EVENT_INVALID_STATUS_TRANSITION  (HttpStatus.UNPROCESSABLE_ENTITY,  "EVENT_INVALID_STATUS_TRANSITION",   "Không thể chuyển trạng thái sự kiện theo cách này"),
    EVENT_HAS_ACTIVE_SEATS           (HttpStatus.UNPROCESSABLE_ENTITY,  "EVENT_HAS_ACTIVE_SEATS",            "Không thể thay đổi cấu hình khi đang có ghế được giữ/bán"),

    // ── Seat (3xxx) ───────────────────────────────────────────
    SEAT_NOT_FOUND           (HttpStatus.NOT_FOUND,            "SEAT_NOT_FOUND",           "Ghế không tồn tại"),
    SEAT_NOT_AVAILABLE       (HttpStatus.CONFLICT,             "SEAT_NOT_AVAILABLE",       "Ghế này vừa được người khác giữ, vui lòng chọn ghế khác"),
    SEAT_HOLD_LIMIT_EXCEEDED (HttpStatus.UNPROCESSABLE_ENTITY, "SEAT_HOLD_LIMIT_EXCEEDED", "Bạn chỉ có thể giữ tối đa 2 ghế mỗi lần đặt"),
    SEAT_NOT_OWNED_BY_USER   (HttpStatus.FORBIDDEN,            "SEAT_NOT_OWNED_BY_USER",   "Bạn không phải chủ sở hữu của ghế đang giữ này"),
    SEAT_ZONE_NOT_FOUND      (HttpStatus.NOT_FOUND,            "SEAT_ZONE_NOT_FOUND",      "Khu vực ghế không tồn tại"),
    SEAT_CONFIG_LOCKED       (HttpStatus.UNPROCESSABLE_ENTITY, "SEAT_CONFIG_LOCKED",       "Không thể thay đổi cấu hình ghế khi sự kiện đã mở bán"),

    // ── Hold (4xxx) ───────────────────────────────────────────
    HOLD_NOT_FOUND       (HttpStatus.NOT_FOUND,            "HOLD_NOT_FOUND",       "Phiên giữ ghế không tồn tại"),
    HOLD_EXPIRED         (HttpStatus.GONE,                  "HOLD_EXPIRED",         "Thời gian giữ ghế đã hết, vui lòng chọn lại"),
    HOLD_NOT_ACTIVE      (HttpStatus.UNPROCESSABLE_ENTITY,  "HOLD_NOT_ACTIVE",      "Phiên giữ ghế không còn hiệu lực"),
    HOLD_NOT_OWNED_BY_USER(HttpStatus.FORBIDDEN,            "HOLD_NOT_OWNED_BY_USER","Bạn không phải chủ sở hữu phiên giữ ghế này"),

    // ── Order (5xxx) ──────────────────────────────────────────
    ORDER_NOT_FOUND         (HttpStatus.NOT_FOUND,    "ORDER_NOT_FOUND",          "Đơn hàng không tồn tại"),
    ORDER_ALREADY_PAID      (HttpStatus.CONFLICT,     "ORDER_ALREADY_PAID",       "Đơn hàng này đã được thanh toán"),
    ORDER_EXPIRED           (HttpStatus.GONE,         "ORDER_EXPIRED",            "Đơn hàng đã hết hạn"),
    ORDER_ALREADY_CANCELLED (HttpStatus.CONFLICT,     "ORDER_ALREADY_CANCELLED",  "Đơn hàng đã bị hủy"),
    ORDER_NOT_OWNED_BY_USER (HttpStatus.FORBIDDEN,    "ORDER_NOT_OWNED_BY_USER",  "Bạn không có quyền truy cập đơn hàng này"),

    // ── Ticket (6xxx) ─────────────────────────────────────────
    TICKET_NOT_FOUND         (HttpStatus.NOT_FOUND, "TICKET_NOT_FOUND",         "Vé không tồn tại"),
    TICKET_NOT_OWNED_BY_USER (HttpStatus.FORBIDDEN, "TICKET_NOT_OWNED_BY_USER", "Vé này không thuộc về bạn"),


    // ── Queue (7xxx) ──────────────────────────────────────────────────────────
    QUEUE_SESSION_NOT_FOUND (HttpStatus.NOT_FOUND,            "QUEUE_SESSION_NOT_FOUND", "Phiên hàng chờ không tồn tại"),
    QUEUE_TOKEN_INVALID     (HttpStatus.UNAUTHORIZED,          "QUEUE_TOKEN_INVALID",     "Token hàng chờ không hợp lệ"),
    QUEUE_TOKEN_EXPIRED     (HttpStatus.GONE,                  "QUEUE_TOKEN_EXPIRED",     "Token hàng chờ đã hết hạn, vui lòng xếp hàng lại"),
    QUEUE_ALREADY_JOINED    (HttpStatus.CONFLICT,              "QUEUE_ALREADY_JOINED",    "Bạn đã có mặt trong hàng chờ của sự kiện này"),
    QUEUE_NOT_ACTIVE        (HttpStatus.UNPROCESSABLE_ENTITY,  "QUEUE_NOT_ACTIVE",        "Hàng chờ không kích hoạt cho sự kiện này"),

    // ── Validation (8xxx) ─────────────────────────────────────
    VALIDATION_FAILED    (HttpStatus.BAD_REQUEST, "VALIDATION_FAILED",   "Dữ liệu không hợp lệ"),
    INVALID_PAGE_PARAMS  (HttpStatus.BAD_REQUEST, "INVALID_PAGE_PARAMS", "Tham số phân trang không hợp lệ"),

    // ── System (9xxx) ─────────────────────────────────────────
    INTERNAL_SERVER_ERROR (HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "Đã có lỗi xảy ra, vui lòng thử lại sau"),
    SERVICE_UNAVAILABLE   (HttpStatus.SERVICE_UNAVAILABLE,   "SERVICE_UNAVAILABLE",   "Hệ thống đang bảo trì");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String code, String message) {
        this.httpStatus = httpStatus;
        this.code = code;
        this.message = message;
    }
}
