package com.example.TicketRush_backend.dto.hold;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
public class HoldResponse {

    private Long holdId;
    private Instant expiresAt;
    private long remainingSeconds;

    /** Ghế vừa được hold/release trong request này */
    private HeldSeatDetail heldSeat;

    /** Toàn bộ ghế đang hold trong session này */
    private List<HeldSeatDetail> allSelectedSeats;

    private BigDecimal totalAmount;

    @Data
    @Builder
    public static class HeldSeatDetail {
        private Long seatId;
        private String zoneName;
        private String rowLabel;
        private Integer seatNumber;
        private BigDecimal price;
    }
}
