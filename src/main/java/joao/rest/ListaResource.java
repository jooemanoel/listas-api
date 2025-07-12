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
import joao.persistence.dto.ListaDTO;
import joao.persistence.models.Lista;
import joao.services.ListaService;

@Path("/listas")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ListaResource {

  @Inject
  ListaService listaService;

  // Método para listar todas as listas
  @GET
  public List<Lista> listar() {
    return listaService.listar();
  }

  // Método para consultar lista por ID
  @GET
  @Path("/{idLista}")
  public Lista consultar(@PathParam("idLista") Long idLista) {
    return listaService.consultar(idLista);
  }

  // Método para criar uma nova lista
  @POST
  public Long criarLista(ListaDTO lista) {
    return listaService.criar(lista);
  }

  // Método para editar uma lista
  @PUT
  public Long editarLista(ListaDTO lista) {
    return listaService.editar(lista);
  }

  // Método para excluir uma lista
  @DELETE
  @Path("/{idLista}")
  public Long excluirLista(@PathParam("idLista") Long idLista) {
    return listaService.excluir(idLista);
  }
}