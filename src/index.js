// Servidor local. Na Vercel, o ponto de entrada é api/index.js.
//   npm run dev          -> Firestore (precisa do .env)
//   npm run dev:memoria  -> dados em memória, sem credenciais (para testar o front-end)
import { criarApp } from "./app.js";
import { lerConfig } from "./config.js";

const memoria = process.argv.includes("--memoria");

const repo = memoria
  ? (await import("./repositorios/memoria.js")).criarRepositorioMemoria()
  : (await import("./repositorios/firestore.js")).criarRepositorioFirestore();

const app = criarApp({ repo, config: lerConfig({ permitirSegredoTemporario: memoria }) });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}${memoria ? " (dados em memória)" : ""}`);
});
