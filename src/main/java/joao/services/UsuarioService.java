package joao.services;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import joao.persistence.dao.UsuarioDAO;
import joao.persistence.dto.UsuarioDTO;
import joao.persistence.models.Lista;
import joao.persistence.models.Usuario;

@ApplicationScoped
public class UsuarioService {

  @Inject
  UsuarioDAO usuarioDAO;

  @Inject
  ListaService listaService;

  // Método para listar todos os usuários
  public List<Usuario> listar() {
    return usuarioDAO.listar();
  }

  // Consultar usuário por ID
  public Usuario consultar(Long idUsuario) {
    List<Usuario> usuarios = usuarioDAO.consultar(idUsuario);
    if (usuarios.isEmpty()) {
      Usuario usuario = new Usuario();
      usuario.setNome("Usuário não encontrado");
      return usuario; // Retorna um usuário fictício se não encontrado
    }
    return usuarios.get(0); // Retorna o primeiro usuário encontrado
  }

  // Método para cadastrar um novo usuário
  public Long criar(UsuarioDTO usuario) {
    if (usuario.getNome() == null || usuario.getNome().isEmpty() || usuario.getSenha() == null
        || usuario.getSenha().isEmpty()) {
      return -2L; // Dados inválidos
    }
    if (usuarioDAO.consultarPorNome(usuario.getNome()).size() > 0) {
      return -1L; // Nome já cadastrado
    }
    return usuarioDAO.cadastrar(usuario.getNome(), usuario.getSenha()); // Retorna o ID do usuário cadastrado
  }

  // Método para editar usuário
  public Long editar(UsuarioDTO usuario) {
    return usuarioDAO.editar(usuario.getIdUsuario(), usuario.getNome().toUpperCase(), usuario.getSenha());
  }

  // Método para excluir usuário
  public Long excluir(Long idUsuario) {
    Usuario usuario = consultar(idUsuario);
    if (usuario.getIdUsuario() == 0L) {
      return -1L;
    }
    for(Lista lista : usuario.getListas()) {
      listaService.excluir(lista.getIdLista());
    }
    return usuarioDAO.excluir(idUsuario);
  }

  // Método para autenticar usuário
  public Usuario entrar(String nome, String senha) {
    List<Usuario> usuarios = usuarioDAO.consultarPorNome(nome);
    if (usuarios.isEmpty()) {
      Usuario usuario = new Usuario();
      usuario.setNome("Usuário não encontrado");
      return usuario;
    }
    if (!usuarios.get(0).getSenha().equals(senha)) {
      Usuario usuario = new Usuario();
      usuario.setNome("Senha incorreta");
      return usuario;
    }
    return consultar(usuarios.get(0).getIdUsuario());
  }
}
