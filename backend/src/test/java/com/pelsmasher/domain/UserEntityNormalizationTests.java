package com.pelsmasher.domain;

import java.util.Locale;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class UserEntityNormalizationTests {

    private Locale originalLocale;

    @BeforeEach
    void switchToTurkishLocale() {
        originalLocale = Locale.getDefault();
        Locale.setDefault(Locale.forLanguageTag("tr-TR"));
    }

    @AfterEach
    void restoreLocale() {
        Locale.setDefault(originalLocale);
    }

    @Test
    void normalizeEmailIgnoresCaseAndSurroundingSpacesRegardlessOfServerLocale() {
        assertEquals("info@gym.com", UserEntity.normalizeEmail("  INFO@Gym.COM "));
    }

    @Test
    void normalizeUsernameIgnoresCaseRegardlessOfServerLocale() {
        assertEquals("iron", UserEntity.normalizeUsername(" IRON "));
    }
}
