package joao.persistence.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.NamedNativeQuery;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "itens", schema = "public")
@NamedNativeQuery(name = "LISTAR_ITENS", query = "SELECT * FROM itens", resultClass = Item.class)
@NamedNativeQuery(name = "CONSULTAR_ITEM", query = "SELECT * FROM itens WHERE id_item = :idItem", resultClass = Item.class)
@NamedNativeQuery(name = "CRIAR_ITEM", query = "INSERT INTO itens (id_lista, nome_item) VALUES (:idLista, :nomeItem) RETURNING id_item", resultClass = Long.class)
@NamedNativeQuery(name = "EDITAR_ITEM", query = "UPDATE itens SET nome_item = :nomeItem, checked = :checked WHERE id_item = :idItem", resultClass = Long.class)
@NamedNativeQuery(name = "EXCLUIR_ITEM", query = "DELETE FROM itens WHERE id_item = :idItem", resultClass = Long.class)
@NamedNativeQuery(name = "EXCLUIR_ITENS_POR_LISTA", query = "DELETE FROM itens WHERE id_lista = :idLista", resultClass = Long.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Item {

    @Id
    @GeneratedValue(strategy = jakarta.persistence.GenerationType.IDENTITY)
    @Column(name = "id_item")
    private Long idItem = 0L;

    @Column(name = "id_lista")
    private Long idLista = 0L;

    @Column(name = "nome_item", nullable = false)
    private String nomeItem = "";

    @Column(name = "checked", nullable = false)
    private short checked = 0;
}
