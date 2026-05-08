package com.example.TicketRush_backend.dto.queue;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QueueStatusResponse {
    private Long eventId;
    private boolean queueActive;
    private long currentQueueLength;
    private long estimatedWaitMinutes;
}
