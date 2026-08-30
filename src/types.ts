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

export type FinancingType = 'Financiamento' | 'Parcelamento';

export interface Financing {
  id: string;
  descricao: string;
  tipo: FinancingType;
  responsavel: string;
  valorParcela: number;
  parcelasPagas: number;
  parcelasTotais: number;
  dataCadastro: string;
}

export interface ParsedFinancingNew {
  descricao: string;
  tipo_financiamento: FinancingType;
  valor_parcela: number;
  parcelas_pagas: number;
  parcelas_totais: number;
}

export interface ParsedFinancingPayment {
  descricao: string;
  parcelas: number;
}

export interface ParsedMetaDefinida {
  categoria: string;
  valor: number;
}

export interface ParsedRendaNova {
  descricao: string;
  valor: number;
}

export interface ParsedGastoFixoNovo {
  descricao: string;
  categoria: string;
  valor: number;
  dia_vencimento: number;
}

export interface FixedExpense {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  responsavel: string;
  diaVencimento: number;
  ultimoMesLancado: string;
  dataCadastro: string;
}

export interface ResumoPeriodo {
  totalGeral: number;
  porResponsavel: Record<string, number>;
  porCategoria: { categoria: string; total: number }[];
}

export interface ConsultaGeral {
  gastoMesAtual: number;
  gastoMesAnteriorMesmoDia: number;
  rendaTotal: number;
  saldoMes: number;
  compromissoMensalFixo: number;
  metas: { categoria: string; meta: number; gasto: number }[];
}

export interface ParsedConsulta {
  categoria: string | null;
}

export type ParsedMessage =
  | ({ tipo: 'gasto' } & ParsedExpense)
  | ({ tipo: 'financiamento_novo' } & ParsedFinancingNew)
  | ({ tipo: 'financiamento_pagamento' } & ParsedFinancingPayment)
  | ({ tipo: 'definir_meta' } & ParsedMetaDefinida)
  | ({ tipo: 'renda_nova' } & ParsedRendaNova)
  | ({ tipo: 'gasto_fixo_novo' } & ParsedGastoFixoNovo)
  | ({ tipo: 'consulta' } & ParsedConsulta)
  | { tipo: 'desfazer_ultimo_gasto' }
  | { tipo: 'nao_identificado' };
