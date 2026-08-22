import 'dotenv/config';
import { connectToWhatsApp, sendMessage } from './whatsapp';
import { parseExpenseFromMessage } from './llm';
import { appendExpenseRow } from './sheets';
import { Expense } from './types';

// Números brasileiros podem aparecer no JID com ou sem o 9º dígito.
function phoneVariants(number: string): string[] {
  const match = number.match(/^55(\d{2})9?(\d{8})$/);
  if (!match) return [number];
  const [, ddd, base] = match;
  return [`55${ddd}9${base}`, `55${ddd}${base}`];
}

const ALLOWED_USERS: Record<string, string> = {};
const PARENT_LABELS: Record<string, string> = {};
const users: [string | undefined, string, string][] = [
  [process.env.USER1_NUMBER, process.env.USER1_NAME ?? 'Usuário 1', 'papai'],
  [process.env.USER2_NUMBER, process.env.USER2_NAME ?? 'Usuário 2', 'mamãe'],
];
for (const [number, name, parentLabel] of users) {
  if (!number) continue;
  for (const variant of phoneVariants(number)) {
    const jid = `${variant}@s.whatsapp.net`;
    ALLOWED_USERS[jid] = name;
    PARENT_LABELS[jid] = parentLabel;
  }
}

const SIGN_OFFS = [
  'Continuo de plantão de olho no dinheirinho! 🐾',
  'Leitãozinho gamer sempre no controle da economia da casa! 🎮🐶',
  'Auau, missão registrada com sucesso! 🐽',
  'Rosnado de aprovação registrado nos livros! 🦴',
  'Balançando o rabinho de felicidade, gasto anotado! 🐾',
];

function randomSignOff(): string {
  return SIGN_OFFS[Math.floor(Math.random() * SIGN_OFFS.length)];
}

async function handleMessage(chatId: string, senderJid: string, text: string): Promise<void> {
  const senderName = ALLOWED_USERS[senderJid];

  if (!senderName) return;

  const parent = PARENT_LABELS[senderJid] ?? 'humano(a)';

  console.log(`📩 Mensagem de ${senderName}: "${text}"`);

  let parsed;
  try {
    parsed = await parseExpenseFromMessage(text);
  } catch (err) {
    console.error('Erro ao processar mensagem com Claude:', err);
    await sendMessage(
      chatId,
      `😵💫 Eita, ${parent}! Meu cerebrinho de leitão engasgou tentando entender isso. Manda de novo? 🐷`
    );
    return;
  }

  if (!parsed) {
    await sendMessage(
      chatId,
      `🤔🐽 Hmm, ${parent}, não captei nenhum gasto aí! Tenta assim: "gastei 50 reais no mercado no crédito" 🐾`
    );
    return;
  }

  const now = new Date();
  const expense: Expense = {
    valor: parsed.valor,
    categoria: parsed.categoria,
    formaPagamento: parsed.forma_pagamento,
    descricao: parsed.descricao,
    responsavel: senderName,
    data: now.toLocaleDateString('pt-BR'),
  };

  try {
    await appendExpenseRow(expense);
  } catch (err) {
    console.error('Erro ao salvar na planilha:', err);
    await sendMessage(
      chatId,
      `😥 Entendi o gasto, ${parent}, mas não consegui anotar na planilha... dá uma olhadinha na configuração pra mim? 🐾`
    );
    return;
  }

  const confirmation =
    `🐶💰 Au au, ${parent}! Anotei aqui:\n` +
    `💸 R$ ${expense.valor.toFixed(2)} em *${expense.categoria}*\n` +
    `💳 ${expense.formaPagamento} | 📝 ${expense.descricao}\n\n` +
    `${randomSignOff()}`;

  await sendMessage(chatId, confirmation);
  console.log(`✅ Gasto registrado para ${senderName}: R$ ${expense.valor} em ${expense.categoria}`);
}

async function main() {
  console.log('🚀 Iniciando bot de gastos do WhatsApp...');
  console.log('📲 Aguarde o QR Code aparecer para escanear com o WhatsApp...\n');
  await connectToWhatsApp(handleMessage);
}

main().catch(console.error);
