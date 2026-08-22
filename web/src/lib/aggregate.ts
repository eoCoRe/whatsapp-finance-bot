import { ExpenseRow } from './sheets';

export interface Breakdown {
  label: string;
  value: number;
}

export interface MonthSummary {
  mes: string; // YYYY-MM
  total: number;
  count: number;
  byPerson: Record<string, number>;
  byCategory: Breakdown[];
  byPayment: Breakdown[];
  rows: ExpenseRow[];
}

function sortedBreakdown(map: Map<string, number>): Breakdown[] {
  return Array.from(map.entries())
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function summarizeMonth(rows: ExpenseRow[], mes: string): MonthSummary {
  const monthRows = rows.filter(r => r.mes === mes);

  const byPerson: Record<string, number> = {};
  const categoryMap = new Map<string, number>();
  const paymentMap = new Map<string, number>();
  let total = 0;

  for (const row of monthRows) {
    total += row.valor;
    byPerson[row.responsavel] = (byPerson[row.responsavel] ?? 0) + row.valor;
    categoryMap.set(row.categoria, (categoryMap.get(row.categoria) ?? 0) + row.valor);
    paymentMap.set(row.formaPagamento, (paymentMap.get(row.formaPagamento) ?? 0) + row.valor);
  }

  return {
    mes,
    total,
    count: monthRows.length,
    byPerson,
    byCategory: sortedBreakdown(categoryMap),
    byPayment: sortedBreakdown(paymentMap),
    rows: monthRows.sort((a, b) => b.dataISO.localeCompare(a.dataISO)),
  };
}

export function listAvailableMonths(rows: ExpenseRow[]): string[] {
  const months = new Set(rows.map(r => r.mes));
  return Array.from(months).sort((a, b) => b.localeCompare(a));
}

export interface MonthlyTrendPoint {
  mes: string;
  total: number;
  byPerson: Record<string, number>;
}

export function buildTrend(rows: ExpenseRow[], months: string[]): MonthlyTrendPoint[] {
  return [...months]
    .sort((a, b) => a.localeCompare(b))
    .map(mes => {
      const monthRows = rows.filter(r => r.mes === mes);
      const byPerson: Record<string, number> = {};
      let total = 0;
      for (const row of monthRows) {
        total += row.valor;
        byPerson[row.responsavel] = (byPerson[row.responsavel] ?? 0) + row.valor;
      }
      return { mes, total, byPerson };
    });
}
