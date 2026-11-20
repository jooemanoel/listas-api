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
  operacoesPorSincronizacao: 500,
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

// ---------- Sincronização (alterações feitas offline no aparelho) ----------

// Ids gerados no aparelho (listas, itens e as próprias operações): letras, números, _ e -.
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const TIPOS = new Set(["criarLista", "excluirLista", "adicionarItem", "marcarItem", "removerItem"]);

function id(op, campo) {
  const valor = op[campo];
  if (typeof valor !== "string" || !ID.test(valor)) throw new ErroHttp(400, `Campo "${campo}" inválido`);
  return valor;
}

/** Corpo de POST /listas/sincronizar: { operacoes: [...] }. Só a estrutura geral; cada operação é validada à parte. */
export function validarLote(corpo) {
  const ops = corpo?.operacoes;
  if (!Array.isArray(ops) || ops.length === 0) throw new ErroHttp(400, 'Campo "operacoes" deve ser uma lista não vazia');
  if (ops.length > LIMITES.operacoesPorSincronizacao) {
    throw new ErroHttp(400, `No máximo ${LIMITES.operacoesPorSincronizacao} operações por vez`);
  }
  return ops;
}

/**
 * Uma operação da fila do aparelho. Lança ErroHttp se for inválida; quem chama decide
 * se a ignora (para uma operação ruim não travar a fila inteira).
 *   { id, tipo, listaId, base, itemId?, nome?, marcado? }
 * `base` é o atualizadoEm da lista que o aparelho conhecia ao fazer a alteração (ou null).
 */
export function validarOperacao(op) {
  if (!op || typeof op !== "object" || Array.isArray(op)) throw new ErroHttp(400, "Operação inválida");
  if (!TIPOS.has(op.tipo)) throw new ErroHttp(400, "Tipo de operação desconhecido");

  const valida = { id: id(op, "id"), tipo: op.tipo, listaId: id(op, "listaId"), base: null };
  if (op.base != null) {
    if (typeof op.base !== "string" || Number.isNaN(Date.parse(op.base))) throw new ErroHttp(400, 'Campo "base" inválido');
    valida.base = op.base;
  }

  switch (op.tipo) {
    case "criarLista":
      valida.nome = validarNome(op, LIMITES.nomeLista);
      break;
    case "adicionarItem":
      valida.itemId = id(op, "itemId");
      valida.nome = validarNome(op, LIMITES.nomeItem);
      break;
    case "marcarItem":
      valida.itemId = id(op, "itemId");
      valida.marcado = validarMarcado(op);
      break;
    case "removerItem":
      valida.itemId = id(op, "itemId");
      break;
  }
  return valida;
}
