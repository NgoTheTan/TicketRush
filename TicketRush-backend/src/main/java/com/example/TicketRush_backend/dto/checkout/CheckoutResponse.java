package com.example.TicketRush_backend.dto.checkout;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
public class CheckoutResponse {

    private OrderDetail order;
    private List<TicketDetail> tickets;

    @Data
    @Builder
    public static class OrderDetail {
        private Long orderId;
        private String orderCode;
        private String status;
        private BigDecimal totalAmount;
        private Instant paidAt;
        private EventSummary event;
    }

    @Data
    @Builder
    public static class EventSummary {
        private Long id;
        private String name;
        private String venue;
        private Instant eventDate;
    }

    @Data
    @Builder
    public static class TicketDetail {
        private Long ticketId;
        private String ticketCode;    // UUID — QR code payload
        private String zoneName;
        private String rowLabel;
        private Integer seatNumber;
        private String status;
        private Instant issuedAt;
    }
}
