package egabank.api.devoir.controller;

import egabank.api.devoir.security.JwtUtil;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {
    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String password = payload.get("password");
        String role = null;

        if (username == null && "EGABANK2026".equals(password)) {
            role = "ADMIN";
            username = "admin";
        } else if (username != null && password != null && password.equals("CLIENT2026")) {
            role = "CLIENT";
        }

        if (role != null) {
            String token = JwtUtil.generateTokenWithRole(username, role);
            Map<String, String> response = new HashMap<>();
            response.put("token", token);
            response.put("role", role);
            return response;
        } else {
            throw new RuntimeException("Identifiants invalides");
        }
    }
}
