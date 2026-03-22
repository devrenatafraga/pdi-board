# 🎲 PDI Board

App web estilo jogo de tabuleiro para acompanhar seu **Plano de Desenvolvimento Individual** (PDI), construído com **Node.js + Express** no backend e **JS/HTML/CSS** no frontend.

## 🚀 Visão geral do projeto

- Backend: `server/` com rota API REST e layer de repositório para dados.
- Frontend: `client/` com UI no browser e consumo de API via `fetch`.
- Persistência: `server/data.json` e suporte de migração em SQL (se DB relacional estiver configurado).
- Testes: `server/__tests__/` com `jest` + `supertest`.

## 📁 Estrutura do projeto

```
pdi-board/
├── server/
│   ├── index.js
│   ├── data.json
│   ├── routes/
│   │   ├── api.js
│   │   └── reports.js
│   ├── db/
│   │   ├── pool.js
│   │   ├── migrations/001_initial.sql
│   │   └── repositories/
│   │       ├── checkpointRepo.js
│   │       ├── evidenceRepo.js
│   │       ├── oneOnOneRepo.js
│   │       ├── pdiRepo.js
│   │       └── themeRepo.js
│   └── __tests__/
│       ├── api.test.js
│       └── repositories.test.js
├── client/
│   ├── index.html
│   ├── css/
│   │   ├── main.css
│   │   ├── board.css
│   │   └── scoreboard.css
│   └── js/
│       ├── api.js
│       ├── app.js
│       ├── board.js
│       ├── evidence.js
│       ├── reports.js
│       ├── scoreboard.js
│       ├── setup.js
│       └── token.js
├── package.json
├── docker-compose.yml
└── README.md
```

## 🧩 Dependências principais

- `express` (server)
- `body-parser` (req body parsing se necessário)
- `jest` (testes unitários e integrados)
- `supertest` (testes de rotas HTTP)
- `sqlite3` ou `pg` (DB driver)
- `knex` ou ORM leve opcional
- `nodemon` (dev)

## ⚙️ Pré-requisitos

- Node.js v18+

## 📥 Instalação

```bash
cd pdi-board
npm install
```

## ▶️ Execução

```bash
npm start
```

Acessar: `http://localhost:3000`

```bash
npm run dev
```

## 🛠️ Boas práticas de backend Node.js

- Arquitetura em camadas (rotas, serviços, repositórios)
- `async/await` + `try/catch` para controle de erros
- Resposta uniforme via `HttpError` (status, message)
- Configuração via `process.env` + `dotenv` + validação (`joi`, `zod`)
- Fechamento explícito de conexões (`pool.end()`)
- Evitar mutação global (`Object.freeze` em constantes)
- Separar lógica de negócios de handlers Express (funções puras testáveis)

## 🌐 Padrões de HTTP client

- Usar `fetch` ou `axios` com:
  - timeout e retry configuráveis
  - tratamento de status 2xx/4xx/5xx
  - parsing JSON seguro e fallback de erro
- Implementar wrapper em `client/js/api.js` como:
  - `getThemes`, `createCheckpoint`, `updateEvidence`, `fetchReport`
- Camada de interceptors (auth, logging, refresh token)
- DTOs/data mappers para separar contrato API de estado da UI

## 🔁 Programação assíncrona e funcional

- Paralelismo com `Promise.all` / `Promise.allSettled`
- Evitar `forEach` com `async` (usar `for...of` ou `map` + `Promise.all`)
- Funções puras e composição (`compose`, `pipe`)
- Imutabilidade local (`{ ...state, campo: valor }`)
- Higher-order functions para retry, cache, validação

## 🧪 Testes unitários

- `jest` para funções puras: mappers, validadores e regras de negócio
- Mock de dependências (`jest.mock`) para repositórios e DB
- Cobertura de branches de sucesso e erro
- `describe.each` para parametrização de casos

## 🔗 Testes integrados

- Roteamento HTTP com `supertest`
- App Express importado para teste com `beforeAll/afterAll`
- DB em memória ou transações rollback entre testes
- Verificar contratos:
  - status: `200`, `201`, `400`, `404`, `500`
  - headers `Content-Type: application/json`
  - payload e mensagens de erro

## 🧹 Qualidade de código

- `eslint`, `prettier` para formatação
- `husky` + `lint-staged` em pré-commit (opcional)
- Documentar com `README.md`, `API docs` e exemplos `curl`
- Migrations e rollback para esquema de banco

## 🧾 API REST

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/data` | Retorna todos os dados |
| PUT | `/api/config` | Salva configuração |
| PUT | `/api/themes/:id` | Atualiza tema |
| PUT | `/api/checkpoints/:themeId/:id` | Atualiza checkpoint |
| POST | `/api/oneOnOnes` | Registra 1:1 |
| DELETE | `/api/oneOnOnes/:id` | Remove 1:1 |
| POST | `/api/evidence` | Adiciona evidência |
| DELETE | `/api/evidence/:id` | Remove evidência |

## 🔍 SonarCloud

1. Criar projeto `devrenatafraga/pdi-board` no SonarCloud
2. Gerar `SONAR_TOKEN` e adicionar no GitHub Secrets
3. Workflow de CI faz análise em push/PR

---

## 💡 Uso rápido do app

1. Navegar para setup inicial (nome, data, temas, checkpoints)
2. Atualizar checkpoints durante o PDI
3. Registrar 1:1s e evidências
4. Ver placar de progresso e relatório
