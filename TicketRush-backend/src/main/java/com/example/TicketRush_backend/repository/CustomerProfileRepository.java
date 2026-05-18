package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.CustomerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, Long> {

    Optional<CustomerProfile> findByUserId(Long userId);

    // ── Sprint 4: Audience analytics ──────────────────────────

    /**
     * Phân tích tuổi khán giả theo nhóm cho một event.
     * Trả về Object[]{ageGroup (String), count (Long)}
     * BR-09: chỉ chính xác khi customer đã điền dateOfBirth.
     */
    @Query(value = """
        SELECT
            CASE
                WHEN EXTRACT(YEAR FROM AGE(cp.date_of_birth)) < 18  THEN 'Under 18'
                WHEN EXTRACT(YEAR FROM AGE(cp.date_of_birth)) <= 24 THEN '18-24'
                WHEN EXTRACT(YEAR FROM AGE(cp.date_of_birth)) <= 34 THEN '25-34'
                WHEN EXTRACT(YEAR FROM AGE(cp.date_of_birth)) <= 44 THEN '35-44'
                ELSE '45+'
            END AS age_group,
            COUNT(DISTINCT o.user_id) AS count
        FROM orders o
        JOIN customer_profiles cp ON cp.user_id = o.user_id
        WHERE o.event_id = :eventId
          AND o.status   = 'PAID'
          AND cp.date_of_birth IS NOT NULL
        GROUP BY age_group
        ORDER BY MIN(EXTRACT(YEAR FROM AGE(cp.date_of_birth)))
    """, nativeQuery = true)
    List<Object[]> findAudienceByAgeGroup(@Param("eventId") Long eventId);

    /**
     * Phân tích giới tính khán giả cho một event.
     * Trả về Object[]{gender (String), count (Long)}
     */
    @Query(value = """
        SELECT cp.gender::text AS gender,
               COUNT(DISTINCT o.user_id) AS count
        FROM orders o
        JOIN customer_profiles cp ON cp.user_id = o.user_id
        WHERE o.event_id = :eventId
          AND o.status   = 'PAID'
          AND cp.gender IS NOT NULL
        GROUP BY cp.gender
    """, nativeQuery = true)
    List<Object[]> findAudienceByGender(@Param("eventId") Long eventId);
}
