import 'dotenv/config';
import { connectToWhatsApp, sendMessage } from './whatsapp';
import { interpretMessage } from './llm';
import {
  appendExpenseRow,
  appendFinancing,
  registrarPagamentoFinanciamento,
  setMeta,
  getMetaCategoria,
  getGastoMesPorCategoria,
  setRenda,
  appendGastoFixo,
  removerUltimoGasto,
  getGastoMesTotal,
  getRendaTotalGeral,
  getConsultaGeral,
} from './sheets';
import { checkGastosFixos, checkResumosEBackup } from './scheduler';
import { Expense } from './types';
import * as msg from './messages';

// Números brasileiros podem aparecer no JID com ou sem o 9º dígito.
function phoneVariants(number: string): string[] {
  const match = number.match(/^55(\d{2})9?(\d{8})$/);
  if (!match) return [number];
  const [, ddd, base] = match;
  return [`55${ddd}9${base}`, `55${ddd}${base}`];
}

const ALLOWED_USERS: Record<string, string> = {};
const PARENT_LABELS: Record<string, string> = {};
const NAME_TO_JID: Record<string, string> = {};
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
  // Usa a primeira variante (com o 9º dígito) como JID canônico pra notificações proativas.
  if (!NAME_TO_JID[name]) {
    NAME_TO_JID[name] = `${phoneVariants(number)[0]}@s.whatsapp.net`;
  }
}

async function handleMessage(chatId: string, senderJid: string, text: string): Promise<void> {
  const senderName = ALLOWED_USERS[senderJid];

  if (!senderName) return;

  const parent = PARENT_LABELS[senderJid] ?? 'humano(a)';

  console.log(`📩 Mensagem de ${senderName}: "${text}"`);

  let parsed;
  try {
    parsed = await interpretMessage(text);
  } catch (err) {
    console.error('Erro ao processar mensagem com Gemini:', err);
    await sendMessage(chatId, msg.erroInterpretar(parent));
    return;
  }

  if (parsed.tipo === 'nao_identificado') {
    await sendMessage(chatId, msg.naoIdentificado(parent));
    return;
  }

  if (parsed.tipo === 'gasto') {
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
      console.error('Erro ao salvar gasto na planilha:', err);
      await sendMessage(chatId, msg.erroSalvarGasto(parent));
      return;
    }

    let metaLine: string | null = null;
    try {
      const meta = await getMetaCategoria(expense.categoria, senderName);
      if (meta > 0) {
        const gastoNoMes = await getGastoMesPorCategoria(expense.categoria, senderName);
        metaLine = msg.progressoMeta(expense.categoria, gastoNoMes, meta);
      }
    } catch (err) {
      console.error('Erro ao checar meta da categoria:', err);
    }

    let orcamentoLine: string | null = null;
    try {
      const gastoTotalMes = await getGastoMesTotal();
      const rendaTotalGeral = await getRendaTotalGeral();
      orcamentoLine = msg.orcamentoGeralAlerta(gastoTotalMes, rendaTotalGeral);
    } catch (err) {
      console.error('Erro ao checar orçamento geral:', err);
    }

    await sendMessage(chatId, msg.gastoConfirmado(parent, expense, [metaLine, orcamentoLine]));
    console.log(`✅ Gasto registrado para ${senderName}: R$ ${expense.valor} em ${expense.categoria}`);
    return;
  }

  if (parsed.tipo === 'consulta') {
    try {
      if (parsed.categoria) {
        const [gasto, meta] = await Promise.all([
          getGastoMesPorCategoria(parsed.categoria, senderName),
          getMetaCategoria(parsed.categoria, senderName),
        ]);
        await sendMessage(chatId, msg.consultaCategoria(parent, parsed.categoria, gasto, meta));
      } else {
        const consulta = await getConsultaGeral(senderName);
        await sendMessage(chatId, msg.consultaGeral(parent, consulta));
      }
    } catch (err) {
      console.error('Erro ao responder consulta:', err);
      await sendMessage(chatId, msg.erroConsulta(parent));
    }
    return;
  }

  if (parsed.tipo === 'desfazer_ultimo_gasto') {
    try {
      const removido = await removerUltimoGasto(senderName);
      if (!removido) {
        await sendMessage(chatId, msg.nadaParaRemover(parent));
      } else {
        await sendMessage(chatId, msg.gastoRemovido(parent, removido));
        console.log(`🗑️ Gasto removido para ${senderName}: R$ ${removido.valor} em ${removido.categoria}`);
      }
    } catch (err) {
      console.error('Erro ao remover último gasto:', err);
      await sendMessage(chatId, msg.erroRemoverGasto(parent));
    }
    return;
  }

  if (parsed.tipo === 'definir_meta') {
    try {
      await setMeta(parsed.categoria, parsed.valor, senderName);
      await sendMessage(chatId, msg.metaDefinida(parent, parsed.categoria, parsed.valor));
      console.log(`✅ Meta definida para ${senderName}: ${parsed.categoria} = R$ ${parsed.valor}`);
    } catch (err) {
      console.error('Erro ao definir meta:', err);
      await sendMessage(chatId, msg.erroDefinirMeta(parent));
    }
    return;
  }

  if (parsed.tipo === 'financiamento_novo') {
    try {
      const financing = await appendFinancing({
        descricao: parsed.descricao,
        tipo: parsed.tipo_financiamento,
        responsavel: senderName,
        valorParcela: parsed.valor_parcela,
        parcelasPagas: parsed.parcelas_pagas,
        parcelasTotais: parsed.parcelas_totais,
      });

      await sendMessage(chatId, msg.financiamentoCadastrado(parent, financing));
      console.log(`✅ ${financing.tipo} cadastrado: ${financing.descricao}`);
    } catch (err) {
      console.error('Erro ao cadastrar financiamento:', err);
      await sendMessage(chatId, msg.erroCadastrarFinanciamento(parent));
    }
    return;
  }

  if (parsed.tipo === 'financiamento_pagamento') {
    try {
      const result = await registrarPagamentoFinanciamento(parsed.descricao, parsed.parcelas || 1);

      if (result.status === 'nao_encontrado') {
        await sendMessage(chatId, msg.financiamentoNaoEncontrado(parent, parsed.descricao));
        return;
      }

      if (result.status === 'ambiguo') {
        await sendMessage(chatId, msg.financiamentoAmbiguo(parent, result.opcoes));
        return;
      }

      const { financing, quitado } = result;

      if (quitado) {
        await sendMessage(chatId, msg.financiamentoQuitado(parent, financing));
      } else {
        await sendMessage(chatId, msg.pagamentoRegistrado(parent, financing));
      }
      console.log(`✅ Pagamento registrado: ${financing.descricao} (${financing.parcelasPagas}/${financing.parcelasTotais})`);
    } catch (err) {
      console.error('Erro ao registrar pagamento de financiamento:', err);
      await sendMessage(chatId, msg.erroPagamentoFinanciamento(parent));
    }
    return;
  }

  if (parsed.tipo === 'renda_nova') {
    try {
      await setRenda(parsed.descricao, parsed.valor, senderName);
      await sendMessage(chatId, msg.rendaDefinida(parent, parsed.descricao, parsed.valor));
      console.log(`✅ Renda definida para ${senderName}: ${parsed.descricao} = R$ ${parsed.valor}`);
    } catch (err) {
      console.error('Erro ao definir renda:', err);
      await sendMessage(chatId, msg.erroDefinirRenda(parent));
    }
    return;
  }

  if (parsed.tipo === 'gasto_fixo_novo') {
    try {
      const dia = Math.min(31, Math.max(1, parsed.dia_vencimento || 1));
      await appendGastoFixo({
        descricao: parsed.descricao,
        categoria: parsed.categoria,
        valor: parsed.valor,
        responsavel: senderName,
        diaVencimento: dia,
      });
      await sendMessage(chatId, msg.gastoFixoCadastrado(parent, parsed.descricao, parsed.valor, dia));
      console.log(`✅ Gasto fixo cadastrado para ${senderName}: ${parsed.descricao} = R$ ${parsed.valor} (dia ${dia})`);
    } catch (err) {
      console.error('Erro ao cadastrar gasto fixo:', err);
      await sendMessage(chatId, msg.erroGastoFixo(parent));
    }
    return;
  }
}

