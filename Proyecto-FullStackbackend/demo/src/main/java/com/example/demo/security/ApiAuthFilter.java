package com.example.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
public class ApiAuthFilter extends OncePerRequestFilter {
    private final JwtUtil jwt;
    public ApiAuthFilter(JwtUtil jwt) { this.jwt = jwt; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if ("http://localhost:4200".equals(request.getHeader("Origin"))) {
            response.setHeader("Access-Control-Allow-Origin", "http://localhost:4200");
            response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            response.addHeader("Vary", "Origin");
            if ("OPTIONS".equals(request.getMethod()) &&
                    request.getHeader("Access-Control-Request-Method") != null) {
                response.setStatus(HttpServletResponse.SC_NO_CONTENT);
                return;
            }
        }
        String path = request.getServletPath();
        if (!"OPTIONS".equals(request.getMethod()) && path.startsWith("/api/") &&
                !path.equals("/api/auth/login")) {
            String authorization = request.getHeader("Authorization");
            try {
                if (authorization == null || !authorization.startsWith("Bearer ") ||
                        jwt.extractUsername(authorization.substring(7)) == null) {
                    throw new IllegalArgumentException("Sesión requerida");
                }
            } catch (RuntimeException exception) {
                response.setStatus(401);
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
