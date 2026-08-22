'use client';

import { useState } from 'react';
import { formatBRL } from '@/lib/format';
import { deleteIncomeAction, upsertIncomeAction } from '@/app/orcamento/actions';

interface IncomeCardProps {
  responsavel: string;
  descricao: string;
  valor: number;
}

export default function IncomeCard({ responsavel, descricao, valor }: IncomeCardProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        className="income-row income-row--editing"
        action={async formData => {
          await upsertIncomeAction(formData);
          setEditing(false);
        }}
      >
        <input type="hidden" name="responsavel" value={responsavel} />
        <input type="hidden" name="descricao" value={descricao} />
        <span className="income-row__label">{descricao}</span>
        <input name="valor" type="number" step="0.01" min="0" defaultValue={valor} autoFocus className="income-row__input" />
        <button type="submit" className="btn btn--primary">Salvar</button>
        <button type="button" className="btn" onClick={() => setEditing(false)}>Cancelar</button>
      </form>
    );
  }

  return (
    <div className="income-row">
      <span className="income-row__label">{descricao}</span>
      <strong className="income-row__value">{formatBRL(valor)}/mês</strong>
      <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label="Editar">✏️</button>
      <form
        action={async formData => {
          if (confirm(`Remover renda "${descricao}"?`)) {
            await deleteIncomeAction(formData);
          }
        }}
      >
        <input type="hidden" name="responsavel" value={responsavel} />
        <input type="hidden" name="descricao" value={descricao} />
        <button type="submit" className="icon-btn" aria-label="Excluir">🗑️</button>
      </form>
    </div>
  );
}
