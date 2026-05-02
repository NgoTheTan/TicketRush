package com.example.TicketRush_backend.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.TicketRush_backend.entity.EventSeat;
import com.example.TicketRush_backend.enums.SeatStatus;

import jakarta.persistence.LockModeType;

public interface EventSeatRepository extends JpaRepository<EventSeat, Long> {

    List<EventSeat> findByEventId(Long eventId);

    List<EventSeat> findByEventIdAndZoneId(Long eventId, Long zoneId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM EventSeat s WHERE s.id = :id")
    Optional<EventSeat> findByIdForUpdate(@Param("id") Long id);

    int countByEventIdAndHeldByIdAndStatus(
            Long eventId,
            Long userId,
            SeatStatus status
    );

    List<EventSeat> findByStatusAndHeldUntilBefore(
            SeatStatus status,
            Instant now
    );

    long countByEventIdAndStatus(Long eventId, SeatStatus status);
}