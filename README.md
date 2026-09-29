# Solar Monitor — Sistema de Monitoramento FoxESS

Sistema web SPA (Single Page Application) para monitoramento e gestão de usinas fotovoltaicas integrado à FoxESS Open API.

## Funcionalidades
- **Dashboard Geral:** Visão rápida do status de todas as usinas (Online, Offline, Alarme) e sumário de geração.
- **Página de Usina:** Análise detalhada por planta, incluindo potência em tempo real, curva de geração do dia, parâmetros elétricos e alarmes.
- **Relatório Automático:** Cálculo automático de desempenho (Real vs Esperado) baseado na configuração de geração anual.
- **Armazenamento Local:** Todos os dados (configurações, cadastro de plantas, histórico) são armazenados no `localStorage` do navegador. Não há necessidade de banco de dados externo.

## Como Usar
Como a aplicação é 100% frontend (HTML/CSS/JS), não é necessária compilação:

1. Abra o arquivo `index.html` diretamente no navegador.
2. Acesse o menu **Configurações**.
3. (Opcional) Desative o "Modo Demonstração" e insira sua API Key da FoxESS.
4. Acesse o menu **Unidades** para cadastrar e vincular as usinas.

## Integração FoxESS API
A integração utiliza os endpoints abertos documentados no portal FoxESS Cloud.

### Obtendo a API Key:
1. Acesse [foxesscloud.com](https://www.foxesscloud.com).
2. Vá para **Perfil do Usuário** > **Gerenciamento de API**.
3. Gere uma nova API Key.

### Problemas com CORS (Cross-Origin Resource Sharing)
Ao fazer requisições diretamente do navegador para a API FoxESS (`fetch`), você pode encontrar o erro bloqueio de CORS.
Para contornar isso durante o uso local/desktop, recomenda-se:

**Opção 1 (Mais fácil):** Utilizar uma extensão do navegador para desbloquear CORS, como "CORS Unblock" ou "Allow CORS".

**Opção 2 (Avançado):** Servir a aplicação através de um servidor local de proxy (Node.js/Express) que adicione os headers adequados.

## Estrutura do Projeto
- `index.html`: Entry point, layout principal.
- `assets/css/`: Estilos CSS puros utilizando variáveis modernas.
- `assets/js/core/`: Mecanismos centrais (Store, Router, App init).
- `assets/js/api/`: Camada de comunicação com FoxESS e dados falsos.
- `assets/js/pages/`: Lógica de renderização das telas.
- `assets/js/utils/`: Funções auxiliares (Datas, Energia, Criptografia MD5 para a API).
