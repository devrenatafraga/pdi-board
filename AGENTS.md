# Project Overview: PDI Board

Este repositório implementa uma aplicação de quadro de PDI (Plano de Desenvolvimento Individual) com backend Node.js/Express e frontend JS + HTML/CSS. A arquitetura é leve e organizada em camadas, com foco em gerenciamento de temas, checkpoints, evidências e relatórios.

## Estrutura de pastas

- `server/`: backend Node.js
  - `index.js`: ponto de entrada do servidor. 
  - `routes/`: rota REST (API, reports)
  - `db/`: abstrações e migrações de banco de dados
    - `pool.js`: configuração do pool de conexões (SQLite/Postgres etc.)
    - `migrations/`: scripts SQL de versão
    - `repositories/`: CRUD e regras de acesso a dados
  - `__tests__/`: testes Jest para rotas e repositórios
- `client/`: frontend estático (HTML/CSS/JS)
  - `js/`: lógica de UI, chamadas API e organização de páginas
- `coverage/`: relatório de cobertura de testes
- `docker-compose.yml`: orquestração de containers (se aplicável)
- `package.json`: dependências e scripts
- `README.md`: documentação de uso e setup

## Dependências e árvore de pacotes típicas

1. `express` (API server)
2. `body-parser` (middleware de JSON / form data em versões antigas de Express)
3. `jest` (unit + integration tests)
4. `supertest` (testes de rotas HTTP)
5. `sqlite3` ou `pg` (driver DB)
6. `knex` ou ORM leve, quando presente
7. `nodemon` (dev)

> Em projetos similares, camadas se conectam assim:
> - `routes` usa `repositories` para persistência
> - `repositories` usa `db/pool` para query
> - `tests/__tests__` usam `supertest` e `mock` ou DB de teste

# Melhores práticas Node.js / backend

- Seguir padrão MVC ou Clean Architecture: separação clara entre rota, serviço e repositório.
- Usar `async/await` com `try/catch` e erros customizados (e.g. `HttpError`) para respostas HTTP uniformes.
- Não acoplar lógica de negócio à camada de Express. Exportar funções puras para testes unitários.
- Configurar variáveis ambientais (`process.env`) com `dotenv` e validar usando `joi` ou `zod`.
- Garantir fechamento correto de conexões e transações (`pool.end()` em shutdown / testes).
- Evitar mutação global; usar `Object.freeze` para constantes compartilhadas.

# Padrões de HTTP client / API client

- Utilizar cliente `fetch` (nativo) ou `axios` no frontend/contexto Node:
  - `timeout` e `retry` controlados.
  - tratamento de status 2xx/4xx/5xx e parsing JSON seguro.
  - encapsular chamadas em uma camada `api.js` com métodos:
    - `getThemes()`, `createCheckpoint()`, `updateEvidence(id, body)` etc.
- Implementar interceptadores (interceptors) para auth token, logs e refresh de token.
- Usar DTOs e transformação de dados (data mappers) para separar API/Model.

# Programação assíncrona e funcional

- Prefira `Promise.allSettled`/`Promise.all` para executar várias chamadas em paralelo quando possível.
- Use funções puras e composição:
  - `const formatEvidence = compose(toCamelCase, removeNulls, toApiShape)`
- Não use `forEach` com `async`; use `for...of` ou `map` + `Promise.all`.
- Local-immutability:
  - `const nextState = { ...currentState, field: value }`
- Funções de ordem superior para abstrair controles comuns (retry, cache, validation).

# Testes unitários

- Cobertura de unidade para funções puras (mappers, calculadores, validações) em `server/__tests__/unit`.
- Simular dependências com `jest.mock` para repositórios/DB, mantendo testes rápidos.
- Verificar branch coverage de erros e sucesso.
- Usar `describe.each` para casos de inputs variados.

# Testes integrados

- Testar rotas com `supertest` e uma instância de app Express.
- Usar um banco de dados em memória (SQLite) ou sandbox transacional para isolar cada teste.
- Iniciar e finalizar servidor em `beforeAll/afterAll`, limpar dados em `beforeEach/afterEach`.
- Validar contratos HTTP:
  - códigos: 200/201/400/404/500
  - headers (JSON content-type, CORS)
  - payload e mensagens de erro.

# Qualidade de código e manutenção

- Configurar `eslint` e `prettier` (rules de semicolons, arrow-parens, no-console em produção).
- Usar `husky` + `lint-staged` (opcional) para checks pré-commit.
- Documentar endpoints e dados com `README.md` e exemplos `curl`.
- Controle de versões de schema: migration scripts com rollback (novas colunas, índices).

# Dicas específicas para este projeto

- Repositórios existentes (`checkpointRepo`, `evidenceRepo`, `oneOnOneRepo`, `pdiRepo`, `themeRepo`) devem usar interface consistente:
  - `findAll`, `findById`, `create`, `update`, `delete`
- `routes/api.js` deve ser uma rota modular: `router.use('/checkpoints', checkpointRouter)` etc.
- Relatórios em `routes/reports.js` devem ser cacheáveis e com limite/paginação.

---

## Resumo rápido

1. Coworking entre pastas: `routes` -> `repositories` -> `db`.
2. `async/await`, `try/catch`, erros HTTP e separação de camadas.
3. `jest` + `supertest` para validações unit/integration.
4. Adotar estilo funcional e imutabilidade para reduzir bugs.
5. Teste e documentação sempre antes de merge.
