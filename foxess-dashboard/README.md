# Dashboard Próprio de Monitoramento FoxESS

Este projeto é um dashboard de monitoramento para usinas solares, construído conforme especificação estrita, separando frontend e backend, ocultando a API key de ambientes públicos e utilizando um banco de dados SQLite.

## Estrutura do Projeto

* `backend/`: Node.js + Express + SQLite
* `frontend/`: HTML, CSS e JS puros
* `package.json`: Dependências

## Instalação e Execução

### Pré-requisitos
* Node.js (v14 ou superior)
* npm

### Passos

1. Entre no diretório do projeto:
   ```bash
   cd foxess-dashboard
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure a API Key:
   Renomeie o arquivo `.env.example` para `.env` e substitua `SUA_CHAVE_AQUI` pela sua API Key real (ex: `5dde6665fae5cp42c6pa084g7a4bf10025b2`).

4. Inicialize o Banco de Dados:
   Este comando criará o arquivo `foxess.db` e as tabelas necessárias, além de cadastrar a primeira planta de teste (datalogger `769W2DTF132A592`).
   ```bash
   npm run init-db
   ```

5. Inicie o Servidor:
   ```bash
   npm start
   ```

O frontend e o backend estarão rodando juntos. Acesse no navegador:
`http://localhost:3000`

## Arquitetura e Segurança
Seguindo a especificação, a chave da API **NÃO** está exposta no HTML/JS. O frontend requisita dados para o Backend (`/api/unidades/...`), e o Backend é quem faz a ponte de comunicação com a FoxESS Cloud de forma segura, guardando o cache e registrando em banco de dados.
