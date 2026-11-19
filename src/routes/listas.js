// Todas as rotas exigem login, e cada usuário só enxerga as próprias listas:
// o id do usuário vem do token assinado, nunca de um parâmetro enviado pelo cliente.
import { randomBytes } from "node:crypto";
import { Router } from "express";
import { exigirLogin } from "../autenticacao.js";
import { ErroHttp, LIMITES, validarMarcado, validarNome } from "../validacao.js";

const naoEncontrada = () => new ErroHttp(404, "Lista não encontrada");

function acharItem(lista, itemId) {
  const item = lista.itens.find((i) => i.id === itemId);
  if (!item) throw new ErroHttp(404, "Item não encontrado");
  return item;
}

export function rotasListas({ repo, config }) {
  const router = Router();
  router.use(exigirLogin(config));

  async function alterar(req, res, funcao) {
    const lista = await repo.alterarItens(req.usuario.id, req.params.id, funcao);
    if (!lista) throw naoEncontrada();
    res.json(lista);
  }

  router.get("/", async (req, res) => {
    res.json(await repo.listarListas(req.usuario.id));
  });

  router.post("/", async (req, res) => {
    const nome = validarNome(req.body, LIMITES.nomeLista);
    if ((await repo.contarListas(req.usuario.id)) >= LIMITES.listasPorUsuario) {
      throw new ErroHttp(422, `Limite de ${LIMITES.listasPorUsuario} listas atingido`);
    }
    res.status(201).json(await repo.criarLista(req.usuario.id, nome));
  });

  router.get("/:id", async (req, res) => {
    const lista = await repo.buscarLista(req.usuario.id, req.params.id);
    if (!lista) throw naoEncontrada();
    res.json(lista);
  });

  router.delete("/:id", async (req, res) => {
    if (!(await repo.excluirLista(req.usuario.id, req.params.id))) throw naoEncontrada();
    res.status(204).end();
  });

  // Itens: cada operação devolve a lista inteira atualizada.

  router.post("/:id/itens", async (req, res) => {
    const nome = validarNome(req.body, LIMITES.nomeItem);
    await alterar(req, res, (lista) => {
      if (lista.itens.some((i) => i.nome === nome)) {
        throw new ErroHttp(409, `"${nome}" já está na lista`);
      }
      if (lista.itens.length >= LIMITES.itensPorLista) {
        throw new ErroHttp(422, `Limite de ${LIMITES.itensPorLista} itens atingido`);
      }
      return [...lista.itens, { id: randomBytes(6).toString("base64url"), nome, marcado: false }];
    });
  });

  router.patch("/:id/itens/:itemId", async (req, res) => {
    const marcado = validarMarcado(req.body);
    await alterar(req, res, (lista) => {
      acharItem(lista, req.params.itemId).marcado = marcado;
      return lista.itens;
    });
  });

  router.delete("/:id/itens/:itemId", async (req, res) => {
    await alterar(req, res, (lista) => {
      acharItem(lista, req.params.itemId);
      return lista.itens.filter((i) => i.id !== req.params.itemId);
    });
  });

  return router;
}
