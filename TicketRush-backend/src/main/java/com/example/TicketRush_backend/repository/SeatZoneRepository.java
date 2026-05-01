package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.SeatZone;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SeatZoneRepository extends JpaRepository<SeatZone, Long> {
    List<SeatZone> findByEventId(Long eventId);
    void deleteByEventId(Long eventId);
}
