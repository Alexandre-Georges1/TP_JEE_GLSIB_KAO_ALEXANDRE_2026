package egabank.api.devoir.service;


import egabank.api.devoir.entity.Compte;
import egabank.api.devoir.entity.Transaction;
import egabank.api.devoir.exception.SoldeInsuffisantException;
import egabank.api.devoir.repository.CompteRepository;
import egabank.api.devoir.repository.TransactionRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;


@Service
public class CompteService implements IcompteService {
    private final CompteRepository compteRepository;
    private final TransactionRepository transactionRepository;

    public CompteService(CompteRepository compteRepository, TransactionRepository transactionRepository) {
        this.compteRepository = compteRepository;
        this.transactionRepository = transactionRepository;
    }


    @Override
    public List<Compte> showCompte(){
        return compteRepository.findAll();
    }

    @Override
    public Compte saveCompte(Compte compte){
        if (compte.getNumeroCompte() == null || compte.getNumeroCompte().isEmpty()) {
            // Génération de compte à 11 chiffres aléatoires
            long min = 10000000000L;
            long max = 99999999999L;
            long randomNum = min + (long)(Math.random() * (max - min));
            compte.setNumeroCompte(String.valueOf(randomNum));
        }
        if (compte.getDateCreation() == null) {
            compte.setDateCreation(LocalDate.now());
        }
        if (compte.getSolde() == null) {
            compte.setSolde(0);
        }
        if (compte.getTypeCompte() != null) {
            compte.setTypeCompte(compte.getTypeCompte().toUpperCase());
        }

        if (compte.getClient() != null && compte.getClient().getNom() != null) {
            compte.getClient().setNom(compte.getClient().getNom().toUpperCase());
        }

        return compteRepository.save(compte);
    }

    @Override
    public Compte getOneCompte(Long id) {
        return compteRepository.findById(id).orElse(null);
    }
    @Override
    public void deleteCompte(Long id) {
        compteRepository.deleteById(id);
    }

    public void deposer(Long id, Integer montant) {
        Compte compte = compteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Compte introuvable"));

        if (montant == null || montant <= 0) {
            throw new IllegalArgumentException("Montant de dépôt invalide");
        }

        Integer soldeAvant = compte.getSolde();
        Integer soldeApres = soldeAvant + montant;

        compte.setSolde(soldeApres);
        compteRepository.save(compte);


        Transaction transaction = new Transaction(
                null,
                LocalDateTime.now(),
                "DEPOT",
                soldeAvant,
                soldeApres,
                montant,
                compte
        );
        transactionRepository.save(transaction);
    }


    public void retirer(Long id, Integer montant) {
        Compte compte = compteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Compte introuvable"));

        if (montant == null || montant <= 0) {
            throw new IllegalArgumentException("Montant invalide");
        }
        if (compte.getSolde() < montant) {
            throw new SoldeInsuffisantException("Solde insuffisant !");
        }

        Integer soldeAvant = compte.getSolde();
        Integer soldeApres = soldeAvant - montant;

        compte.setSolde(soldeApres);
        compteRepository.save(compte);

        Transaction transaction = new Transaction(
                null,
                LocalDateTime.now(),
                "RETRAIT",
                soldeAvant,
                soldeApres,
                montant,
                compte
        );
        transactionRepository.save(transaction);
    }

    @Transactional
    public void transferer(Long id, Integer montant, Long id2) {
        retirer(id, montant);
        deposer(id2, montant);
    }

    public Compte updateCompte(Long id, Compte compteModifie) {

        Compte compteExistant = compteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Compte introuvable"));
        if (compteModifie.getTypeCompte() != null) {
            compteExistant.setTypeCompte(compteModifie.getTypeCompte().toUpperCase());
        }
        if (compteModifie.getClient() != null) {
            compteExistant.setClient(compteModifie.getClient());
        }
        return compteRepository.save(compteExistant);
    }


}
