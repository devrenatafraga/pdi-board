# 🎲 PDI Board

App web estilo jogo de tabuleiro para acompanhar seu **Plano de Desenvolvimento Individual**.

## Funcionalidades

- 🎨 **3 trilhas temáticas** com cores personalizáveis  
- 📅 **8 checkpoints por tema** (2 por mês, 4 meses)  
- 🏠 **Casas especiais**: Start 🚀, Bônus 🎁, Retrocesso ⚠️, Milestone 🏆  
- 🎯 **Peão arrastável** ao longo da trilha  
- 📋 **Modal de checkpoint**: editar título, status, pontos e notas  
- 🏆 **Placar geral** com histórico de reuniões 1:1  
- 📌 **Parede de Evidências**: links de PRs, certificados, elogios  
- 💾 **Persistência** em arquivo JSON no servidor  

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior

## Instalação

```bash
# Clone ou acesse o diretório do projeto
cd pdi-board

# Instale as dependências
npm install
```

## Como rodar

```bash
npm start
```

Acesse em: **http://localhost:3000**

Para desenvolvimento com hot reload:
```bash
npm run dev
```

## Primeiro acesso

Ao abrir o app pela primeira vez, o **wizard de setup** será exibido:

1. **Informações do PDI**: nome e data de início  
2. **Temas**: defina os 3 temas (nome + cor)  
3. **Checkpoints**: nomeie os 8 checkpoints de cada tema  

Após o setup, o tabuleiro é gerado automaticamente.

## Estrutura do projeto

```
pdi-board/
├── server/
│   ├── index.js          # Express server (porta 3000)
│   ├── data.json         # Dados persistidos (auto-criado)
│   └── routes/api.js     # API REST
├── client/
│   ├── index.html
│   ├── css/
│   │   ├── main.css
│   │   ├── board.css
│   │   └── scoreboard.css
│   └── js/
│       ├── api.js        # Wrapper fetch
│       ├── app.js        # Inicialização e navegação
│       ├── setup.js      # Wizard de configuração
│       ├── board.js      # Renderização das trilhas
│       ├── token.js      # Drag-and-drop do peão
│       ├── scoreboard.js # Placar e histórico 1:1s
│       └── evidence.js   # Parede de evidências
└── package.json
```

## Dinâmica quinzenal dos 1:1s

1. **Antes**: Revise o board e prepare os pontos do checkpoint  
2. **Durante**: Abra o tema, mova o peão, atualize status/pontos/notas  
3. **Após**: Registre o 1:1 no Placar (**🏆 Placar** → **+ Registrar 1:1**)  

## API REST

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
