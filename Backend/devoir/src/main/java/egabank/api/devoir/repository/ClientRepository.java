package egabank.api.devoir.repository;

import egabank.api.devoir.entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientRepository extends JpaRepository<Client, Long> {
}
