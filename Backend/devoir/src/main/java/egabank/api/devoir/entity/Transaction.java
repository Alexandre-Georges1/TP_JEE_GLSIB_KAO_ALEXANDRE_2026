package egabank.api.devoir.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {
    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;
    private LocalDateTime dateTransaction;
    private String type;
    private Integer montantAvant;
    private Integer montantApres;
    private Integer montant;
    private String origineFonds;
    private String numeroCompte;
    private String nomClient;

    @ManyToOne
    @JoinColumn(name = "compte_id")
    @com.fasterxml.jackson.annotation.JsonBackReference(value = "compte-transaction")
    private Compte compte;

    private String compteDestination;
}
