package com.example.TicketRush_backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.TicketRush_backend.common.ApiResponse;
import com.example.TicketRush_backend.dto.event.EventResponse;
import com.example.TicketRush_backend.service.EventService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<EventResponse>>> listEvents(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("eventDate").ascending());
        Page<EventResponse> result = eventService.listPublicEvents(search, pageable);

        return ResponseEntity.ok(ApiResponse.ok(result.getContent(),
                ApiResponse.PageMeta.of(result)));
    }

    @GetMapping("/suggest")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> suggestEvents(
            @RequestParam(required = false) String keyword) {
        List<Map<String, Object>> suggestions = eventService.suggestEvents(keyword);
        return ResponseEntity.ok(ApiResponse.ok(suggestions));
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventResponse>> getEvent(@PathVariable Long eventId) {
        return ResponseEntity.ok(ApiResponse.ok(eventService.getEventDetail(eventId)));
    }
}
