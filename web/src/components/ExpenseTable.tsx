import { ExpenseRow } from '@/lib/sheets';
import { formatBRL, formatDateBR } from '@/lib/format';

interface ExpenseTableProps {
  rows: ExpenseRow[];
}

export default function ExpenseTable({ rows }: ExpenseTableProps) {
  if (rows.length === 0) {
    return <p className="chart-empty">Nenhum gasto registrado neste mês ainda.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="expense-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Responsável</th>
            <th>Categoria</th>
            <th>Pagamento</th>
            <th>Descrição</th>
            <th className="expense-table__value-col">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.dataISO}-${i}`}>
              <td>{formatDateBR(row.dataISO)}</td>
              <td>{row.responsavel}</td>
              <td>{row.categoria}</td>
              <td>{row.formaPagamento}</td>
              <td>{row.descricao || '—'}</td>
              <td className="expense-table__value-col">{formatBRL(row.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
