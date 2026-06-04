import 'dotenv/config';
import { connectToWhatsApp, sendMessage } from './whatsapp';
import { parseExpenseFromMessage } from './llm';
import { appendExpenseRow } from './sheets';
import { Expense } from './types';

const ALLOWED_USERS: Record<string, string> = {
  [`${process.env.USER1_NUMBER}@s.whatsapp.net`]: process.env.USER1_NAME ?? 'Usuário 1',
  [`${process.env.USER2_NUMBER}@s.whatsapp.net`]: process.env.USER2_NAME ?? 'Usuário 2',
};

async function handleMessage(from: string, text: string): Promise<void> {
  const senderName = ALLOWED_USERS[from];

  if (!senderName) return;

  console.log(`📩 Mensagem de ${senderName}: "${text}"`);

  let parsed;
  try {
    parsed = await parseExpenseFromMessage(text);
  } catch (err) {
    console.error('Erro ao processar mensagem com Claude:', err);
    await sendMessage(from, '⚠️ Não consegui interpretar o gasto. Tente novamente com mais detalhes.');
    return;
  }

  if (!parsed) {
    await sendMessage(from, '🤔 Não identifiquei um gasto na sua mensagem. Tente algo como: "Gastei 50 reais no mercado no crédito".');
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
    await sendMessage(from, '❌ Erro ao salvar na planilha. Verifique a configuração do Google Sheets.');
    return;
  }

  const confirmation =
    `✅ Gasto de R$ ${expense.valor.toFixed(2)} em *${expense.categoria}* registrado com sucesso!\n` +
    `💳 ${expense.formaPagamento} | 📝 ${expense.descricao}`;

  await sendMessage(from, confirmation);
  console.log(`✅ Gasto registrado para ${senderName}: R$ ${expense.valor} em ${expense.categoria}`);
}

async function main() {
  console.log('🚀 Iniciando bot de gastos do WhatsApp...');
  console.log('📲 Aguarde o QR Code aparecer para escanear com o WhatsApp...\n');
  await connectToWhatsApp(handleMessage);
}

main().catch(console.error);
