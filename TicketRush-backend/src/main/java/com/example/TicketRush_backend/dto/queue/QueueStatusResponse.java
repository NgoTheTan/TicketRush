package com.example.TicketRush_backend.dto.queue;

import lombok.Builder;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
@Builder
public class QueueStatusResponse {
    private Long eventId; // null = system queue
    private boolean queueActive;
    private long currentQueueLength;
    private long estimatedWaitMinutes;
}
