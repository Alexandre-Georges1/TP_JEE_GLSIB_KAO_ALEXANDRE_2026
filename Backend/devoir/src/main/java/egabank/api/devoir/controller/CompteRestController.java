package egabank.api.devoir.controller;
import egabank.api.devoir.entity.Compte;

import egabank.api.devoir.service.IcompteService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class CompteRestController {
    private IcompteService compteService;
    public CompteRestController (IcompteService compteService) {
        this.compteService = compteService;
    }
    @GetMapping("/comptes")
    public List<Compte> listeCompte(){ return compteService.showCompte();}
    @GetMapping("comptes/{id}")
    public Compte getCompte(@PathVariable Long id){ return compteService.getOneCompte(id);}
    @PostMapping("/comptes")
    public Compte saveCompte( @Valid @RequestBody Compte compte){ return compteService.saveCompte(compte);}
    @PutMapping("/comptes/{id}")
    public Compte updateCompte(@PathVariable Long id, @Valid @RequestBody Compte compte){
        compte.setId(id);
        return compteService.updateCompte(id, compte);
    }
    @DeleteMapping("/comptes/{id}")
    public void deleteCompte(@PathVariable Long id) {
        compteService.deleteCompte(id);
    }
    @PostMapping("/comptes/{id}/deposer")
    public void deposer(@PathVariable Long id,  @RequestBody  Map<String, Object> body) {
        Integer montant = (Integer) body.get("montant");
        String origineFonds = (String) body.get("origineFonds");
        compteService.deposer(id, montant, origineFonds);
    }
    @PostMapping("/comptes/{id}/retirer")
    public void retirer(@PathVariable Long id,  @RequestBody  Map<String, Integer> body) {
        compteService.retirer(id, body.get("montant"));
    }
   @PostMapping("/comptes/{id}/transferer")
public void transferer(@PathVariable Long id, @RequestBody Map<String, Object> body) {
    Integer montant = (Integer) body.get("montant");
    Long id2 = ((Number) body.get("id")).longValue();
    compteService.transferer(id, montant, id2);
}
}
