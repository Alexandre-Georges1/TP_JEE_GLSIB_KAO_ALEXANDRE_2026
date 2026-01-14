package egabank.api.devoir.dto;

import egabank.api.devoir.entity.Compte;
import egabank.api.devoir.entity.Transaction;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReleveDTO {
    private Compte compte;
    private List<Transaction> transactions;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private Integer totalCredits;
    private Integer totalDebits;
    private Integer soldeDebut;
    private Integer soldeFin;
    private Integer nombreTransactions;
}
