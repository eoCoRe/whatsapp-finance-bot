import { fetchExpenses } from '@/lib/sheets';
import { buildTrend, listAvailableMonths, summarizeMonth } from '@/lib/aggregate';
import { formatMonthLabel } from '@/lib/format';
import MonthSelector from '@/components/MonthSelector';
import StatTile from '@/components/StatTile';
import BarChartHorizontal from '@/components/BarChartHorizontal';
import LineChartMulti from '@/components/LineChartMulti';
import ExpenseTable from '@/components/ExpenseTable';
import ThemeToggle from '@/components/ThemeToggle';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function previousMonthKey(mes: string): string {
  const [year, month] = mes.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const rows = await fetchExpenses();
  const months = listAvailableMonths(rows);

  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : (months[0] ?? currentMonthKey());

  const summary = summarizeMonth(rows, mes);
  const prevSummary = summarizeMonth(rows, previousMonthKey(mes));

  const person1 = process.env.USER1_NAME ?? 'Pessoa 1';
  const person2 = process.env.USER2_NAME ?? 'Pessoa 2';

  const trendMonths = months.length > 0 ? months.slice(0, 12) : [mes];
  const trend = buildTrend(rows, trendMonths);

  const monthsForSelector = months.includes(mes) ? months : [mes, ...months];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>🐶💰 Leitãozinho Financeiro</h1>
          <p className="page-header__subtitle">Painel de gastos do casal</p>
        </div>
        <ThemeToggle />
      </header>

      <MonthSelector months={monthsForSelector} selected={mes} />

      <section className="stat-grid" aria-label={`Resumo de ${formatMonthLabel(mes)}`}>
        <StatTile
          label={`Total em ${formatMonthLabel(mes)}`}
          value={summary.total}
          deltaPct={pctDelta(summary.total, prevSummary.total)}
        />
        <StatTile
          label={person1}
          value={summary.byPerson[person1] ?? 0}
          accent="var(--series-1)"
          deltaPct={pctDelta(summary.byPerson[person1] ?? 0, prevSummary.byPerson[person1] ?? 0)}
        />
        <StatTile
          label={person2}
          value={summary.byPerson[person2] ?? 0}
          accent="var(--series-2)"
          deltaPct={pctDelta(summary.byPerson[person2] ?? 0, prevSummary.byPerson[person2] ?? 0)}
        />
      </section>

      <section className="card">
        <h2>Tendência mensal por pessoa</h2>
        <LineChartMulti
          trend={trend}
          series={[
            { key: person1, name: person1, color: 'var(--series-1)' },
            { key: person2, name: person2, color: 'var(--series-2)' },
          ]}
        />
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Gastos por categoria</h2>
          <BarChartHorizontal data={summary.byCategory} color="var(--seq-500)" />
        </section>

        <section className="card">
          <h2>Gastos por forma de pagamento</h2>
          <BarChartHorizontal data={summary.byPayment} color="var(--accent-aqua)" />
        </section>
      </div>

      <section className="card">
        <h2>
          Lançamentos de {formatMonthLabel(mes)} ({summary.count})
        </h2>
        <ExpenseTable rows={summary.rows} />
      </section>
    </div>
  );
}
