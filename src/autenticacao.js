// Senhas (hash com bcrypt) e tokens (JWT assinado com HS256).
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ErroHttp } from "./validacao.js";

// Custo 11: ~2^11 rodadas. Lento o bastante para atrapalhar força bruta,
// rápido o bastante para um login em função serverless.
const CUSTO_BCRYPT = 11;
const EMISSOR = "listas-api";

export const gerarHash = (senha) => bcrypt.hash(senha, CUSTO_BCRYPT);

// Hash fixo usado quando o usuário não existe: a resposta leva o mesmo tempo
// nos dois casos, e ninguém descobre quais nomes estão cadastrados pelo relógio.
const HASH_FALSO = bcrypt.hashSync("senha-que-nao-existe", CUSTO_BCRYPT);

export async function conferirSenha(senha, hash) {
  const ok = await bcrypt.compare(senha, hash ?? HASH_FALSO);
  return ok && Boolean(hash);
}

export function emitirToken(usuario, { segredo, validade }) {
  return jwt.sign({ nome: usuario.nome }, segredo, {
    algorithm: "HS256",
    subject: usuario.id,
    issuer: EMISSOR,
    expiresIn: validade,
  });
}

/** Middleware: exige "Authorization: Bearer <token>" e coloca o usuário em req.usuario. */
export function exigirLogin({ segredo }) {
  return (req, res, next) => {
    const [tipo, token] = (req.get("authorization") ?? "").split(" ");
    if (tipo !== "Bearer" || !token) {
      return next(new ErroHttp(401, "Faça login para continuar"));
    }
    try {
      // O algoritmo é fixado: impede tokens forjados com "alg: none" ou outro algoritmo.
      const dados = jwt.verify(token, segredo, { algorithms: ["HS256"], issuer: EMISSOR });
      req.usuario = { id: dados.sub, nome: dados.nome };
      next();
    } catch {
      next(new ErroHttp(401, "Sessão expirada. Faça login novamente"));
    }
  };
}
