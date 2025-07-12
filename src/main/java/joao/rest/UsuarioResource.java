package joao.rest;

import java.util.List;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import joao.persistence.dto.UsuarioDTO;
import joao.persistence.models.Usuario;
import joao.services.UsuarioService;

@Path("/usuarios")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UsuarioResource {

    @Inject
    UsuarioService usuarioService;

    // Método para listar todos os usuários
    @GET
    public List<Usuario> listar() {
        return usuarioService.listar();
    }

    // Método para consultar usuário por ID
    @GET
    @Path("/{idUsuario}")
    public Usuario consultar(@PathParam("idUsuario") Long idUsuario) {
        return usuarioService.consultar(idUsuario);
    }

    // Método para cadastrar um novo usuário
    @POST
    public Long criar(UsuarioDTO usuario) {
        return usuarioService.criar(usuario);
    }

    // Método para editar usuário
    @PUT
    public Long editar(UsuarioDTO usuario) {
        return usuarioService.editar(usuario);
    }

    // Método para excluir usuário
    @DELETE
    @Path("/{idUsuario}")
    public Long excluir(@PathParam("idUsuario") Long idUsuario) {
        return usuarioService.excluir(idUsuario);
    }

    // Método para autenticar usuário
    @POST
    @Path("/entrar")
    public Usuario entrar(UsuarioDTO usuarioDTO) {
        return usuarioService.entrar(usuarioDTO.getNome().toUpperCase(), usuarioDTO.getSenha());
    }
}