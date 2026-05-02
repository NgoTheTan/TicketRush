package com.example.TicketRush_backend.dto.hold;

import com.example.TicketRush_backend.enums.HoldStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
public class ActiveHoldResponse {

    private Long holdId;
    private Long eventId;
    private HoldStatus status;
    private Instant expiresAt;
    private long remainingSeconds;
    private List<HoldResponse.HeldSeatDetail> selectedSeats;
    private BigDecimal totalAmount;
}
