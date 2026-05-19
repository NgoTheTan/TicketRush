package com.example.TicketRush_backend.service;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.ticket.TicketResponse;
import com.example.TicketRush_backend.entity.Ticket;
import com.example.TicketRush_backend.enums.TicketStatus;
import com.example.TicketRush_backend.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;

    @Transactional(readOnly = true)
    public Page<TicketResponse> getMyTickets(Long userId, TicketStatus status, Pageable pageable) {
        Page<Ticket> page = status != null
                ? ticketRepository.findByUserIdAndStatus(userId, status, pageable)
                : ticketRepository.findByUserId(userId, pageable);
        return page.map(TicketResponse::from);
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getMyTicketsForEvent(Long userId, Long eventId) {
        return ticketRepository.findByUserIdAndEventIdOrderByIssuedAtDesc(userId, eventId)
                .stream()
                .map(TicketResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketDetail(Long ticketId, Long userId) {
        Ticket ticket = ticketRepository.findByIdAndUserId(ticketId, userId)
                .orElseThrow(() -> {
                    // Check if ticket exists at all to return correct error
                    if (ticketRepository.existsById(ticketId)) {
                        return new AppException(ErrorCode.TICKET_NOT_OWNED_BY_USER);
                    }
                    return new AppException(ErrorCode.TICKET_NOT_FOUND);
                });
        return TicketResponse.from(ticket);
    }
}
