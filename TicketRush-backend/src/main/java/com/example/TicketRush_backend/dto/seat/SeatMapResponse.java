package com.example.TicketRush_backend.dto.seat;

import com.example.TicketRush_backend.enums.SeatStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
public class SeatMapResponse {

    private Long eventId;
    private List<ZoneMap> zones;

    @Data
    @Builder
    public static class ZoneMap {
        private Long zoneId;
        private String zoneName;
        private BigDecimal price;
        private String colorCode;
        private List<RowMap> rows;
    }

    @Data
    @Builder
    public static class RowMap {
        private String rowLabel;
        private List<SeatItem> seats;
    }

    @Data
    @Builder
    public static class SeatItem {
        private Long seatId;
        private Integer seatNumber;
        private SeatStatus status;
        // heldByMe: true nếu chính user đang giữ ghế này (phục vụ UI highlight)
        private boolean heldByMe;
    }
}
