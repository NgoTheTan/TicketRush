package com.example.TicketRush_backend.dto.ws;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Payload gửi qua WebSocket topic /topic/admin/orders/{eventId}
 * Thông báo cho admin biết có order mới hoặc order thay đổi trạng thái.
 */
@Getter
@Builder
public class OrderUpdateMessage {

    /** ORDER_CREATED | ORDER_PAID | ORDER_CANCELLED | ORDER_EXPIRED */
    private String type;

    private Long orderId;
    private String orderCode;
    private Long eventId;
    private String eventName;

    /** PENDING | PAID | CANCELLED | EXPIRED */
    private String status;

    private BigDecimal totalAmount;
    private String customerName;
    private String customerEmail;
    private int ticketCount;

    @Builder.Default
    private Instant timestamp = Instant.now();
}
