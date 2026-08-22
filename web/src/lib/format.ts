export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

export function formatCompactBRL(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}K`;
  }
  return formatBRL(value);
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function formatMonthLabel(mes: string): string {
  const [year, month] = mes.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} de ${year}`;
}

export function formatMonthShort(mes: string): string {
  const [year, month] = mes.split('-').map(Number);
  return `${MONTH_NAMES_SHORT[month - 1]}/${String(year).slice(2)}`;
}

export function formatDateBR(dataISO: string): string {
  const [year, month, day] = dataISO.split('-');
  return `${day}/${month}/${year}`;
}
