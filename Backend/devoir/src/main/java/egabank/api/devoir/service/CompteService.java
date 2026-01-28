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
        Compte compte = compteRepository.findById(id).orElse(null);
        if (compte != null) {
            
            if (compte.getTransactions() != null) {
                for (Transaction transaction : compte.getTransactions()) {
                    transaction.setCompte(null);
                    transactionRepository.save(transaction);
                }
            }
            compteRepository.delete(compte);
        }
    }

    public void deposer(Long id, Integer montant, String origineFonds) {
        Compte compte = compteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Compte introuvable"));

        if (montant == null || montant <= 0) {
            throw new IllegalArgumentException("Montant de dépôt invalide");
        }
        if (origineFonds == null || origineFonds.trim().isEmpty()) {
            throw new IllegalArgumentException("L'origine des fonds est obligatoire pour un dépôt");
        }
        Integer soldeAvant = compte.getSolde();
        Integer soldeApres = soldeAvant + montant;
        compte.setSolde(soldeApres);
        compteRepository.save(compte);


        Transaction transaction = new Transaction();
        transaction.setDateTransaction(LocalDateTime.now());
        transaction.setType("DEPOT");
        transaction.setMontantAvant(soldeAvant);
        transaction.setMontantApres(soldeApres);
        transaction.setMontant(montant);
        transaction.setOrigineFonds(origineFonds);
        transaction.setCompte(compte);
        transaction.setNumeroCompte(compte.getNumeroCompte());
        if (compte.getClient() != null) {
            transaction.setNomClient(compte.getClient().getNom() + " " + compte.getClient().getPrenom());
        }
        
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
        Transaction transaction = new Transaction();
        transaction.setDateTransaction(LocalDateTime.now());
        transaction.setType("RETRAIT");
        transaction.setMontantAvant(soldeAvant);
        transaction.setMontantApres(soldeApres);
        transaction.setMontant(montant);
        transaction.setOrigineFonds(null); 
        transaction.setCompte(compte);
        transaction.setNumeroCompte(compte.getNumeroCompte());
        if (compte.getClient() != null) {
            transaction.setNomClient(compte.getClient().getNom() + " " + compte.getClient().getPrenom());
        }
        
        transactionRepository.save(transaction);
    }
    @Transactional
    public void transferer(Long id, Integer montant, Long id2) {
        Compte compteSource = compteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Compte source introuvable"));

        if (montant == null || montant <= 0) {
            throw new IllegalArgumentException("Montant invalide");
        }
        if (compteSource.getSolde() < montant) {
            throw new SoldeInsuffisantException("Solde insuffisant !");
        }

        Integer soldeSourceAvant = compteSource.getSolde();
        Integer soldeSourceApres = soldeSourceAvant - montant;
        compteSource.setSolde(soldeSourceApres);
        compteRepository.save(compteSource);
        Compte compteDestination = compteRepository.findById(id2)
                .orElseThrow(() -> new RuntimeException("Compte destination introuvable"));

        Integer soldeDestAvant = compteDestination.getSolde();
        Integer soldeDestApres = soldeDestAvant + montant;
        compteDestination.setSolde(soldeDestApres);
        compteRepository.save(compteDestination);

       
        Transaction transactionSource = new Transaction();
        transactionSource.setDateTransaction(LocalDateTime.now());
        transactionSource.setType("VIREMENT");
        transactionSource.setMontantAvant(soldeSourceAvant);
        transactionSource.setMontantApres(soldeSourceApres);
        transactionSource.setMontant(montant);
        transactionSource.setOrigineFonds(null);
        transactionSource.setCompte(compteSource); 
        transactionSource.setNumeroCompte(compteSource.getNumeroCompte());
    
        transactionSource.setCompteDestination(compteDestination.getNumeroCompte());
        if (compteSource.getClient() != null) {
            transactionSource.setNomClient(compteSource.getClient().getNom() + " " + compteSource.getClient().getPrenom());
        }
        transactionRepository.save(transactionSource);
        Transaction transactionDest = new Transaction();
        transactionDest.setDateTransaction(LocalDateTime.now());
        transactionDest.setType("VIREMENT_RECU");
        transactionDest.setMontantAvant(soldeDestAvant);
        transactionDest.setMontantApres(soldeDestApres);
        transactionDest.setMontant(montant);
        transactionDest.setOrigineFonds(null);
        transactionDest.setCompte(compteDestination); 
        transactionDest.setNumeroCompte(compteDestination.getNumeroCompte());
        
        
        transactionDest.setCompteDestination(compteSource.getNumeroCompte());

        if (compteDestination.getClient() != null) {
            transactionDest.setNomClient(compteDestination.getClient().getNom() + " " + compteDestination.getClient().getPrenom());
        }
        transactionRepository.save(transactionDest);
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
