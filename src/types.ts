export interface Expense {
  valor: number;
  categoria: string;
  formaPagamento: string;
  descricao: string;
  responsavel: string;
  data: string;
}

export interface ParsedExpense {
  valor: number;
  categoria: string;
  forma_pagamento: string;
  descricao: string;
}
