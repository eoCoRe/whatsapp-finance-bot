import { createFinancingAction } from '@/app/financiamentos/actions';

interface NewFinancingFormProps {
  people: string[];
}

export default function NewFinancingForm({ people }: NewFinancingFormProps) {
  return (
    <form className="card" action={createFinancingAction}>
      <h2>Novo financiamento / parcelamento</h2>
      <div className="form-grid">
        <label>
          Descrição
          <input name="descricao" placeholder="Ex: Financiamento do carro, TV parcelada" required />
        </label>
        <label>
          Tipo
          <select name="tipo" defaultValue="Financiamento">
            <option value="Financiamento">🏦 Financiamento</option>
            <option value="Parcelamento">💳 Parcelamento</option>
          </select>
        </label>
        <label>
          Responsável
          <select name="responsavel" defaultValue={people[0]}>
            {people.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Valor da parcela
          <input name="valorParcela" type="number" step="0.01" min="0" placeholder="800.00" required />
        </label>
        <label>
          Parcelas já pagas
          <input name="parcelasPagas" type="number" step="1" min="0" defaultValue={0} required />
        </label>
        <label>
          Parcelas totais
          <input name="parcelasTotais" type="number" step="1" min="1" placeholder="60" required />
        </label>
      </div>
      <button type="submit" className="btn btn--primary">Cadastrar</button>
    </form>
  );
}
