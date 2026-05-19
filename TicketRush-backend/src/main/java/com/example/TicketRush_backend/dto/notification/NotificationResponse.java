package com.example.TicketRush_backend.dto.notification;

import java.time.Instant;

import com.example.TicketRush_backend.entity.AppNotification;
import com.example.TicketRush_backend.enums.NotificationType;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private String title;
    private String message;
    private String linkUrl;
    private Long eventId;
    private Long orderId;
    private boolean read;
    private Instant readAt;
    private Instant createdAt;

    public static NotificationResponse from(AppNotification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .linkUrl(n.getLinkUrl())
                .eventId(n.getEventId())
                .orderId(n.getOrderId())
                .read(n.getReadAt() != null)
                .readAt(n.getReadAt())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
