package com.webmessenger;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class WebMessengerApplication {
    public static void main(String[] args) {
        SpringApplication.run(WebMessengerApplication.class, args);
    }
}
