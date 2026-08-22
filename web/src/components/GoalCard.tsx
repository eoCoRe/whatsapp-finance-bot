'use client';

import { useState } from 'react';
import { formatBRL } from '@/lib/format';
import { updateGoalAction } from '@/app/metas/actions';

interface GoalCardProps {
  responsavel: string;
  categoria: string;
  valorMeta: number;
  gastoNoMes: number;
}

type Status = 'good' | 'warning' | 'critical';

export default function GoalCard({ responsavel, categoria, valorMeta, gastoNoMes }: GoalCardProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        className="goal-card goal-card--editing"
        action={async formData => {
          await updateGoalAction(formData);
          setEditing(false);
        }}
      >
        <input type="hidden" name="responsavel" value={responsavel} />
        <input type="hidden" name="categoria" value={categoria} />
        <label>
          Meta mensal para {categoria}
          <input
            name="valorMeta"
            type="number"
            step="0.01"
            min="0"
            defaultValue={valorMeta || ''}
            placeholder="Ex: 540.00"
            autoFocus
          />
        </label>
        <div className="financing-card__actions">
          <button type="submit" className="btn btn--primary">Salvar</button>
          <button type="button" className="btn" onClick={() => setEditing(false)}>Cancelar</button>
        </div>
      </form>
    );
  }

  if (valorMeta <= 0) {
    return (
      <div className="goal-card goal-card--empty">
        <span className="goal-card__categoria">{categoria}</span>
        <span className="goal-card__no-goal">Sem meta definida</span>
        <button type="button" className="btn" onClick={() => setEditing(true)}>Definir meta</button>
      </div>
    );
  }

  const pct = (gastoNoMes / valorMeta) * 100;
  const status: Status = pct >= 100 ? 'critical' : pct >= 80 ? 'warning' : 'good';
  const statusLabel: Record<Status, string> = {
    good: '✅ Sob controle',
    warning: '⚠️ Quase lá',
    critical: '🚨 Estourou',
  };

  return (
    <div className="goal-card">
      <div className="goal-card__header">
        <span className="goal-card__categoria">{categoria}</span>
        <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label="Editar meta">✏️</button>
      </div>
      <div className="meter">
        <div className="meter__track">
          <div className={`meter__fill meter__fill--${status}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <span className="meter__label">{formatBRL(gastoNoMes)} de {formatBRL(valorMeta)}</span>
      </div>
      <span className={`badge badge--${status}`}>{statusLabel[status]}</span>
    </div>
  );
}
