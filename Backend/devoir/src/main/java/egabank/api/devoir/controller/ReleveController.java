package egabank.api.devoir.controller;

import egabank.api.devoir.dto.ReleveDTO;
import egabank.api.devoir.service.ReleveService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/releves")
@CrossOrigin(origins = "*")
public class ReleveController {
    
    private final ReleveService releveService;
    
    public ReleveController(ReleveService releveService) {
        this.releveService = releveService;
    }
    
    @GetMapping("/compte/{compteId}")
    public ResponseEntity<ReleveDTO> obtenirDonneesReleve(
            @PathVariable Long compteId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin) {
        
        try {
            ReleveDTO releve = releveService.obtenirDonneesReleve(compteId, dateDebut, dateFin);
            return ResponseEntity.ok(releve);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    
    
    @GetMapping("/compte/{compteId}/pdf")
    public ResponseEntity<byte[]> telechargerRelevePdf(
            @PathVariable Long compteId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin) {
        
        try {
            byte[] pdf = releveService.genererRelevePdf(compteId, dateDebut, dateFin);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", 
                "releve_" + compteId + "_" + LocalDate.now() + ".pdf");
            headers.setContentLength(pdf.length);
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(pdf);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
