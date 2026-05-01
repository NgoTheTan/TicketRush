package com.example.TicketRush_backend.dto.order;

import com.example.TicketRush_backend.entity.Order;
import com.example.TicketRush_backend.entity.OrderItem;
import com.example.TicketRush_backend.enums.OrderStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class OrderResponse {
    private Long orderId;
    private String orderCode;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private Instant createdAt;
    private Instant paidAt;
    private Instant expiresAt;
    private EventSummary event;
    private List<ItemDetail> items;
    private CustomerSummary customer;

    @Data @Builder
    public static class EventSummary {
        private Long id;
        private String name;
        private String venue;
        private Instant eventDate;
        private String imageUrl;
    }

    @Data @Builder
    public static class ItemDetail {
        private Long orderItemId;
        private String zoneName;
        private String rowLabel;
        private Integer seatNumber;
        private BigDecimal unitPrice;
        private TicketSummary ticket;
    }

    @Data @Builder
    public static class TicketSummary {
        private Long ticketId;
        private String ticketCode;
        private String status;
    }

    @Data @Builder
    public static class CustomerSummary {
        private String fullName;
        private String email;
        private String phone;
    }

    public static OrderResponse from(Order o) {
        return OrderResponse.builder()
                .orderId(o.getId())
                .orderCode(o.getOrderCode())
                .status(o.getStatus())
                .totalAmount(o.getTotalAmount())
                .createdAt(o.getCreatedAt())
                .paidAt(o.getPaidAt())
                .expiresAt(o.getExpiresAt())
                .event(EventSummary.builder()
                        .id(o.getEvent().getId())
                        .name(o.getEvent().getName())
                        .venue(o.getEvent().getVenue())
                        .eventDate(o.getEvent().getEventDate())
                        .imageUrl(o.getEvent().getImageUrl())
                        .build())
                .items(o.getItems().stream().map(OrderResponse::itemDetail).toList())
                .build();
    }

    private static ItemDetail itemDetail(OrderItem item) {
        var builder = ItemDetail.builder()
                .orderItemId(item.getId())
                .zoneName(item.getZoneName())
                .rowLabel(item.getRowLabel())
                .seatNumber(item.getSeatNumber())
                .unitPrice(item.getUnitPrice());

        if (item.getTicket() != null) {
            builder.ticket(TicketSummary.builder()
                    .ticketId(item.getTicket().getId())
                    .ticketCode(item.getTicket().getTicketCode().toString())
                    .status(item.getTicket().getStatus().name())
                    .build());
        }
        return builder.build();
    }
}
