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
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

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
    if (type !== 'notify') return;

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
