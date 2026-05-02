package com.example.TicketRush_backend.dto.ticket;

import com.example.TicketRush_backend.entity.Ticket;
import com.example.TicketRush_backend.enums.TicketStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder
public class TicketResponse {
    private Long ticketId;
    private String ticketCode;
    private TicketStatus status;
    private Instant issuedAt;
    private EventSummary event;
    private SeatDetail seat;
    private OrderSummary order;

    @Data @Builder
    public static class EventSummary {
        private Long id;
        private String name;
        private String description;
        private String venue;
        private Instant eventDate;
        private String imageUrl;
    }

    @Data @Builder
    public static class SeatDetail {
        private String zoneName;
        private String rowLabel;
        private Integer seatNumber;
        private BigDecimal price;
    }

    @Data @Builder
    public static class OrderSummary {
        private String orderCode;
        private Instant paidAt;
    }

    public static TicketResponse from(Ticket t) {
        var item = t.getOrderItem();
        var order = item.getOrder();

        return TicketResponse.builder()
                .ticketId(t.getId())
                .ticketCode(t.getTicketCode().toString())
                .status(t.getStatus())
                .issuedAt(t.getIssuedAt())
                .event(EventSummary.builder()
                        .id(t.getEvent().getId())
                        .name(t.getEvent().getName())
                        .description(t.getEvent().getDescription())
                        .venue(t.getEvent().getVenue())
                        .eventDate(t.getEvent().getEventDate())
                        .imageUrl(t.getEvent().getImageUrl())
                        .build())
                .seat(SeatDetail.builder()
                        .zoneName(item.getZoneName())
                        .rowLabel(item.getRowLabel())
                        .seatNumber(item.getSeatNumber())
                        .price(item.getUnitPrice())
                        .build())
                .order(OrderSummary.builder()
                        .orderCode(order.getOrderCode())
                        .paidAt(order.getPaidAt())
                        .build())
                .build();
    }
}
