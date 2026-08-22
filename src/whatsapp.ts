import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

const logger = pino({ level: 'silent' });

let sock: WASocket | null = null;

type MessageHandler = (chatId: string, senderJid: string, text: string) => Promise<void>;

export async function connectToWhatsApp(onMessage: MessageHandler): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    generateHighQualityLinkPreview: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (statusCode === DisconnectReason.connectionReplaced) {
        console.log(
          '⚠️ CONFLITO: outra instância do bot conectou com a mesma sessão e derrubou esta conexão. ' +
          'Verifique se não há dois processos do bot rodando ao mesmo tempo (isso pode fazer mensagens se perderem).'
        );
      }

      console.log('Conexão encerrada. Reconectando:', shouldReconnect);

      if (shouldReconnect) {
        connectToWhatsApp(onMessage);
      } else {
        console.log('Sessão encerrada (logout). Delete a pasta auth_info_baileys e reinicie.');
      }
    } else if (connection === 'open') {
      console.log('✅ Bot conectado ao WhatsApp!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // 'notify' = mensagem chegou com o bot online; 'append' = mensagem que
    // ficou represada e o WhatsApp entrega ao reconectar (bot estava offline).
    // Processamos os dois pra não perder gasto mandado com o PC desligado.
    console.log(
      `[msg.upsert] type=${type} count=${messages.length} ${messages
        .map(m => `(from=${m.key.remoteJid} fromMe=${m.key.fromMe} id=${m.key.id})`)
        .join(' ')}`
    );

    if (type !== 'notify' && type !== 'append') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const chatId = msg.key.remoteJid;
      if (!chatId) continue;

      // Em grupos, remoteJid é o ID do grupo; quem enviou vem em participant.
      // O WhatsApp pode usar JIDs @lid (privados) em vez do número real; as
      // variantes *Pn trazem o JID com o número de telefone de fato.
      const senderJid =
        msg.key.participantPn || msg.key.senderPn || msg.key.participant || chatId;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';

      if (!text.trim()) continue;

      await onMessage(chatId, senderJid, text);
    }
  });
}

export async function sendMessage(to: string, text: string): Promise<void> {
  if (!sock) throw new Error('WhatsApp não conectado.');
  await sock.sendMessage(to, { text });
}
