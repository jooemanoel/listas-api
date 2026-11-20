// Testes de ponta a ponta da API, com o repositório em memória.
// Rodar: npm test
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { criarApp } from "../src/app.js";
import { gerarHash } from "../src/autenticacao.js";
import { criarRepositorioMemoria } from "../src/repositorios/memoria.js";

const config = { segredo: "s".repeat(40), validade: "1h", origens: ["http://localhost:5173"], limiteTentativas: 1000 };
const repo = criarRepositorioMemoria();
let servidor;
let base;

async function chamar(metodo, caminho, { corpo, token } = {}) {
  const headers = {};
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(base + caminho, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
  const texto = await r.text();
  return { status: r.status, dados: texto ? JSON.parse(texto) : null, headers: r.headers };
}

before(async () => {
  servidor = criarApp({ repo, config }).listen(0);
  await new Promise((ok) => servidor.once("listening", ok));
  base = `http://localhost:${servidor.address().port}`;
});
after(() => servidor.close());

describe("autenticação", () => {
  test("cadastro normaliza o nome, guarda hash e devolve token", async () => {
    const r = await chamar("POST", "/auth/cadastro", { corpo: { nome: "  João  Emanoel ", senha: "segredo1" } });
    assert.equal(r.status, 201);
    assert.equal(r.dados.usuario.nome, "JOAO EMANOEL");
    assert.ok(r.dados.token);

    const salvo = await repo.buscarUsuario("JOAO EMANOEL");
    assert.notEqual(salvo.senhaHash, "segredo1");
    assert.match(salvo.senhaHash, /^\$2[aby]\$11\$/);
    assert.equal(salvo.senha, undefined);
  });

  test("cadastro recusa nome repetido, senha curta e corpo inválido", async () => {
    assert.equal((await chamar("POST", "/auth/cadastro", { corpo: { nome: "joao emanoel", senha: "segredo1" } })).status, 409);
    assert.equal((await chamar("POST", "/auth/cadastro", { corpo: { nome: "maria", senha: "123" } })).status, 400);
    assert.equal((await chamar("POST", "/auth/cadastro", { corpo: { nome: 42, senha: "segredo1" } })).status, 400);
    assert.equal((await chamar("POST", "/auth/cadastro", { corpo: "{quebrado" })).status, 400);
  });

  test("login: mesma resposta para senha errada e usuário inexistente", async () => {
    const errada = await chamar("POST", "/auth/login", { corpo: { nome: "JOAO EMANOEL", senha: "outra" } });
    const inexistente = await chamar("POST", "/auth/login", { corpo: { nome: "NINGUEM", senha: "outra" } });
    assert.equal(errada.status, 401);
    assert.deepEqual(errada.dados, inexistente.dados);

    const certa = await chamar("POST", "/auth/login", { corpo: { nome: "joão emanoel", senha: "segredo1" } });
    assert.equal(certa.status, 200);
    const eu = await chamar("GET", "/auth/eu", { token: certa.dados.token });
    assert.deepEqual(eu.dados.usuario, { id: "JOAO EMANOEL", nome: "JOAO EMANOEL" });
  });

  test("login aceita usuário migrado com senha curta", async () => {
    await repo.criarUsuario({ id: "ZE", nome: "ZE", senhaHash: await gerarHash("12") });
    assert.equal((await chamar("POST", "/auth/login", { corpo: { nome: "ze", senha: "12" } })).status, 200);
  });

  test("rotas protegidas recusam token ausente, forjado, expirado ou com alg none", async () => {
    assert.equal((await chamar("GET", "/listas")).status, 401);
    const forjado = jwt.sign({ nome: "X" }, "outro-segredo-com-mais-de-32-caracteres", { subject: "X", issuer: "listas-api" });
    assert.equal((await chamar("GET", "/listas", { token: forjado })).status, 401);
    const expirado = jwt.sign({ nome: "X" }, config.segredo, { subject: "X", issuer: "listas-api", expiresIn: -10 });
    assert.equal((await chamar("GET", "/listas", { token: expirado })).status, 401);
    const semAssinatura = jwt.sign({ nome: "X" }, null, { subject: "X", issuer: "listas-api", algorithm: "none" });
    assert.equal((await chamar("GET", "/listas", { token: semAssinatura })).status, 401);
  });
});

describe("listas e itens", () => {
  let token;
  let outroToken;

  before(async () => {
    token = (await chamar("POST", "/auth/login", { corpo: { nome: "JOAO EMANOEL", senha: "segredo1" } })).dados.token;
    outroToken = (await chamar("POST", "/auth/cadastro", { corpo: { nome: "Maria", senha: "segredo2" } })).dados.token;
  });

  test("ciclo completo: criar, adicionar, marcar, remover item e excluir lista", async () => {
    const criada = await chamar("POST", "/listas", { token, corpo: { nome: " mercado " } });
    assert.equal(criada.status, 201);
    assert.equal(criada.dados.nome, "MERCADO");
    const id = criada.dados.id;

    let r = await chamar("POST", `/listas/${id}/itens`, { token, corpo: { nome: "arroz" } });
    assert.equal(r.status, 200);
    r = await chamar("POST", `/listas/${id}/itens`, { token, corpo: { nome: "feijão" } });
    assert.deepEqual(r.dados.itens.map((i) => i.nome), ["ARROZ", "FEIJÃO"]);

    const repetido = await chamar("POST", `/listas/${id}/itens`, { token, corpo: { nome: "Arroz" } });
    assert.equal(repetido.status, 409);

    const arroz = r.dados.itens[0];
    r = await chamar("PATCH", `/listas/${id}/itens/${arroz.id}`, { token, corpo: { marcado: true } });
    assert.equal(r.dados.itens[0].marcado, true);
    assert.equal((await chamar("PATCH", `/listas/${id}/itens/${arroz.id}`, { token, corpo: { marcado: "sim" } })).status, 400);

    r = await chamar("DELETE", `/listas/${id}/itens/${arroz.id}`, { token });
    assert.deepEqual(r.dados.itens.map((i) => i.nome), ["FEIJÃO"]);
    assert.equal((await chamar("DELETE", `/listas/${id}/itens/${arroz.id}`, { token })).status, 404);

    assert.equal((await chamar("GET", "/listas", { token })).dados.length, 1);
    assert.equal((await chamar("DELETE", `/listas/${id}`, { token })).status, 204);
    assert.equal((await chamar("GET", `/listas/${id}`, { token })).status, 404);
  });

  test("um usuário não acessa as listas de outro", async () => {
    const { dados } = await chamar("POST", "/listas", { token, corpo: { nome: "particular" } });
    assert.equal((await chamar("GET", "/listas", { token: outroToken })).dados.length, 0);
    assert.equal((await chamar("GET", `/listas/${dados.id}`, { token: outroToken })).status, 404);
    assert.equal((await chamar("DELETE", `/listas/${dados.id}`, { token: outroToken })).status, 404);
    assert.equal((await chamar("POST", `/listas/${dados.id}/itens`, { token: outroToken, corpo: { nome: "x" } })).status, 404);
    assert.equal((await chamar("GET", `/listas/${dados.id}`, { token })).status, 200);
  });

  test("valida nomes de lista e item", async () => {
    assert.equal((await chamar("POST", "/listas", { token, corpo: { nome: "   " } })).status, 400);
    assert.equal((await chamar("POST", "/listas", { token, corpo: { nome: "x".repeat(61) } })).status, 400);
    assert.equal((await chamar("POST", "/listas", { token, corpo: {} })).status, 400);
  });
});

describe("sincronização (modo offline)", () => {
  let token;
  let op = 0;
  const nova = (dados) => ({ id: `op${++op}`, base: null, ...dados });
  const sincronizar = (operacoes, t = token) => chamar("POST", "/listas/sincronizar", { token: t, corpo: { operacoes } });

  before(async () => {
    token = (await chamar("POST", "/auth/cadastro", { corpo: { nome: "Offline", senha: "segredo3" } })).dados.token;
  });

  test("exige login e uma lista de operações", async () => {
    assert.equal((await chamar("POST", "/listas/sincronizar", { corpo: { operacoes: [] } })).status, 401);
    assert.equal((await sincronizar([])).status, 400);
    assert.equal((await chamar("POST", "/listas/sincronizar", { token, corpo: { operacoes: "x" } })).status, 400);
  });

  test("cria lista e itens com ids do aparelho e é idempotente ao reenviar", async () => {
    const ops = [
      nova({ tipo: "criarLista", listaId: "listaOffline1", nome: " feira " }),
      nova({ tipo: "adicionarItem", listaId: "listaOffline1", itemId: "item1", nome: "banana" }),
      nova({ tipo: "adicionarItem", listaId: "listaOffline1", itemId: "item2", nome: "maçã" }),
      nova({ tipo: "marcarItem", listaId: "listaOffline1", itemId: "item1", marcado: true }),
      nova({ tipo: "removerItem", listaId: "listaOffline1", itemId: "item2" }),
    ];
    let r = await sincronizar(ops);
    assert.equal(r.status, 200);
    assert.deepEqual(r.dados.conflitos, []);
    assert.deepEqual(r.dados.ignoradas, []);
    assert.equal(r.dados.listas.length, 1);
    assert.equal(r.dados.listas[0].nome, "FEIRA");
    assert.deepEqual(r.dados.listas[0].itens, [{ id: "item1", nome: "BANANA", marcado: true }]);

    // A resposta se perdeu e o aparelho reenvia tudo: nada duplica.
    r = await sincronizar(ops);
    assert.deepEqual(r.dados.listas[0].itens, [{ id: "item1", nome: "BANANA", marcado: true }]);
    assert.equal((await chamar("GET", "/listas", { token })).dados.length, 1);
  });

  test("detecta alteração feita em outro aparelho e aplica as alterações mesmo assim", async () => {
    const lista = (await chamar("GET", "/listas/listaOffline1", { token })).dados;
    const base = lista.atualizadoEm;

    // Outro aparelho adiciona um item depois que este ficou offline.
    await chamar("POST", "/listas/listaOffline1/itens", { token, corpo: { nome: "pão" } });

    const r = await sincronizar([
      nova({ tipo: "adicionarItem", listaId: "listaOffline1", itemId: "item3", nome: "leite", base }),
      nova({ tipo: "marcarItem", listaId: "listaOffline1", itemId: "item1", marcado: false, base }),
    ]);
    assert.deepEqual(r.dados.conflitos, ["listaOffline1"]);
    assert.deepEqual(r.dados.listas[0].itens.map((i) => [i.nome, i.marcado]), [
      ["BANANA", false],
      ["PÃO", false],
      ["LEITE", false],
    ]);
    assert.ok(Date.parse(r.dados.listas[0].atualizadoEm) > Date.parse(base));

    // Com a base atualizada, não há conflito.
    const semConflito = await sincronizar([
      nova({ tipo: "marcarItem", listaId: "listaOffline1", itemId: "item3", marcado: true, base: r.dados.listas[0].atualizadoEm }),
    ]);
    assert.deepEqual(semConflito.dados.conflitos, []);
  });

  test("pula operações impossíveis sem travar as outras", async () => {
    const r = await sincronizar([
      nova({ tipo: "adicionarItem", listaId: "listaOffline1", itemId: "item9", nome: "banana" }), // nome repetido
      nova({ tipo: "marcarItem", listaId: "listaOffline1", itemId: "naoExiste", marcado: true }),
      nova({ tipo: "adicionarItem", listaId: "listaOffline1", itemId: "item4", nome: "café" }),
      nova({ tipo: "adicionarItem", listaId: "listaApagada", itemId: "item5", nome: "x", base: new Date().toISOString() }),
      { id: "ruim", tipo: "apagarTudo", listaId: "listaOffline1" },
      nova({ tipo: "adicionarItem", listaId: "../outro-usuario", itemId: "i", nome: "x" }),
    ]);
    assert.equal(r.status, 200);
    assert.deepEqual(r.dados.ignoradas.map((i) => i.id).sort(), ["op10", "op12", "op13", "op9", "ruim"].sort());
    assert.ok(r.dados.listas[0].itens.some((i) => i.nome === "CAFÉ"));
    assert.ok(r.dados.excluidas.includes("listaApagada"));
    assert.ok(r.dados.conflitos.includes("listaApagada"));
  });

  test("exclui lista; criar e excluir offline não grava nada", async () => {
    let r = await sincronizar([
      nova({ tipo: "criarLista", listaId: "temporaria", nome: "rascunho" }),
      nova({ tipo: "excluirLista", listaId: "temporaria" }),
      nova({ tipo: "excluirLista", listaId: "listaOffline1" }),
    ]);
    assert.deepEqual(r.dados.excluidas.sort(), ["listaOffline1", "temporaria"]);
    assert.equal((await chamar("GET", "/listas", { token })).dados.length, 0);
  });

  test("um usuário não sincroniza nas listas de outro", async () => {
    const dono = (await chamar("POST", "/auth/login", { corpo: { nome: "JOAO EMANOEL", senha: "segredo1" } })).dados.token;
    const { dados } = await chamar("POST", "/listas", { token: dono, corpo: { nome: "alheia" } });
    const r = await sincronizar([nova({ tipo: "adicionarItem", listaId: dados.id, itemId: "intruso", nome: "x" })]);
    assert.deepEqual(r.dados.listas, []);
    assert.equal((await chamar("GET", `/listas/${dados.id}`, { token: dono })).dados.itens.length, 0);
  });
});

describe("cabeçalhos", () => {
  test("CORS só libera as origens configuradas; respostas não vão para cache", async () => {
    const liberada = await fetch(base + "/", { headers: { Origin: "http://localhost:5173" } });
    assert.equal(liberada.headers.get("access-control-allow-origin"), "http://localhost:5173");
    const bloqueada = await fetch(base + "/", { headers: { Origin: "https://site-malicioso.example" } });
    assert.equal(bloqueada.headers.get("access-control-allow-origin"), null);
    assert.equal(liberada.headers.get("cache-control"), "no-store");
    assert.equal(liberada.headers.get("x-powered-by"), null);
  });
});
