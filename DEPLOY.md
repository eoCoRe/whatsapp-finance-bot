# Deploy 24h — Oracle Cloud Free Tier

Guia para colocar o bot rodando o tempo todo numa VM gratuita da Oracle (Always Free), sem depender do seu PC ligado.

## 1. Criar a conta e a VM

1. Crie uma conta em https://www.oracle.com/cloud/free/ (pede cartão só para verificação de identidade — nada é cobrado dentro do Always Free).
2. No console da Oracle Cloud, vá em **Compute > Instances > Create Instance**.
3. Configure:
   - **Image**: Canonical Ubuntu 22.04
   - **Shape**: clique em "Change shape" → Ampere → `VM.Standard.A1.Flex` → deixe 2 OCPUs / 12GB RAM (ou o máximo Always Free disponível)
   - **Networking**: deixe as opções padrão (VCN novo, subnet pública)
   - **SSH keys**: deixe a Oracle gerar um par de chaves e baixe a chave privada (`.key`) — vai precisar dela para conectar
4. Clique em **Create**. Se aparecer erro de "Out of capacity", tente novamente em alguns minutos ou troque a região/Availability Domain — é um problema comum e temporário da Oracle com instâncias ARM gratuitas.
5. Anote o **IP público** da instância criada.

## 2. Conectar via SSH

No seu PC (PowerShell):

```powershell
ssh -i "caminho\para\sua-chave.key" ubuntu@SEU_IP_PUBLICO
```

## 3. Instalar dependências na VM

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
sudo npm install -g pm2
node -v   # confirme que instalou o Node 20
```

## 4. Levar o código para a VM

Se o repositório já está no GitHub (`eoCoRe/whatsapp-finance-bot`):

```bash
git clone https://github.com/eoCoRe/whatsapp-finance-bot.git
cd whatsapp-finance-bot
npm install
npm run build
```

> ⚠️ **Nota sobre VMs pequenas (ex: `VM.Standard.E2.1.Micro`, 1GB RAM):** o
> `tsc` (compilador TypeScript) pode ser pesado demais pra rodar direto nessa
> VM — pode travar ou ficar extremamente lento usando swap. Se isso
> acontecer, compile localmente no seu PC (`npm run build`) e copie a pasta
> `dist/` já pronta pra VM via `scp`, pulando o `npm run build` remoto:
> ```powershell
> scp -i "sua-chave.key" -r dist usuario@SEU_IP:/home/usuario/whatsapp-finance-bot/
> ```

## 5. Configurar o `.env`

```bash
nano .env
```

Cole o conteúdo do seu `.env` local (mesmas chaves do `.env.example`: `GEMINI_API_KEY`, `GOOGLE_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_NAME`, `USER1_NUMBER`, `USER1_NAME`, `USER2_NUMBER`, `USER2_NAME`). Salve com `Ctrl+O`, `Enter`, `Ctrl+X`.

## 6. Primeiro login no WhatsApp (escanear o QR Code)

Rode em primeiro plano pra ver o QR Code aparecer no terminal SSH:

```bash
npm start
```

Escaneie o QR Code com o WhatsApp do celular (o mesmo número que você já usa hoje). Depois que aparecer "conectado" no log, pare o processo com `Ctrl+C`. A pasta `auth_info_baileys/` ficou salva no disco da VM — como é uma VM de verdade (não um container efêmero), essa sessão persiste entre reinicializações.

## 7. Rodar 24h com PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

O `pm2 startup` vai imprimir um comando `sudo env PATH=...` — copie e rode exatamente esse comando que ele mostrar. Isso faz o bot subir sozinho automaticamente se a VM reiniciar.

## 8. Comandos úteis

```bash
pm2 logs whatsapp-finance-bot   # ver logs em tempo real
pm2 restart whatsapp-finance-bot
pm2 stop whatsapp-finance-bot
```

## 9. Atualizar o bot no futuro

```bash
cd whatsapp-finance-bot
git pull
npm install
npm run build
pm2 restart whatsapp-finance-bot
```

Se a VM for pequena e o `npm run build` travar/ficar lento demais, compile local e copie a `dist/` via `scp` (veja a nota no passo 4), depois só rode `pm2 restart whatsapp-finance-bot` na VM.

## Observações

- Não precisa abrir nenhuma porta de entrada na VM — o bot só faz conexões de saída (WhatsApp, Google Sheets, Gemini).
- Se algum dia o WhatsApp deslogar a sessão, repita o passo 6 (rodar `npm start` em primeiro plano pra escanear o QR de novo).
- O dashboard em `web/` (Next.js) não está incluído neste guia — ele não precisa ficar 24h ligado do mesmo jeito, já que não mantém conexão persistente. Se quiser hospedá-lo também, dá pra fazer separado (ex: Vercel, que tem free tier genuíno para apps Next.js).
