package joao.persistence.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ListaDTO {
  private Long idLista;
  private Long idUsuario;
  private String nomeLista = "";
}
