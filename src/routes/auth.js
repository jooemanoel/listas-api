import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { conferirSenha, emitirToken, exigirLogin, gerarHash } from "../autenticacao.js";
import { ErroHttp, validarCredenciais } from "../validacao.js";

export function rotasAuth({ repo, config }) {
  const router = Router();

  // Limita tentativas por IP (contra adivinhação de senha).
  // Na Vercel cada instância tem seu próprio contador: é uma barreira, não uma garantia.
  const limitar = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.limiteTentativas ?? 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo" },
  });

  const resposta = (usuario) => ({
    token: emitirToken(usuario, config),
    usuario: { id: usuario.id, nome: usuario.nome },
  });

  router.post("/cadastro", limitar, async (req, res) => {
    const { nome, senha } = validarCredenciais(req.body, { cadastro: true });
    const senhaHash = await gerarHash(senha);
    const criado = await repo.criarUsuario({ id: nome, nome, senhaHash });
    if (!criado) throw new ErroHttp(409, "Este nome de usuário já está em uso");
    res.status(201).json(resposta({ id: nome, nome }));
  });

  router.post("/login", limitar, async (req, res) => {
    const { nome, senha } = validarCredenciais(req.body);
    const usuario = await repo.buscarUsuario(nome);
    // Mesma mensagem para "não existe" e "senha errada": não revela quem está cadastrado.
    if (!(await conferirSenha(senha, usuario?.senhaHash))) {
      throw new ErroHttp(401, "Usuário ou senha incorretos");
    }
    res.json(resposta(usuario));
  });

  // Confere se o token salvo no aparelho ainda vale.
  router.get("/eu", exigirLogin(config), (req, res) => {
    res.json({ usuario: req.usuario });
  });

  return router;
}
