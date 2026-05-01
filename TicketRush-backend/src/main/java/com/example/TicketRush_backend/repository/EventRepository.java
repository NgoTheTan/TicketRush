package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.Event;
import com.example.TicketRush_backend.enums.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRepository extends JpaRepository<Event, Long> {

    Page<Event> findByStatus(EventStatus status, Pageable pageable);

    Page<Event> findByStatusAndNameContainingIgnoreCase(EventStatus status, String name, Pageable pageable);

    Page<Event> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
