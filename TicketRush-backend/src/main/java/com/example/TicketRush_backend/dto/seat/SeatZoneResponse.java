package com.example.TicketRush_backend.dto.seat;

import com.example.TicketRush_backend.entity.SeatZone;
import com.example.TicketRush_backend.enums.SeatStatus;
import com.example.TicketRush_backend.repository.EventSeatRepository;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data @Builder
public class SeatZoneResponse {
    private Long zoneId;
    private String name;
    private BigDecimal price;
    private String colorCode;
    private Integer totalRows;
    private Integer seatsPerRow;
    private int totalSeats;
    private long availableSeats;
    private long soldSeats;
    private long lockedSeats;

    public static SeatZoneResponse from(SeatZone z, EventSeatRepository repo) {
        int total = z.getTotalRows() * z.getSeatsPerRow();
        return SeatZoneResponse.builder()
                .zoneId(z.getId())
                .name(z.getName())
                .price(z.getPrice())
                .colorCode(z.getColorCode())
                .totalRows(z.getTotalRows())
                .seatsPerRow(z.getSeatsPerRow())
                .totalSeats(total)
                .availableSeats(repo.countByEventIdAndStatus(z.getEvent().getId(), SeatStatus.AVAILABLE))
                .soldSeats(repo.countByEventIdAndStatus(z.getEvent().getId(), SeatStatus.SOLD))
                .lockedSeats(repo.countByEventIdAndStatus(z.getEvent().getId(), SeatStatus.LOCKED))
                .build();
    }
}
