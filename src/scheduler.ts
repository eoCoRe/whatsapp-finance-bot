import fs from 'fs';
import path from 'path';
import {
  appendExpenseRow,
  listGastosFixos,
  marcarGastoFixoLancado,
  getResumoPeriodo,
  getRendaTotalGeral,
} from './sheets';
import { backupPlanilha } from './backup';
import * as msg from './messages';

type NotifyFn = (responsavel: string, text: string) => Promise<void>;
type NotifyAllFn = (text: string) => Promise<void>;

function mesAtualChave(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

// Estado local (fica na VM, não vai pro Git) pra saber se já mandamos o
// resumo/backup dessa semana ou desse mês e não duplicar em cada checagem.
const STATE_FILE = path.join(__dirname, '..', 'bot-state.json');

interface BotState {
  ultimaSemanaResumo?: string;
  ultimoMesResumo?: string;
  ultimaSemanaBackup?: string;
}

function readState(): BotState {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeState(state: BotState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Algoritmo padrão ISO 8601 pra semana do ano (ex: "2026-W35").
function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function mesAnteriorRange(hoje: Date): { desde: Date; ate: Date } {
  const desde = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const ate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return { desde, ate };
}

export async function checkResumosEBackup(notifyAll: NotifyAllFn): Promise<void> {
  const hoje = new Date();
  const state = readState();

  // Resumo semanal + backup: toda segunda-feira, uma vez por semana ISO.
  if (hoje.getDay() === 1) {
    const semanaAtual = isoWeekKey(hoje);

    if (state.ultimaSemanaResumo !== semanaAtual) {
      try {
        const seteDiasAtras = new Date(hoje);
        seteDiasAtras.setDate(hoje.getDate() - 7);
        const resumo = await getResumoPeriodo(seteDiasAtras, hoje);
        await notifyAll(msg.resumoSemanal(resumo));
        state.ultimaSemanaResumo = semanaAtual;
        writeState(state);
      } catch (err) {
        console.error('Erro ao gerar resumo semanal:', err);
      }
    }

    if (state.ultimaSemanaBackup !== semanaAtual) {
      try {
        await backupPlanilha();
        state.ultimaSemanaBackup = semanaAtual;
        writeState(state);
        console.log('✅ Backup semanal da planilha concluído.');
      } catch (err) {
        console.error('Erro ao fazer backup da planilha:', err);
        await notifyAll(msg.erroBackup());
      }
    }
  }

  // Resumo mensal: todo dia 1, resumindo o mês que acabou de fechar.
  if (hoje.getDate() === 1) {
    const mesChave = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    if (state.ultimoMesResumo !== mesChave) {
      try {
        const { desde, ate } = mesAnteriorRange(hoje);
        const resumo = await getResumoPeriodo(desde, ate);
        const rendaTotal = await getRendaTotalGeral();
        await notifyAll(msg.resumoMensal(resumo, rendaTotal));
        state.ultimoMesResumo = mesChave;
        writeState(state);
      } catch (err) {
        console.error('Erro ao gerar resumo mensal:', err);
      }
    }
  }
}

export async function checkGastosFixos(notify: NotifyFn): Promise<void> {
  let fixos;
  try {
    fixos = await listGastosFixos();
  } catch (err) {
    console.error('Erro ao listar gastos fixos:', err);
    return;
  }

  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const mesAtual = mesAtualChave();

  for (const fixo of fixos) {
    if (fixo.ultimoMesLancado === mesAtual) continue;
    if (diaAtual < fixo.diaVencimento) continue;

    try {
      await appendExpenseRow({
        valor: fixo.valor,
        categoria: fixo.categoria,
        formaPagamento: 'Débito',
        descricao: `${fixo.descricao} (gasto fixo)`,
        responsavel: fixo.responsavel,
        data: hoje.toLocaleDateString('pt-BR'),
      });

      await marcarGastoFixoLancado(fixo.id, mesAtual);

      await notify(fixo.responsavel, msg.gastoFixoAutoLancado(fixo.descricao, fixo.valor));
      console.log(`✅ Gasto fixo lançado automaticamente: ${fixo.descricao} (${fixo.responsavel})`);
    } catch (err) {
      console.error(`Erro ao lançar gasto fixo "${fixo.descricao}":`, err);
    }
  }
}
