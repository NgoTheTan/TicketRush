package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    @Override
    @EntityGraph(attributePaths = "profile")
    Optional<User> findById(Long id);

    @EntityGraph(attributePaths = "profile")
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
