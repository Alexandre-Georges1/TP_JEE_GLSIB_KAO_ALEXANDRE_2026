package egabank.api.devoir.entity;


import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
public class Client {
    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;
    @NotBlank(message = "Le nom est obligatoire")
    @Size(min = 2, message = "Le nom doit avoir au moins 2 caractères")
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire")
    private String prenom;

    @NotNull(message = "La date de naissance est obligatoire")
    @Past(message = "La date de naissance doit être dans le passé")
    private LocalDate dnaissance;

    @NotNull(message = "Le sexe est obligatoire")
    private String sexe;

    @NotNull(message = "L'adresse est obligatoire")
    private String adresse;

    @NotNull(message = "Le numéro de téléphone est obligatoire")
    @Column(unique = true)
    private String tel;

    @NotNull(message = "La nationalité est obligatoire")
    private String nationalite;

    @Email(message = "L'email doit être valide")
    @Column(unique = true)
    private String courriel;
}
