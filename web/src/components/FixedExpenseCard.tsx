'use client';

import { useState } from 'react';
import { formatBRL } from '@/lib/format';
import { deleteFixedExpenseAction, updateFixedExpenseAction } from '@/app/orcamento/actions';

const CATEGORIES = [
  'Alimentação', 'Mercado', 'Transporte', 'Saúde', 'Lazer',
  'Moradia', 'Educação', 'Vestuário', 'Beleza', 'Pets', 'Assinaturas', 'Outros',
];

interface FixedExpenseCardProps {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  responsavel: string;
  diaVencimento: number;
  lancadoEsseMes: boolean;
}

export default function FixedExpenseCard({
  id,
  descricao,
  categoria,
  valor,
  responsavel,
  diaVencimento,
  lancadoEsseMes,
}: FixedExpenseCardProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        className="fixed-expense-row fixed-expense-row--editing"
        action={async formData => {
          await updateFixedExpenseAction(formData);
          setEditing(false);
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="responsavel" value={responsavel} />
        <div className="form-grid">
          <label>
            Descrição
            <input name="descricao" defaultValue={descricao} required />
          </label>
          <label>
            Categoria
            <select name="categoria" defaultValue={categoria}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Valor
            <input name="valor" type="number" step="0.01" min="0" defaultValue={valor} required />
          </label>
          <label>
            Dia do vencimento
            <input name="diaVencimento" type="number" step="1" min="1" max="31" defaultValue={diaVencimento} required />
          </label>
        </div>
        <div className="financing-card__actions">
          <button type="submit" className="btn btn--primary">Salvar</button>
          <button type="button" className="btn" onClick={() => setEditing(false)}>Cancelar</button>
        </div>
      </form>
    );
  }

  return (
    <div className="fixed-expense-row">
      <div className="fixed-expense-row__main">
        <span className="fixed-expense-row__desc">{descricao}</span>
        <span className="financing-card__person">{categoria}</span>
        <span className="financing-card__person">Todo dia {diaVencimento}</span>
        {lancadoEsseMes && <span className="badge badge--good">✅ Lançado esse mês</span>}
      </div>
      <strong>{formatBRL(valor)}</strong>
      <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label="Editar">✏️</button>
      <form
        action={async formData => {
          if (confirm(`Remover gasto fixo "${descricao}"?`)) {
            await deleteFixedExpenseAction(formData);
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="icon-btn" aria-label="Excluir">🗑️</button>
      </form>
    </div>
  );
}
