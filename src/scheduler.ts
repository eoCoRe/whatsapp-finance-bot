import { appendExpenseRow, listGastosFixos, marcarGastoFixoLancado } from './sheets';
import * as msg from './messages';

type NotifyFn = (responsavel: string, text: string) => Promise<void>;

function mesAtualChave(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
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
