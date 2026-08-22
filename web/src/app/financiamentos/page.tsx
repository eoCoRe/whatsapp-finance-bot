import Link from 'next/link';
import { listFinancings } from '@/lib/financing';
import { formatBRL } from '@/lib/format';
import FinancingCard from '@/components/FinancingCard';
import NewFinancingForm from '@/components/NewFinancingForm';
import ThemeToggle from '@/components/ThemeToggle';
import BrandHeader from '@/components/BrandHeader';

export default async function FinanciamentosPage() {
  const financings = await listFinancings();

  const person1 = process.env.USER1_NAME ?? 'Pessoa 1';
  const person2 = process.env.USER2_NAME ?? 'Pessoa 2';
  const people = [person1, person2, 'Ambos'];

  const totalRestante = financings.reduce(
    (sum, f) => sum + Math.max(0, f.parcelasTotais - f.parcelasPagas) * f.valorParcela,
    0
  );
  const ativos = financings.filter(f => f.parcelasPagas < f.parcelasTotais);
  const quitados = financings.filter(f => f.parcelasTotais > 0 && f.parcelasPagas >= f.parcelasTotais);

  return (
    <div className="page">
      <header className="page-header">
        <BrandHeader
          title="Financiamentos e dívidas"
          subtitle={
            <>
              <Link href="/">← Voltar para o painel</Link> · <Link href="/metas">Metas de gasto →</Link> ·{' '}
              <Link href="/orcamento">Orçamento →</Link>
            </>
          }
        />
        <ThemeToggle />
      </header>

      <section className="stat-grid" aria-label="Resumo de financiamentos">
        <div className="stat-tile">
          <span className="stat-tile__label">Falta pagar (ativos)</span>
          <span className="stat-tile__value">{formatBRL(totalRestante)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Em andamento</span>
          <span className="stat-tile__value">{ativos.length}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Quitados</span>
          <span className="stat-tile__value">{quitados.length}</span>
        </div>
      </section>

      <NewFinancingForm people={people} />

      <section className="financing-grid">
        {financings.length === 0 ? (
          <p className="chart-empty">
            Nenhum financiamento cadastrado ainda. Cadastre acima ou manda pro Leitãozinho no WhatsApp:
            &quot;financiamento do carro, 60 parcelas de 800, já paguei 12&quot;
          </p>
        ) : (
          financings.map(f => <FinancingCard key={f.id} financing={f} people={people} />)
        )}
      </section>
    </div>
  );
}
