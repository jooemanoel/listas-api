package joao.persistence.models;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.ColumnResult;
import jakarta.persistence.ConstructorResult;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.NamedNativeQuery;
import jakarta.persistence.OneToMany;
import jakarta.persistence.SqlResultSetMapping;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "usuarios", schema = "public")
@NamedNativeQuery(
    name = "LISTAR_USUARIOS", 
    query = "SELECT * FROM usuarios", 
    resultClass = Usuario.class
)
@NamedNativeQuery(
    name = "CONSULTAR_USUARIO", 
    query = "SELECT * FROM usuarios WHERE id_usuario = :idUsuario", 
    resultClass = Usuario.class
)
@NamedNativeQuery(
    name = "CRIAR_USUARIO", 
    query = "INSERT INTO usuarios (nome, senha) VALUES (:nome, :senha) RETURNING id_usuario", 
    resultClass = Long.class
)
@SqlResultSetMapping(
    name = "CONSULTAR_USUARIO_POR_NOME_mapping", 
    classes = @ConstructorResult(
        targetClass = Usuario.class, 
        columns = {
            @ColumnResult(name = "id_usuario", type = Long.class), 
            @ColumnResult(name = "nome", type = String.class), 
            @ColumnResult(name = "senha", type = String.class),
        }
    )
)
@NamedNativeQuery(
    name = "CONSULTAR_USUARIO_POR_NOME", 
    query = "SELECT id_usuario, nome, senha FROM usuarios WHERE nome = :nome", 
    resultSetMapping = "CONSULTAR_USUARIO_POR_NOME_mapping"
)
@NamedNativeQuery(
    name = "EXCLUIR_USUARIO", 
    query = "DELETE FROM usuarios WHERE id_usuario = :idUsuario", 
    resultClass = Usuario.class
)
@NamedNativeQuery(
    name = "EDITAR_USUARIO", 
    query = "UPDATE usuarios SET nome = :nome, senha = :senha WHERE id_usuario = :idUsuario", 
    resultClass = Long.class
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario = 0L;

    @Column(nullable = false)
    private String nome = "";

    @Column(nullable = false)
    private String senha = "";

    @OneToMany
    @JoinColumn(name = "id_usuario", referencedColumnName = "id_usuario")
    private List<Lista> listas = new ArrayList<>();

    public Usuario(Long idUsuario, String nome, String senha) {
        this.idUsuario = idUsuario;
        this.nome = nome;
        this.senha = senha;
        this.listas = new ArrayList<>();
    }
}
