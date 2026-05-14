package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.Ticket;
import com.example.TicketRush_backend.enums.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    Page<Ticket> findByUserId(Long userId, Pageable pageable);

    Page<Ticket> findByUserIdAndStatus(Long userId, TicketStatus status, Pageable pageable);

    Optional<Ticket> findByIdAndUserId(Long id, Long userId);

    List<Ticket> findByEventId(Long eventId);
}
