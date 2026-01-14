package egabank.api.devoir.controller;

import jakarta.validation.Valid;
import egabank.api.devoir.entity.Client;
import egabank.api.devoir.service.IclientService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class ClientRestController {
    private IclientService clientService;
    public ClientRestController (IclientService clientService) {
        this.clientService = clientService;
    }
    @GetMapping("/clients")
    public List<Client> listeClient(){ return clientService.showClient();}
    @GetMapping("clients/{id}")
    public Client getClient(@PathVariable Long id){ return clientService.getOneClient(id);}
    @PostMapping("/clients")
    public Client saveClient( @Valid @RequestBody Client client){ return clientService.saveClient(client);}
    @PutMapping("/clients/{id}")
    public Client updateClient(@PathVariable Long id, @Valid @RequestBody Client client){
        client.setId(id);
        return clientService.saveClient(client);
    }
    @DeleteMapping("/clients/{id}")
    public void deleteClient(@PathVariable Long id) {
        clientService.deleteClient(id);
    }

}
