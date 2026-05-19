package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.Ticket;
import com.example.TicketRush_backend.enums.EventStatus;
import com.example.TicketRush_backend.enums.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    Page<Ticket> findByUserId(Long userId, Pageable pageable);

    Page<Ticket> findByUserIdAndStatus(Long userId, TicketStatus status, Pageable pageable);

    Optional<Ticket> findByIdAndUserId(Long id, Long userId);

    List<Ticket> findByUserIdAndEventIdOrderByIssuedAtDesc(Long userId, Long eventId);

    List<Ticket> findByEventId(Long eventId);

    @Query("""
        SELECT DISTINCT t.user.id, t.event.id
        FROM Ticket t
        WHERE t.status = :ticketStatus
          AND t.event.status NOT IN :excludedStatuses
          AND t.event.eventDate > :now
          AND t.event.eventDate <= :latest
    """)
    List<Object[]> findValidTicketRecipientsForEventsBetween(
            @Param("ticketStatus") TicketStatus ticketStatus,
            @Param("excludedStatuses") Collection<EventStatus> excludedStatuses,
            @Param("now") Instant now,
            @Param("latest") Instant latest);
}
