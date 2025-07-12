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
        return "<!DOCTYPE html><html lang=\"en\">\n" +
               "<head>\n" +
               "    <meta charset=\"UTF-8\">\n" +
               "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
               "    <title>Greeting</title>\n" +
               "</head>\n" +
               "<body style=\"text-align:center;\">\n" +
               "    <h1>A aplicação está funcionando!</h1>\n" +
               "    <h1>Principais endpoints:</h2>\n" +
               "    <h3>/usuarios</h3>\n" +
               "    <h3>/listas</h3>\n" +
               "    <h3>/itens</h3>\n" +
               "</body>\n" +
               "</html>";
    }
}
