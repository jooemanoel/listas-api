// Regras dos dados recebidos. Tudo que vem do cliente passa por aqui antes de chegar ao banco.

export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export const LIMITES = {
  nomeUsuario: { min: 3, max: 40 },
  senha: { min: 6, max: 64 }, // bcrypt só considera os primeiros 72 bytes
  nomeLista: 60,
  nomeItem: 100,
  listasPorUsuario: 200,
  itensPorLista: 500,
};

/**
 * Mesmo formato do app antigo: maiúsculas, sem acentos, só letras e espaços.
 * "  João  Emanoel " -> "JOAO EMANOEL". O resultado também é o id do documento do usuário.
 */
export function normalizarNomeUsuario(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Nomes de listas e itens: espaços aparados e em maiúsculas (como no app antigo). */
export function normalizarTexto(valor) {
  return String(valor ?? "").replace(/\s+/g, " ").trim().toUpperCase();
}

function texto(corpo, campo) {
  const valor = corpo?.[campo];
  if (typeof valor !== "string") throw new ErroHttp(400, `Campo "${campo}" é obrigatório`);
  return valor;
}

export function validarCredenciais(corpo, { cadastro = false } = {}) {
  const nome = normalizarNomeUsuario(texto(corpo, "nome"));
  const senha = texto(corpo, "senha");

  if (!nome) throw new ErroHttp(400, "Informe o nome de usuário");
  if (!senha) throw new ErroHttp(400, "Informe a senha");
  if (senha.length > LIMITES.senha.max) {
    throw new ErroHttp(400, `A senha deve ter no máximo ${LIMITES.senha.max} caracteres`);
  }

  // As regras de tamanho mínimo valem só para contas novas:
  // usuários migrados do app antigo podem ter nomes e senhas mais curtos.
  if (cadastro) {
    const { min, max } = LIMITES.nomeUsuario;
    if (nome.length < min || nome.length > max) {
      throw new ErroHttp(400, `O nome deve ter entre ${min} e ${max} letras`);
    }
    if (senha.length < LIMITES.senha.min) {
      throw new ErroHttp(400, `A senha deve ter pelo menos ${LIMITES.senha.min} caracteres`);
    }
  }
  return { nome, senha };
}

export function validarNome(corpo, maximo) {
  const nome = normalizarTexto(texto(corpo, "nome"));
  if (!nome) throw new ErroHttp(400, "Informe o nome");
  if (nome.length > maximo) throw new ErroHttp(400, `O nome deve ter no máximo ${maximo} caracteres`);
  return nome;
}

export function validarMarcado(corpo) {
  if (typeof corpo?.marcado !== "boolean") {
    throw new ErroHttp(400, 'Campo "marcado" deve ser true ou false');
  }
  return corpo.marcado;
}
