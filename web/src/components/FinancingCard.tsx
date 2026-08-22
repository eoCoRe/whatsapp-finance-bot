'use client';

import { useState } from 'react';
import { Financing } from '@/lib/financing';
import { formatBRL } from '@/lib/format';
import { deleteFinancingAction, registerPaymentAction, updateFinancingAction } from '@/app/financiamentos/actions';

interface FinancingCardProps {
  financing: Financing;
  people: string[];
}

export default function FinancingCard({ financing, people }: FinancingCardProps) {
  const [editing, setEditing] = useState(false);

  const pct = financing.parcelasTotais > 0
    ? Math.min(100, (financing.parcelasPagas / financing.parcelasTotais) * 100)
    : 0;
  const restante = Math.max(0, financing.parcelasTotais - financing.parcelasPagas) * financing.valorParcela;
  const total = financing.parcelasTotais * financing.valorParcela;
  const quitado = financing.parcelasTotais > 0 && financing.parcelasPagas >= financing.parcelasTotais;

  if (editing) {
    return (
      <form
        className="financing-card financing-card--editing"
        action={async formData => {
          await updateFinancingAction(formData);
          setEditing(false);
        }}
      >
        <input type="hidden" name="id" value={financing.id} />
        <div className="form-grid">
          <label>
            Descrição
            <input name="descricao" defaultValue={financing.descricao} required />
          </label>
          <label>
            Tipo
            <select name="tipo" defaultValue={financing.tipo}>
              <option value="Financiamento">🏦 Financiamento</option>
              <option value="Parcelamento">💳 Parcelamento</option>
            </select>
          </label>
          <label>
            Responsável
            <select name="responsavel" defaultValue={financing.responsavel}>
              {people.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Valor da parcela
            <input name="valorParcela" type="number" step="0.01" min="0" defaultValue={financing.valorParcela} required />
          </label>
          <label>
            Parcelas pagas
            <input name="parcelasPagas" type="number" step="1" min="0" defaultValue={financing.parcelasPagas} required />
          </label>
          <label>
            Parcelas totais
            <input name="parcelasTotais" type="number" step="1" min="1" defaultValue={financing.parcelasTotais} required />
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
    <div className="financing-card">
      <div className="financing-card__header">
        <div>
          <h3>{financing.descricao}</h3>
          <span className="financing-card__person">{financing.responsavel}</span>
          <span className={`tag tag--${financing.tipo === 'Parcelamento' ? 'parcelamento' : 'financiamento'}`}>
            {financing.tipo === 'Parcelamento' ? '💳 Parcelamento' : '🏦 Financiamento'}
          </span>
        </div>
        <div className="financing-card__icon-actions">
          <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label="Editar">✏️</button>
          <form
            action={async formData => {
              if (confirm(`Remover "${financing.descricao}"?`)) {
                await deleteFinancingAction(formData);
              }
            }}
          >
            <input type="hidden" name="id" value={financing.id} />
            <button type="submit" className="icon-btn" aria-label="Excluir">🗑️</button>
          </form>
        </div>
      </div>

      <div className="meter">
        <div className="meter__track">
          <div className="meter__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="meter__label">
          {financing.parcelasPagas}/{financing.parcelasTotais} parcelas ({pct.toFixed(0)}%)
        </span>
      </div>

      <div className="financing-card__stats">
        <div>
          <span className="financing-card__stat-label">Parcela</span>
          <strong>{formatBRL(financing.valorParcela)}</strong>
        </div>
        <div>
          <span className="financing-card__stat-label">Falta pagar</span>
          <strong>{formatBRL(restante)}</strong>
        </div>
        <div>
          <span className="financing-card__stat-label">Total</span>
          <strong>{formatBRL(total)}</strong>
        </div>
      </div>

      {quitado ? (
        <span className="badge badge--good">🎉 Quitado</span>
      ) : (
        <form action={registerPaymentAction}>
          <input type="hidden" name="id" value={financing.id} />
          <button type="submit" className="btn btn--primary">✅ Registrar parcela paga</button>
        </form>
      )}
    </div>
  );
}
