package com.example.TicketRush_backend.dto.ws;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

/**
 * Payload gửi qua WebSocket topic /topic/seats/{eventId}
 * Tương thích với SeatUpdateEvent đang được frontend expect.
 */
@Getter
@Builder
public class SeatUpdateMessage {

    /** SEAT_LOCKED | SEAT_AVAILABLE | SEAT_SOLD */
    private String type;

    private Long eventId;
    private Long seatId;

    /** LOCKED | AVAILABLE | SOLD */
    private String status;

    @Builder.Default
    private Instant timestamp = Instant.now();
}
