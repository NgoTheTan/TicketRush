package com.example.TicketRush_backend.dto.queue;

import lombok.Builder;
import lombok.Getter;
import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class JoinQueueResponse {
    private Long sessionId;
    private UUID queueToken;
    private int position;
    private long estimatedWaitSeconds;
    private Instant joinedAt;
}
