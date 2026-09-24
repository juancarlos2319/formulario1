package com.example.demo.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {
    @Test void tokenDuraUnaHoraYConservaUsuario() {
        String secret = "test-only-secret-with-at-least-32-bytes";
        JwtUtil jwt = new JwtUtil();
        ReflectionTestUtils.setField(jwt, "secretKey", secret);
        String token = jwt.generateToken("admin");
        var claims = Jwts.parserBuilder().setSigningKey(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                .build().parseClaimsJws(token).getBody();
        assertEquals(3600000L, claims.getExpiration().getTime() - claims.getIssuedAt().getTime());
        assertEquals("admin", jwt.extractUsername(token));
    }
}
