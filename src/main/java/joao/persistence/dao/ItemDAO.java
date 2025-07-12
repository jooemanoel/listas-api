package joao.persistence.dao;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import joao.persistence.models.Item;

@ApplicationScoped
public class ItemDAO {
  @Inject
  EntityManager entityManager;

  // Listar todos os itens
  public List<Item> listar() {
    return entityManager.createNamedQuery("LISTAR_ITENS", Item.class).getResultList();
  }

  // Consultar item por ID
  public List<Item> consultar(Long idItem) {
    return entityManager.createNamedQuery("CONSULTAR_ITEM", Item.class)
        .setParameter("idItem", idItem)
        .getResultList();
  }

  // Criar um novo item
  public Long criar(Long idLista, String nomeItem) {
    return entityManager.createNamedQuery("CRIAR_ITEM", Long.class)
        .setParameter("idLista", idLista)
        .setParameter("nomeItem", nomeItem)
        .getSingleResult();
  }

  // Editar um item
  @Transactional
  public Long editar(Long idItem, String nomeItem, short checked) {
    return (long) entityManager.createNamedQuery("EDITAR_ITEM", Long.class)
        .setParameter("idItem", idItem)
        .setParameter("nomeItem", nomeItem)
        .setParameter("checked", checked)
        .executeUpdate();
  }

  // Excluir um item
  @Transactional
  public Long excluir(Long idItem) {
    return (long) entityManager.createNamedQuery("EXCLUIR_ITEM", Long.class)
        .setParameter("idItem", idItem)
        .executeUpdate();
  }
  // Excluir todos os itens de uma lista
  @Transactional
  public Long excluirPorLista(Long idLista) {
    return (long) entityManager.createNamedQuery("EXCLUIR_ITENS_POR_LISTA", Long.class)
        .setParameter("idLista", idLista)
        .executeUpdate();
  }
}