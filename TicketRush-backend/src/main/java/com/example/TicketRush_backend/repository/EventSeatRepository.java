package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.EventSeat;
import com.example.TicketRush_backend.enums.SeatStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface EventSeatRepository extends JpaRepository<EventSeat, Long> {

    List<EventSeat> findByEventId(Long eventId);

    List<EventSeat> findByEventIdAndZoneId(Long eventId, Long zoneId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM EventSeat s WHERE s.id = :id")
    Optional<EventSeat> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT COUNT(s) FROM EventSeat s WHERE s.event.id = :eventId AND s.heldBy.id = :userId AND s.status = 'LOCKED'")
    int countLockedByUserInEvent(@Param("eventId") Long eventId, @Param("userId") Long userId);

    @Query("SELECT s FROM EventSeat s WHERE s.status = 'LOCKED' AND s.heldUntil < :now")
    List<EventSeat> findExpiredLocks(@Param("now") Instant now);

    long countByEventIdAndStatus(Long eventId, SeatStatus status);
}
