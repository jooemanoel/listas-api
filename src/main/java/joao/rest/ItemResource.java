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
import joao.persistence.models.Item;
import joao.services.ItemService;

@Path("/itens")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ItemResource {
  @Inject
  ItemService itemService;

  // Listar todos os itens
  @GET
  public List<Item> listar() {
    return itemService.listar();
  }

  // Consultar item por ID
  @GET
  @Path("/{idItem}")
  public Item consultar(@PathParam("idItem") Long idItem) {
    return itemService.consultar(idItem);
  }

  // Criar um novo item
  @POST
  public Long criarItem(Item item) {
    return itemService.criar(item);
  }

  // Editar um item
  @PUT
  public Long editarItem(Item item) {
    return itemService.editar(item);
  }

  // Excluir um item
  @DELETE
  @Path("/{idItem}")
  public Long excluirItem(@PathParam("idItem") Long idItem) {
    return itemService.excluir(idItem);
  }
}
