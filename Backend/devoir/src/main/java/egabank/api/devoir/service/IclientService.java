package egabank.api.devoir.service;


import egabank.api.devoir.entity.Client;

import java.util.List;

public interface IclientService {
    List<Client> showClient();
    public Client getOneClient(Long id);
    public Client saveClient(Client client);
    public void deleteClient(Long id);
}
