// Acesso ao Firestore pelo SDK de administrador (firebase-admin).
//
// Diferente do SDK web usado pelo app antigo, este SDK se autentica com uma conta de
// serviço e só roda no servidor. Assim as regras do Firestore podem bloquear todo
// acesso direto do navegador às coleções do Listas.
//
// Estrutura:
//   listas_usuarios/{NOME}                 { nome, senhaHash, criadoEm }
//   listas_usuarios/{NOME}/listas/{id}     { nome, itens: [{ id, nome, marcado }], criadoEm, atualizadoEm }
import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const COLECAO_USUARIOS = "listas_usuarios";

export function conectarFirestore() {
  if (!getApps().length) {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
    initializeApp({
      projectId: FIREBASE_PROJECT_ID,
      // Sem a chave nas variáveis, usa GOOGLE_APPLICATION_CREDENTIALS (arquivo JSON local).
      credential: FIREBASE_PRIVATE_KEY
        ? cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            // Na Vercel e no .env as quebras de linha chegam como "\n" literal.
            privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          })
        : applicationDefault(),
    });
  }
  return getFirestore();
}

const paraIso = (valor) => (valor?.toDate ? valor.toDate() : valor)?.toISOString?.() ?? null;

function paraLista(snap) {
  const dados = snap.data();
  return {
    id: snap.id,
    nome: dados.nome,
    itens: dados.itens ?? [],
    criadoEm: paraIso(dados.criadoEm),
    atualizadoEm: paraIso(dados.atualizadoEm),
  };
}

export function criarRepositorioFirestore(db = conectarFirestore()) {
  const usuarios = db.collection(COLECAO_USUARIOS);
  const listas = (usuarioId) => usuarios.doc(usuarioId).collection("listas");

  return {
    async buscarUsuario(id) {
      const snap = await usuarios.doc(id).get();
      return snap.exists ? { id: snap.id, ...snap.data() } : null;
    },

    /** Cria o usuário; devolve false se o nome já existir (create() é atômico). */
    async criarUsuario({ id, nome, senhaHash }) {
      try {
        await usuarios.doc(id).create({ nome, senhaHash, criadoEm: new Date() });
        return true;
      } catch (erro) {
        if (erro.code === 6) return false; // ALREADY_EXISTS
        throw erro;
      }
    },

    async listarListas(usuarioId) {
      const snap = await listas(usuarioId).orderBy("nome").get();
      return snap.docs.map(paraLista);
    },

    async contarListas(usuarioId) {
      const snap = await listas(usuarioId).count().get();
      return snap.data().count;
    },

    async buscarLista(usuarioId, listaId) {
      const snap = await listas(usuarioId).doc(listaId).get();
      return snap.exists ? paraLista(snap) : null;
    },

    /**
     * Cria a lista. Com `id` (lista criada offline no aparelho), usa esse id e devolve
     * null se ele já existir: reenviar a mesma criação não duplica a lista.
     */
    async criarLista(usuarioId, nome, id) {
      const agora = new Date();
      const ref = id ? listas(usuarioId).doc(id) : listas(usuarioId).doc();
      try {
        await ref.create({ nome, itens: [], criadoEm: agora, atualizadoEm: agora });
      } catch (erro) {
        if (erro.code === 6) return null; // ALREADY_EXISTS
        throw erro;
      }
      return { id: ref.id, nome, itens: [], criadoEm: agora.toISOString(), atualizadoEm: agora.toISOString() };
    },

    async excluirLista(usuarioId, listaId) {
      const ref = listas(usuarioId).doc(listaId);
      const snap = await ref.get();
      if (!snap.exists) return false;
      await ref.delete();
      return true;
    },

    /**
     * Lê, altera e grava a lista numa transação: dois aparelhos mexendo na mesma
     * lista ao mesmo tempo não apagam a alteração um do outro.
     * `alterar(lista)` devolve os novos itens ou lança ErroHttp.
     */
    async alterarItens(usuarioId, listaId, alterar) {
      const ref = listas(usuarioId).doc(listaId);
      return db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        if (!snap.exists) return null;
        const lista = paraLista(snap);
        const itens = alterar(lista);
        const atualizadoEm = new Date();
        t.update(ref, { itens, atualizadoEm });
        return { ...lista, itens, atualizadoEm: atualizadoEm.toISOString() };
      });
    },
  };
}
