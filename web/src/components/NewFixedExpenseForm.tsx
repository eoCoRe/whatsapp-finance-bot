import { createFixedExpenseAction } from '@/app/orcamento/actions';

const CATEGORIES = [
  'Alimentação', 'Mercado', 'Transporte', 'Saúde', 'Lazer',
  'Moradia', 'Educação', 'Vestuário', 'Beleza', 'Pets', 'Assinaturas', 'Outros',
];

interface NewFixedExpenseFormProps {
  responsavel: string;
}

export default function NewFixedExpenseForm({ responsavel }: NewFixedExpenseFormProps) {
  return (
    <form className="form-grid form-grid--inline" action={createFixedExpenseAction}>
      <input type="hidden" name="responsavel" value={responsavel} />
      <label>
        Descrição
        <input name="descricao" placeholder="Ex: Internet" required />
      </label>
      <label>
        Categoria
        <select name="categoria" defaultValue="Assinaturas">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label>
        Valor
        <input name="valor" type="number" step="0.01" min="0" placeholder="120.00" required />
      </label>
      <label>
        Dia do vencimento
        <input name="diaVencimento" type="number" step="1" min="1" max="31" placeholder="10" required />
      </label>
      <div className="form-grid__submit">
        <button type="submit" className="btn btn--primary">Adicionar</button>
      </div>
    </form>
  );
}
