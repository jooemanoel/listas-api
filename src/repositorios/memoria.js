// Repositório em memória, com a mesma interface do Firestore.
// Usado nos testes e em "npm run dev:memoria" (testar o front-end sem credenciais).
// Os dados somem quando o processo termina.
import { randomBytes } from "node:crypto";

const copiar = (valor) => structuredClone(valor);

export function criarRepositorioMemoria() {
  const usuarios = new Map(); // id -> { id, nome, senhaHash }
  const listas = new Map(); // usuarioId -> Map(listaId -> lista)

  const doUsuario = (id) => {
    if (!listas.has(id)) listas.set(id, new Map());
    return listas.get(id);
  };

  return {
    async buscarUsuario(id) {
      return usuarios.has(id) ? copiar(usuarios.get(id)) : null;
    },

    async criarUsuario({ id, nome, senhaHash }) {
      if (usuarios.has(id)) return false;
      usuarios.set(id, { id, nome, senhaHash, criadoEm: new Date().toISOString() });
      return true;
    },

    async listarListas(usuarioId) {
      return [...doUsuario(usuarioId).values()]
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(copiar);
    },

    async contarListas(usuarioId) {
      return doUsuario(usuarioId).size;
    },

    async buscarLista(usuarioId, listaId) {
      const lista = doUsuario(usuarioId).get(listaId);
      return lista ? copiar(lista) : null;
    },

    async criarLista(usuarioId, nome) {
      const agora = new Date().toISOString();
      const lista = { id: randomBytes(10).toString("base64url"), nome, itens: [], criadoEm: agora, atualizadoEm: agora };
      doUsuario(usuarioId).set(lista.id, lista);
      return copiar(lista);
    },

    async excluirLista(usuarioId, listaId) {
      return doUsuario(usuarioId).delete(listaId);
    },

    async alterarItens(usuarioId, listaId, alterar) {
      const atual = doUsuario(usuarioId).get(listaId);
      if (!atual) return null;
      const itens = alterar(copiar(atual));
      const nova = { ...atual, itens, atualizadoEm: new Date().toISOString() };
      doUsuario(usuarioId).set(listaId, nova);
      return copiar(nova);
    },
  };
}
