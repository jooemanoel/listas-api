package joao.persistence.dao;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import joao.persistence.models.Usuario;

@ApplicationScoped
public class UsuarioDAO {
  @Inject
  EntityManager entityManager;

  // Listar todos os usuários
  public List<Usuario> listar() {
    return entityManager.createNamedQuery("LISTAR_USUARIOS", Usuario.class).getResultList();
  }

  // Consultar usuário por ID
  public List<Usuario> consultar(Long idUsuario) {
    return entityManager.createNamedQuery("CONSULTAR_USUARIO", Usuario.class)
        .setParameter("idUsuario", idUsuario)
        .getResultList();
  }

  // Criar um novo usuário
  @Transactional
  public Long cadastrar(String nome, String senha) {
    return entityManager.createNamedQuery("CRIAR_USUARIO", Long.class)
        .setParameter("nome", nome)
        .setParameter("senha", senha)
        .getSingleResult();
  }

  // Atualizar usuário existente
  public Usuario atualizar(Usuario usuario) {
    return entityManager.merge(usuario);
  }

  // Autenticar usuário
  public List<Usuario> consultarPorNome(String nome) {
    return entityManager.createNamedQuery("CONSULTAR_USUARIO_POR_NOME", Usuario.class)
        .setParameter("nome", nome).getResultList();
  }

  // Excluir usuário
  @Transactional
  public Long excluir(Long idUsuario) {
    return (long) entityManager.createNamedQuery("EXCLUIR_USUARIO")
        .setParameter("idUsuario", idUsuario)
        .executeUpdate();
  }

  // Editar usuário
  @Transactional
  public Long editar(Long idUsuario, String nome, String senha) {
    return (long) entityManager.createNamedQuery("EDITAR_USUARIO", Long.class)
        .setParameter("idUsuario", idUsuario)
        .setParameter("nome", nome)
        .setParameter("senha", senha)
        .executeUpdate();
  }
}