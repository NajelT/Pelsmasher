package com.pelsmasher.service;

import com.pelsmasher.api.ApiDtos.AuthResponse;
import com.pelsmasher.api.ApiDtos.AuthUserResponse;
import com.pelsmasher.api.ApiDtos.LoginRequest;
import com.pelsmasher.api.ApiDtos.RegisterRequest;
import com.pelsmasher.domain.AuthTokenEntity;
import com.pelsmasher.domain.UserEntity;
import com.pelsmasher.repository.AuthTokenRepository;
import com.pelsmasher.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final AuthTokenRepository authTokens;
    private final SeedDataService seedDataService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(
        UserRepository users,
        AuthTokenRepository authTokens,
        SeedDataService seedDataService
    ) {
        this.users = users;
        this.authTokens = authTokens;
        this.seedDataService = seedDataService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = cleanEmail(request.email());
        String normalizedEmail = UserEntity.normalizeEmail(email);

        if (!email.contains("@")) {
            throw new IllegalArgumentException("Email is invalid");
        }
        if (request.password().length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }
        if (!request.password().equals(request.repeatPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }
        if (users.existsByNormalizedEmail(normalizedEmail)) {
            throw new IllegalArgumentException("Email is already registered");
        }

        UserEntity user = users.save(new UserEntity(
            UUID.randomUUID().toString(),
            email,
            passwordEncoder.encode(request.password())
        ));
        seedDataService.seedDefaultCatalogForUser(user.getId());

        return createAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = UserEntity.normalizeEmail(request.email());
        UserEntity user = users.findByNormalizedEmail(normalizedEmail)
            .orElseThrow(() -> new AuthenticationFailedException("Email or password is incorrect"));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AuthenticationFailedException("Email or password is incorrect");
        }

        return createAuthResponse(user);
    }

    private AuthResponse createAuthResponse(UserEntity user) {
        String rawToken = UUID.randomUUID() + "." + UUID.randomUUID();
        AuthTokenEntity token = new AuthTokenEntity(
            hashToken(rawToken),
            user.getId(),
            Instant.now().plus(30, ChronoUnit.DAYS)
        );
        authTokens.save(token);

        return new AuthResponse(rawToken, toUserResponse(user));
    }

    private AuthUserResponse toUserResponse(UserEntity user) {
        return new AuthUserResponse(user.getId(), user.getEmail(), user.getDisplayName());
    }

    private static String cleanEmail(String email) {
        return email == null ? "" : email.trim();
    }

    public static String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
