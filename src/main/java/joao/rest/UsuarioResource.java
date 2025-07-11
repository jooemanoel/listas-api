package joao.rest;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import joao.persistence.dao.UsuarioDAO;
import joao.persistence.models.Usuario;

import java.util.List;

@Path("/usuarios")
public class UsuarioResource {

    @Inject
    UsuarioDAO usuarioDAO;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<Usuario> listarUsuarios() {
        return usuarioDAO.listAll();
    }
}