# 💸 WhatsApp Finance Bot

Bot de WhatsApp para registro automático de gastos financeiros do casal direto no Google Sheets, usando Claude AI para interpretar mensagens em linguagem natural.

## Como funciona

1. Você manda uma mensagem como *"gastei 50 reais no mercado no crédito"*
2. O bot usa Claude AI para extrair: valor, categoria, forma de pagamento e descrição
3. Os dados são inseridos automaticamente na sua planilha do Google Sheets
4. O bot confirma o registro no WhatsApp

## Stack

- **Node.js + TypeScript**
- **Baileys** — conexão com WhatsApp Web (sem API oficial)
- **Claude Haiku** — extração de dados via LLM
- **Google Sheets API** — banco de dados via Service Account

## Pré-requisitos

- Node.js 18+
- Conta na [Anthropic Console](https://console.anthropic.com)
- Projeto no Google Cloud com a Sheets API habilitada

## Instalação

```bash
npm install
cp .env.example .env
# Preencha as variáveis no .env
npm run dev
```

Escaneie o QR Code que aparecer no terminal com o WhatsApp do seu celular.

## Configuração do .env

| Variável | Descrição |
|---|---|
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic |
| `GOOGLE_SPREADSHEET_ID` | ID da planilha (da URL do Google Sheets) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | E-mail da Service Account do Google Cloud |
| `GOOGLE_PRIVATE_KEY` | Chave privada da Service Account (do arquivo JSON) |
| `GOOGLE_SHEET_NAME` | Nome da aba da planilha (padrão: `Gastos`) |
| `USER1_NUMBER` | Número do usuário 1 (ex: `5511999999999`) |
| `USER1_NAME` | Nome do usuário 1 |
| `USER2_NUMBER` | Número do usuário 2 |
| `USER2_NAME` | Nome do usuário 2 |

## Estrutura da Planilha

A aba deve ter as seguintes colunas (linha 1 como cabeçalho):

| Data | Responsavel | Valor | Categoria | FormaPagamento | Descricao |
|---|---|---|---|---|---|

## Configuração do Google Cloud (Service Account)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto ou selecione um existente
3. Ative a **Google Sheets API**
4. Em *IAM & Admin > Service Accounts*, crie uma nova Service Account
5. Gere e baixe a chave JSON
6. Compartilhe sua planilha com o e-mail da Service Account (permissão de Editor)
7. Copie `client_email` e `private_key` do JSON para o `.env`

## Scripts

```bash
npm run dev    # Executa em modo desenvolvimento
npm run build  # Compila TypeScript
npm start      # Executa o build compilado
```
