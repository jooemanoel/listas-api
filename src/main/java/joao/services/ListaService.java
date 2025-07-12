package joao.services;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import joao.persistence.dao.ListaDAO;
import joao.persistence.dto.ListaDTO;
import joao.persistence.models.Lista;

@ApplicationScoped
public class ListaService {
  @Inject
  ListaDAO listaDAO;

  @Inject
  ItemService itemService;

  // Método para listar todas as listas
  public List<Lista> listar() {
    return listaDAO.listar();
  }

  // Método para consultar lista por ID
  public Lista consultar(Long idLista) {
    List<Lista> listas = listaDAO.consultar(idLista);
    if (listas.isEmpty()) {
      Lista lista = new Lista();
      lista.setNomeLista("Lista não encontrada");
      return lista; // Retorna uma lista fictícia se não encontrada
    }
    return listas.get(0); // Retorna a primeira lista encontrada
  }

  // Método para criar uma nova lista
  public Long criar(ListaDTO lista) {
    if (lista.getNomeLista() == null || lista.getNomeLista().isEmpty()) {
      return -2L; // Dados inválidos
    }
    if (listaDAO.consultarPorNome(lista.getNomeLista().toUpperCase()).size() > 0) {
      return -1L; // Lista já existe
    }
    return listaDAO.criar(lista.getIdUsuario(), lista.getNomeLista().toUpperCase());
  }

  // Método para editar uma lista
  public Long editar(ListaDTO lista) {
    return listaDAO.editar(lista.getIdLista(), lista.getNomeLista().toUpperCase());
  }

  // Método para excluir uma lista
  public Long excluir(Long idLista) {
    Lista lista = consultar(idLista);
    if (lista.getIdLista() == 0L) {
      return -1L;
    }
    itemService.excluirTodos(lista.getIdLista());
    return listaDAO.excluir(idLista);
  }
}
