package com.example.TicketRush_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import com.example.TicketRush_backend.config.StartupSchemaPatcher;

@SpringBootApplication
public class TicketRushBackendApplication {

	public static void main(String[] args) {
		SpringApplication application = new SpringApplication(TicketRushBackendApplication.class);
		application.addInitializers(new StartupSchemaPatcher());
		application.run(args);
	}

}
