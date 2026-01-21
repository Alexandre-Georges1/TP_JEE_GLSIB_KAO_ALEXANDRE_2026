package egabank.api.devoir.service;

import egabank.api.devoir.entity.Compte;
import java.util.List;

public interface IcompteService {
    List<Compte> showCompte();
    public Compte getOneCompte(Long id);
    public Compte saveCompte(Compte compte);
    public void deleteCompte(Long id);
    public void deposer(Long id, Integer montant, String origineFonds);
    public void retirer(Long id, Integer montant);
    public void transferer(Long id, Integer montant, Long id2);
    public Compte updateCompte(Long id, Compte compteModifie);

}
