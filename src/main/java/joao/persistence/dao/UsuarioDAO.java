package joao.persistence.dao;

import java.util.List;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import joao.persistence.models.Usuario;

@ApplicationScoped
public class UsuarioDAO implements PanacheRepositoryBase<Usuario, Long> {
  /**
   * List all users.
   *
   * @return List of all users
   */
  public List<Usuario> listarTodos() {
    return listAll();
  }
}