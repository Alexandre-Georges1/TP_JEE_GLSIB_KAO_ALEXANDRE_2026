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
    @JoinColumn(name = "client_id")
    @com.fasterxml.jackson.annotation.JsonBackReference(value = "client-compte")
    private Client client;

    @com.fasterxml.jackson.annotation.JsonProperty("clientId")
    public Long getClientId() {
        return client != null ? client.getId() : null;
    }

    @OneToMany(mappedBy="compte", cascade = CascadeType.ALL)
    @com.fasterxml.jackson.annotation.JsonManagedReference(value = "compte-transaction") 
    List<Transaction> transactions;
}
