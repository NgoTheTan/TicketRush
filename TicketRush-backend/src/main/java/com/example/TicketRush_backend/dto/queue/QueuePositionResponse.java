package com.example.TicketRush_backend.dto.queue;

import com.example.TicketRush_backend.enums.QueueStatus;
import lombok.Builder;
import lombok.Getter;
import java.time.Instant;

@Getter
@Builder
public class QueuePositionResponse {
    /** WAITING | ADMITTED | CANCELLED | EXPIRED */
    private QueueStatus status;
    private int position;
    private long estimatedWaitSeconds;

    // Set khi status == ADMITTED
    private String accessToken;
    private Instant accessExpiresAt;
}
