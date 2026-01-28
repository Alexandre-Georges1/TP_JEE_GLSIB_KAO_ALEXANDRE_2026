package egabank.api.devoir.service;

import egabank.api.devoir.entity.Client;
import egabank.api.devoir.repository.ClientRepository;
import egabank.api.devoir.repository.TransactionRepository;
import egabank.api.devoir.entity.Transaction;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ClientService implements IclientService {
    private final ClientRepository clientRepository;
    private final TransactionRepository transactionRepository;
    public ClientService(ClientRepository clientRepository, TransactionRepository transactionRepository) {
        this.clientRepository = clientRepository;
        this.transactionRepository = transactionRepository;
    }
    @Override
    public List<Client> showClient() {
        return clientRepository.findAll();
    }
    @Override
    public Client saveClient(Client client) {
        if (client.getId() != null) {
            Client existingClient = clientRepository.findById(client.getId()).orElse(null);
            if (existingClient != null && client.getComptes() == null) {
                client.setComptes(existingClient.getComptes());
            }
        }
        
        if (client.getNom() != null) {
            client.setNom(client.getNom().toUpperCase());
        }

        if (client.getPrenom() != null) {
            client.setPrenom(client.getPrenom().toUpperCase());
        }

        if (client.getAdresse() != null) {
            client.setAdresse(client.getAdresse().toUpperCase());
        }

        if (client.getSexe() != null) {
            client.setSexe(client.getSexe().toUpperCase());
        }

        if (client.getCourriel() != null) {
            client.setCourriel(client.getCourriel().toLowerCase());
        }
        if(client.getNationalite() != null) {
            client.setNationalite(client.getNationalite().toUpperCase());
        }
        if(client.getTel() != null){
            client.setTel(client.getTel().toUpperCase());
        }
        return clientRepository.save(client);
    }

    @Override
    public Client getOneClient(Long id) {
        return clientRepository.findById(id).orElse(null);
    }

    @Override
    public void deleteClient(Long id) {
        Client client = clientRepository.findById(id).orElse(null);
        if (client != null) {
            // Désassocier les transactions pour chaque compte du client
            if (client.getComptes() != null) {
                for (egabank.api.devoir.entity.Compte compte : client.getComptes()) {
                    if (compte.getTransactions() != null) {
                        for (Transaction transaction : compte.getTransactions()) {
                            transaction.setCompte(null);
                            transactionRepository.save(transaction);
                        }
                    }
                }
            }
            clientRepository.delete(client);
        }
    }
}