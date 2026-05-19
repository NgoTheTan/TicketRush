package com.example.TicketRush_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.TicketRush_backend.entity.AppNotification;
import com.example.TicketRush_backend.enums.NotificationType;

public interface NotificationRepository extends JpaRepository<AppNotification, Long> {

    Page<AppNotification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);

    long countByRecipientIdAndReadAtIsNull(Long recipientId);

    Optional<AppNotification> findByIdAndRecipientId(Long id, Long recipientId);

    List<AppNotification> findByIdInAndRecipientId(List<Long> ids, Long recipientId);

    List<AppNotification> findByRecipientId(Long recipientId);

    List<AppNotification> findByRecipientIdAndReadAtIsNull(Long recipientId);

    boolean existsByRecipientIdAndTypeAndEventId(Long recipientId, NotificationType type, Long eventId);
}
