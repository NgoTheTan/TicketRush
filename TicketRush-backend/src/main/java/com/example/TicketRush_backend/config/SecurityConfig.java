package com.example.TicketRush_backend.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.example.TicketRush_backend.security.JwtAuthFilter;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOriginsRaw;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/v1/auth/login",
                    "/api/v1/auth/register"
                ).permitAll()

                .requestMatchers(HttpMethod.GET, "/api/v1/events").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/events/*").permitAll()

                // Seat map + Sprint 2 customer actions
                .requestMatchers(HttpMethod.GET, "/api/v1/events/*/seats").hasRole("CUSTOMER")
                .requestMatchers(HttpMethod.POST, "/api/v1/events/*/seats/*/hold").hasRole("CUSTOMER")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/events/*/seats/*/hold").hasRole("CUSTOMER")
                .requestMatchers(HttpMethod.POST, "/api/v1/holds/*/release").hasRole("CUSTOMER")
                .requestMatchers(HttpMethod.POST, "/api/v1/orders").hasRole("CUSTOMER")
                .requestMatchers(HttpMethod.GET, "/api/v1/checkout/*/summary").hasRole("CUSTOMER")
                .requestMatchers(HttpMethod.POST, "/api/v1/checkout/*/confirm").hasRole("CUSTOMER")
                .requestMatchers("/api/v1/me/**").hasRole("CUSTOMER")
                .requestMatchers("/api/v1/auth/me").authenticated()

                // WebSocket handshake endpoint — SockJS (Sprint 3)
                .requestMatchers("/ws/**").permitAll()

                // Queue endpoints (Sprint 3)
                .requestMatchers(HttpMethod.GET, "/api/v1/queue/*/status").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/queue/*/join").hasRole("CUSTOMER")
                .requestMatchers(HttpMethod.GET, "/api/v1/queue/position/*").authenticated()

                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        List<String> origins = Arrays.asList(allowedOriginsRaw.split(","));
        config.setAllowedOrigins(origins.stream().map(String::trim).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
