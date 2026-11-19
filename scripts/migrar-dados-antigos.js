// Copia os dados do app antigo (listas-estatico, em Angular) para a estrutura nova.
//
// Antes:
//   usuarios/{id-aleatório}      { nome, senha }               <- senha em texto puro
//   {NOME DO USUÁRIO}/{id}       { nome, itens: [{ nome, checked }] }
// Depois:
//   listas_usuarios/{NOME}               { nome, senhaHash, criadoEm }
//   listas_usuarios/{NOME}/listas/{id}   { nome, itens: [{ id, nome, marcado }], criadoEm, atualizadoEm }
//
// Nada é apagado: o app antigo continua funcionando até você desligá-lo.
// Usuários que já existem na estrutura nova são pulados (pode rodar mais de uma vez).
//
// Uso:
//   npm run migrar              -> só mostra o que seria feito
//   npm run migrar -- --gravar  -> grava de verdade
import { randomBytes } from "node:crypto";
import { gerarHash } from "../src/autenticacao.js";
import { COLECAO_USUARIOS, conectarFirestore } from "../src/repositorios/firestore.js";
import { normalizarNomeUsuario, normalizarTexto } from "../src/validacao.js";

const gravar = process.argv.includes("--gravar");
const db = conectarFirestore();

console.log(gravar ? "MODO GRAVAÇÃO\n" : "Simulação (nada será gravado). Use --gravar para aplicar.\n");

const antigos = await db.collection("usuarios").get();
let migrados = 0;

for (const doc of antigos.docs) {
  const { nome: nomeAntigo, senha } = doc.data();
  const nome = normalizarNomeUsuario(nomeAntigo);

  if (!nome || typeof senha !== "string") {
    console.log(`- ignorado ${doc.id}: sem nome ou senha`);
    continue;
  }

  const destino = db.collection(COLECAO_USUARIOS).doc(nome);
  if ((await destino.get()).exists) {
    console.log(`- ${nome}: já migrado`);
    continue;
  }

  // O app antigo guardava as listas numa coleção com o nome do usuário.
  const listas = await db.collection(nomeAntigo).get();
  console.log(`+ ${nome}: ${listas.size} lista(s)`);
  if (!gravar) continue;

  const lote = db.batch();
  const agora = new Date();
  lote.create(destino, { nome, senhaHash: await gerarHash(senha), criadoEm: agora });

  for (const lista of listas.docs) {
    const dados = lista.data();
    const vistos = new Set();
    const itens = (dados.itens ?? [])
      .map((i) => ({ nome: normalizarTexto(i.nome), marcado: Boolean(i.checked) }))
      .filter((i) => i.nome && !vistos.has(i.nome) && vistos.add(i.nome))
      .map((i) => ({ id: randomBytes(6).toString("base64url"), ...i }));

    lote.set(destino.collection("listas").doc(lista.id), {
      nome: normalizarTexto(dados.nome) || "SEM NOME",
      itens,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }
  await lote.commit(); // usuário e listas entram juntos, ou nada entra
  migrados++;
}

console.log(`\n${gravar ? "Migrados" : "Seriam migrados"}: ${gravar ? migrados : "ver itens com +"} de ${antigos.size} usuário(s).`);
