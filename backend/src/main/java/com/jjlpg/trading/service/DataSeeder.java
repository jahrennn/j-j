package com.jjlpg.trading.service;

import com.jjlpg.trading.entity.User;
import com.jjlpg.trading.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements ApplicationRunner {

    @org.springframework.beans.factory.annotation.Value("${app.bootstrap.admin-password:admin123}")
    private String bootstrapPassword;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() == 0) {
            if (bootstrapPassword == null || bootstrapPassword.length() < 8) {
                throw new IllegalStateException("Set BOOTSTRAP_ADMIN_PASSWORD to initialize the first admin account");
            }
            User admin = new User();
            admin.setUsername("admin");
            admin.setPasswordHash(passwordEncoder.encode(bootstrapPassword));
            userRepository.save(admin);
        }
    }
}
