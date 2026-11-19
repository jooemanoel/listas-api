# listas-api

API em Express para o app **Listas** ([listas-vue](../listas-vue)). Faz a ponte entre o
front-end e o Firestore: o navegador nunca fala com o banco diretamente.

## O que mudou em relação ao listas-estatico (Angular)

| Problema no app antigo | Como está agora |
|---|---|
| O front-end lia e gravava no Firestore com o SDK web: qualquer pessoa com a `apiKey` (pública no JS) acessava todas as coleções | O front-end só conversa com a API. A API usa o **firebase-admin** com conta de serviço, e as regras do Firestore podem bloquear o navegador |
| O login baixava **todos os usuários com as senhas** para o navegador e comparava lá | O login acontece no servidor; a senha nunca sai dele |
| Senhas em texto puro no banco | **bcrypt** (custo 11) |
| O `localStorage` guardava o usuário inteiro (com a senha); bastava editar o JSON para "virar" outra pessoa | O aparelho guarda só um **JWT** assinado (HS256, validade configurável). O id do usuário sai do token, nunca de um parâmetro do cliente |
| "Usuário não encontrado" × "Senha incorreta" revelava quem tinha conta | Mensagem única e tempo de resposta igual nos dois casos |
| Sem limite de tentativas | 20 tentativas de login/cadastro a cada 15 min por IP |
| Itens identificados pelo nome (dois iguais se confundiam) e regravação da lista inteira a cada clique | Cada item tem `id`; alterações em transação (dois aparelhos não sobrescrevem um ao outro) |

## Comandos

```bash
npm install
npm run dev:memoria   # sem credenciais: dados em memória (bom para testar o front-end)
npm run dev           # com o Firestore (precisa do .env)
npm test              # testes de ponta a ponta (usam o repositório em memória)
npm run segredo       # gera um valor para JWT_SECRET
npm run migrar        # simula a migração dos dados antigos (--gravar para aplicar)
```

## Rotas

Todas recebem e devolvem JSON. Erros vêm como `{ "erro": "mensagem" }`.

| Método | Caminho | Corpo | Resposta |
|---|---|---|---|
| POST | `/auth/cadastro` | `{ nome, senha }` | `201 { token, usuario }` |
| POST | `/auth/login` | `{ nome, senha }` | `{ token, usuario }` |
| GET | `/auth/eu` | — | `{ usuario }` |
| GET | `/listas` | — | `[lista]` (ordem alfabética) |
| POST | `/listas` | `{ nome }` | `201 lista` |
| GET | `/listas/:id` | — | `lista` |
| DELETE | `/listas/:id` | — | `204` |
| POST | `/listas/:id/itens` | `{ nome }` | `lista` |
| PATCH | `/listas/:id/itens/:itemId` | `{ marcado }` | `lista` |
| DELETE | `/listas/:id/itens/:itemId` | — | `lista` |

As rotas de `/listas` e `/auth/eu` exigem `Authorization: Bearer <token>`.
Formato da lista: `{ id, nome, itens: [{ id, nome, marcado }], criadoEm, atualizadoEm }`.

Como no app antigo, nomes de usuário viram maiúsculas sem acento (`João` → `JOAO`),
e nomes de listas e itens ficam em maiúsculas.

## Configuração

1. **Conta de serviço**: Firebase Console → ⚙ Configurações do projeto → Contas de serviço →
   *Gerar nova chave privada*. Do JSON baixado, copie `project_id`, `client_email` e
   `private_key` para o `.env` (veja [.env.example](.env.example)). **Não** coloque o arquivo
   no repositório (o `.gitignore` já bloqueia os nomes padrão).
2. `cp .env.example .env`, preencha, e gere o `JWT_SECRET` com `npm run segredo`.

## Deploy na Vercel

1. Importe o repositório na Vercel (sem framework, sem build: o `vercel.json` já manda tudo para `api/index.js`).
2. Em *Settings → Environment Variables*, cadastre: `JWT_SECRET`, `JWT_EXPIRES_IN`,
   `CORS_ORIGINS` (ex.: `https://jooemanoel.github.io`), `FIREBASE_PROJECT_ID`,
   `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` (cole a chave inteira, com os `\n`).
3. Se a API ficar em outro endereço que não `https://listas-api.vercel.app`, ajuste o
   `.env.production` do listas-vue.

## Migração dos dados antigos

```bash
npm run migrar              # mostra quem seria migrado
npm run migrar -- --gravar  # copia usuários (com hash da senha) e listas
```

O script **copia** de `usuarios` + coleção-por-usuário para `listas_usuarios/{NOME}/listas`,
sem apagar nada. Pode rodar de novo: quem já foi migrado é pulado. Quem se cadastrar no app
antigo depois da migração precisa de uma nova rodada.

## Depois da migração: fechar o banco

O firebase-admin ignora as regras do Firestore, então a API continua funcionando com tudo
bloqueado para o navegador. Quando o app antigo for desligado:

1. Apague a coleção `usuarios` e as coleções com nomes de usuários (elas ainda têm as senhas em texto puro e ficam legíveis por qualquer um enquanto as regras permitirem).
2. Bloqueie as coleções do Listas nas regras do Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Só a listas-api (firebase-admin) acessa.
    match /listas_usuarios/{documento=**} {
      allow read, write: if false;
    }
    // ...regras das outras coleções do projeto
  }
}
```

> **Atenção (questoes-rapidas-api):** ela usa o SDK *web* do Firebase no servidor, então
> depende de regras abertas para a coleção `questoes` — e qualquer um com a `apiKey` pode
> gravar nela. Vale migrá-la para o firebase-admin, do mesmo jeito que aqui, e então
> fechar o banco inteiro (`match /{documento=**} { allow read, write: if false; }`).

## Estrutura

```
api/index.js                  entrada da função na Vercel
src/app.js                    Express: CORS, JSON, rotas, tratamento de erros
src/config.js                 variáveis de ambiente (falha cedo se faltar o JWT_SECRET)
src/autenticacao.js           bcrypt, emissão e verificação do JWT
src/validacao.js              normalização e limites dos dados recebidos
src/routes/                   /auth e /listas
src/repositorios/firestore.js acesso ao Firestore (firebase-admin)
src/repositorios/memoria.js   mesma interface, em memória (testes e dev:memoria)
scripts/migrar-dados-antigos.js
test/api.test.js
```

## Limitações conhecidas

- **Sair não invalida o token** no servidor: o aparelho apenas o descarta. Um token copiado
  continua válido até expirar (`JWT_EXPIRES_IN`). Para derrubar todas as sessões, troque o `JWT_SECRET`.
- O limite de tentativas é por instância da função; para um limite global seria preciso um
  armazenamento compartilhado (ex.: Upstash Redis).
- Não há troca de senha nem exclusão de conta.
