package joao.persistence.models;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.NamedNativeQuery;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "listas", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
@NamedNativeQuery(
    name = "LISTAR_LISTAS",
    query = "SELECT * FROM listas",
    resultClass = Lista.class
)
@NamedNativeQuery(
    name = "CONSULTAR_LISTA",
    query = "SELECT * FROM listas WHERE id_lista = :idLista",
    resultClass = Lista.class
)
@NamedNativeQuery(
    name = "CONSULTAR_LISTA_POR_NOME",
    query = "SELECT * FROM listas WHERE nome_lista = :nomeLista",
    resultClass = Lista.class
)
@NamedNativeQuery(
    name = "CRIAR_LISTA",
    query = "INSERT INTO listas (id_usuario, nome_lista) VALUES (:idUsuario, :nomeLista) RETURNING id_lista",
    resultClass = Long.class
)
@NamedNativeQuery(
    name = "EDITAR_LISTA",
    query = "UPDATE listas SET nome_lista = :nomeLista WHERE id_lista = :idLista",
    resultClass = Long.class
)
@NamedNativeQuery(
    name = "EXCLUIR_LISTA",
    query = "DELETE FROM listas WHERE id_lista = :idLista",
    resultClass = Long.class
)
@NamedNativeQuery(
    name = "EXCLUIR_LISTAS_POR_USUARIO",
    query = "DELETE FROM listas WHERE id_usuario = :idUsuario",
    resultClass = Long.class
)
public class Lista {

  @Id
  @GeneratedValue(strategy = jakarta.persistence.GenerationType.IDENTITY)
  @Column(name = "id_lista")
  private Long idLista = 0L;

  @Column(name = "id_usuario", nullable = false)
  private Long idUsuario = 0L;

  @Column(name = "nome_lista", nullable = false)
  private String nomeLista = "";

  @OneToMany
  @JoinColumn(name = "id_lista", referencedColumnName = "id_lista")
  private List<Item> itens = new ArrayList<>();
}
