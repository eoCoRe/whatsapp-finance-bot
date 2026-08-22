import Link from 'next/link';
import { fetchExpenses } from '@/lib/sheets';
import { listGoals } from '@/lib/goals';
import { formatMonthLabel } from '@/lib/format';
import GoalCard from '@/components/GoalCard';
import ThemeToggle from '@/components/ThemeToggle';
import BrandHeader from '@/components/BrandHeader';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default async function MetasPage() {
  const mes = currentMonthKey();
  const [goals, rows] = await Promise.all([listGoals(), fetchExpenses()]);

  const monthRows = rows.filter(r => r.mes === mes);

  function gastoDoMes(responsavel: string, categoria: string): number {
    return monthRows
      .filter(r => r.responsavel === responsavel && r.categoria === categoria)
      .reduce((sum, r) => sum + r.valor, 0);
  }

  const goalsWithSpend = goals.map(g => ({
    ...g,
    gastoNoMes: gastoDoMes(g.responsavel, g.categoria),
  }));

  const comMeta = goalsWithSpend.filter(g => g.valorMeta > 0);
  const estourados = comMeta.filter(g => g.gastoNoMes >= g.valorMeta).length;
  const emAlerta = comMeta.filter(g => {
    const pct = (g.gastoNoMes / g.valorMeta) * 100;
    return pct >= 80 && pct < 100;
  }).length;
  const soControle = comMeta.length - estourados - emAlerta;

  const pessoas = Array.from(new Set(goalsWithSpend.map(g => g.responsavel)));

  return (
    <div className="page">
      <header className="page-header">
        <BrandHeader
          title="Metas de gasto"
          subtitle={
            <>
              Progresso de {formatMonthLabel(mes)} · <Link href="/">← Voltar para o painel</Link> ·{' '}
              <Link href="/orcamento">Orçamento →</Link>
            </>
          }
        />
        <ThemeToggle />
      </header>

      <section className="stat-grid" aria-label="Resumo de metas">
        <div className="stat-tile">
          <span className="stat-tile__label">Sob controle</span>
          <span className="stat-tile__value" style={{ color: 'var(--status-good)' }}>{soControle}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Quase no limite</span>
          <span className="stat-tile__value" style={{ color: 'var(--status-warning)' }}>{emAlerta}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Estouradas</span>
          <span className="stat-tile__value" style={{ color: 'var(--status-critical)' }}>{estourados}</span>
        </div>
      </section>

      <p className="page-hint">
        Cada um define suas próprias metas — pelo painel ou pelo WhatsApp: &quot;quero gastar no máximo 540 reais por mês no mercado&quot;
      </p>

      {pessoas.map(pessoa => (
        <section key={pessoa} className="card">
          <h2>{pessoa}</h2>
          <div className="goals-grid">
            {goalsWithSpend
              .filter(g => g.responsavel === pessoa)
              .map(g => (
                <GoalCard
                  key={`${g.responsavel}-${g.categoria}`}
                  responsavel={g.responsavel}
                  categoria={g.categoria}
                  valorMeta={g.valorMeta}
                  gastoNoMes={g.gastoNoMes}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
