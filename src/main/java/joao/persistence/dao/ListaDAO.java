package joao.persistence.dao;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import joao.persistence.models.Lista;

@ApplicationScoped
public class ListaDAO {
  @Inject
  EntityManager entityManager;

  // Listar todas as listas
  public List<Lista> listar() {
    return entityManager.createNamedQuery("LISTAR_LISTAS", Lista.class).getResultList();
  }

  // Consultar lista por ID
  public List<Lista> consultar(Long idLista) {
    return entityManager.createNamedQuery("CONSULTAR_LISTA", Lista.class)
        .setParameter("idLista", idLista)
        .getResultList();
  }

  public List<Lista> consultarPorNome(String nomeLista) {
    return entityManager.createNamedQuery("CONSULTAR_LISTA_POR_NOME", Lista.class)
        .setParameter("nomeLista", nomeLista)
        .getResultList();
  }

  // Criar uma nova lista
  public Long criar(Long idUsuario, String nomeLista) {
    return entityManager.createNamedQuery("CRIAR_LISTA", Long.class)
        .setParameter("idUsuario", idUsuario)
        .setParameter("nomeLista", nomeLista)
        .getSingleResult();
  }

  // Editar uma lista
  @Transactional
  public Long editar(Long idLista, String nomeLista) {
    return (long) entityManager.createNamedQuery("EDITAR_LISTA", Long.class)
        .setParameter("idLista", idLista)
        .setParameter("nomeLista", nomeLista)
        .executeUpdate();
  }

  // Excluir uma lista
  @Transactional
  public Long excluir(Long idLista) {
    return (long) entityManager.createNamedQuery("EXCLUIR_LISTA", Long.class)
        .setParameter("idLista", idLista)
        .executeUpdate();
  }

  // Excluir listas por usuário
  @Transactional
  public Long excluirPorUsuario(Long idUsuario) {
    return (long) entityManager.createNamedQuery("EXCLUIR_LISTAS_POR_USUARIO", Long.class)
        .setParameter("idUsuario", idUsuario)
        .executeUpdate();
  }
}