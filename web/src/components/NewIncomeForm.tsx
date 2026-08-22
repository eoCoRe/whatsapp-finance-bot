import { upsertIncomeAction } from '@/app/orcamento/actions';

interface NewIncomeFormProps {
  responsavel: string;
}

export default function NewIncomeForm({ responsavel }: NewIncomeFormProps) {
  return (
    <form className="income-row income-row--new" action={upsertIncomeAction}>
      <input type="hidden" name="responsavel" value={responsavel} />
      <input name="descricao" placeholder="Ex: Salário" required className="income-row__input" />
      <input name="valor" type="number" step="0.01" min="0" placeholder="0,00" required className="income-row__input" />
      <button type="submit" className="btn btn--primary">Adicionar</button>
    </form>
  );
}
