// Lê e valida as variáveis de ambiente uma única vez.
// Falhar cedo (na inicialização) é melhor do que descobrir no primeiro login.
import { randomBytes } from "node:crypto";

export function lerConfig({ permitirSegredoTemporario = false } = {}) {
  let segredo = process.env.JWT_SECRET ?? "";

  if (segredo.length < 32) {
    if (!permitirSegredoTemporario) {
      throw new Error(
        "JWT_SECRET ausente ou curto demais (mínimo 32 caracteres). Gere um com: npm run segredo"
      );
    }
    segredo = randomBytes(48).toString("base64url");
    console.warn("aviso: JWT_SECRET não definido; usando um segredo temporário (só para desenvolvimento)");
  }

  const origens = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

  return {
    segredo,
    validade: process.env.JWT_EXPIRES_IN || "30d",
    origens,
  };
}
