package joao.rest;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/")
public class RootResource {

    @GET
    @Produces(MediaType.TEXT_HTML)
    public String hello() {
        return "<!DOCTYPE html>\r\n" + //
                        "<html lang=\"en\">\r\n" + //
                        "  <head>\r\n" + //
                        "    <meta charset=\"UTF-8\" />\r\n" + //
                        "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\r\n" + //
                        "    <title>Listas - API</title>\r\n" + //
                        "  </head>\r\n" + //
                        "  <body style=\"text-align: center; background-color: darkgray; color: #333\">\r\n" + //
                        "    <h1>Listas - API</h1>\r\n" + //
                        "    <p>Bem-vindo à documentação da API de Listas.</p>\r\n" + //
                        "    <p>\r\n" + //
                        "      Esta API permite que você gerencie listas de itens de forma eficiente.\r\n" + //
                        "    </p>\r\n" + //
                        "    <p>Você pode criar, ler, atualizar e excluir listas e seus itens.</p>\r\n" + //
                        "    <br />\r\n" + //
                        "    <a href=\"/swagger-ui\">Swagger</a>\r\n" + //
                        "  </body>\r\n" + //
                        "</html>\r\n" + //
                        "";
    }
}
