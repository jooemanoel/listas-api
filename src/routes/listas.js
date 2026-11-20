// Todas as rotas exigem login, e cada usuário só enxerga as próprias listas:
// o id do usuário vem do token assinado, nunca de um parâmetro enviado pelo cliente.
import { randomBytes } from "node:crypto";
import { Router } from "express";
import { exigirLogin } from "../autenticacao.js";
import { ErroHttp, LIMITES, validarLote, validarMarcado, validarNome, validarOperacao } from "../validacao.js";

const naoEncontrada = () => new ErroHttp(404, "Lista não encontrada");

function acharItem(lista, itemId) {
  const item = lista.itens.find((i) => i.id === itemId);
  if (!item) throw new ErroHttp(404, "Item não encontrado");
  return item;
}

function verificarNovoItem(itens, nome) {
  if (itens.some((i) => i.nome === nome)) throw new ErroHttp(409, `"${nome}" já está na lista`);
  if (itens.length >= LIMITES.itensPorLista) throw new ErroHttp(422, `Limite de ${LIMITES.itensPorLista} itens atingido`);
}

/**
 * Aplica uma operação de item vinda da sincronização. Não altera o array recebido.
 * Repetir a mesma operação não muda o resultado (o aparelho pode reenviar a fila
 * se a resposta anterior se perdeu no caminho).
 */
function aplicarOperacaoDeItem(itens, op) {
  switch (op.tipo) {
    case "adicionarItem":
      if (itens.some((i) => i.id === op.itemId)) return itens; // já aplicada antes
      verificarNovoItem(itens, op.nome);
      return [...itens, { id: op.itemId, nome: op.nome, marcado: false }];
    case "marcarItem":
      if (!itens.some((i) => i.id === op.itemId)) throw new ErroHttp(404, "Item não existe mais");
      return itens.map((i) => (i.id === op.itemId ? { ...i, marcado: op.marcado } : i));
    case "removerItem":
      return itens.filter((i) => i.id !== op.itemId);
  }
  return itens;
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

  /**
   * Recebe a fila de alterações do aparelho (feitas online ou offline), na ordem em que
   * aconteceram, e aplica cada uma sobre o estado atual do banco.
   *
   * Para cada lista, compara o atualizadoEm do banco com a `base` (o atualizadoEm que o
   * aparelho conhecia ao fazer a primeira alteração). Se o banco for mais novo, a lista
   * também mudou em outro aparelho: as alterações são aplicadas mesmo assim, item a item,
   * e a lista volta em `conflitos` para o aparelho avisar o usuário.
   *
   * Operações inválidas ou impossíveis (item repetido, lista apagada em outro aparelho...)
   * são puladas e voltam em `ignoradas`, sem travar as demais.
   *
   * Resposta: { listas: [lista atualizada], excluidas: [id], conflitos: [id], ignoradas: [{ id, motivo }] }
   */
  router.post("/sincronizar", async (req, res) => {
    const usuarioId = req.usuario.id;
    const resultado = { listas: [], excluidas: [], conflitos: [], ignoradas: [] };
    const ignorar = (op, motivo) => resultado.ignoradas.push({ id: op?.id ?? null, motivo });

    // Valida cada operação e agrupa por lista, mantendo a ordem.
    const grupos = new Map();
    for (const bruta of validarLote(req.body)) {
      let op;
      try {
        op = validarOperacao(bruta);
      } catch (erro) {
        ignorar(bruta, erro.message);
        continue;
      }
      if (!grupos.has(op.listaId)) grupos.set(op.listaId, []);
      grupos.get(op.listaId).push(op);
    }

    let totalListas = null;

    for (const [listaId, ops] of grupos) {
      const criacao = ops.find((o) => o.tipo === "criarLista");
      const exclusao = ops.some((o) => o.tipo === "excluirLista");
      let lista = await repo.buscarLista(usuarioId, listaId);

      if (!lista && criacao) {
        // Criada e excluída enquanto offline: nada a gravar.
        if (exclusao) {
          resultado.excluidas.push(listaId);
          continue;
        }
        totalListas ??= await repo.contarListas(usuarioId);
        if (totalListas >= LIMITES.listasPorUsuario) {
          ops.forEach((o) => ignorar(o, `Limite de ${LIMITES.listasPorUsuario} listas atingido`));
          resultado.excluidas.push(listaId);
          continue;
        }
        lista = (await repo.criarLista(usuarioId, criacao.nome, listaId)) ?? (await repo.buscarLista(usuarioId, listaId));
        totalListas++;
      }

      if (!lista) {
        // Excluída em outro aparelho (ou nunca existiu).
        const pendentes = ops.filter((o) => o.tipo !== "excluirLista");
        pendentes.forEach((o) => ignorar(o, "A lista foi excluída em outro aparelho"));
        if (pendentes.length) resultado.conflitos.push(listaId);
        resultado.excluidas.push(listaId);
        continue;
      }

      const base = ops.find((o) => o.base)?.base;
      if (base && Date.parse(lista.atualizadoEm) > Date.parse(base)) resultado.conflitos.push(listaId);

      if (exclusao) {
        await repo.excluirLista(usuarioId, listaId);
        resultado.excluidas.push(listaId);
        continue;
      }

      const deItens = ops.filter((o) => o.tipo !== "criarLista");
      if (deItens.length) {
        let puladas = [];
        const atualizada = await repo.alterarItens(usuarioId, listaId, (atual) => {
          puladas = []; // a transação pode rodar de novo: recomeça a contagem
          let itens = atual.itens;
          for (const op of deItens) {
            try {
              itens = aplicarOperacaoDeItem(itens, op);
            } catch (erro) {
              puladas.push({ op, motivo: erro.message });
            }
          }
          return itens;
        });
        puladas.forEach(({ op, motivo }) => ignorar(op, motivo));
        lista = atualizada ?? lista;
      }

      resultado.listas.push(lista);
    }

    res.json(resultado);
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
      verificarNovoItem(lista.itens, nome);
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
