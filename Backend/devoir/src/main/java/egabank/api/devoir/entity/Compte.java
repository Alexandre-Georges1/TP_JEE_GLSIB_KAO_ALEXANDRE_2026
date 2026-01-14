package egabank.api.devoir.entity;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
public class Compte {
    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;

    private String numeroCompte;

    private LocalDate dateCreation;

    @NotBlank(message = "Le type de compte est obligatoire")
    private String typeCompte;


    private Integer solde;


    @ManyToOne
    @JoinColumn(name = "client_id") // clé étrangère
    private Client client;

    @OneToMany(mappedBy="compte", cascade = CascadeType.ALL)
    @JsonManagedReference 
    List<Transaction> transactions;
}
