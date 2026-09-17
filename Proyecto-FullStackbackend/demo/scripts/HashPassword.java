import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.Console;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/** Ejecutar desde una terminal con el classpath generado por Maven; ver README.md. */
class HashPassword {
    public static void main(String[] args) {
        Console console = System.console();
        if (console == null) {
            throw new IllegalStateException("Ejecuta esta utilidad desde una terminal interactiva");
        }
        char[] password = console.readPassword("Nueva contraseña: ");
        char[] confirmation = console.readPassword("Confirmar contraseña: ");
        try {
            if (password == null || confirmation == null || !Arrays.equals(password, confirmation)) {
                throw new IllegalArgumentException("Las contraseñas no coinciden");
            }
            String value = new String(password);
            if (value.isBlank() || value.length() < 12 || value.getBytes(StandardCharsets.UTF_8).length > 72) {
                throw new IllegalArgumentException("Usa al menos 12 caracteres y como máximo 72 bytes UTF-8");
            }
            System.out.println(new BCryptPasswordEncoder(12).encode(value));
        } finally {
            if (password != null) Arrays.fill(password, '\0');
            if (confirmation != null) Arrays.fill(confirmation, '\0');
        }
    }
}
