package com.example.TicketRush_backend.dto.ws;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Payload gửi qua WebSocket topic /topic/admin/dashboard/{eventId}
 * Broadcast summary stats mỗi khi có thay đổi ghế hoặc order.
 */
@Getter
@Builder
public class DashboardUpdateMessage {

    private Long eventId;

    private long soldSeats;
    private long lockedSeats;
    private long availableSeats;
    private long totalSeats;

    private double fillRate;
    private BigDecimal totalRevenue;

    /** Số đơn hàng đang PENDING (chờ xử lý) */
    private long pendingOrders;

    @Builder.Default
    private Instant timestamp = Instant.now();
}
