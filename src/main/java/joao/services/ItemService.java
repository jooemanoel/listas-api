package joao.services;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import joao.persistence.dao.ItemDAO;
import joao.persistence.models.Item;

@ApplicationScoped
public class ItemService {
  @Inject
  ItemDAO itemDAO;

  // Listar todos os itens
  public List<Item> listar() {
    return itemDAO.listar();
  }

  // Consultar item por ID
  public Item consultar(Long idItem) {
    List<Item> itens = itemDAO.consultar(idItem);
    if (itens.isEmpty()) {
      Item item = new Item();
      item.setNomeItem("Item não encontrado");
      return item; // Retorna um item fictício se não encontrado
    }
    return itens.get(0); // Retorna o primeiro item encontrado
  }

  // Criar um novo item
  public Long criar(Item item) {
    return itemDAO.criar(item.getIdLista(), item.getNomeItem());
  }

  // Editar um item
  public Long editar(Item item) {
    return itemDAO.editar(item.getIdItem(), item.getNomeItem(), item.getChecked());
  }

  // Excluir um item
  public Long excluir(Long idItem) {
    return itemDAO.excluir(idItem);
  }

  // Excluir todos os itens de uma lista
  public Long excluirTodos(Long idLista) {
    return itemDAO.excluirPorLista(idLista);
  }
}
