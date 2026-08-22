import Link from 'next/link';
import { fetchExpenses } from '@/lib/sheets';
import { summarizeMonth } from '@/lib/aggregate';
import { listIncome } from '@/lib/income';
import { listFixedExpenses } from '@/lib/fixedExpenses';
import { formatBRL, formatMonthLabel } from '@/lib/format';
import IncomeCard from '@/components/IncomeCard';
import NewIncomeForm from '@/components/NewIncomeForm';
import FixedExpenseCard from '@/components/FixedExpenseCard';
import NewFixedExpenseForm from '@/components/NewFixedExpenseForm';
import ThemeToggle from '@/components/ThemeToggle';
import BrandHeader from '@/components/BrandHeader';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default async function OrcamentoPage() {
  const mes = currentMonthKey();
  const mesAtualChave = `${mes.slice(5, 7)}/${mes.slice(0, 4)}`;

  const [income, fixedExpenses, rows] = await Promise.all([
    listIncome(),
    listFixedExpenses(),
    fetchExpenses(),
  ]);

  const summary = summarizeMonth(rows, mes);

  const person1 = process.env.USER1_NAME ?? 'Pessoa 1';
  const person2 = process.env.USER2_NAME ?? 'Pessoa 2';
  const pessoas = [person1, person2];

  const budgets = pessoas.map(pessoa => {
    const rendaTotal = income.filter(i => i.responsavel === pessoa).reduce((s, i) => s + i.valor, 0);
    const fixosTotal = fixedExpenses.filter(f => f.responsavel === pessoa).reduce((s, f) => s + f.valor, 0);
    const variavel = summary.byPerson[pessoa] ?? 0;
    const sobra = rendaTotal - fixosTotal - variavel;
    return { pessoa, rendaTotal, fixosTotal, variavel, sobra };
  });

  return (
    <div className="page">
      <header className="page-header">
        <BrandHeader
          title="Orçamento"
          subtitle={
            <>
              Renda, gastos fixos e sobra de {formatMonthLabel(mes)} · <Link href="/">← Voltar para o painel</Link>
            </>
          }
        />
        <ThemeToggle />
      </header>

      {budgets.map(b => (
        <section key={b.pessoa} className="card">
          <h2>{b.pessoa}</h2>

          <div className="budget-summary">
            <div>
              <span className="stat-tile__label">Renda</span>
              <strong>{formatBRL(b.rendaTotal)}</strong>
            </div>
            <div>
              <span className="stat-tile__label">Gastos fixos</span>
              <strong>{formatBRL(b.fixosTotal)}</strong>
            </div>
            <div>
              <span className="stat-tile__label">Variável (mês)</span>
              <strong>{formatBRL(b.variavel)}</strong>
            </div>
            <div>
              <span className="stat-tile__label">Sobra</span>
              <strong style={{ color: b.sobra >= 0 ? 'var(--status-good)' : 'var(--status-critical)' }}>
                {formatBRL(b.sobra)}
              </strong>
            </div>
          </div>

          <h3 className="subsection-title">💵 Fontes de renda</h3>
          <div className="income-list">
            {income.filter(i => i.responsavel === b.pessoa).map(i => (
              <IncomeCard key={i.descricao} responsavel={i.responsavel} descricao={i.descricao} valor={i.valor} />
            ))}
            <NewIncomeForm responsavel={b.pessoa} />
          </div>

          <h3 className="subsection-title">🔁 Gastos fixos</h3>
          <div className="fixed-expense-list">
            {fixedExpenses.filter(f => f.responsavel === b.pessoa).map(f => (
              <FixedExpenseCard
                key={f.id}
                id={f.id}
                descricao={f.descricao}
                categoria={f.categoria}
                valor={f.valor}
                responsavel={f.responsavel}
                diaVencimento={f.diaVencimento}
                lancadoEsseMes={f.ultimoMesLancado === mesAtualChave}
              />
            ))}
          </div>
          <NewFixedExpenseForm responsavel={b.pessoa} />
        </section>
      ))}
    </div>
  );
}
