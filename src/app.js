// Monta o app Express. O repositório (Firestore ou memória) e a configuração
// chegam por parâmetro, o que permite testar a API sem tocar no banco real.
import express from "express";
import cors from "cors";
import { rotasAuth } from "./routes/auth.js";
import { rotasListas } from "./routes/listas.js";
import { ErroHttp } from "./validacao.js";

export function criarApp({ repo, config }) {
  const app = express();

  app.disable("x-powered-by");
  // Atrás do proxy da Vercel: o IP real do cliente vem em X-Forwarded-For (usado no limite de tentativas).
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: config.origens.includes("*") ? "*" : config.origens,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400, // o navegador guarda a resposta do "preflight" por 1 dia
    })
  );
  app.use(express.json({ limit: "10kb" }));

  // Respostas com dados do usuário nunca devem ficar em cache compartilhado.
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  app.get("/", (req, res) => {
    res.json({ status: "ok", mensagem: "API Listas no ar" });
  });

  app.use("/auth", rotasAuth({ repo, config }));
  app.use("/listas", rotasListas({ repo, config }));

  app.use((req, res) => {
    res.status(404).json({ erro: "Rota não encontrada" });
  });

  // Express 5 encaminha para cá também os erros lançados em funções async.
  app.use((err, req, res, next) => {
    if (err instanceof ErroHttp) return res.status(err.status).json({ erro: err.message });
    if (err.type === "entity.parse.failed") return res.status(400).json({ erro: "JSON inválido" });
    if (err.type === "entity.too.large") return res.status(413).json({ erro: "Requisição grande demais" });
    console.error(err);
    // Detalhes de erros internos ficam no log, não na resposta.
    res.status(500).json({ erro: "Erro interno" });
  });

  return app;
}
