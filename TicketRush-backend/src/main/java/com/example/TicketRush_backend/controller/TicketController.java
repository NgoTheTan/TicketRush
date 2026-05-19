package com.example.TicketRush_backend.controller;

import com.example.TicketRush_backend.common.ApiResponse;
import com.example.TicketRush_backend.dto.ticket.TicketResponse;
import com.example.TicketRush_backend.enums.TicketStatus;
import com.example.TicketRush_backend.security.SecurityUtils;
import com.example.TicketRush_backend.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> myTickets(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Long userId = SecurityUtils.getCurrentUserId();
        Page<TicketResponse> result = ticketService.getMyTickets(
                userId, status, PageRequest.of(page, size, Sort.by("issuedAt").descending()));

        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), ApiResponse.PageMeta.of(result)));
    }

    @GetMapping("/my/events/{eventId}")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> myTicketsForEvent(@PathVariable Long eventId) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(ticketService.getMyTicketsForEvent(userId, eventId)));
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<ApiResponse<TicketResponse>> getTicket(@PathVariable Long ticketId) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(ticketService.getTicketDetail(ticketId, userId)));
    }
}
