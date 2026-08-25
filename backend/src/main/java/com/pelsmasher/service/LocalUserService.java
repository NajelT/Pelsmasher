package com.pelsmasher.service;

import com.pelsmasher.domain.UserEntity;
import com.pelsmasher.repository.AuthTokenRepository;
import com.pelsmasher.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class LocalUserService {

    public static final String LOCAL_USER_ID = "local-user";

    private final UserRepository users;
    private final AuthTokenRepository authTokens;

    public LocalUserService(
        UserRepository users,
        AuthTokenRepository authTokens
    ) {
        this.users = users;
        this.authTokens = authTokens;
    }

    @Transactional
    public UserEntity ensureLocalUser() {
        UserEntity authenticatedUser = findAuthenticatedUser();
        if (authenticatedUser != null) {
            return authenticatedUser;
        }

        return users.findById(LOCAL_USER_ID)
            .orElseGet(() -> users.save(new UserEntity(LOCAL_USER_ID, "Local User")));
    }

    private UserEntity findAuthenticatedUser() {
        ServletRequestAttributes attributes =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) return null;

        HttpServletRequest request = attributes.getRequest();
        if (request == null) return null;

        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }

        String rawToken = authorization.substring("Bearer ".length()).trim();
        if (rawToken.isBlank()) return null;

        return authTokens.findByTokenHashAndRevokedFalse(AuthService.hashToken(rawToken))
            .filter(token -> !token.isExpired())
            .map(token -> users.findById(token.getUser().getId()).orElse(null))
            .orElse(null);
    }
}