async function notifyByName(responsavel: string, text: string): Promise<void> {
  const jid = NAME_TO_JID[responsavel];
  if (!jid) {
    console.error(`Não encontrei o JID de "${responsavel}" para notificar sobre gasto fixo.`);
    return;
  }
  await sendMessage(jid, text);
}

async function notifyAll(text: string): Promise<void> {
  for (const jid of new Set(Object.values(NAME_TO_JID))) {
    try {
      await sendMessage(jid, text);
    } catch (err) {
      console.error(`Erro ao notificar ${jid}:`, err);
    }
  }
}

const GASTOS_FIXOS_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

async function main() {
  console.log('🚀 Iniciando bot de gastos do WhatsApp...');
  console.log('📲 Aguarde o QR Code aparecer para escanear com o WhatsApp...\n');
  await connectToWhatsApp(handleMessage);

  setInterval(() => {
    checkGastosFixos(notifyByName).catch(err => console.error('Erro ao checar gastos fixos:', err));
    checkResumosEBackup(notifyAll).catch(err => console.error('Erro ao checar resumos/backup:', err));
  }, GASTOS_FIXOS_CHECK_INTERVAL_MS);

  setTimeout(() => {
    checkGastosFixos(notifyByName).catch(err => console.error('Erro ao checar gastos fixos:', err));
    checkResumosEBackup(notifyAll).catch(err => console.error('Erro ao checar resumos/backup:', err));
  }, 15 * 1000);
}

main().catch(console.error);
