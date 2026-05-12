package com.example.TicketRush_backend.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.TicketRush_backend.entity.Event;
import com.example.TicketRush_backend.enums.EventStatus;

public interface EventRepository extends JpaRepository<Event, Long> {

    Page<Event> findByStatus(EventStatus status, Pageable pageable);

    Page<Event> findByStatusAndNameContainingIgnoreCase(EventStatus status, String name, Pageable pageable);

    Page<Event> findByNameContainingIgnoreCase(String name, Pageable pageable);

    /**
     * Autocomplete suggestions: ON_SALE events containing keyword, sorted by similarity.
     * Returns max 10 results, prioritizing events that start with keyword.
     */
    @Query("""
        SELECT e FROM Event e
        WHERE e.status = 'ON_SALE'
        AND LOWER(e.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        ORDER BY 
            CASE WHEN LOWER(e.name) LIKE LOWER(CONCAT(:keyword, '%')) THEN 0 ELSE 1 END,
            LENGTH(e.name),
            e.createdAt DESC
        LIMIT 10
    """)
    List<Event> findSuggestions(@Param("keyword") String keyword);
}
