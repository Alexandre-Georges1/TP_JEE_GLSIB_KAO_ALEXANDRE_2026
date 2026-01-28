package egabank.api.devoir.controller;
import egabank.api.devoir.entity.Transaction;
import egabank.api.devoir.repository.TransactionRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
public class TransactionRestController {
    
    private final TransactionRepository transactionRepository;

    public TransactionRestController(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    @GetMapping("/transactions")
    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAll();
    }
}
