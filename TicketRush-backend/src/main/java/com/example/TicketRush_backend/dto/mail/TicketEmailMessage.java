package com.example.TicketRush_backend.dto.mail;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record TicketEmailMessage(
        String recipientEmail,
        String customerName,
        String orderCode,
        BigDecimal totalAmount,
        String eventName,
        String venue,
        Instant eventDate,
        List<TicketInfo> tickets
) {
    public record TicketInfo(
            Long ticketId,
            String ticketCode,
            String zoneName,
            String rowLabel,
            Integer seatNumber,
            BigDecimal price
    ) {
    }
}
